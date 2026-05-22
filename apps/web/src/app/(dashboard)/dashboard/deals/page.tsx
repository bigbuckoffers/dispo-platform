'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, TrendingUp, MapPin, Users, AlertCircle, Plus,
  Filter, ArrowUpDown, ChevronRight, Building2, DollarSign,
  Zap, Eye, RefreshCw, Target, BarChart3, Clock
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import Link from 'next/link';
import AddDealModal from '@/components/deal/AddDealModal';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-700 text-gray-300',
  NEEDS_INFO: 'bg-amber-900/50 text-amber-300',
  READY_TO_MATCH: 'bg-blue-900/50 text-blue-300',
  MATCHED: 'bg-purple-900/50 text-purple-300',
  READY_TO_BLAST: 'bg-green-900/50 text-green-300',
  CAMPAIGN_ACTIVE: 'bg-emerald-900/50 text-emerald-400',
  OFFER_RECEIVED: 'bg-orange-900/50 text-orange-300',
  ASSIGNED: 'bg-teal-900/50 text-teal-300',
  CLOSED: 'bg-green-800/50 text-green-200',
  DEAD: 'bg-red-900/50 text-red-400',
};

const SOURCE_COLORS: Record<string, string> = {
  OWN: 'bg-yellow-900/50 text-yellow-300',
  JV: 'bg-blue-900/50 text-blue-300',
  FACEBOOK: 'bg-indigo-900/50 text-indigo-300',
  SMS: 'bg-green-900/50 text-green-300',
  BIRD_DOG: 'bg-orange-900/50 text-orange-300',
  MANUAL: 'bg-gray-800 text-gray-400',
};

function getPriorityBadge(score: number) {
  if (score >= 90) return { label: 'Hot 🔥', bg: 'bg-red-900/60 text-red-300 border border-red-700/50' };
  if (score >= 75) return { label: 'Strong', bg: 'bg-orange-900/60 text-orange-300 border border-orange-700/50' };
  if (score >= 60) return { label: 'Workable', bg: 'bg-yellow-900/60 text-yellow-300 border border-yellow-700/50' };
  if (score >= 40) return { label: 'Needs Info', bg: 'bg-blue-900/60 text-blue-300 border border-blue-700/50' };
  return { label: 'Weak', bg: 'bg-gray-800 text-gray-500 border border-gray-700' };
}

function getCoverageColor(status: string) {
  if (status === 'Strong Coverage') return 'text-green-400';
  if (status === 'Moderate Coverage') return 'text-yellow-400';
  if (status === 'Weak Coverage') return 'text-orange-400';
  return 'text-red-400';
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

  // Summary stats
  const stats = useMemo(() => {
    const active = deals.filter((d: any) => !['DEAD', 'CLOSED'].includes(d.status));
    return {
      total: active.length,
      readyToMatch: deals.filter((d: any) => d.status === 'READY_TO_MATCH').length,
      readyToBlast: deals.filter((d: any) => d.status === 'READY_TO_BLAST').length,
      highestSpread: Math.max(0, ...deals.map((d: any) => d.spread || 0)),
      mostBuyers: Math.max(0, ...deals.map((d: any) => d.matchedBuyerCount || 0)),
      needsInfo: deals.filter((d: any) => d.status === 'NEEDS_INFO' || d.status === 'DRAFT').length,
    };
  }, [deals]);

  // Market gaps from deals
  const marketGaps = useMemo(() => {
    if (marketIntel?.byBuyerGap) return marketIntel.byBuyerGap;
    // compute from deals if no endpoint yet
    const map: Record<string, any> = {};
    for (const d of deals) {
      const key = d.marketKey || `${d.city}, ${d.state}`;
      if (!map[key]) map[key] = { market: key, deals: 0, spread: 0, buyers: 0, tier1: 0, gapScore: 0 };
      map[key].deals++;
      map[key].spread += d.spread || 0;
      map[key].buyers += d.matchedBuyerCount || 0;
      map[key].tier1 += d.tier1MatchCount || 0;
      map[key].gapScore = Math.max(map[key].gapScore, d.buyerGapScore || 0);
    }
    return Object.values(map).sort((a: any, b: any) => b.gapScore - a.gapScore).slice(0, 5);
  }, [deals, marketIntel]);

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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${showFilters ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            <Filter size={14} /> Filters
          </button>
          <button
            onClick={() => setShowAddDeal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition"
          >
            <Plus size={16} /> Add Deal
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Active Deals', value: stats.total, icon: Building2, color: 'text-white' },
          { label: 'Ready to Match', value: stats.readyToMatch, icon: Target, color: 'text-blue-400' },
          { label: 'Ready to Blast', value: stats.readyToBlast, icon: Zap, color: 'text-green-400' },
          { label: 'Highest Spread', value: formatCurrency(stats.highestSpread), icon: DollarSign, color: 'text-yellow-400' },
          { label: 'Most Buyers', value: stats.mostBuyers, icon: Users, color: 'text-purple-400' },
          { label: 'Needs Info', value: stats.needsInfo, icon: AlertCircle, color: 'text-amber-400' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-gray-900 rounded-xl p-4 border border-gray-800"
          >
            <s.icon size={16} className={`${s.color} mb-2`} />
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-900 rounded-xl p-4 border border-gray-800"
          >
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Sort By</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700"
                >
                  <option value="dealPriorityScore">Deal Priority Score</option>
                  <option value="spread">Spread (High to Low)</option>
                  <option value="matchedBuyerCount">Buyer Match Count</option>
                  <option value="closingDate">Closing Date</option>
                  <option value="createdAt">Newest</option>
                </select>
              </div>
              <div>
                <label className="text-gray-500 text-xs mb-1 block">Status</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700"
                >
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
                <select
                  value={filterSource}
                  onChange={e => setFilterSource(e.target.value)}
                  className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700"
                >
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
            <BarChart3 size={16} className="text-orange-400" />
            <h2 className="text-white font-semibold">Markets We Need Buyers In</h2>
            <span className="text-gray-500 text-xs ml-1">Based on active high-quality deals with weak buyer coverage</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-800">
            {marketGaps.slice(0, 3).map((m: any, i: number) => {
              const coverage = m.buyers >= 15 ? 'Strong Coverage' : m.buyers >= 8 ? 'Moderate Coverage' : m.buyers >= 1 ? 'Weak Coverage' : 'Buyer Gap';
              return (
                <div key={i} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-medium text-sm">{m.market}</p>
                      <p className="text-gray-500 text-xs">{m.deals} active deal{m.deals !== 1 ? 's' : ''}</p>
                    </div>
                    <span className={`text-xs font-medium ${getCoverageColor(coverage)}`}>{coverage}</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Est. Spread</span>
                      <span className="text-white">{formatCurrency(m.spread)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Matched Buyers</span>
                      <span className={m.buyers < 5 ? 'text-red-400' : 'text-white'}>{m.buyers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tier 1 Buyers</span>
                      <span className={m.tier1 === 0 ? 'text-red-400' : 'text-white'}>{m.tier1}</span>
                    </div>
                  </div>
                  {(coverage === 'Buyer Gap' || coverage === 'Weak Coverage') && (
                    <div className="mt-3 p-2 bg-red-900/20 rounded-lg border border-red-900/30">
                      <p className="text-red-300 text-xs">⚠ Find more buyers in this market</p>
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
          <p className="text-gray-400 text-sm">{deals.length} deals</p>
          <div className="flex items-center gap-1 text-gray-500 text-xs">
            <ArrowUpDown size={12} />
            <span>Priority Score ↓</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading deals...</div>
        ) : deals.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No deals yet</p>
            <p className="text-gray-600 text-sm mt-1">Add your first deal to get started</p>
            <button
              onClick={() => setShowAddDeal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition"
            >
              + Add Deal
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {deals.map((deal: any, i: number) => {
              const priority = getPriorityBadge(deal.dealPriorityScore || 0);
              const spread = deal.spread || ((deal.arv || 0) - (deal.askingPrice || 0) - (deal.repairEstimate || 0));
              const missing = deal.missingInfoCount || 0;
              const coverageColor = getCoverageColor(deal.buyerCoverageStatus || 'Buyer Gap');

              return (
                <motion.div
                  key={deal.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="group hover:bg-gray-800/40 transition"
                >
                  <Link href={`/dashboard/deals/${deal.id}`} className="flex items-center gap-4 p-4">
                    {/* Priority Score */}
                    <div className="w-14 text-center shrink-0">
                      <div className={`text-xs font-bold px-2 py-1 rounded-lg ${priority.bg}`}>
                        {priority.label}
                      </div>
                      <p className="text-gray-500 text-xs mt-1">{deal.dealPriorityScore || 0}</p>
                    </div>

                    {/* Property */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">
                        {deal.address || 'No address'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-gray-400 text-xs">
                          <MapPin size={10} />
                          {[deal.city, deal.state, deal.zipCode].filter(Boolean).join(', ')}
                        </span>
                        {deal.beds && <span className="text-gray-500 text-xs">{deal.beds}bd/{deal.baths}ba</span>}
                        {deal.sqft && <span className="text-gray-500 text-xs">{deal.sqft?.toLocaleString()} sqft</span>}
                      </div>
                    </div>

                    {/* Source */}
                    <div className="hidden md:block w-24 text-center shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_COLORS[deal.sourceType || 'MANUAL'] || 'bg-gray-800 text-gray-400'}`}>
                        {deal.sourceType || 'Manual'}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="hidden md:block w-28 text-center shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[deal.status] || 'bg-gray-800 text-gray-400'}`}>
                        {(deal.status || 'DRAFT').replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Financials */}
                    <div className="hidden lg:block w-28 text-right shrink-0">
                      <p className="text-white text-sm font-medium">{deal.askingPrice ? formatCurrency(deal.askingPrice) : '—'}</p>
                      <p className="text-gray-500 text-xs">ask</p>
                    </div>
                    <div className="hidden lg:block w-20 text-right shrink-0">
                      <p className={`text-sm font-medium ${spread > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                        {spread > 0 ? formatCurrency(spread) : '—'}
                      </p>
                      <p className="text-gray-500 text-xs">spread</p>
                    </div>

                    {/* Buyers */}
                    <div className="hidden lg:block w-20 text-center shrink-0">
                      <p className={`text-sm font-medium ${(deal.matchedBuyerCount || 0) > 0 ? 'text-purple-400' : 'text-gray-600'}`}>
                        {deal.matchedBuyerCount || 0}
                      </p>
                      <p className="text-gray-500 text-xs">buyers</p>
                    </div>

                    {/* Missing info */}
                    <div className="hidden xl:block w-20 text-center shrink-0">
                      {missing > 0 ? (
                        <span className="flex items-center gap-1 justify-center text-amber-400 text-xs">
                          <AlertCircle size={10} /> {missing} missing
                        </span>
                      ) : (
                        <span className="text-green-400 text-xs">✓ Complete</span>
                      )}
                    </div>

                    {/* Next action */}
                    <div className="hidden xl:block w-36 shrink-0">
                      <p className="text-blue-400 text-xs truncate">{deal.nextBestAction || '—'}</p>
                    </div>

                    <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 transition shrink-0" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Deal Modal */}
      <AnimatePresence>
        {showAddDeal && <AddDealModal onClose={() => setShowAddDeal(false)} onSuccess={() => { setShowAddDeal(false); refetch(); }} />}
      </AnimatePresence>
    </div>
  );
}
