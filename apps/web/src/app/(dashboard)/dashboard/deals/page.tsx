'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, Zap, Plus, Filter, RefreshCw, Camera, ChevronRight, BarChart3, ChevronDown, ChevronUp, TrendingUp, Clock, AlertCircle, Target } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import Link from 'next/link';
import AddDealModal from '@/components/deal/AddDealModal';

function getScoreTier(s: number) {
  if (s>=85) return {label:'🔥 Hot',    text:'text-red-200',    bg:'bg-red-900/80 border-red-600/70',      hot:true};
  if (s>=75) return {label:'Strong',    text:'text-orange-200', bg:'bg-orange-900/70 border-orange-700/60', hot:false};
  if (s>=60) return {label:'Workable',  text:'text-yellow-200', bg:'bg-yellow-900/60 border-yellow-700/50', hot:false};
  if (s>=40) return {label:'Needs Info',text:'text-blue-300',   bg:'bg-blue-900/60 border-blue-700/50',    hot:false};
  return          {label:'Weak',        text:'text-gray-500',   bg:'bg-gray-800 border-gray-700',           hot:false};
}

function getReadiness(deal: any) {
  const checks = [
    {pts:20, ok:!!(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length)},
    {pts:15, ok:!!deal.accessInfo},
    {pts:10, ok:!!deal.description},
    {pts:15, ok:!!deal.askingPrice},
    {pts:15, ok:!!(deal.zillowEstimate||deal.realtorEstimate||deal.redfinEstimate||deal.rentcastEstimate||deal.arv)},
    {pts:10, ok:!!(deal.sourceName||deal.sourceType==='OWN')},
    {pts:5,  ok:deal.sourceType==='OWN'||!!(deal.dealSource?.permissionToMarket)},
    {pts:10, ok:(deal.matchedBuyerCount||0)>0},
  ];
  const total = checks.reduce((s,c)=>s+c.pts,0);
  const earned = checks.filter(c=>c.ok).reduce((s,c)=>s+c.pts,0);
  const pct = Math.round((earned/total)*100);
  const blocker = [
    !(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length)&&'Photos',
    !(deal.zillowEstimate||deal.realtorEstimate||deal.redfinEstimate||deal.rentcastEstimate||deal.arv)&&'Value est.',
    (deal.matchedBuyerCount||0)===0&&'Buyers',
    !deal.accessInfo&&'Access',
  ].find(Boolean) as string|null;
  return {pct, blocker};
}

function getDemand(b: number) {
  if (b>=15) return {label:'Strong',   color:'text-green-300',  bg:'bg-green-900/40 border border-green-700/40'};
  if (b>=8)  return {label:'Moderate', color:'text-blue-300',   bg:'bg-blue-900/40 border border-blue-700/40'};
  if (b>=3)  return {label:'Some',     color:'text-amber-300',  bg:'bg-amber-900/40 border border-amber-700/40'};
  if (b>=1)  return {label:'Weak',     color:'text-orange-300', bg:'bg-orange-900/40 border border-orange-700/40'};
  return          {label:'Gap',        color:'text-red-400',    bg:'bg-red-900/30 border border-red-800/40'};
}

function getDeadline(deal: any): {text:string;subtext:string;color:string;urgent:boolean}|null {
  const now = Date.now();
  const dates = [
    deal.assignmentDeadline && {date: new Date(deal.assignmentDeadline), label:'Assignment'},
    deal.inspectionDeadline && {date: new Date(deal.inspectionDeadline), label:'Inspection'},
    deal.closingDate        && {date: new Date(deal.closingDate),        label:'COE'},
    deal.emdDueDate         && {date: new Date(deal.emdDueDate),         label:'EMD'},
  ].filter(Boolean) as {date:Date;label:string}[];

  if (dates.length === 0) return null;
  const soonest = dates.sort((a,b)=>a.date.getTime()-b.date.getTime())[0];
  const daysLeft = Math.ceil((soonest.date.getTime()-now)/86400000);

  if (daysLeft < 0) return {text:`${soonest.label} passed`,subtext:'',color:'text-red-500',urgent:true};
  if (daysLeft === 0) return {text:`${soonest.label} today`,subtext:'',color:'text-red-400',urgent:true};
  if (daysLeft <= 3) return {text:`${daysLeft}d left`,subtext:soonest.label,color:'text-red-400',urgent:true};
  if (daysLeft <= 7) return {text:`${daysLeft}d left`,subtext:soonest.label,color:'text-amber-400',urgent:true};
  if (daysLeft <= 14) return {text:`${daysLeft}d left`,subtext:soonest.label,color:'text-yellow-400',urgent:false};
  return {text:`${daysLeft}d`,subtext:soonest.label,color:'text-gray-500',urgent:false};
}

function getActionButton(deal: any, score: number): {label:string;cls:string} {
  const b = deal.matchedBuyerCount||0;
  const action = deal.nextBestAction||'';
  if (score>=75&&b>=3)  return {label:'Sell This Deal',cls:'bg-blue-600 hover:bg-blue-500 text-white font-bold'};
  if (deal.status==='READY_TO_BLAST') return {label:'Generate Blast',cls:'bg-green-800 hover:bg-green-700 text-green-200 border border-green-700/50'};
  if (b===0||action.toLowerCase().includes('match')) return {label:'Run Match',cls:'bg-blue-900/70 hover:bg-blue-900 text-blue-200 border border-blue-700/40'};
  if (action.toLowerCase().includes('photo')) return {label:'Get Photos',cls:'bg-amber-900/60 hover:bg-amber-900 text-amber-200 border border-amber-700/40'};
  if (action.toLowerCase().includes('buyer')) return {label:'Find Buyers',cls:'bg-orange-900/60 hover:bg-orange-900 text-orange-200 border border-orange-700/40'};
  return {label:'Review',cls:'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'};
}

function getSignal(deal: any): string {
  const b = deal.matchedBuyerCount||0;
  const t1 = deal.tier1MatchCount||0;
  const hasPhotos = !!(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length);
  const r = getReadiness(deal);
  if (b>=10&&r.pct>=75) return `${b} buyers matched${t1>0?`, ${t1} Tier 1`:''}. Ready to sell.`;
  if (b>=5&&!hasPhotos) return `${b} buyers matched. Get photos to blast.`;
  if (b>=5) return `${b} buyers matched${t1>0?`, ${t1} Tier 1`:''}. ${r.pct}% ready.`;
  if (b===0&&(deal.dealPriorityScore||0)>=60) return `Good deal. No buyers yet in ${deal.city||'this market'}.`;
  if (!hasPhotos) return 'Add photos to unlock buyer blast.';
  return `${deal.missingInfoCount||0} fields missing.`;
}

function shortNeed(need: string): string {
  if (!need) return 'buyers needed';
  const l = need.toLowerCase();
  if (l.includes('cash')&&l.includes('landlord')) return 'cash buyers / landlords';
  if (l.includes('section 8')) return 'Section 8 / rehab buyers';
  if (l.includes('subto')) return 'Subto buyers';
  if (l.includes('cash')) return 'cash buyers';
  return need.slice(0,40)+(need.length>40?'…':'');
}

const STATUS_COLORS: Record<string,string> = {
  DRAFT:'bg-gray-700 text-gray-400', NEEDS_INFO:'bg-amber-900/50 text-amber-300',
  READY_TO_MATCH:'bg-blue-900/50 text-blue-300', MATCHED:'bg-purple-900/50 text-purple-300',
  READY_TO_BLAST:'bg-green-900/50 text-green-300', CAMPAIGN_ACTIVE:'bg-emerald-900/50 text-emerald-400',
  OFFER_RECEIVED:'bg-orange-900/50 text-orange-300', ACTIVE:'bg-blue-900/50 text-blue-300',
};

// column layout: score | property | ask | 70% | public | arv | deadline | buyers | ready | action
const COLS = '80px 1fr 88px 88px 88px 88px 90px 120px 78px 150px';

export default function DealsPage() {
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [sortBy, setSortBy] = useState('dealPriorityScore');
  const [showFilters, setShowFilters] = useState(false);
  const [showGaps, setShowGaps] = useState(false);

  const {data:dealsData, isLoading, refetch} = useQuery({
    queryKey:['deals', sortBy],
    queryFn:()=>api.get(`/deals?page=1&limit=100&sort=${sortBy}`).then(r=>r.data),
  });
  const deals = dealsData?.data || [];

  const stats = useMemo(()=>({
    total:    deals.filter((d:any)=>!['DEAD','CLOSED','DRAFT'].includes(d.status)).length,
    hot:      deals.filter((d:any)=>(d.dealPriorityScore||0)>=75&&(d.matchedBuyerCount||0)>=3).length,
    blast:    deals.filter((d:any)=>d.status==='READY_TO_BLAST').length,
    buyers:   deals.filter((d:any)=>(d.matchedBuyerCount||0)>=3).length,
    noPhoto:  deals.filter((d:any)=>!(d.photosUrl||d.googleDriveUrl||d.photos?.length)&&(d.dealPriorityScore||0)>=50).length,
    urgent:   deals.filter((d:any)=>{
      const dl = getDeadline(d);
      return dl?.urgent;
    }).length,
  }),[deals]);

  const noBuyerDeals = useMemo(()=>
    deals.filter((d:any)=>(d.dealPriorityScore||0)>=60&&(d.matchedBuyerCount||0)===0)
  ,[deals]);

  const marketGaps = useMemo(()=>{
    const map:Record<string,any>={};
    for (const d of deals) {
      if ((d.dealPriorityScore||0)<40) continue;
      const key=d.marketKey||`${d.city||'?'}, ${d.state||''}`;
      if(!map[key]) map[key]={market:key,buyers:0,need:'',score:0};
      map[key].buyers=Math.max(map[key].buyers,d.matchedBuyerCount||0);
      map[key].score=Math.max(map[key].score,d.dealPriorityScore||0);
      if(d.marketBuyerNeedRecommendation) map[key].need=d.marketBuyerNeedRecommendation;
    }
    return Object.values(map).filter((m:any)=>m.buyers===0).sort((a:any,b:any)=>b.score-a.score).slice(0,4);
  },[deals]);

  return (
    <div className="p-4 space-y-3 w-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Deals Pipeline</h1>
          <p className="text-gray-500 text-xs mt-0.5">Ranked by opportunity — scan fast, click to work</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>refetch()} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"><RefreshCw size={14}/></button>
          <button onClick={()=>setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${showFilters?'bg-blue-600 text-white':'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}><Filter size={12}/> Sort</button>
          <button onClick={()=>setShowAddDeal(true)} className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg font-medium"><Plus size={14}/> Add Deal</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          {label:'Active Deals',   value:stats.total,         icon:Building2,  color:'text-white'},
          {label:'Hot / Sellable', value:stats.hot||'—',      icon:TrendingUp, color:'text-red-400'},
          {label:'Ready to Blast', value:stats.blast||'—',    icon:Zap,        color:'text-green-400'},
          {label:'Has Buyers',     value:stats.buyers||'—',   icon:Users,      color:'text-blue-400'},
          {label:'Need Photos',    value:stats.noPhoto||'—',  icon:Camera,     color:'text-amber-400'},
          {label:'Deadline Soon',  value:stats.urgent||'—',   icon:Clock,      color:'text-orange-400'},
        ].map(s=>(
          <div key={s.label} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <s.icon size={12} className={`${s.color} mb-1.5`}/>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* No-buyers alert */}
      {noBuyerDeals.length>0&&(
        <div className="bg-amber-900/10 border border-amber-800/30 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Target size={13} className="text-amber-400 shrink-0"/>
            <span className="text-amber-300 font-semibold text-xs">Buyer Gap Detected</span>
            <span className="text-gray-500 text-xs">— {noBuyerDeals.length} good deal{noBuyerDeals.length!==1?'s':''} with no matched buyers. Find buyers, JV out, or blast to outside networks.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {noBuyerDeals.map((d:any)=>(
              <Link key={d.id} href={`/dashboard/deals/${d.id}`} className="flex items-center gap-2 bg-gray-900/60 rounded-lg px-3 py-1.5 hover:bg-gray-800 transition text-xs border border-gray-800">
                <span className="text-amber-400 font-bold">{d.dealPriorityScore}</span>
                <span className="text-white font-medium">{d.address}</span>
                <span className="text-gray-500">{d.city}, {d.state}</span>
                <ChevronRight size={11} className="text-gray-600"/>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Buyer gap strip */}
      {marketGaps.length>0&&(
        <div className="border border-amber-800/25 rounded-xl overflow-hidden" style={{background:'rgba(120,80,0,0.04)'}}>
          <button onClick={()=>setShowGaps(!showGaps)} className="w-full px-4 py-2.5 flex items-center gap-2 text-left hover:bg-amber-900/8 transition">
            <BarChart3 size={12} className="text-amber-400 shrink-0"/>
            <span className="text-amber-300 text-xs font-medium shrink-0">Buyer Coverage Gaps:</span>
            <span className="text-amber-600/80 text-xs truncate flex-1">
              {marketGaps.map((m:any)=>`${m.market.split(',')[0]}: ${shortNeed(m.need)}`).join('  ·  ')}
            </span>
            <span className="text-xs text-amber-700 bg-amber-900/30 px-1.5 py-0.5 rounded shrink-0">{marketGaps.length}</span>
            {showGaps?<ChevronUp size={11} className="text-amber-600 shrink-0"/>:<ChevronDown size={11} className="text-amber-600 shrink-0"/>}
          </button>
          {showGaps&&(
            <div className="px-4 pb-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              {marketGaps.map((m:any,i:number)=>(
                <div key={i} className="bg-gray-900/60 rounded-lg p-2.5 border border-gray-800/50 text-xs">
                  <p className="text-white font-medium">{m.market}</p>
                  <p className="text-gray-500 text-xs">Score {m.score} · 0 buyers</p>
                  <p className="text-amber-500/70 mt-0.5">{shortNeed(m.need)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sort */}
      <AnimatePresence>
        {showFilters&&(
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="bg-gray-900 rounded-xl px-4 py-3 border border-gray-800">
            <div className="flex items-center gap-3">
              <label className="text-gray-500 text-xs font-medium">Sort by</label>
              {['dealPriorityScore','matchedBuyerCount','closingDate','createdAt'].map(v=>(
                <button key={v} onClick={()=>setSortBy(v)}
                  className={`px-3 py-1 rounded-lg text-xs transition ${sortBy===v?'bg-blue-600 text-white':'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {{dealPriorityScore:'Priority Score',matchedBuyerCount:'Buyer Count',closingDate:'Closing Date',createdAt:'Newest First'}[v]}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pipeline Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden w-full">

        {/* Column headers */}
        <div className="grid border-b border-gray-700 bg-gray-800/60 text-gray-500 text-xs font-semibold uppercase tracking-wide" style={{gridTemplateColumns:COLS}}>
          <div className="px-3 py-3">Score</div>
          <div className="px-3 py-3">Property</div>
          <div className="px-3 py-3 text-right">Ask</div>
          <div className="px-3 py-3 text-right">70% Val</div>
          <div className="px-3 py-3 text-right">Public Val</div>
          <div className="px-3 py-3 text-right">ARV</div>
          <div className="px-3 py-3 text-center">Deadline</div>
          <div className="px-3 py-3 text-center">Buyers</div>
          <div className="px-3 py-3 text-center">Ready</div>
          <div className="px-3 py-3">Action</div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Loading deals...</div>
        ) : deals.length===0 ? (
          <div className="p-12 text-center">
            <Building2 size={28} className="text-gray-700 mx-auto mb-3"/>
            <p className="text-gray-400 text-sm font-medium">No deals yet</p>
            <button onClick={()=>setShowAddDeal(true)} className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg">+ Add Deal</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {deals.map((deal:any, i:number)=>{
              const score = deal.dealPriorityScore||0;
              const tier = getScoreTier(score);
              const ready = getReadiness(deal);
              const buyers = deal.matchedBuyerCount||0;
              const tier1 = deal.tier1MatchCount||0;
              const demand = getDemand(buyers);
              const deadline = getDeadline(deal);
              const action = getActionButton(deal, score);
              const signal = getSignal(deal);

              const estimates = [deal.zillowEstimate,deal.realtorEstimate,deal.redfinEstimate,deal.rentcastEstimate]
                .filter((v):v is number=>typeof v==='number'&&v>0);
              const avgPublic = estimates.length>0 ? Math.round(estimates.reduce((a,b)=>a+b,0)/estimates.length) : null;
              const refVal = avgPublic||(deal.arv>0?deal.arv:null);
              const seventyPct = refVal ? Math.round(refVal*0.7) : null;
              const underSeventy = seventyPct&&deal.askingPrice ? deal.askingPrice<=seventyPct : null;

              return (
                <motion.div key={deal.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.02}}
                  className={`group transition-colors ${tier.hot?'border-l-[3px] border-orange-500/80 bg-orange-950/15 hover:bg-orange-950/25':'border-l-[3px] border-transparent hover:bg-gray-800/30'} ${deadline?.urgent&&!tier.hot?'border-l-[3px] border-red-700/50':''}`}>

                  <div className="grid items-start" style={{gridTemplateColumns:COLS}}>

                    {/* Score */}
                    <div className="px-3 py-3">
                      <div className={`rounded-xl border text-center py-2 px-1 ${tier.bg}`}>
                        <p className={`text-xl font-bold leading-none ${tier.text}`}>{score||'—'}</p>
                        <p className={`text-xs mt-0.5 font-medium ${tier.text} opacity-90`}>{tier.label}</p>
                      </div>
                    </div>

                    {/* Property */}
                    <Link href={`/dashboard/deals/${deal.id}`} className="px-3 py-3 block min-w-0 group/row">
                      <p className="text-white font-bold text-sm group-hover/row:text-blue-300 transition leading-snug">{deal.address||'No address'}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{[deal.city,deal.state,deal.zipCode].filter(Boolean).join(', ')}</p>
                      {(deal.beds||deal.sqft)&&(
                        <p className="text-gray-500 text-xs mt-0.5">
                          {[deal.beds&&`${deal.beds}bd/${deal.baths}ba`,deal.sqft&&`${deal.sqft.toLocaleString()}sf`,deal.dealType].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <p className="text-gray-500 text-xs italic mt-1 leading-snug">{signal}</p>
                      <div className="mt-1.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[deal.status||'DRAFT']||'bg-gray-800 text-gray-400'}`}>
                          {(deal.status||'DRAFT').replace(/_/g,' ')}
                        </span>
                      </div>
                    </Link>

                    {/* Ask */}
                    <div className="px-3 py-3 text-right">
                      <p className="text-white font-bold text-sm">{deal.askingPrice?formatCurrency(deal.askingPrice):'—'}</p>
                      {deal.repairEstimate>0&&<p className="text-gray-600 text-xs mt-0.5">+{formatCurrency(deal.repairEstimate)}<br/>repairs</p>}
                    </div>

                    {/* 70% Value */}
                    <div className="px-3 py-3 text-right">
                      {seventyPct ? (
                        <>
                          <p className={`font-bold text-sm ${underSeventy?'text-green-400':'text-amber-400'}`}>{formatCurrency(seventyPct)}</p>
                          <p className={`text-xs mt-0.5 ${underSeventy?'text-green-600':'text-amber-600'}`}>{underSeventy?'✓ Under 70%':'Over 70%'}</p>
                        </>
                      ) : <span className="text-gray-700 text-xs">—</span>}
                    </div>

                    {/* Public Value */}
                    <div className="px-3 py-3 text-right">
                      {avgPublic ? (
                        <>
                          <p className="text-blue-300 text-sm font-medium">{formatCurrency(avgPublic)}</p>
                          <p className="text-gray-600 text-xs mt-0.5">{estimates.length} est.</p>
                        </>
                      ) : (
                        <Link href={`/dashboard/deals/${deal.id}`} className="text-gray-600 text-xs hover:text-blue-400 transition">+ Add est.</Link>
                      )}
                    </div>

                    {/* ARV */}
                    <div className="px-3 py-3 text-right">
                      {deal.arv>0 ? (
                        <>
                          <p className="text-teal-300 text-sm font-medium">{formatCurrency(deal.arv)}</p>
                          <p className="text-gray-600 text-xs mt-0.5">ARV</p>
                        </>
                      ) : <span className="text-gray-700 text-xs">—</span>}
                    </div>

                    {/* Deadline */}
                    <div className="px-3 py-3 text-center">
                      {deadline ? (
                        <>
                          <p className={`text-sm font-bold ${deadline.color}`}>{deadline.text}</p>
                          {deadline.subtext&&<p className="text-gray-600 text-xs mt-0.5">{deadline.subtext}</p>}
                          {deadline.urgent&&<p className="text-red-500 text-xs mt-0.5 font-medium">⚠ Urgent</p>}
                        </>
                      ) : (
                        <Link href={`/dashboard/deals/${deal.id}`} className="text-gray-700 text-xs hover:text-amber-400 transition">+ Add COE</Link>
                      )}
                    </div>

                    {/* Buyers */}
                    <div className="px-3 py-3 text-center">
                      <div className={`rounded-lg px-2 py-1.5 ${demand.bg}`}>
                        <p className={`text-xl font-bold ${demand.color}`}>{buyers}</p>
                        {tier1>0&&<p className={`text-xs ${demand.color} opacity-80`}>{tier1} Tier 1</p>}
                        <p className={`text-xs ${demand.color} opacity-70 mt-0.5`}>{demand.label}</p>
                      </div>
                    </div>

                    {/* Readiness */}
                    <div className="px-3 py-3 text-center">
                      <p className={`text-lg font-bold ${ready.pct>=85?'text-green-400':ready.pct>=65?'text-amber-400':ready.pct>=45?'text-orange-400':'text-red-400'}`}>{ready.pct}%</p>
                      <div className="w-full h-1 bg-gray-700 rounded-full mt-1 mb-1">
                        <div className={`h-full rounded-full ${ready.pct>=85?'bg-green-500':ready.pct>=65?'bg-amber-500':ready.pct>=45?'bg-orange-500':'bg-red-500'}`} style={{width:`${ready.pct}%`}}/>
                      </div>
                      {ready.blocker&&<p className="text-gray-600 text-xs leading-tight">No {ready.blocker}</p>}
                    </div>

                    {/* Action */}
                    <div className="px-3 py-3">
                      <Link href={`/dashboard/deals/${deal.id}`}
                        className={`inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs transition w-full ${action.cls}`}>
                        {action.label} <ChevronRight size={11}/>
                      </Link>
                    </div>

                  </div>
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
