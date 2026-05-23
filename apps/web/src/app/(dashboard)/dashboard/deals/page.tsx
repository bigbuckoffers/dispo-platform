'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, Zap, AlertCircle, Plus, Filter,
  ChevronRight, MapPin, RefreshCw, Target, BarChart3,
  ChevronDown, ChevronUp, Shield, Camera, ArrowRight
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import Link from 'next/link';
import AddDealModal from '@/components/deal/AddDealModal';

// ── constants ────────────────────────────────────────────────────

const STATUS_COLORS: Record<string,string> = {
  DRAFT:'bg-gray-700 text-gray-400', NEEDS_INFO:'bg-amber-900/50 text-amber-300',
  READY_TO_MATCH:'bg-blue-900/50 text-blue-300', MATCHED:'bg-purple-900/50 text-purple-300',
  READY_TO_BLAST:'bg-green-900/50 text-green-300', CAMPAIGN_ACTIVE:'bg-emerald-900/50 text-emerald-400',
  OFFER_RECEIVED:'bg-orange-900/50 text-orange-300', ACTIVE:'bg-blue-900/50 text-blue-300',
  CLOSED:'bg-gray-700 text-gray-400', DEAD:'bg-red-900/40 text-red-500',
};
const STATUS_TIPS: Record<string,string> = {
  DRAFT:'Saved but not reviewed.',
  NEEDS_INFO:'Missing key details before matching.',
  READY_TO_MATCH:'Ready to run buyer matching.',
  MATCHED:'Buyer match ran — buyers found.',
  READY_TO_BLAST:'Buyers matched + all blast requirements met.',
  CAMPAIGN_ACTIVE:'Blast is live.',
  OFFER_RECEIVED:'A buyer submitted an offer.',
};
const SRC_RELIABILITY: Record<string,{label:string;color:string}> = {
  NEW_SOURCE:     {label:'New Source',      color:'text-blue-400'},
  TRUSTED_SOURCE: {label:'Trusted',         color:'text-green-400'},
  GOOD_SOURCE:    {label:'Good',            color:'text-green-400'},
  SLOW_RESPONSE:  {label:'Slow Response',   color:'text-amber-400'},
  BAD_INFO_BEFORE:{label:'Bad Info Before', color:'text-orange-400'},
  LOW_QUALITY:    {label:'Low Quality',     color:'text-red-400'},
  CLOSED_BEFORE:  {label:'Closed Before',   color:'text-purple-400'},
  BLACKLIST:      {label:'Blacklist',       color:'text-red-500'},
};

// ── helpers ──────────────────────────────────────────────────────

function getScoreTier(score: number): {label:string;color:string;bg:string;hot:boolean} {
  if (score >= 85) return {label:'🔥 Hot',    color:'text-red-200',    bg:'bg-red-900/70 border-red-600/70',    hot:true};
  if (score >= 75) return {label:'Strong',     color:'text-orange-200', bg:'bg-orange-900/60 border-orange-700/60', hot:false};
  if (score >= 60) return {label:'Workable',   color:'text-yellow-200', bg:'bg-yellow-900/50 border-yellow-700/50', hot:false};
  if (score >= 40) return {label:'Needs Info', color:'text-blue-300',   bg:'bg-blue-900/50 border-blue-700/50',  hot:false};
  return              {label:'Weak',           color:'text-gray-400',   bg:'bg-gray-800 border-gray-700',        hot:false};
}

function getBlastReadiness(deal: any) {
  const checks = [
    {name:'Photos',               pts:20, ok:!!(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length)},
    {name:'Access info',          pts:15, ok:!!deal.accessInfo},
    {name:'Description',          pts:10, ok:!!deal.description},
    {name:'Asking price',         pts:15, ok:!!deal.askingPrice},
    {name:'Public estimate',      pts:15, ok:!!(deal.zillowEstimate||deal.realtorEstimate||deal.redfinEstimate||deal.rentcastEstimate||deal.arv)},
    {name:'Source confirmed',     pts:10, ok:!!(deal.sourceName||deal.sourceType==='OWN')},
    {name:'Permission to market', pts:5,  ok:deal.sourceType==='OWN'||!!(deal.dealSource?.permissionToMarket)},
    {name:'Buyer matches',        pts:10, ok:(deal.matchedBuyerCount||0)>0},
  ];
  const total = checks.reduce((s,c)=>s+c.pts,0);
  const earned = checks.filter(c=>c.ok).reduce((s,c)=>s+c.pts,0);
  const pct = Math.round((earned/total)*100);
  const missing = checks.filter(c=>!c.ok).map(c=>c.name);
  const barColor = pct>=85?'bg-green-500':pct>=65?'bg-amber-500':pct>=45?'bg-orange-500':'bg-red-500';
  const textColor = pct>=85?'text-green-400':pct>=65?'text-amber-400':pct>=45?'text-orange-400':'text-red-400';
  return {pct, missing, barColor, textColor, topMissing: missing[0]||null};
}

function getSourceLabel(sourceType: string, reliabilityLabel?: string): {line1:string;line2:string|null;reliabilityColor:string} {
  if (sourceType==='OWN') return {line1:'Own Deal', line2:null, reliabilityColor:'text-green-400'};
  const typeMap: Record<string,string> = {JV:'JV',FACEBOOK:'Facebook',SMS:'SMS',BIRD_DOG:'Bird Dog',WHOLESALER:'Wholesaler',AGENT:'Agent',MANUAL:'Manual'};
  const typeName = typeMap[sourceType]||sourceType;
  if (!reliabilityLabel) return {line1:typeName, line2:'Unknown Source', reliabilityColor:'text-gray-500'};
  const rel = SRC_RELIABILITY[reliabilityLabel];
  return {line1:typeName, line2:rel?.label||'Unknown', reliabilityColor:rel?.color||'text-gray-500'};
}

function getBuyerDemand(deal: any): {label:string;color:string;bg:string} {
  const b = deal.matchedBuyerCount||0;
  if (b>=15) return {label:'Strong coverage',  color:'text-green-300',  bg:'bg-green-900/30'};
  if (b>=8)  return {label:'Moderate coverage',color:'text-blue-300',   bg:'bg-blue-900/30'};
  if (b>=3)  return {label:'Some interest',    color:'text-amber-300',  bg:'bg-amber-900/30'};
  if (b>=1)  return {label:'Weak coverage',    color:'text-orange-300', bg:'bg-orange-900/30'};
  return          {label:'Buyer gap',           color:'text-red-400',    bg:'bg-red-900/20'};
}

function getActionButton(deal: any, score: number): {label:string;cls:string} {
  const action = deal.nextBestAction||'';
  const buyers = deal.matchedBuyerCount||0;
  if (score>=75 && buyers>=3) return {label:'Review Deal', cls:'bg-blue-600 hover:bg-blue-500 text-white'};
  if (deal.status==='READY_TO_BLAST'||action.toLowerCase().includes('blast')) return {label:'Generate blast', cls:'bg-green-800/80 hover:bg-green-700 text-green-200 border border-green-700/50'};
  if (buyers===0||action.toLowerCase().includes('match')) return {label:'Run buyer match', cls:'bg-blue-900/60 hover:bg-blue-900/80 text-blue-200 border border-blue-700/40'};
  if (action.toLowerCase().includes('photo')) return {label:'Request photos', cls:'bg-amber-900/60 hover:bg-amber-900/80 text-amber-200 border border-amber-700/40'};
  if (action.toLowerCase().includes('public')||action.toLowerCase().includes('zillow')) return {label:'Add public values', cls:'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600'};
  if (action.toLowerCase().includes('follow')) return {label:'Send follow-up', cls:'bg-amber-900/60 hover:bg-amber-900/80 text-amber-200 border border-amber-700/40'};
  if (action.toLowerCase().includes('permission')||action.toLowerCase().includes('jv')) return {label:'Confirm JV', cls:'bg-purple-900/60 hover:bg-purple-900/80 text-purple-200 border border-purple-700/40'};
  return {label:'Review deal', cls:'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600'};
}

function getOpportunityRead(deal: any): string {
  const buyers = deal.matchedBuyerCount||0;
  const tier1 = deal.tier1MatchCount||0;
  const hasPhotos = !!(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length);
  const blast = getBlastReadiness(deal);

  if (buyers>=10 && blast.pct>=75) return `${buyers} buyers matched${tier1>0?`, ${tier1} Tier 1`:''}. Blast ready.`;
  if (buyers>=5 && !hasPhotos) return `${buyers} buyers matched. Get photos to finish.`;
  if (buyers>=5) return `${buyers} buyers matched${tier1>0?`, ${tier1} Tier 1`:''}. ${blast.pct}% ready.`;
  if (buyers===0 && (deal.dealPriorityScore||0)>=60) return `Good deal but no matched buyers yet — buyer gap in ${deal.city||'this market'}.`;
  if (!hasPhotos && (deal.dealPriorityScore||0)>=55) return `Needs photos and public values before marketing.`;
  if (blast.topMissing) return `Missing: ${blast.missing.slice(0,3).join(', ')}.`;
  return `Score ${deal.dealPriorityScore||0}. ${deal.missingInfoCount||0} fields missing.`;
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
  return null;
}

function shortNeed(need: string): string {
  if (!need) return 'buyers needed';
  const l = need.toLowerCase();
  if (l.includes('cash')&&l.includes('landlord')) return 'cash buyers / landlords';
  if (l.includes('section 8')||l.includes('heavy rehab')) return 'Section 8 / heavy rehab buyers';
  if (l.includes('subto')) return 'Subto buyers';
  if (l.includes('flip')) return 'fix & flip buyers';
  if (l.includes('cash')) return 'cash buyers';
  return need.slice(0,45)+(need.length>45?'…':'');
}

function StatusBadge({status}: {status:string}) {
  const [show,setShow]=useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <span className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap cursor-default ${STATUS_COLORS[status]||'bg-gray-800 text-gray-400'}`}>{(status||'DRAFT').replace(/_/g,' ')}</span>
      {show&&STATUS_TIPS[status]&&(
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-44 bg-gray-800 border border-gray-600 rounded-lg p-2 shadow-xl pointer-events-none">
          <p className="text-gray-200 text-xs">{STATUS_TIPS[status]}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"/>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────

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

  const stats = useMemo(()=>({
    total:   deals.filter((d:any)=>!['DEAD','CLOSED','DRAFT'].includes(d.status)).length,
    match:   deals.filter((d:any)=>d.status==='READY_TO_MATCH').length,
    blast:   deals.filter((d:any)=>d.status==='READY_TO_BLAST').length,
    trusted: deals.filter((d:any)=>d.sourceType==='OWN'||['TRUSTED_SOURCE','GOOD_SOURCE','CLOSED_BEFORE'].includes(d.dealSource?.reliabilityLabel)).length,
    buyers:  deals.filter((d:any)=>(d.matchedBuyerCount||0)>=3).length,
    noPhoto: deals.filter((d:any)=>!(d.photosUrl||d.googleDriveUrl||d.photos?.length)&&(d.dealPriorityScore||0)>=50).length,
  }),[deals]);

  const marketGaps = useMemo(()=>{
    const map:Record<string,any>={};
    for (const d of deals) {
      if ((d.dealPriorityScore||0)<40) continue;
      const key=d.marketKey||`${d.city||'Unknown'}, ${d.state||''}`;
      if(!map[key]) map[key]={market:key,deals:0,buyers:0,tier1:0,gapScore:0,need:''};
      map[key].deals++;
      map[key].buyers=Math.max(map[key].buyers,d.matchedBuyerCount||0);
      map[key].tier1=Math.max(map[key].tier1,d.tier1MatchCount||0);
      map[key].gapScore=Math.max(map[key].gapScore,d.buyerGapScore||0);
      if(d.marketBuyerNeedRecommendation) map[key].need=d.marketBuyerNeedRecommendation;
    }
    return Object.values(map).sort((a:any,b:any)=>b.gapScore-a.gapScore).slice(0,6);
  },[deals]);

  const gapMarkets = marketGaps.filter((m:any)=>m.buyers===0);

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Deals</h1>
          <p className="text-gray-500 text-xs mt-0.5">Ranked by opportunity — best first</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>refetch()} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition"><RefreshCw size={14}/></button>
          <button onClick={()=>setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${showFilters?'bg-blue-600 text-white':'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}><Filter size={12}/> Filters</button>
          <button onClick={()=>setShowAddDeal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg font-medium transition"><Plus size={14}/> Add Deal</button>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
        {[
          {label:'Active',       value:stats.total,        icon:Building2,  color:'text-white'},
          {label:'Ready Match',  value:stats.match||'—',   icon:Target,     color:'text-blue-400'},
          {label:'Ready Blast',  value:stats.blast||'—',   icon:Zap,        color:'text-green-400'},
          {label:'Trusted Src',  value:stats.trusted||'—', icon:Shield,     color:'text-purple-400'},
          {label:'Has Buyers',   value:stats.buyers||'—',  icon:Users,      color:'text-orange-400'},
          {label:'Need Photos',  value:stats.noPhoto||'—', icon:Camera,     color:'text-amber-400'},
        ].map(s=>(
          <div key={s.label} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <s.icon size={13} className={`${s.color} mb-1.5`}/>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Buyer Coverage Gaps — compact strip */}
      {gapMarkets.length > 0 && (
        <div className="border border-amber-800/25 rounded-xl overflow-hidden" style={{background:'rgba(120,80,0,0.04)'}}>
          <button onClick={()=>setShowGaps(!showGaps)} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-amber-900/8 transition text-left">
            <BarChart3 size={13} className="text-amber-400 shrink-0"/>
            <span className="text-amber-300 text-xs font-medium shrink-0">Buyer Coverage Gaps:</span>
            <span className="text-amber-600/80 text-xs truncate">
              {gapMarkets.map((m:any)=>`${m.market.split(',')[0]}: ${shortNeed(m.need)}`).join(' · ')}
            </span>
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-amber-700 bg-amber-900/30 px-1.5 py-0.5 rounded">{gapMarkets.length}</span>
              {showGaps?<ChevronUp size={12} className="text-amber-600"/>:<ChevronDown size={12} className="text-amber-600"/>}
            </div>
          </button>
          {showGaps && (
            <div className="px-4 pb-3 grid grid-cols-2 md:grid-cols-3 gap-2">
              {marketGaps.map((m:any,i:number)=>{
                const cov=m.buyers>=10?'Strong':m.buyers>=5?'Moderate':m.buyers>=1?'Weak':'Gap';
                const cc=cov==='Strong'?'text-green-400':cov==='Moderate'?'text-yellow-400':cov==='Weak'?'text-orange-400':'text-red-400';
                return (
                  <div key={i} className="bg-gray-900/60 rounded-lg p-2.5 border border-gray-800/50 text-xs">
                    <div className="flex justify-between mb-1"><span className="text-white font-medium">{m.market}</span><span className={cc}>{cov}</span></div>
                    <div className="flex gap-3 text-gray-500 mb-1"><span>Deals: <span className="text-white">{m.deals}</span></span><span>Buyers: <span className={m.buyers===0?'text-red-400':'text-white'}>{m.buyers||'0'}</span></span></div>
                    {m.need&&<p className="text-amber-500/70">{shortNeed(m.need)}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <AnimatePresence>
        {showFilters&&(
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex flex-wrap gap-4">
              <div><label className="text-gray-500 text-xs mb-1 block">Sort</label>
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

      {/* Pipeline Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {/* Column headers */}
        <div className="hidden lg:grid grid-cols-[100px_1fr_120px_100px_90px_100px_90px_110px_90px_140px] gap-3 px-4 py-2 border-b border-gray-800 bg-gray-800/40">
          {['Score','Property','Source','Type','Ask','Public Value','70% Avg','Buyers','Readiness','Action'].map(h=>(
            <span key={h} className="text-gray-500 text-xs font-medium">{h}</span>
          ))}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading deals...</div>
        ) : deals.length===0 ? (
          <div className="p-12 text-center">
            <Building2 size={28} className="text-gray-700 mx-auto mb-3"/>
            <p className="text-gray-400 font-medium text-sm">No deals yet</p>
            <button onClick={()=>setShowAddDeal(true)} className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition">+ Add Deal</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {deals.map((deal:any, i:number)=>{
              const score = deal.dealPriorityScore||0;
              const tier = getScoreTier(score);
              const blast = getBlastReadiness(deal);
              const demand = getBuyerDemand(deal);
              const src = getSourceLabel(deal.sourceType||'MANUAL', deal.dealSource?.reliabilityLabel);
              const actionBtn = getActionButton(deal, score);
              const reason = getOpportunityRead(deal);
              const age = getAgeLabel(deal);
              const buyers = deal.matchedBuyerCount||0;
              const tier1 = deal.tier1MatchCount||0;
              const hasPhotos = !!(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length);
              const estimates = [deal.zillowEstimate,deal.realtorEstimate,deal.redfinEstimate,deal.rentcastEstimate].filter((v):v is number=>typeof v==='number'&&v>0);
              const avgPublic = estimates.length>0?Math.round(estimates.reduce((a,b)=>a+b,0)/estimates.length):null;
              const seventyPct = avgPublic?Math.round(avgPublic*0.7):null;

              return (
                <motion.div key={deal.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.03}}
                  className={`group transition ${tier.hot?'bg-orange-900/8 border-l-2 border-orange-500/50 hover:bg-orange-900/12':'hover:bg-gray-800/25'}`}>

                  {/* Desktop grid layout */}
                  <div className="hidden lg:grid grid-cols-[100px_1fr_120px_100px_90px_100px_90px_110px_90px_140px] gap-3 px-4 py-3 items-start">

                    {/* 1. Score */}
                    <div className="flex flex-col items-center gap-0.5 pt-0.5">
                      <div className={`text-center px-2 py-1 rounded-lg border w-full ${tier.bg}`}>
                        <p className={`text-lg font-bold leading-none ${tier.color}`}>{score||'—'}</p>
                        <p className={`text-xs mt-0.5 ${tier.color} opacity-80`}>{tier.label}</p>
                      </div>
                    </div>

                    {/* 2. Property */}
                    <div className="min-w-0">
                      <Link href={`/dashboard/deals/${deal.id}`} className="block group/link">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-white font-semibold text-sm group-hover/link:text-blue-300 transition truncate">{deal.address||'No address'}</p>
                          {age&&<span className={`text-xs shrink-0 ${age.color}`}>{age.text}</span>}
                        </div>
                        <p className="text-gray-400 text-xs mb-0.5">{[deal.city,deal.state,deal.zipCode].filter(Boolean).join(', ')}</p>
                        <p className="text-gray-500 text-xs">
                          {[deal.beds&&`${deal.beds}bd/${deal.baths}ba`,deal.sqft&&`${deal.sqft.toLocaleString()}sf`].filter(Boolean).join(' · ')}
                        </p>
                        <p className="text-gray-600 text-xs italic mt-1 leading-snug">{reason}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <StatusBadge status={deal.status||'DRAFT'}/>
                          {!hasPhotos&&<span className="text-xs text-amber-600 flex items-center gap-0.5"><Camera size={9}/> No Photos</span>}
                        </div>
                      </Link>
                    </div>

                    {/* 3. Source */}
                    <div>
                      <p className="text-gray-300 text-xs font-medium">{src.line1}</p>
                      {src.line2&&<p className={`text-xs ${src.reliabilityColor}`}>{src.line2}</p>}
                    </div>

                    {/* 4. Deal Type */}
                    <div>
                      {deal.dealType&&<p className="text-indigo-400 text-xs font-medium">{deal.dealType}</p>}
                      {deal.overallCondition&&deal.overallCondition!=='UNKNOWN'&&(
                        <p className="text-gray-500 text-xs">{deal.overallCondition.replace(/_/g,' ')}</p>
                      )}
                    </div>

                    {/* 5. Ask */}
                    <div className="text-right">
                      <p className="text-white text-sm font-bold">{deal.askingPrice?formatCurrency(deal.askingPrice):'TBD'}</p>
                      {deal.repairEstimate>0&&<p className="text-gray-600 text-xs">Repairs: {formatCurrency(deal.repairEstimate)}</p>}
                    </div>

                    {/* 6. Public Value */}
                    <div className="text-right">
                      {avgPublic ? (
                        <p className="text-blue-300 text-sm font-medium">{formatCurrency(avgPublic)}</p>
                      ) : (
                        <Link href={`/dashboard/deals/${deal.id}`} className="text-gray-600 text-xs hover:text-blue-400 transition leading-tight">Add Zillow/<br/>Redfin</Link>
                      )}
                      {estimates.length>0&&<p className="text-gray-600 text-xs">{estimates.length} source{estimates.length!==1?'s':''}</p>}
                    </div>

                    {/* 7. 70% */}
                    <div className="text-right">
                      {seventyPct ? (
                        <>
                          <p className={`text-sm font-medium ${deal.askingPrice&&deal.askingPrice<=seventyPct?'text-green-400':'text-amber-400'}`}>{formatCurrency(seventyPct)}</p>
                          {deal.askingPrice&&<p className={`text-xs ${deal.askingPrice<=seventyPct?'text-green-600':'text-amber-600'}`}>{deal.askingPrice<=seventyPct?'Under 70%':'Over 70%'}</p>}
                        </>
                      ) : <span className="text-gray-700 text-xs">—</span>}
                    </div>

                    {/* 8. Buyers */}
                    <div>
                      {buyers>0 ? (
                        <>
                          <p className={`text-sm font-bold ${demand.color}`}>{buyers} buyers</p>
                          {tier1>0&&<p className="text-purple-400 text-xs">{tier1} Tier 1</p>}
                          <p className={`text-xs ${demand.color} opacity-70`}>{demand.label}</p>
                        </>
                      ) : (
                        <span className="text-xs text-red-400 font-medium">Buyer gap</span>
                      )}
                    </div>

                    {/* 9. Readiness */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${blast.textColor}`}>{blast.pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mb-1">
                        <div className={`h-full rounded-full ${blast.barColor}`} style={{width:`${blast.pct}%`}}/>
                      </div>
                      {blast.topMissing&&<p className="text-gray-600 text-xs">Needs {blast.topMissing}</p>}
                    </div>

                    {/* 10. Action */}
                    <div>
                      <Link href={`/dashboard/deals/${deal.id}`}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition w-full justify-center ${actionBtn.cls}`}>
                        {actionBtn.label}<ArrowRight size={11}/>
                      </Link>
                    </div>
                  </div>

                  {/* Mobile layout */}
                  <Link href={`/dashboard/deals/${deal.id}`} className="lg:hidden block p-4">
                    <div className="flex items-start gap-3">
                      <div className={`text-center px-2 py-1 rounded-lg border shrink-0 w-16 ${tier.bg}`}>
                        <p className={`text-base font-bold leading-none ${tier.color}`}>{score||'—'}</p>
                        <p className={`text-xs mt-0.5 ${tier.color} opacity-80`}>{tier.label}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm">{deal.address}</p>
                        <p className="text-gray-400 text-xs">{[deal.city,deal.state].filter(Boolean).join(', ')} · {deal.dealType}</p>
                        <p className="text-gray-600 text-xs italic mt-1">{reason}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <StatusBadge status={deal.status||'DRAFT'}/>
                          {buyers>0&&<span className={`text-xs ${demand.color}`}>{buyers} buyers</span>}
                          <span className={`text-xs ${blast.textColor}`}>{blast.pct}% ready</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-gray-600 shrink-0 mt-1"/>
                    </div>
                  </Link>

                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddDeal&&<AddDealModal onClose={()=>setShowAddDeal(false)} onSuccess={()=>{setShowAddDeal(false);refetch();}}/>}
      </AnimatePresence>
    </div>
  );
}
