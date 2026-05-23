'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, Zap, AlertCircle, Plus, Filter, ArrowUpDown, ChevronRight, MapPin, RefreshCw, Target, BarChart3, ChevronDown, ChevronUp, Shield, Camera } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import Link from 'next/link';
import AddDealModal from '@/components/deal/AddDealModal';
const STATUS_COLORS: Record<string, string> = { DRAFT:'bg-gray-700 text-gray-400', NEEDS_INFO:'bg-amber-900/50 text-amber-300', READY_TO_MATCH:'bg-blue-900/50 text-blue-300', MATCHED:'bg-purple-900/50 text-purple-300', READY_TO_BLAST:'bg-green-900/50 text-green-300', CAMPAIGN_ACTIVE:'bg-emerald-900/50 text-emerald-400', OFFER_RECEIVED:'bg-orange-900/50 text-orange-300', ACTIVE:'bg-blue-900/50 text-blue-300', CLOSED:'bg-gray-700 text-gray-400', DEAD:'bg-red-900/40 text-red-500' };
const STATUS_TIPS: Record<string, string> = { DRAFT:'Saved but not reviewed.', NEEDS_INFO:'Missing key details before matching.', READY_TO_MATCH:'Has enough info — ready to run buyer matching.', MATCHED:'Buyer match ran, buyers found.', READY_TO_BLAST:'Buyers matched + all blast requirements met.', CAMPAIGN_ACTIVE:'Blast is live.', OFFER_RECEIVED:'A buyer submitted an offer.' };
const SRC_BADGE: Record<string, { label: string; cls: string }> = { NEW_SOURCE:{label:'New',cls:'bg-blue-900/40 text-blue-300 border-blue-700/40'}, TRUSTED_SOURCE:{label:'Trusted ✓',cls:'bg-green-900/40 text-green-300 border-green-700/40'}, GOOD_SOURCE:{label:'Good',cls:'bg-green-900/30 text-green-400 border-green-800/40'}, SLOW_RESPONSE:{label:'Slow',cls:'bg-amber-900/40 text-amber-300 border-amber-700/40'}, BAD_INFO_BEFORE:{label:'Bad Info',cls:'bg-orange-900/40 text-orange-300 border-orange-700/40'}, LOW_QUALITY:{label:'Low Quality',cls:'bg-red-900/40 text-red-300 border-red-700/40'}, CLOSED_BEFORE:{label:'Closed ✓',cls:'bg-purple-900/40 text-purple-300 border-purple-700/40'}, BLACKLIST:{label:'Blacklist',cls:'bg-red-900/60 text-red-200 border-red-600'} };
function getPriorityBadge(score: number) {
  if (score >= 90) return { label: '🔥 Hot', bg: 'bg-red-900/70 text-red-300 border border-red-700/60' };
  if (score >= 75) return { label: 'Strong', bg: 'bg-orange-900/70 text-orange-300 border border-orange-700/60' };
  if (score >= 60) return { label: 'Workable', bg: 'bg-yellow-900/60 text-yellow-300 border border-yellow-700/50' };
  if (score >= 40) return { label: 'Needs Info', bg: 'bg-blue-900/60 text-blue-300 border border-blue-700/50' };
  if (score > 0) return { label: 'Weak', bg: 'bg-gray-800 text-gray-500 border border-gray-700' };
  return null;
}
function getBlastReadiness(deal: any) {
  const checks = [
    { name: 'Photos', ok: !!(deal.photosUrl || deal.googleDriveUrl || deal.photos?.length) },
    { name: 'Access info', ok: !!deal.accessInfo },
    { name: 'Description', ok: !!deal.description },
    { name: 'Asking price', ok: !!deal.askingPrice },
    { name: 'Public estimate', ok: !!(deal.zillowEstimate || deal.realtorEstimate || deal.redfinEstimate || deal.rentcastEstimate || deal.arv) },
    { name: 'Source confirmed', ok: !!(deal.sourceName || deal.sourceType === 'OWN') },
    { name: 'Permission to market', ok: deal.sourceType === 'OWN' || !!(deal.dealSource?.permissionToMarket) },
    { name: 'Buyer matches', ok: (deal.matchedBuyerCount || 0) > 0 },
  ];
  const passed = checks.filter(c => c.ok).length;
  const pct = Math.round((passed / checks.length) * 100);
  const missing = checks.filter(c => !c.ok).map(c => c.name);
  const color = pct >= 85 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : pct >= 40 ? 'text-orange-400' : 'text-red-400';
  const label = pct >= 85 ? `${pct}% Ready` : missing[0] ? `${pct}% — needs ${missing[0]}` : `${pct}%`;
  return { pct, label, color, missing };
}
function getAgeLabel(deal: any): { text: string; color: string } | null {
  const now = Date.now();
  if (deal.closingDate) {
    const daysLeft = Math.ceil((new Date(deal.closingDate).getTime() - now) / 86400000);
    if (daysLeft <= 0) return { text: 'COE passed', color: 'text-red-400' };
    if (daysLeft <= 3) return { text: `COE in ${daysLeft}d`, color: 'text-red-400' };
    if (daysLeft <= 7) return { text: `COE in ${daysLeft}d`, color: 'text-amber-400' };
  }
  const daysOld = Math.floor((now - new Date(deal.createdAt).getTime()) / 86400000);
  if (daysOld === 0) return { text: 'Added today', color: 'text-green-400' };
  if (daysOld >= 14) return { text: `Stale ${daysOld}d`, color: 'text-amber-500' };
  if (daysOld >= 7) return { text: `${daysOld}d old`, color: 'text-gray-500' };
  return null;
}
function StatusBadge({ status }: { status: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span className={`text-xs px-2 py-0.5 rounded-full cursor-default whitespace-nowrap ${STATUS_COLORS[status] || 'bg-gray-800 text-gray-400'}`}>{(status||'DRAFT').replace(/_/g,' ')}</span>
      {show && STATUS_TIPS[status] && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-48 bg-gray-800 border border-gray-600 rounded-lg p-2.5 shadow-xl pointer-events-none">
          <p className="text-gray-200 text-xs leading-relaxed">{STATUS_TIPS[status]}</p>
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
  const [showFilters, setShowFilters] = useState(false);
  const [showGaps, setShowGaps] = useState(false);
  const { data: dealsData, isLoading, refetch } = useQuery({ queryKey: ['deals', sortBy, filterStatus], queryFn: () => api.get(`/deals?page=1&limit=50&sort=${sortBy}${filterStatus !== 'ALL' ? '&status='+filterStatus : ''}`).then(r => r.data) });
  const deals = dealsData?.data || [];
  const stats = useMemo(() => {
    const active = deals.filter((d: any) => !['DEAD','CLOSED','DRAFT'].includes(d.status));
    return {
      total: active.length,
      readyToMatch: deals.filter((d: any) => d.status === 'READY_TO_MATCH').length,
      readyToBlast: deals.filter((d: any) => d.status === 'READY_TO_BLAST').length,
      trustedDeals: deals.filter((d: any) => d.sourceType === 'OWN' || ['TRUSTED_SOURCE','GOOD_SOURCE','CLOSED_BEFORE'].includes(d.dealSource?.reliabilityLabel)).length,
      highDemand: deals.filter((d: any) => (d.matchedBuyerCount||0) >= 5).length,
      needsInfo: deals.filter((d: any) => (d.missingInfoCount||0) > 2).length,
    };
  }, [deals]);
  const marketGaps = useMemo(() => {
    const map: Record<string, any> = {};
    for (const d of deals) {
      if (!d.dealPriorityScore || d.dealPriorityScore < 40) continue;
      const key = d.marketKey || `${d.city||'Unknown'}, ${d.state||''}`;
      if (!map[key]) map[key] = { market: key, deals: 0, totalScore: 0, buyers: 0, tier1: 0, gapScore: 0, need: '' };
      map[key].deals++; map[key].totalScore += d.dealPriorityScore||0;
      map[key].buyers = Math.max(map[key].buyers, d.matchedBuyerCount||0);
      map[key].tier1 = Math.max(map[key].tier1, d.tier1MatchCount||0);
      map[key].gapScore = Math.max(map[key].gapScore, d.buyerGapScore||0);
      if (d.marketBuyerNeedRecommendation) map[key].need = d.marketBuyerNeedRecommendation;
    }
    return Object.values(map).sort((a: any, b: any) => b.gapScore - a.gapScore).slice(0, 6);
  }, [deals]);
  const gapSummary = marketGaps.filter((m: any) => m.buyers === 0).map((m: any) => m.market.split(',')[0]).join(', ');
  const noBuyerDeals = deals.filter((d: any) => (d.dealPriorityScore||0) >= 55 && (d.matchedBuyerCount||0) === 0);
  return (
    <div className="p-5 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-white">Deals</h1><p className="text-gray-500 text-xs mt-0.5">Sorted by Deal Priority Score — best opportunities first</p></div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition"><RefreshCw size={14} /></button>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${showFilters?'bg-blue-600 text-white':'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}><Filter size={12} /> Filters</button>
          <button onClick={() => setShowAddDeal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg font-medium transition"><Plus size={14} /> Add Deal</button>
        </div>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
        {[{label:'Active',value:stats.total,icon:Building2,color:'text-white'},{label:'Ready Match',value:stats.readyToMatch||'—',icon:Target,color:'text-blue-400'},{label:'Ready Blast',value:stats.readyToBlast||'—',icon:Zap,color:'text-green-400'},{label:'Trusted Src',value:stats.trustedDeals||'—',icon:Shield,color:'text-purple-400'},{label:'Has Buyers',value:stats.highDemand||'—',icon:Users,color:'text-orange-400'},{label:'Needs Info',value:stats.needsInfo||'—',icon:AlertCircle,color:'text-amber-400'}].map((s,i) => (
          <div key={s.label} className="bg-gray-900 rounded-xl p-3 border border-gray-800"><s.icon size={13} className={`${s.color} mb-1.5`} /><p className={`text-lg font-bold ${s.color}`}>{s.value}</p><p className="text-gray-500 text-xs">{s.label}</p></div>
        ))}
      </div>
      {noBuyerDeals.length > 0 && (
        <div className="bg-red-900/15 border border-red-800/40 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2"><AlertCircle size={13} className="text-red-400 shrink-0" /><span className="text-red-300 font-semibold text-xs">{noBuyerDeals.length} good deal{noBuyerDeals.length!==1?'s':''} with no buyers — needs review</span></div>
          <div className="flex flex-wrap gap-2">{noBuyerDeals.map((d: any) => (
            <Link key={d.id} href={`/dashboard/deals/${d.id}`} className="flex items-center gap-2 bg-gray-900/60 rounded-lg px-3 py-1.5 hover:bg-gray-800/60 transition text-xs">
              <span className="text-red-400 font-bold">{d.dealPriorityScore}</span><span className="text-white">{d.address}</span><span className="text-gray-500">{d.city}, {d.state}</span><span className="text-red-400">0 buyers</span><ChevronRight size={11} className="text-gray-600" />
            </Link>
          ))}</div>
        </div>
      )}
      {marketGaps.length > 0 && (
        <div className="border border-amber-800/25 rounded-xl overflow-hidden" style={{background:'rgba(120,80,0,0.04)'}}>
          <button onClick={() => setShowGaps(!showGaps)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-900/10 transition">
            <div className="flex items-center gap-2 min-w-0">
              <BarChart3 size={13} className="text-amber-400 shrink-0" />
              <span className="text-amber-300 font-medium text-xs">Buyer Coverage Gaps</span>
              <span className="text-amber-600/80 text-xs hidden sm:inline">— Markets where strong deals need buyers</span>
              {!showGaps && gapSummary && <span className="text-amber-500 text-xs truncate ml-1">{gapSummary} need buyers</span>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-amber-600 bg-amber-900/30 px-2 py-0.5 rounded">{marketGaps.length} markets</span>
              {showGaps ? <ChevronUp size={13} className="text-amber-600" /> : <ChevronDown size={13} className="text-amber-600" />}
            </div>
          </button>
          {showGaps && (
            <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {marketGaps.map((m: any, i: number) => {
                const avgScore = m.deals > 0 ? Math.round(m.totalScore/m.deals) : 0;
                const coverage = m.buyers>=10&&m.tier1>=2?'Strong':m.buyers>=5?'Moderate':m.buyers>=1?'Weak':'Gap';
                const coverageColor = coverage==='Strong'?'text-green-400':coverage==='Moderate'?'text-yellow-400':coverage==='Weak'?'text-orange-400':'text-red-400';
                return (
                  <div key={i} className="bg-gray-900/70 rounded-lg p-3 border border-gray-800/60">
                    <div className="flex items-start justify-between mb-2"><p className="text-white text-xs font-semibold">{m.market}</p><span className={`text-xs font-medium ${coverageColor}`}>{coverage}</span></div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-2">
                      <div><span className="text-gray-600">Deals</span><span className="text-white ml-1">{m.deals}</span></div>
                      <div><span className="text-gray-600">Avg Score</span><span className="text-white ml-1">{avgScore}</span></div>
                      <div><span className="text-gray-600">Buyers</span><span className={`ml-1 ${m.buyers===0?'text-red-400':'text-white'}`}>{m.buyers||'None'}</span></div>
                      <div><span className="text-gray-600">Tier 1</span><span className={`ml-1 ${m.tier1===0?'text-red-400':'text-white'}`}>{m.tier1||'None'}</span></div>
                    </div>
                    {m.need && <p className="text-amber-400/70 text-xs leading-relaxed">{m.need.length>80?m.need.slice(0,80)+'…':m.need}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <AnimatePresence>{showFilters && (
        <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex flex-wrap gap-4">
            <div><label className="text-gray-500 text-xs mb-1 block">Sort By</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700">
                <option value="dealPriorityScore">Priority Score</option><option value="matchedBuyerCount">Buyer Count</option><option value="closingDate">Closing Date</option><option value="createdAt">Newest</option>
              </select></div>
            <div><label className="text-gray-500 text-xs mb-1 block">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700">
                <option value="ALL">All</option><option value="NEEDS_INFO">Needs Info</option><option value="READY_TO_MATCH">Ready to Match</option><option value="MATCHED">Matched</option><option value="READY_TO_BLAST">Ready to Blast</option><option value="CAMPAIGN_ACTIVE">Campaign Active</option>
              </select></div>
          </div>
        </motion.div>
      )}</AnimatePresence>
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <p className="text-gray-400 text-xs">{deals.length} deal{deals.length!==1?'s':''}</p>
          <div className="flex items-center gap-1 text-gray-600 text-xs"><ArrowUpDown size={11} /><span>Priority Score ↓</span></div>
        </div>
        {isLoading ? <div className="p-8 text-center text-gray-500 text-sm">Loading deals...</div>
        : deals.length === 0 ? (
          <div className="p-12 text-center"><Building2 size={28} className="text-gray-700 mx-auto mb-3" /><p className="text-gray-400 font-medium text-sm">No deals yet</p><button onClick={() => setShowAddDeal(true)} className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition">+ Add Deal</button></div>
        ) : (
          <div className="divide-y divide-gray-800/40">
            {deals.map((deal: any, i: number) => {
              const priority = getPriorityBadge(deal.dealPriorityScore||0);
              const blast = getBlastReadiness(deal);
              const age = getAgeLabel(deal);
              const noBuyers = (deal.dealPriorityScore||0) >= 55 && (deal.matchedBuyerCount||0) === 0;
              const srcLabel = deal.dealSource?.reliabilityLabel;
              const srcBadge = srcLabel ? SRC_BADGE[srcLabel] : null;
              const hasPhotos = !!(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length);
              const estimates = [deal.zillowEstimate,deal.realtorEstimate,deal.redfinEstimate,deal.rentcastEstimate].filter((v): v is number => typeof v==='number'&&v>0);
              const avgPublic = estimates.length>0 ? estimates.reduce((a,b)=>a+b,0)/estimates.length : null;
              const seventyPct = avgPublic ? avgPublic*0.7 : null;
              return (
                <motion.div key={deal.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.03}} className="group hover:bg-gray-800/20 transition">
                  <Link href={`/dashboard/deals/${deal.id}`} className="block p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-16 shrink-0 text-center pt-0.5">
                        {priority ? (<><div className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${priority.bg}`}>{priority.label}</div><p className="text-gray-600 text-xs mt-0.5">{deal.dealPriorityScore}</p></>) : (<div className="text-xs px-1.5 py-0.5 rounded-md bg-gray-800 text-gray-600">—</div>)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-white font-semibold text-sm">{deal.address||'No address'}</p>
                          {noBuyers && <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 border border-red-800/40 font-medium">⚠ No Buyers</span>}
                          {age && <span className={`text-xs ${age.color}`}>{age.text}</span>}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <span className="flex items-center gap-1 text-gray-500 text-xs"><MapPin size={9} />{[deal.city,deal.state,deal.zipCode].filter(Boolean).join(', ')}</span>
                          {deal.beds && <span className="text-gray-600 text-xs">{deal.beds}bd/{deal.baths}ba</span>}
                          {deal.sqft && <span className="text-gray-600 text-xs">{deal.sqft?.toLocaleString()}sf</span>}
                          {deal.dealType && <span className="text-indigo-400 text-xs font-medium">{deal.dealType}</span>}
                          {deal.overallCondition && deal.overallCondition!=='UNKNOWN' && <span className="text-gray-600 text-xs">{deal.overallCondition.replace(/_/g,' ')}</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={deal.status||'DRAFT'} />
                          {deal.sourceType && deal.sourceType!=='MANUAL' && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">{deal.sourceType}</span>}
                          {deal.sourceType==='OWN' && <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/30 text-green-400 border border-green-800/40">Own Deal</span>}
                          {srcBadge && <span className={`text-xs px-1.5 py-0.5 rounded border ${srcBadge.cls}`}>{srcBadge.label}</span>}
                          {hasPhotos ? <span className="text-xs text-green-500 flex items-center gap-0.5"><Camera size={10} /> Photos</span> : <span className="text-xs text-amber-600 flex items-center gap-0.5"><Camera size={10} /> No Photos</span>}
                          <span className={`text-xs font-medium ${blast.color}`}>{blast.label}</span>
                        </div>
                      </div>
                      <div className="hidden md:flex items-start gap-4 shrink-0">
                        <div className="text-right"><p className="text-white text-sm font-medium">{deal.askingPrice?formatCurrency(deal.askingPrice):'—'}</p><p className="text-gray-600 text-xs">ask</p></div>
                        <div className="text-right w-20">{avgPublic ? (<><p className="text-blue-300 text-sm font-medium">{formatCurrency(avgPublic)}</p><p className="text-gray-600 text-xs">avg public</p></>) : <Link href={`/dashboard/deals/${deal.id}`} onClick={e=>e.stopPropagation()} className="text-gray-700 text-xs hover:text-blue-400 transition">+ Add values</Link>}</div>
                        <div className="text-right w-16">{seventyPct ? (<><p className={`text-sm font-medium ${deal.askingPrice&&deal.askingPrice<=seventyPct?'text-green-400':'text-amber-400'}`}>{formatCurrency(seventyPct)}</p><p className="text-gray-600 text-xs">70% avg</p></>) : <span className="text-gray-700 text-xs">—</span>}</div>
                        <div className="text-right w-12"><p className={`text-sm font-bold ${(deal.matchedBuyerCount||0)>0?'text-purple-400':'text-gray-700'}`}>{deal.matchedBuyerCount||'—'}</p><p className="text-gray-600 text-xs">buyers</p></div>
                        <div className="text-right w-32">{deal.nextBestAction && <p className="text-blue-400 text-xs leading-tight">{deal.nextBestAction}</p>}</div>
                      </div>
                      <ChevronRight size={14} className="text-gray-700 group-hover:text-gray-400 transition shrink-0 mt-1" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <AnimatePresence>{showAddDeal && <AddDealModal onClose={() => setShowAddDeal(false)} onSuccess={() => { setShowAddDeal(false); refetch(); }} />}</AnimatePresence>
    </div>
  );
}
