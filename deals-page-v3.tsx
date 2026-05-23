'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, DollarSign, Users, Zap, AlertCircle, Plus,
  Filter, ArrowUpDown, ChevronRight, MapPin, RefreshCw,
  Target, BarChart3, TrendingUp, Flame
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import Link from 'next/link';
import AddDealModal from '@/components/deal/AddDealModal';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-700 text-gray-400',
  NEEDS_INFO: 'bg-amber-900/50 text-amber-300',
  READY_TO_MATCH: 'bg-blue-900/50 text-blue-300',
  MATCHED: 'bg-purple-900/50 text-purple-300',
  READY_TO_BLAST: 'bg-green-900/50 text-green-300',
  CAMPAIGN_ACTIVE: 'bg-emerald-900/50 text-emerald-400',
  OFFER_RECEIVED: 'bg-orange-900/50 text-orange-300',
  ACTIVE: 'bg-blue-900/50 text-blue-300',
  CLOSED: 'bg-gray-700 text-gray-400',
  DEAD: 'bg-red-900/40 text-red-500',
};

const STATUS_TOOLTIPS: Record<string, string> = {
  DRAFT: 'Deal saved but not yet reviewed or ready for any action.',
  NEEDS_INFO: 'Missing key details — needs photos, asking price, or public estimates before matching.',
  READY_TO_MATCH: 'Has enough info to run buyer matching. Photos + asking price + at least one public estimate on file.',
  MATCHED: 'Buyer match has been run and buyers were found in your database.',
  READY_TO_BLAST: 'Buyers matched AND all blast requirements met — photos, access info, and description are complete.',
  CAMPAIGN_ACTIVE: 'Buyer blast is live. SMS/email campaign is actively running.',
  OFFER_RECEIVED: 'A buyer has submitted an offer on this deal.',
  ASSIGNED: 'Deal has been assigned to a buyer.',
  UNDER_CONTRACT: 'Deal is under contract.',
  ACTIVE: 'Deal is active and being worked.',
  CLOSED: 'Deal has closed successfully.',
  DEAD: 'Deal fell through or was removed from pipeline.',
};

function getPriorityBadge(score: number) {
  if (score >= 90) return { label: '🔥 Hot', bg: 'bg-red-900/60 text-red-300 border border-red-700/50' };
  if (score >= 75) return { label: 'Strong', bg: 'bg-orange-900/60 text-orange-300 border border-orange-700/50' };
  if (score >= 60) return { label: 'Workable', bg: 'bg-yellow-900/60 text-yellow-300 border border-yellow-700/50' };
  if (score >= 40) return { label: 'Needs Info', bg: 'bg-blue-900/60 text-blue-300 border border-blue-700/50' };
  if (score > 0) return { label: 'Weak', bg: 'bg-gray-800 text-gray-500 border border-gray-700' };
  return null;
}

function getCoverageColor(status: string) {
  if (status === 'Strong Coverage') return 'text-green-400';
  if (status === 'Moderate Coverage') return 'text-yellow-400';
  if (status === 'Weak Coverage') return 'text-orange-400';
  return 'text-red-400';
}

// Tooltip component for status badges
function StatusBadge({ status }: { status: string }) {
  const [show, setShow] = useState(false);
  const tooltip = STATUS_TOOLTIPS[status] || '';
  const colorClass = STATUS_COLORS[status] || 'bg-gray-800 text-gray-400';
  const label = (status || 'DRAFT').replace(/_/g, ' ');

  return (
    <div className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}>
      <span className={`text-xs px-2 py-0.5 rounded-full cursor-default ${colorClass}`}>
        {label}
      </span>
      {show && tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 bg-gray-800 border border-gray-600 rounded-lg p-2.5 shadow-xl pointer-events-none">
          <p className="text-gray-200 text-xs leading-relaxed">{tooltip}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  );
}

export default function DealsPage() {
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [sortBy, setSortBy] = useState('dealPriorityScore');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const { data: dealsData, isLoading, refetch } = useQuery({
    queryKey: ['deals', sortBy, filterStatus, filterSource],
    queryFn: () => api.get(`/deals?page=1&limit=50&sort=${sortBy}${filterStatus !== 'ALL' ? '&status=' + filterStatus : ''}${filterSource !== 'ALL' ? '&source=' + filterSource : ''}`).then(r => r.data),
  });

  const { data: marketIntel } = useQuery({
    queryKey: ['market-intelligence'],
    queryFn: () => api.get('/deals/market-intelligence').then(r => r.data).catch(() => null),
  });

  const deals = dealsData?.data || [];

  const stats = useMemo(() => {
    const active = deals.filter((d: any) => !['DEAD', 'CLOSED', 'DRAFT'].includes(d.status));
    return {
      total: active.length,
      readyToMatch: deals.filter((d: any) => d.status === 'READY_TO_MATCH').length,
      readyToBlast: deals.filter((d: any) => d.status === 'READY_TO_BLAST').length,
      mostBuyers: Math.max(0, ...deals.map((d: any) => d.matchedBuyerCount || 0)),
      needsInfo: deals.filter((d: any) => ['NEEDS_INFO', 'DRAFT'].includes(d.status) || (d.missingInfoCount || 0) > 3).length,
      noBuyersAlert: deals.filter((d: any) => (d.dealPriorityScore || 0) >= 60 && (d.matchedBuyerCount || 0) === 0).length,
    };
  }, [deals]);

  // Build market gaps
  const marketGaps = useMemo(() => {
    if (marketIntel?.byBuyerGap?.length) return marketIntel.byBuyerGap;
    const map: Record<string, any> = {};
    for (const d of deals) {
      if (!d.dealPriorityScore || d.dealPriorityScore < 40) continue;
      const key = d.marketKey || `${d.city || 'Unknown'}, ${d.state || ''}`;
      if (!map[key]) map[key] = { market: key, deals: 0, spread: 0, buyers: 0, tier1: 0, gapScore: 0, recommendation: '' };
      map[key].deals++;
      map[key].spread += d.spread || 0;
      map[key].buyers = Math.max(map[key].buyers, d.matchedBuyerCount || 0);
      map[key].tier1 = Math.max(map[key].tier1, d.tier1MatchCount || 0);
      map[key].gapScore = Math.max(map[key].gapScore, d.buyerGapScore || 0);
      if (d.marketBuyerNeedRecommendation) map[key].recommendation = d.marketBuyerNeedRecommendation;
    }
    return Object.values(map).sort((a: any, b: any) => b.gapScore - a.gapScore).slice(0, 3);
  }, [deals, marketIntel]);

  // Good deals with no buyers
  const noBuyerDeals = useMemo(() =>
    deals.filter((d: any) => (d.dealPriorityScore || 0) >= 60 && (d.matchedBuyerCount || 0) === 0),
  [deals]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Deals</h1>
          <p className="text-gray-500 text-sm mt-0.5">Sorted by Deal Priority Score — best opportunities first</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${showFilters ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            <Filter size={14} /> Filters
          </button>
          <button onClick={() => setShowAddDeal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition">
            <Plus size={16} /> Add Deal
          </button>
        </div>
      </div>

      {/* Summary Cards — no Highest Spread */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Active Deals', value: stats.total, icon: Building2, color: 'text-white' },
          { label: 'Ready to Match', value: stats.readyToMatch || '—', icon: Target, color: 'text-blue-400' },
          { label: 'Ready to Blast', value: stats.readyToBlast || '—', icon: Zap, color: 'text-green-400' },
          { label: 'Most Buyers', value: stats.mostBuyers || '—', icon: Users, color: 'text-purple-400' },
          { label: 'Needs Info', value: stats.needsInfo || '—', icon: AlertCircle, color: 'text-amber-400' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <s.icon size={16} className={`${s.color} mb-2`} />
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ⚠ No Buyers Alert */}
      {noBuyerDeals.length > 0 && (
        <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <h3 className="text-red-300 font-semibold text-sm">
              {noBuyerDeals.length} Good Deal{noBuyerDeals.length !== 1 ? 's' : ''} With No Buyers — Needs Review
            </h3>
          </div>
          <p className="text-gray-400 text-xs mb-3">
            These deals scored 60+ but have zero matched buyers in your database. Consider JV-ing out, blasting to outside networks, or buying yourself.
          </p>
          <div className="space-y-2">
            {noBuyerDeals.map((d: any) => (
              <Link key={d.id} href={`/dashboard/deals/${d.id}`}
                className="flex items-center justify-between bg-gray-900/60 rounded-lg px-3 py-2 hover:bg-gray-800/60 transition">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-red-400">{d.dealPriorityScore}</span>
                  <span className="text-white text-sm font-medium">{d.address}</span>
                  <span className="text-gray-500 text-xs">{d.city}, {d.state}</span>
                </div>
                <div className="flex items-center gap-3">
                  {d.askingPrice && <span className="text-gray-400 text-xs">{formatCurrency(d.askingPrice)}</span>}
                  <span className="text-red-400 text-xs font-medium">0 buyers</span>
                  <ChevronRight size={14} className="text-gray-600" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Sort By</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700">
                  <option value="dealPriorityScore">Deal Priority Score</option>
                  <option value="spread">Spread (High to Low)</option>
                  <option value="matchedBuyerCount">Buyer Match Count</option>
                  <option value="closingDate">Closing Date</option>
                  <option value="createdAt">Newest</option>
                </select>
              </div>
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Status</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700">
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="NEEDS_INFO">Needs Info</option>
                  <option value="READY_TO_MATCH">Ready to Match</option>
                  <option value="MATCHED">Matched</option>
                  <option value="READY_TO_BLAST">Ready to Blast</option>
                  <option value="CAMPAIGN_ACTIVE">Campaign Active</option>
                  <option value="OFFER_RECEIVED">Offer Received</option>
                </select>
              </div>
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Source</label>
                <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700">
                  <option value="ALL">All Sources</option>
                  <option value="OWN">Own Deal</option>
                  <option value="JV">JV Partner</option>
                  <option value="FACEBOOK">Facebook</option>
                  <option value="SMS">SMS</option>
                  <option value="BIRD_DOG">Bird Dog</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Market Intelligence */}
      {marketGaps.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center gap-2">
            <BarChart3 size={15} className="text-orange-400" />
            <h2 className="text-white font-semibold text-sm">Markets We Need Buyers In</h2>
            <span className="text-gray-500 text-xs">Based on active high-quality deals with weak buyer coverage</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-800">
            {marketGaps.slice(0, 3).map((m: any, i: number) => {
              const buyers = m.buyers ?? m.totalMatchedBuyers ?? 0;
              const tier1 = m.tier1 ?? m.totalTier1Buyers ?? 0;
              const spread = m.spread ?? m.totalEstimatedSpread ?? 0;
              const dealCount = m.deals ?? m.activeDealCount ?? 0;
              const coverage = buyers >= 15 && tier1 >= 3 ? 'Strong Coverage'
                : buyers >= 8 || tier1 >= 1 ? 'Moderate Coverage'
                : buyers >= 1 ? 'Weak Coverage' : 'Buyer Gap';
              const rec = m.recommendation || m.marketBuyerNeedRecommendation || '';
              return (
                <div key={i} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white font-medium text-sm">{m.market}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {dealCount > 0 ? `${dealCount} active good deal${dealCount !== 1 ? 's' : ''}` : 'Active deals'}
                      </p>
                    </div>
                    <span className={`text-xs font-medium ${getCoverageColor(coverage)}`}>{coverage}</span>
                  </div>
                  <div className="space-y-1.5 text-xs mb-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Est. Total Spread</span>
                      <span className="text-white">{spread > 0 ? formatCurrency(spread) : 'Not enough data yet'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Matched Buyers</span>
                      <span className={buyers === 0 ? 'text-red-400' : buyers < 5 ? 'text-amber-400' : 'text-white'}>
                        {buyers > 0 ? buyers : 'None yet'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tier 1 Buyers</span>
                      <span className={tier1 === 0 ? 'text-red-400' : 'text-white'}>
                        {tier1 > 0 ? tier1 : 'None yet'}
                      </span>
                    </div>
                    {m.gapScore > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Buyer Gap Score</span>
                        <span className="text-orange-400">{m.gapScore}/100</span>
                      </div>
                    )}
                  </div>
                  {(coverage === 'Buyer Gap' || coverage === 'Weak Coverage') && (
                    <div className="p-2.5 bg-red-900/20 rounded-lg border border-red-900/30">
                      <p className="text-red-300 text-xs">{rec || `Find more buyers in ${m.market}`}</p>
                    </div>
                  )}
                  {coverage === 'Moderate Coverage' && rec && (
                    <div className="p-2.5 bg-yellow-900/20 rounded-lg border border-yellow-900/30">
                      <p className="text-yellow-300 text-xs">{rec}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deals Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <p className="text-gray-400 text-sm">{deals.length} deal{deals.length !== 1 ? 's' : ''}</p>
          <div className="flex items-center gap-1 text-gray-500 text-xs">
            <ArrowUpDown size={12} /><span>Priority Score ↓</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading deals...</div>
        ) : deals.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No deals yet</p>
            <p className="text-gray-600 text-sm mt-1">Add your first deal to get started</p>
            <button onClick={() => setShowAddDeal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition">
              + Add Deal
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/40">
            {deals.map((deal: any, i: number) => {
              const priority = getPriorityBadge(deal.dealPriorityScore || 0);
              const spread = deal.spread ?? ((deal.arv || 0) - (deal.askingPrice || 0) - (deal.repairEstimate || 0));
              const missing = deal.missingInfoCount || 0;
              const hasPhotos = !!(deal.photosUrl || deal.googleDriveUrl || deal.photos?.length);
              const noBuyers = (deal.dealPriorityScore || 0) >= 60 && (deal.matchedBuyerCount || 0) === 0;

              // Avg public value
              const estimates = [deal.zillowEstimate, deal.realtorEstimate, deal.redfinEstimate].filter((v): v is number => typeof v === 'number' && v > 0);
              const avgPublic = estimates.length > 0 ? estimates.reduce((a, b) => a + b, 0) / estimates.length : null;
              const seventyPct = avgPublic ? avgPublic * 0.7 : null;

              return (
                <motion.div key={deal.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="group hover:bg-gray-800/30 transition">
                  <Link href={`/dashboard/deals/${deal.id}`} className="flex items-center gap-3 p-4">

                    {/* Priority */}
                    <div className="w-16 text-center shrink-0">
                      {priority ? (
                        <>
                          <div className={`text-xs font-bold px-2 py-1 rounded-lg ${priority.bg}`}>{priority.label}</div>
                          <p className="text-gray-600 text-xs mt-1">{deal.dealPriorityScore}</p>
                        </>
                      ) : (
                        <div className="text-xs px-2 py-1 rounded-lg bg-gray-800 text-gray-600">—</div>
                      )}
                    </div>

                    {/* Property */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm truncate">{deal.address || 'No address'}</p>
                        {noBuyers && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/60 text-red-300 border border-red-800/50 shrink-0 font-medium">
                            ⚠ No Buyers
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-gray-500 text-xs">
                          <MapPin size={10} />{[deal.city, deal.state, deal.zipCode].filter(Boolean).join(', ')}
                        </span>
                        {deal.beds && <span className="text-gray-600 text-xs">{deal.beds}bd/{deal.baths}ba</span>}
                        {deal.dealType && <span className="text-indigo-500 text-xs">{deal.dealType}</span>}
                      </div>
                    </div>

                    {/* Source */}
                    <div className="hidden md:block w-20 text-center shrink-0">
                      {deal.sourceType && deal.sourceType !== 'MANUAL' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                          {deal.sourceType}
                        </span>
                      )}
                    </div>

                    {/* Status with tooltip */}
                    <div className="hidden md:block w-28 text-center shrink-0">
                      <StatusBadge status={deal.status || 'DRAFT'} />
                    </div>

                    {/* Asking */}
                    <div className="hidden lg:block w-20 text-right shrink-0">
                      <p className="text-white text-sm">{deal.askingPrice ? formatCurrency(deal.askingPrice) : '—'}</p>
                      <p className="text-gray-600 text-xs">ask</p>
                    </div>

                    {/* Spread */}
                    <div className="hidden lg:block w-20 text-right shrink-0">
                      <p className={`text-sm font-medium ${spread > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                        {spread > 0 ? formatCurrency(spread) : '—'}
                      </p>
                      <p className="text-gray-600 text-xs">spread</p>
                    </div>

                    {/* Avg Public Value */}
                    <div className="hidden xl:block w-24 text-right shrink-0">
                      {avgPublic ? (
                        <>
                          <p className="text-blue-300 text-sm font-medium">{formatCurrency(avgPublic)}</p>
                          <p className="text-gray-600 text-xs">avg public</p>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-600 text-sm">—</p>
                          <p className="text-gray-700 text-xs">avg public</p>
                        </>
                      )}
                    </div>

                    {/* 70% of Avg */}
                    <div className="hidden xl:block w-24 text-right shrink-0">
                      {seventyPct ? (
                        <>
                          <p className={`text-sm font-medium ${deal.askingPrice && deal.askingPrice <= seventyPct ? 'text-green-400' : 'text-amber-400'}`}>
                            {formatCurrency(seventyPct)}
                          </p>
                          <p className="text-gray-600 text-xs">70% avg</p>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-600 text-sm">—</p>
                          <p className="text-gray-700 text-xs">70% avg</p>
                        </>
                      )}
                    </div>

                    {/* Buyers */}
                    <div className="hidden lg:block w-14 text-center shrink-0">
                      <p className={`text-sm font-medium ${(deal.matchedBuyerCount || 0) > 0 ? 'text-purple-400' : 'text-gray-700'}`}>
                        {deal.matchedBuyerCount || '—'}
                      </p>
                      <p className="text-gray-600 text-xs">buyers</p>
                    </div>

                    {/* Warnings + Next action */}
                    <div className="hidden xl:block w-32 shrink-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        {!hasPhotos && <span title="No photos" className="text-amber-600 text-xs">📷</span>}
                        {missing > 0 && <span className="text-amber-500 text-xs">{missing} missing</span>}
                      </div>
                      {deal.nextBestAction && (
                        <p className="text-blue-400 text-xs truncate">{deal.nextBestAction}</p>
                      )}
                    </div>

                    <ChevronRight size={16} className="text-gray-700 group-hover:text-gray-400 transition shrink-0" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddDeal && <AddDealModal onClose={() => setShowAddDeal(false)} onSuccess={() => { setShowAddDeal(false); refetch(); }} />}
      </AnimatePresence>
    </div>
  );
}
