'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, Zap, AlertCircle, Plus, Filter,
  ArrowUpDown, ChevronRight, MapPin, RefreshCw, Target,
  BarChart3, ChevronDown, ChevronUp, Shield, Camera,
  ExternalLink, Info, ArrowRight
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import Link from 'next/link';
import AddDealModal from '@/components/deal/AddDealModal';

const STATUS_COLORS: Record<string,string> = {
  DRAFT:'bg-gray-700 text-gray-400', NEEDS_INFO:'bg-amber-900/50 text-amber-300',
  READY_TO_MATCH:'bg-blue-900/50 text-blue-300', MATCHED:'bg-purple-900/50 text-purple-300',
  READY_TO_BLAST:'bg-green-900/50 text-green-300', CAMPAIGN_ACTIVE:'bg-emerald-900/50 text-emerald-400',
  OFFER_RECEIVED:'bg-orange-900/50 text-orange-300', ACTIVE:'bg-blue-900/50 text-blue-300',
  CLOSED:'bg-gray-700 text-gray-400', DEAD:'bg-red-900/40 text-red-500',
};
const STATUS_TIPS: Record<string,string> = {
  DRAFT:'Saved but not reviewed.', NEEDS_INFO:'Missing key details before matching.',
  READY_TO_MATCH:'Has enough info — ready to run buyer matching.',
  MATCHED:'Buyer match ran, buyers found.',
  READY_TO_BLAST:'Buyers matched + all blast requirements met.',
  CAMPAIGN_ACTIVE:'Blast is live.', OFFER_RECEIVED:'A buyer submitted an offer.',
};
const SRC_BADGE: Record<string,{label:string;cls:string}> = {
  NEW_SOURCE:     {label:'New Source',     cls:'bg-blue-900/40 text-blue-300 border-blue-700/40'},
  TRUSTED_SOURCE: {label:'Trusted ✓',     cls:'bg-green-900/40 text-green-300 border-green-700/40'},
  GOOD_SOURCE:    {label:'Good',           cls:'bg-green-900/30 text-green-400 border-green-800/40'},
  SLOW_RESPONSE:  {label:'Slow Response',  cls:'bg-amber-900/40 text-amber-300 border-amber-700/40'},
  BAD_INFO_BEFORE:{label:'Bad Info Before',cls:'bg-orange-900/40 text-orange-300 border-orange-700/40'},
  LOW_QUALITY:    {label:'Low Quality',    cls:'bg-red-900/40 text-red-300 border-red-700/40'},
  CLOSED_BEFORE:  {label:'Closed Before ✓',cls:'bg-purple-900/40 text-purple-300 border-purple-700/40'},
  BLACKLIST:      {label:'Blacklist',      cls:'bg-red-900/60 text-red-200 border-red-600'},
};

function getPriorityBadge(score: number) {
  if (score >= 90) return {label:'🔥 Hot',   bg:'bg-red-900/70 text-red-300 border border-red-700/60'};
  if (score >= 75) return {label:'Strong',   bg:'bg-orange-900/70 text-orange-300 border border-orange-700/60'};
  if (score >= 60) return {label:'Workable', bg:'bg-yellow-900/60 text-yellow-300 border border-yellow-700/50'};
  if (score >= 40) return {label:'Needs Info',bg:'bg-blue-900/60 text-blue-300 border border-blue-700/50'};
  if (score > 0)   return {label:'Weak',     bg:'bg-gray-800 text-gray-500 border border-gray-700'};
  return null;
}

function getBlastReadiness(deal: any) {
  const checks = [
    {name:'Photos',           pts:20, ok:!!(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length)},
    {name:'Access info',      pts:15, ok:!!deal.accessInfo},
    {name:'Description',      pts:10, ok:!!deal.description},
    {name:'Asking price',     pts:15, ok:!!deal.askingPrice},
    {name:'Public estimate',  pts:15, ok:!!(deal.zillowEstimate||deal.realtorEstimate||deal.redfinEstimate||deal.rentcastEstimate||deal.arv)},
    {name:'Source confirmed', pts:10, ok:!!(deal.sourceName||deal.sourceType==='OWN')},
    {name:'Permission to market',pts:5,ok:deal.sourceType==='OWN'||!!(deal.dealSource?.permissionToMarket)},
    {name:'Buyer matches',    pts:10, ok:(deal.matchedBuyerCount||0)>0},
  ];
  const total = checks.reduce((s,c)=>s+c.pts,0);
  const earned = checks.filter(c=>c.ok).reduce((s,c)=>s+c.pts,0);
  const pct = Math.round((earned/total)*100);
  const missing = checks.filter(c=>!c.ok).map(c=>c.name);
  const color = pct>=85?'text-green-400':pct>=60?'text-amber-400':pct>=40?'text-orange-400':'text-red-400';
  const label = pct>=85?`${pct}% Ready`:missing[0]?`${pct}% — needs ${missing[0]}`:`${pct}%`;
  return {pct,label,color,missing};
}

function getAgeLabel(deal: any): {text:string;color:string}|null {
  const now = Date.now();
  if (deal.closingDate) {
    const d = Math.ceil((new Date(deal.closingDate).getTime()-now)/86400000);
    if (d<=0) return {text:'COE passed',color:'text-red-400'};
    if (d<=3) return {text:`COE in ${d}d`,color:'text-red-400'};
    if (d<=7) return {text:`COE in ${d}d`,color:'text-amber-400'};
  }
  const age = Math.floor((now-new Date(deal.createdAt).getTime())/86400000);
  if (age===0) return {text:'Added today',color:'text-green-400'};
  if (age>=14) return {text:`Stale ${age}d`,color:'text-amber-500'};
  if (age>=7)  return {text:`${age}d old`,color:'text-gray-500'};
  return null;
}

function getSourceLabel(sourceType: string, reliabilityLabel?: string): {combined:string;cls:string} {
  if (sourceType==='OWN') return {combined:'Own Deal',cls:'bg-green-900/30 text-green-400 border-green-800/40'};
  const typeMap: Record<string,string> = {JV:'JV',FACEBOOK:'Facebook',SMS:'SMS',BIRD_DOG:'Bird Dog',WHOLESALER:'Wholesaler',AGENT:'Agent',MANUAL:'Manual'};
  const typeName = typeMap[sourceType] || sourceType;
  if (!reliabilityLabel) return {combined:typeName,cls:'bg-gray-800 text-gray-400 border-gray-700'};
  const rel = SRC_BADGE[reliabilityLabel];
  if (!rel) return {combined:typeName,cls:'bg-gray-800 text-gray-400 border-gray-700'};
  return {combined:`${typeName} · ${rel.label}`,cls:rel.cls};
}

function getNextActionButton(action: string): {label:string;color:string} {
  if (!action) return {label:'Review deal',color:'text-gray-400 bg-gray-800 hover:bg-gray-700'};
  if (action.toLowerCase().includes('blast'))    return {label:'Generate blast',color:'text-green-300 bg-green-900/40 hover:bg-green-900/60 border border-green-700/40'};
  if (action.toLowerCase().includes('match'))    return {label:'Run buyer match',color:'text-blue-300 bg-blue-900/40 hover:bg-blue-900/60 border border-blue-700/40'};
  if (action.toLowerCase().includes('photo'))    return {label:'Request photos',color:'text-amber-300 bg-amber-900/40 hover:bg-amber-900/60 border border-amber-700/40'};
  if (action.toLowerCase().includes('public') || action.toLowerCase().includes('estimate')) return {label:'Add public values',color:'text-blue-300 bg-blue-900/40 hover:bg-blue-900/60 border border-blue-700/40'};
  if (action.toLowerCase().includes('follow'))   return {label:'Send follow-up',color:'text-amber-300 bg-amber-900/40 hover:bg-amber-900/60 border border-amber-700/40'};
  if (action.toLowerCase().includes('permission')||action.toLowerCase().includes('jv')) return {label:'Confirm JV permission',color:'text-purple-300 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-700/40'};
  if (action.toLowerCase().includes('find buyer')) return {label:'Find buyers',color:'text-orange-300 bg-orange-900/40 hover:bg-orange-900/60 border border-orange-700/40'};
  if (action.toLowerCase().includes('missing'))  return {label:'Complete info',color:'text-amber-300 bg-amber-900/40 hover:bg-amber-900/60 border border-amber-700/40'};
  return {label:action.slice(0,22),color:'text-gray-300 bg-gray-800 hover:bg-gray-700'};
}

// Score tooltip component
function ScoreTooltip({deal, priority}: {deal:any; priority:any}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const blast = getBlastReadiness(deal);
  const srcScore = deal.dealSource?.reliabilityScore;
  const hasPublic = !!(deal.zillowEstimate||deal.realtorEstimate||deal.redfinEstimate||deal.rentcastEstimate);

  const breakdown = [
    {label:'Data completeness',  val:deal.dataCompletenessScore||0,  max:100, color:'text-blue-400'},
    {label:'Blast readiness',    val:blast.pct,                       max:100, color:'text-green-400'},
    {label:'Buyer demand',       val:deal.buyerDemandScore||0,        max:100, color:'text-purple-400'},
    {label:'Source reliability', val:deal.sourceType==='OWN'?85:srcScore||50, max:100, color:'text-amber-400'},
    {label:'Price/value conf.', val:hasPublic?80:deal.arv?70:30,      max:100, color:'text-teal-400'},
  ];
  const penalties = [
    !(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length) && '−pts: No photos',
    !deal.closingDate && deal.sourceType!=='OWN' && '−pts: No closing date',
    (deal.matchedBuyerCount||0)===0 && '−pts: No buyer matches',
    deal.sourceType==='FACEBOOK' && !deal.dealSource && '−pts: Unverified source',
  ].filter(Boolean);

  return (
    <div ref={ref} className="relative" onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <div className="cursor-help">
        {priority ? (
          <><div className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${priority.bg}`}>{priority.label}</div>
          <p className="text-gray-600 text-xs mt-0.5 flex items-center gap-0.5 justify-center">{deal.dealPriorityScore}<Info size={8} className="text-gray-700"/></p></>
        ) : (
          <div className="text-xs px-1.5 py-0.5 rounded-md bg-gray-800 text-gray-600">—</div>
        )}
      </div>
      {show && deal.dealPriorityScore > 0 && (
        <div className="absolute left-full top-0 ml-2 z-50 w-56 bg-gray-800 border border-gray-600 rounded-xl p-3 shadow-2xl pointer-events-none">
          <p className="text-white text-xs font-semibold mb-2">Score Breakdown</p>
          <div className="space-y-1.5 mb-2">
            {breakdown.map(b=>(
              <div key={b.label} className="flex items-center justify-between gap-2">
                <span className="text-gray-400 text-xs">{b.label}</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-current rounded-full" style={{width:`${b.val}%`}} />
                  </div>
                  <span className={`text-xs font-medium ${b.color} w-6 text-right`}>{b.val}</span>
                </div>
              </div>
            ))}
          </div>
          {penalties.length > 0 && (
            <div className="border-t border-gray-700 pt-2 space-y-0.5">
              {penalties.map((p,i)=><p key={i} className="text-red-400 text-xs">{p as string}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({status}: {status:string}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <span className={`text-xs px-2 py-0.5 rounded-full cursor-default whitespace-nowrap ${STATUS_COLORS[status]||'bg-gray-800 text-gray-400'}`}>{(status||'DRAFT').replace(/_/g,' ')}</span>
      {show && STATUS_TIPS[status] && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-48 bg-gray-800 border border-gray-600 rounded-lg p-2.5 shadow-xl pointer-events-none">
          <p className="text-gray-200 text-xs leading-relaxed">{STATUS_TIPS[status]}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"/>
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

  const {data:dealsData, isLoading, refetch} = useQuery({
    queryKey:['deals',sortBy,filterStatus],
    queryFn:()=>api.get(`/deals?page=1&limit=50&sort=${sortBy}${filterStatus!=='ALL'?'&status='+filterStatus:''}`).then(r=>r.data),
  });
  const deals = dealsData?.data || [];

  const stats = useMemo(()=>{
    const active = deals.filter((d:any)=>!['DEAD','CLOSED','DRAFT'].includes(d.status));
    return {
      total:active.length,
      readyToMatch:deals.filter((d:any)=>d.status==='READY_TO_MATCH').length,
      readyToBlast:deals.filter((d:any)=>d.status==='READY_TO_BLAST').length,
      trustedDeals:deals.filter((d:any)=>d.sourceType==='OWN'||['TRUSTED_SOURCE','GOOD_SOURCE','CLOSED_BEFORE'].includes(d.dealSource?.reliabilityLabel)).length,
      highDemand:deals.filter((d:any)=>(d.matchedBuyerCount||0)>=5).length,
      needsInfo:deals.filter((d:any)=>(d.missingInfoCount||0)>2).length,
    };
  },[deals]);

  const marketGaps = useMemo(()=>{
    const map:Record<string,any>={};
    for (const d of deals) {
      if (!d.dealPriorityScore||d.dealPriorityScore<40) continue;
      const key = d.marketKey||`${d.city||'Unknown'}, ${d.state||''}`;
      if (!map[key]) map[key]={market:key,deals:0,totalScore:0,buyers:0,tier1:0,gapScore:0,need:''};
      map[key].deals++; map[key].totalScore+=d.dealPriorityScore||0;
      map[key].buyers=Math.max(map[key].buyers,d.matchedBuyerCount||0);
      map[key].tier1=Math.max(map[key].tier1,d.tier1MatchCount||0);
      map[key].gapScore=Math.max(map[key].gapScore,d.buyerGapScore||0);
      if (d.marketBuyerNeedRecommendation) map[key].need=d.marketBuyerNeedRecommendation;
    }
    return Object.values(map).sort((a:any,b:any)=>b.gapScore-a.gapScore).slice(0,6);
  },[deals]);

  // Build compact gap summary for collapsed bar
  const gapMarkets = marketGaps.filter((m:any)=>m.buyers===0);
  const gapCount = gapMarkets.length;
  // Short need descriptions
  function shortNeed(need:string): string {
    if (!need) return 'buyers needed';
    if (need.toLowerCase().includes('cash')) return 'cash buyers / landlords needed';
    if (need.toLowerCase().includes('section 8')||need.toLowerCase().includes('heavy')) return 'Section 8 / heavy rehab buyers needed';
    if (need.toLowerCase().includes('subto')||need.toLowerCase().includes('creative')) return 'Subto / creative finance buyers needed';
    if (need.toLowerCase().includes('flip')) return 'fix & flip buyers needed';
    return need.slice(0,50)+'…';
  }

  const noBuyerDeals = deals.filter((d:any)=>(d.dealPriorityScore||0)>=55&&(d.matchedBuyerCount||0)===0);

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Deals</h1>
          <p className="text-gray-500 text-xs mt-0.5">Sorted by Deal Priority Score — best opportunities first</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>refetch()} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition"><RefreshCw size={14}/></button>
          <button onClick={()=>setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${showFilters?'bg-blue-600 text-white':'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}><Filter size={12}/> Filters</button>
          <button onClick={()=>setShowAddDeal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg font-medium transition"><Plus size={14}/> Add Deal</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
        {[
          {label:'Active',     value:stats.total,              icon:Building2, color:'text-white'},
          {label:'Ready Match',value:stats.readyToMatch||'—',  icon:Target,    color:'text-blue-400'},
          {label:'Ready Blast',value:stats.readyToBlast||'—',  icon:Zap,       color:'text-green-400'},
          {label:'Trusted Src',value:stats.trustedDeals||'—',  icon:Shield,    color:'text-purple-400'},
          {label:'Has Buyers', value:stats.highDemand||'—',    icon:Users,     color:'text-orange-400'},
          {label:'Needs Info', value:stats.needsInfo||'—',     icon:AlertCircle,color:'text-amber-400'},
        ].map(s=>(
          <div key={s.label} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <s.icon size={13} className={`${s.color} mb-1.5`}/>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Buyer Gap Opportunity — amber, not red */}
      {noBuyerDeals.length > 0 && (
        <div className="bg-amber-900/10 border border-amber-800/35 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Target size={13} className="text-amber-400 shrink-0"/>
            <span className="text-amber-300 font-semibold text-xs">Buyer Gap Detected</span>
            <span className="text-gray-500 text-xs">— {noBuyerDeals.length} strong deal{noBuyerDeals.length!==1?'s':''} with no matched buyers. Find buyers, JV it out, or use outside marketing.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {noBuyerDeals.map((d:any)=>(
              <Link key={d.id} href={`/dashboard/deals/${d.id}`} className="flex items-center gap-2 bg-gray-900/60 rounded-lg px-3 py-1.5 hover:bg-gray-800/60 transition text-xs border border-gray-800">
                <span className="text-amber-400 font-bold">{d.dealPriorityScore}</span>
                <span className="text-white">{d.address}</span>
                <span className="text-gray-500">{d.city}, {d.state}</span>
                <ArrowRight size={11} className="text-gray-600"/>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Buyer Coverage Gaps — collapsible with better summary */}
      {marketGaps.length > 0 && (
        <div className="border border-amber-800/25 rounded-xl overflow-hidden" style={{background:'rgba(120,80,0,0.04)'}}>
          <button onClick={()=>setShowGaps(!showGaps)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-900/10 transition">
            <div className="flex items-start gap-2 min-w-0 flex-col sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <BarChart3 size={13} className="text-amber-400"/>
                <span className="text-amber-300 font-medium text-xs">
                  Buyer Coverage Gaps: {gapCount > 0 ? `${gapCount} market${gapCount!==1?'s':''} need buyers` : `${marketGaps.length} markets tracked`}
                </span>
              </div>
              {!showGaps && gapMarkets.length > 0 && (
                <div className="flex flex-wrap gap-2 ml-0 sm:ml-1">
                  {gapMarkets.slice(0,3).map((m:any,i:number)=>(
                    <span key={i} className="text-amber-600/80 text-xs">
                      {m.market.split(',')[0]}: {shortNeed(m.need)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-xs text-amber-600 bg-amber-900/30 px-2 py-0.5 rounded">{marketGaps.length}</span>
              {showGaps ? <ChevronUp size={13} className="text-amber-600"/> : <ChevronDown size={13} className="text-amber-600"/>}
            </div>
          </button>
          {showGaps && (
            <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {marketGaps.map((m:any,i:number)=>{
                const avgScore = m.deals>0?Math.round(m.totalScore/m.deals):0;
                const coverage = m.buyers>=10&&m.tier1>=2?'Strong':m.buyers>=5?'Moderate':m.buyers>=1?'Weak':'Gap';
                const cc = coverage==='Strong'?'text-green-400':coverage==='Moderate'?'text-yellow-400':coverage==='Weak'?'text-orange-400':'text-red-400';
                return (
                  <div key={i} className="bg-gray-900/70 rounded-lg p-3 border border-gray-800/60">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-white text-xs font-semibold">{m.market}</p>
                      <span className={`text-xs font-medium ${cc}`}>{coverage}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-2">
                      <div><span className="text-gray-600">Deals</span><span className="text-white ml-1">{m.deals}</span></div>
                      <div><span className="text-gray-600">Avg Score</span><span className="text-white ml-1">{avgScore}</span></div>
                      <div><span className="text-gray-600">Buyers</span><span className={`ml-1 ${m.buyers===0?'text-red-400':'text-white'}`}>{m.buyers||'None'}</span></div>
                      <div><span className="text-gray-600">Tier 1</span><span className={`ml-1 ${m.tier1===0?'text-red-400':'text-white'}`}>{m.tier1||'None'}</span></div>
                    </div>
                    {m.need && <p className="text-amber-400/70 text-xs leading-relaxed">{shortNeed(m.need)}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex flex-wrap gap-4">
              <div><label className="text-gray-500 text-xs mb-1 block">Sort By</label>
                <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700">
                  <option value="dealPriorityScore">Priority Score</option>
                  <option value="matchedBuyerCount">Buyer Count</option>
                  <option value="closingDate">Closing Date</option>
                  <option value="createdAt">Newest</option>
                </select>
              </div>
              <div><label className="text-gray-500 text-xs mb-1 block">Status</label>
                <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700">
                  <option value="ALL">All</option>
                  <option value="NEEDS_INFO">Needs Info</option>
                  <option value="READY_TO_MATCH">Ready to Match</option>
                  <option value="MATCHED">Matched</option>
                  <option value="READY_TO_BLAST">Ready to Blast</option>
                  <option value="CAMPAIGN_ACTIVE">Campaign Active</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deal Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <p className="text-gray-400 text-xs">{deals.length} deal{deals.length!==1?'s':''}</p>
          <div className="flex items-center gap-1 text-gray-600 text-xs"><ArrowUpDown size={11}/><span>Priority Score ↓</span></div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading deals...</div>
        ) : deals.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 size={28} className="text-gray-700 mx-auto mb-3"/>
            <p className="text-gray-400 font-medium text-sm">No deals yet</p>
            <button onClick={()=>setShowAddDeal(true)} className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition">+ Add Deal</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/40">
            {deals.map((deal:any, i:number)=>{
              const priority = getPriorityBadge(deal.dealPriorityScore||0);
              const blast = getBlastReadiness(deal);
              const age = getAgeLabel(deal);
              const noBuyers = (deal.dealPriorityScore||0)>=55&&(deal.matchedBuyerCount||0)===0;
              const src = getSourceLabel(deal.sourceType||'MANUAL', deal.dealSource?.reliabilityLabel);
              const hasPhotos = !!(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length);
              const estimates = [deal.zillowEstimate,deal.realtorEstimate,deal.redfinEstimate,deal.rentcastEstimate].filter((v):v is number=>typeof v==='number'&&v>0);
              const avgPublic = estimates.length>0?estimates.reduce((a,b)=>a+b,0)/estimates.length:null;
              const seventyPct = avgPublic?avgPublic*0.7:null;
              const actionBtn = getNextActionButton(deal.nextBestAction||'');

              return (
                <motion.div key={deal.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.03}}
                  className="group hover:bg-gray-800/20 transition">
                  <div className="flex items-start gap-3 p-4">

                    {/* Score + tooltip */}
                    <div className="w-16 shrink-0 text-center pt-0.5">
                      <ScoreTooltip deal={deal} priority={priority}/>
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/dashboard/deals/${deal.id}`} className="block">
                        {/* Address line */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-white font-semibold text-sm hover:text-blue-300 transition">{deal.address||'No address'}</p>
                          {noBuyers && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-800/40 font-medium">Buyer Gap</span>}
                          {age && <span className={`text-xs ${age.color}`}>{age.text}</span>}
                        </div>

                        {/* Location + property */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="flex items-center gap-1 text-gray-500 text-xs"><MapPin size={9}/>{[deal.city,deal.state,deal.zipCode].filter(Boolean).join(', ')}</span>
                          {deal.beds && <span className="text-gray-600 text-xs">{deal.beds}bd/{deal.baths}ba</span>}
                          {deal.sqft && <span className="text-gray-600 text-xs">{deal.sqft?.toLocaleString()}sf</span>}
                          {deal.dealType && <span className="text-indigo-400 text-xs font-medium">{deal.dealType}</span>}
                          {deal.overallCondition&&deal.overallCondition!=='UNKNOWN'&&<span className="text-gray-600 text-xs">{deal.overallCondition.replace(/_/g,' ')}</span>}
                        </div>

                        {/* Status + source + photos + readiness */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={deal.status||'DRAFT'}/>
                          {/* Combined source badge */}
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${src.cls}`}>{src.combined}</span>
                          {/* Photos */}
                          {hasPhotos
                            ? <span className="text-xs text-green-500 flex items-center gap-0.5"><Camera size={9}/> Photos</span>
                            : <span className="text-xs text-amber-600 flex items-center gap-0.5"><Camera size={9}/> No Photos</span>
                          }
                          {/* Blast readiness */}
                          <span className={`text-xs font-medium ${blast.color}`}>{blast.label}</span>
                        </div>
                      </Link>
                    </div>

                    {/* Right metrics */}
                    <div className="hidden md:flex items-start gap-3 shrink-0">
                      {/* Asking */}
                      <div className="text-right">
                        <p className="text-white text-sm font-medium">{deal.askingPrice?formatCurrency(deal.askingPrice):'—'}</p>
                        <p className="text-gray-600 text-xs">ask</p>
                      </div>
                      {/* Public value */}
                      <div className="text-right w-20">
                        {avgPublic ? (
                          <><p className="text-blue-300 text-sm font-medium">{formatCurrency(avgPublic)}</p><p className="text-gray-600 text-xs">avg public</p></>
                        ) : (
                          <Link href={`/dashboard/deals/${deal.id}`} className="text-gray-600 text-xs hover:text-blue-400 transition leading-tight block">Add Zillow/<br/>Redfin</Link>
                        )}
                      </div>
                      {/* 70% */}
                      <div className="text-right w-16">
                        {seventyPct ? (
                          <><p className={`text-sm font-medium ${deal.askingPrice&&deal.askingPrice<=seventyPct?'text-green-400':'text-amber-400'}`}>{formatCurrency(seventyPct)}</p><p className="text-gray-600 text-xs">70% avg</p></>
                        ) : <span className="text-gray-700 text-xs">—</span>}
                      </div>
                      {/* Buyers */}
                      <div className="text-right w-12">
                        <p className={`text-sm font-bold ${(deal.matchedBuyerCount||0)>0?'text-purple-400':'text-gray-700'}`}>{deal.matchedBuyerCount||'—'}</p>
                        <p className="text-gray-600 text-xs">buyers</p>
                      </div>
                      {/* Next action button */}
                      <div className="w-36">
                        <Link href={`/dashboard/deals/${deal.id}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${actionBtn.color}`}>
                          {actionBtn.label} <ArrowRight size={10}/>
                        </Link>
                      </div>
                    </div>

                    <ChevronRight size={14} className="text-gray-700 group-hover:text-gray-400 transition shrink-0 mt-1 hidden md:block"/>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddDeal && <AddDealModal onClose={()=>setShowAddDeal(false)} onSuccess={()=>{setShowAddDeal(false);refetch();}}/>}
      </AnimatePresence>
    </div>
  );
}
