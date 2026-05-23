'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, Zap, Plus, Filter, RefreshCw, Camera, ChevronRight, BarChart3, ChevronDown, ChevronUp, TrendingUp, Clock, Target } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import Link from 'next/link';
import AddDealModal from '@/components/deal/AddDealModal';

function tier(s: number) {
  if (s>=85) return {l:'Hot',       t:'text-red-400',    bdr:'border-l-red-500',    hot:true};
  if (s>=75) return {l:'Strong',    t:'text-orange-400', bdr:'border-l-orange-400', hot:false};
  if (s>=60) return {l:'Workable',  t:'text-yellow-400', bdr:'border-l-yellow-400', hot:false};
  if (s>=40) return {l:'Needs Info',t:'text-blue-400',   bdr:'border-l-blue-400',   hot:false};
  return          {l:'Weak',        t:'text-gray-500',   bdr:'border-l-gray-600',   hot:false};
}

function readiness(deal: any) {
  const c = [
    {pts:20,ok:!!(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length)},
    {pts:15,ok:!!deal.accessInfo},{pts:10,ok:!!deal.description},{pts:15,ok:!!deal.askingPrice},
    {pts:15,ok:!!(deal.zillowEstimate||deal.realtorEstimate||deal.redfinEstimate||deal.rentcastEstimate||deal.arv)},
    {pts:10,ok:!!(deal.sourceName||deal.sourceType==='OWN')},
    {pts:5, ok:deal.sourceType==='OWN'||!!(deal.dealSource?.permissionToMarket)},
    {pts:10,ok:(deal.matchedBuyerCount||0)>0},
  ];
  const pct = Math.round(c.filter(x=>x.ok).reduce((s,x)=>s+x.pts,0)/c.reduce((s,x)=>s+x.pts,0)*100);
  const blocker = [
    !(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length)&&'Photos',
    !(deal.zillowEstimate||deal.realtorEstimate||deal.redfinEstimate||deal.rentcastEstimate||deal.arv)&&'Value',
    (deal.matchedBuyerCount||0)===0&&'Buyers',
    !deal.accessInfo&&'Access',
  ].find(Boolean) as string|null;
  return {pct, blocker, bar:pct>=85?'bg-green-500':pct>=65?'bg-amber-500':pct>=45?'bg-orange-500':'bg-red-500', txt:pct>=85?'text-green-400':pct>=65?'text-amber-400':pct>=45?'text-orange-400':'text-red-400'};
}

function demand(b: number) {
  if (b>=15) return {l:'Strong',   c:'text-green-300',  bg:'bg-green-900/40 border-green-700/40'};
  if (b>=8)  return {l:'Moderate', c:'text-blue-300',   bg:'bg-blue-900/40 border-blue-700/40'};
  if (b>=3)  return {l:'Some',     c:'text-amber-300',  bg:'bg-amber-900/40 border-amber-700/40'};
  if (b>=1)  return {l:'Weak',     c:'text-orange-300', bg:'bg-orange-900/40 border-orange-700/40'};
  return          {l:'Gap',        c:'text-red-400',    bg:'bg-red-900/30 border-red-800/40'};
}

function deadline(deal: any) {
  const now = Date.now();
  const dates = [
    deal.assignmentDeadline&&{d:new Date(deal.assignmentDeadline),l:'Assign'},
    deal.inspectionDeadline&&{d:new Date(deal.inspectionDeadline),l:'Inspect'},
    deal.closingDate&&{d:new Date(deal.closingDate),l:'COE'},
    deal.emdDueDate&&{d:new Date(deal.emdDueDate),l:'EMD'},
  ].filter(Boolean) as {d:Date;l:string}[];
  if (!dates.length) return null;
  const s = dates.sort((a,b)=>a.d.getTime()-b.d.getTime())[0];
  const days = Math.ceil((s.d.getTime()-now)/86400000);
  if (days<0)  return {txt:`${s.l} passed`, sub:'',     color:'text-red-500',  urgent:true};
  if (days===0)return {txt:`${s.l} TODAY`,  sub:'',     color:'text-red-400',  urgent:true};
  if (days<=3) return {txt:`${days}d left`, sub:s.l,    color:'text-red-400',  urgent:true};
  if (days<=7) return {txt:`${days}d left`, sub:s.l,    color:'text-amber-400',urgent:true};
  if (days<=14)return {txt:`${days}d`,      sub:s.l,    color:'text-yellow-400',urgent:false};
  return            {txt:`${days}d`,         sub:s.l,    color:'text-gray-500', urgent:false};
}

function actionBtn(deal: any, score: number) {
  const b = deal.matchedBuyerCount||0;
  const a = deal.nextBestAction||'';
  if (score>=75&&b>=3)               return {l:'Sell This Deal', c:'bg-blue-600 hover:bg-blue-500 text-white font-bold'};
  if (deal.status==='READY_TO_BLAST')return {l:'Generate Blast', c:'bg-green-800 hover:bg-green-700 text-green-200 border border-green-700/50'};
  if (b===0||a.toLowerCase().includes('match')) return {l:'Run Match',    c:'bg-blue-900/70 hover:bg-blue-900 text-blue-200 border border-blue-700/40'};
  if (a.toLowerCase().includes('photo'))        return {l:'Get Photos',   c:'bg-amber-900/60 hover:bg-amber-900 text-amber-200 border border-amber-700/40'};
  if (a.toLowerCase().includes('buyer'))        return {l:'Find Buyers',  c:'bg-orange-900/60 hover:bg-orange-900 text-orange-200 border border-orange-700/40'};
  return {l:'Review', c:'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'};
}

function signal(deal: any): string {
  const b = deal.matchedBuyerCount||0, t1 = deal.tier1MatchCount||0;
  const hp = !!(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length);
  const r = readiness(deal);
  if (b>=10&&r.pct>=75) return `${b} buyers matched${t1>0?`, ${t1} T1`:''}. Ready to sell.`;
  if (b>=5&&!hp) return `${b} buyers. Get photos to blast.`;
  if (b>=5) return `${b} buyers matched${t1>0?`, ${t1} T1`:''}.`;
  if (b===0&&(deal.dealPriorityScore||0)>=60) return `Good deal — no buyers yet in ${deal.city||'this market'}.`;
  if (!hp) return 'Add photos to unlock blast.';
  return `${deal.missingInfoCount||0} fields missing.`;
}

function shortNeed(n: string): string {
  if (!n) return 'buyers needed';
  const l = n.toLowerCase();
  if (l.includes('cash')&&l.includes('landlord')) return 'cash buyers / landlords';
  if (l.includes('section 8')) return 'Section 8 / rehab buyers';
  if (l.includes('subto')) return 'Subto buyers';
  if (l.includes('cash')) return 'cash buyers';
  return n.slice(0,40)+(n.length>40?'…':'');
}

const SC: Record<string,string> = {
  DRAFT:'bg-gray-700 text-gray-400', NEEDS_INFO:'bg-amber-900/50 text-amber-300',
  READY_TO_MATCH:'bg-blue-900/50 text-blue-300', MATCHED:'bg-purple-900/50 text-purple-300',
  READY_TO_BLAST:'bg-green-900/50 text-green-300', CAMPAIGN_ACTIVE:'bg-emerald-900/50 text-emerald-400',
  OFFER_RECEIVED:'bg-orange-900/50 text-orange-300', ACTIVE:'bg-blue-900/50 text-blue-300',
};

// 13 columns — compact single-line rows
const COLS = '64px 180px 80px 64px 90px 90px 90px 80px 80px 110px 64px 120px';
const HDRS = ['Score','Address','Beds','Sqft','Status','Asking','70% Val','Public Val','ARV','Deadline','Buyers','Ready','Action'];

export default function DealsPage() {
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [sortBy, setSortBy] = useState('dealPriorityScore');
  const [showFilters, setShowFilters] = useState(false);
  const [showGaps, setShowGaps] = useState(false);

  const {data:dealsData, isLoading, refetch} = useQuery({
    queryKey:['deals',sortBy],
    queryFn:()=>api.get(`/deals?page=1&limit=100&sort=${sortBy}`).then(r=>r.data),
  });
  const deals = dealsData?.data||[];

  const stats = useMemo(()=>({
    total:  deals.filter((d:any)=>!['DEAD','CLOSED','DRAFT'].includes(d.status)).length,
    hot:    deals.filter((d:any)=>(d.dealPriorityScore||0)>=75&&(d.matchedBuyerCount||0)>=3).length,
    blast:  deals.filter((d:any)=>d.status==='READY_TO_BLAST').length,
    buyers: deals.filter((d:any)=>(d.matchedBuyerCount||0)>=3).length,
    noPhoto:deals.filter((d:any)=>!(d.photosUrl||d.googleDriveUrl||d.photos?.length)&&(d.dealPriorityScore||0)>=50).length,
    urgent: deals.filter((d:any)=>deadline(d)?.urgent).length,
  }),[deals]);

  // Buyer gap opportunities — good deals with 0 buyers
  const buyerGapDeals = useMemo(()=>
    deals.filter((d:any)=>(d.dealPriorityScore||0)>=60&&(d.matchedBuyerCount||0)===0)
  ,[deals]);

  // Market coverage — show deals per market, buyers per market, gap status
  const marketCoverage = useMemo(()=>{
    const map:Record<string,any>={};
    for (const d of deals) {
      if ((d.dealPriorityScore||0)<40) continue;
      const key = d.marketKey||`${d.city||'?'}, ${d.state||''}`;
      if (!map[key]) map[key]={market:key, deals:0, topScore:0, buyers:0, tier1:0, need:''};
      map[key].deals++;
      map[key].topScore = Math.max(map[key].topScore, d.dealPriorityScore||0);
      map[key].buyers = Math.max(map[key].buyers, d.matchedBuyerCount||0);
      map[key].tier1 = Math.max(map[key].tier1, d.tier1MatchCount||0);
      if (d.marketBuyerNeedRecommendation) map[key].need = d.marketBuyerNeedRecommendation;
    }
    return Object.values(map).sort((a:any,b:any)=>{
      // sort: buyer gaps first, then by top score
      if (a.buyers===0&&b.buyers>0) return -1;
      if (b.buyers===0&&a.buyers>0) return 1;
      return b.topScore-a.topScore;
    });
  },[deals]);

  const gapMarkets = marketCoverage.filter((m:any)=>m.buyers===0);

  return (
    <div className="p-4 space-y-3 w-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Deals Pipeline</h1>
          <p className="text-gray-500 text-xs mt-0.5">Ranked by opportunity score — scan fast, click to work a deal</p>
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
          {label:'Active',        value:stats.total,        icon:Building2,  color:'text-white'},
          {label:'Hot / Sellable',value:stats.hot||'—',     icon:TrendingUp, color:'text-red-400'},
          {label:'Ready to Blast',value:stats.blast||'—',   icon:Zap,        color:'text-green-400'},
          {label:'Has Buyers',    value:stats.buyers||'—',  icon:Users,      color:'text-blue-400'},
          {label:'Need Photos',   value:stats.noPhoto||'—', icon:Camera,     color:'text-amber-400'},
          {label:'Deadline Soon', value:stats.urgent||'—',  icon:Clock,      color:'text-orange-400'},
        ].map(s=>(
          <div key={s.label} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <s.icon size={12} className={`${s.color} mb-1.5`}/>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Buyer Gap Opportunities — good deals, no buyers */}
      {buyerGapDeals.length>0&&(
        <div className="bg-amber-900/10 border border-amber-800/30 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Target size={13} className="text-amber-400 shrink-0"/>
            <span className="text-amber-300 font-semibold text-xs">Buyer Gap Opportunity</span>
            <span className="text-gray-500 text-xs">— {buyerGapDeals.length} strong deal{buyerGapDeals.length!==1?'s':''} with no matched buyers. Find buyers, JV out, or blast to outside networks.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {buyerGapDeals.map((d:any)=>(
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

      {/* Market Coverage — deals per market, buyers per market, gaps */}
      {marketCoverage.length>0&&(
        <div className="border border-amber-800/25 rounded-xl overflow-hidden" style={{background:'rgba(120,80,0,0.04)'}}>
          <button onClick={()=>setShowGaps(!showGaps)} className="w-full px-4 py-2.5 flex items-center gap-2 text-left hover:bg-amber-900/8 transition">
            <BarChart3 size={12} className="text-amber-400 shrink-0"/>
            <span className="text-amber-300 text-xs font-medium shrink-0">
              Buyer Coverage Gaps: {gapMarkets.length} market{gapMarkets.length!==1?'s':''} need buyers
            </span>
            <span className="text-amber-600/70 text-xs truncate flex-1 hidden sm:block">
              {gapMarkets.slice(0,3).map((m:any)=>`${m.market.split(',')[0]}: ${shortNeed(m.need)}`).join('  ·  ')}
            </span>
            <span className="text-xs text-amber-700 bg-amber-900/30 px-1.5 py-0.5 rounded shrink-0">{marketCoverage.length} markets</span>
            {showGaps?<ChevronUp size={11} className="text-amber-600 shrink-0"/>:<ChevronDown size={11} className="text-amber-600 shrink-0"/>}
          </button>
          {showGaps&&(
            <div className="px-4 pb-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              {marketCoverage.map((m:any,i:number)=>{
                const hasGap = m.buyers===0;
                const cov = m.buyers>=10?'Strong':m.buyers>=5?'Moderate':m.buyers>=1?'Weak':'Gap';
                const cc = cov==='Strong'?'text-green-400':cov==='Moderate'?'text-blue-400':cov==='Weak'?'text-amber-400':'text-red-400';
                return (
                  <div key={i} className={`rounded-lg p-3 border text-xs ${hasGap?'bg-red-900/15 border-red-800/30':'bg-gray-900/60 border-gray-800/50'}`}>
                    <div className="flex items-start justify-between mb-1.5">
                      <p className="text-white font-semibold text-sm">{m.market}</p>
                      <span className={`font-medium ${cc}`}>{cov}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-1.5">
                      <div><span className="text-gray-500">Deals</span><span className="text-white ml-1 font-medium">{m.deals}</span></div>
                      <div><span className="text-gray-500">Top Score</span><span className="text-white ml-1 font-medium">{m.topScore}</span></div>
                      <div><span className="text-gray-500">Buyers</span><span className={`ml-1 font-medium ${m.buyers===0?'text-red-400':'text-white'}`}>{m.buyers}</span></div>
                      <div><span className="text-gray-500">Tier 1</span><span className={`ml-1 font-medium ${m.tier1===0?'text-red-400':'text-white'}`}>{m.tier1}</span></div>
                    </div>
                    {hasGap&&m.need&&<p className="text-amber-400/70 leading-snug">{shortNeed(m.need)}</p>}
                    {!hasGap&&<p className={`${cc} opacity-70`}>Coverage OK</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sort */}
      <AnimatePresence>
        {showFilters&&(
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="bg-gray-900 rounded-xl px-4 py-3 border border-gray-800">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-gray-500 text-xs font-medium">Sort by</label>
              {[['dealPriorityScore','Priority Score'],['matchedBuyerCount','Buyer Count'],['closingDate','Closing Date'],['createdAt','Newest First']].map(([v,l])=>(
                <button key={v} onClick={()=>setSortBy(v)} className={`px-3 py-1 rounded-lg text-xs transition ${sortBy===v?'bg-blue-600 text-white':'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>{l}</button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pipeline Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto w-full">
        <div style={{minWidth:'1200px'}}>

          {/* Column headers */}
          <div className="grid border-b border-gray-700 bg-gray-800/60 text-gray-500 text-xs font-semibold uppercase tracking-wide" style={{gridTemplateColumns:COLS}}>
            {HDRS.map((h,i)=><div key={h} className={`px-2 py-3 whitespace-nowrap ${i===1?'text-left':'text-center'}`}>{h}</div>)}
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
                const sc = deal.dealPriorityScore||0;
                const t = tier(sc);
                const r = readiness(deal);
                const b = deal.matchedBuyerCount||0;
                const t1 = deal.tier1MatchCount||0;
                const dm = demand(b);
                const dl = deadline(deal);
                const ab = actionBtn(deal, sc);
                const sig = signal(deal);

                const ests = [deal.zillowEstimate,deal.realtorEstimate,deal.redfinEstimate,deal.rentcastEstimate].filter((v):v is number=>typeof v==='number'&&v>0);
                const avgP = ests.length>0 ? Math.round(ests.reduce((a,x)=>a+x,0)/ests.length) : null;
                const refV = avgP||(deal.arv>0?deal.arv:null);
                const p70 = refV ? Math.round(refV*0.7) : null;
                const under = p70&&deal.askingPrice ? deal.askingPrice<=p70 : null;

                const t2count = t1>0 ? Math.max(0,Math.round((b-t1)*0.6)) : Math.round(b*0.6);
                const t3count = t1>0 ? Math.max(0,Math.round((b-t1)*0.4)) : Math.round(b*0.4);
                return (
                  <motion.div key={deal.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.02}}
                    className={`group transition-colors ${t.hot?'border-l-[3px] border-orange-500/80 bg-orange-950/10 hover:bg-orange-950/20':'border-l-[3px] border-transparent hover:bg-gray-800/30'}`}>
                    <div className="grid items-center h-11" style={{gridTemplateColumns:COLS}}>

                      {/* Score */}
                      <div className="flex items-center justify-start px-2">
                        <div className={`border-l-[3px] pl-2 ${t.bdr}`}>
                          <p className={`text-sm font-bold leading-none ${t.t}`}>{sc||'—'}</p>
                          <p className={`text-[10px] ${t.t} opacity-60 leading-tight`}>{t.l}</p>
                        </div>
                      </div>

                      {/* Address */}
                      <Link href={`/dashboard/deals/${deal.id}`} className="px-2 flex flex-col justify-center group/row min-w-0">
                        <p className="text-white font-semibold text-xs group-hover/row:text-blue-300 transition truncate leading-tight">{deal.address||'No address'}</p>
                        <p className="text-gray-500 text-[10px] truncate leading-tight">{[deal.city,deal.state,deal.zipCode].filter(Boolean).join(', ')}</p>
                      </Link>


                      {/* Beds/Baths */}
                      <div className="px-2 flex items-center">
                        {deal.beds ? <span className="text-gray-300 text-xs">{deal.beds}bd/{deal.baths}ba</span> : <span className="text-gray-700 text-xs">—</span>}
                      </div>

                      {/* Sqft */}
                      <div className="px-2 flex items-center">
                        {deal.sqft ? <span className="text-gray-300 text-xs">{deal.sqft.toLocaleString()}</span> : <span className="text-gray-700 text-xs">—</span>}
                      </div>

                      {/* Status */}
                      <div className="px-2 flex items-center justify-center relative group/status">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap font-medium cursor-default ${SC[deal.status||'DRAFT']||'bg-gray-800 text-gray-400'}`}>{(deal.status||'DRAFT').replace(/_/g,' ')}</span>
                        <div className="absolute left-0 top-7 z-50 hidden group-hover/status:block bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl w-48">
                          <p className="text-white text-[11px] font-semibold mb-0.5">{(deal.status||'DRAFT').replace(/_/g,' ')}</p>
                          <p className="text-gray-400 text-[10px] leading-snug">{{
                            DRAFT:'Not ready — still being filled out.',
                            NEEDS_INFO:'Missing key details like price, photos, or access info.',
                            READY_TO_MATCH:'Info complete — ready to run AI buyer matching.',
                            MATCHED:'Buyers have been matched. Review and blast.',
                            READY_TO_BLAST:'Matched and ready to send to your buyer list.',
                            CAMPAIGN_ACTIVE:'Blast is live — buyers are being contacted now.',
                            OFFER_RECEIVED:'At least one buyer has made an offer.',
                            ACTIVE:'Active deal in progress.',
                          }[(deal.status||'DRAFT') as string]||'No description available.'}</p>
                        </div>
                      </div>

                      {/* Ask */}
                      <div className="px-2 flex items-center justify-center">
                        <span className="text-white font-bold text-xs">{deal.askingPrice?formatCurrency(deal.askingPrice):'—'}</span>
                      </div>

                      {/* 70% */}
                      <div className="px-2 flex flex-col items-end justify-center">
                        {p70 ? (
                          <>
                            <span className={`font-bold text-xs ${under?'text-green-400':'text-amber-400'}`}>{formatCurrency(p70)}</span>
                            <span className={`text-[10px] leading-tight ${under?'text-green-600':'text-amber-600'}`}>{under?'✓ Under':'Over'}</span>
                          </>
                        ) : <span className="text-gray-700 text-xs">—</span>}
                      </div>

                      {/* Public Val */}
                      <div className="px-2 flex flex-col items-end justify-center">
                        {avgP ? (
                          <>
                            <span className="text-blue-300 text-xs font-medium">{formatCurrency(avgP)}</span>
                            <span className="text-gray-600 text-[10px]">{ests.length} est.</span>
                          </>
                        ) : <Link href={`/dashboard/deals/${deal.id}`} className="text-gray-700 text-[10px] hover:text-blue-400 transition">+ Add</Link>}
                      </div>

                      {/* ARV */}
                      <div className="px-2 flex items-center justify-end">
                        {deal.arv>0 ? <span className="text-teal-300 text-xs font-medium">{formatCurrency(deal.arv)}</span> : <span className="text-gray-700 text-xs">—</span>}
                      </div>

                      {/* Deadline */}
                      <div className="px-2 flex flex-col items-center justify-center">
                        {dl ? (
                          <>
                            <span className={`text-xs font-bold leading-tight ${dl.color}`}>{dl.txt}</span>
                            {dl.urgent&&<span className="text-[10px] text-red-500 leading-tight">⚠ urgent</span>}
                          </>
                        ) : <Link href={`/dashboard/deals/${deal.id}`} className="text-gray-700 text-[10px] hover:text-amber-400 transition">+ COE</Link>}
                      </div>

                      {/* Buyers */}
                      <div className="px-2 flex items-center justify-center relative group/buyers">
                        {b>0 ? (
                          <>
                            <span className={`text-sm font-bold cursor-default ${dm.c}`}>{b}</span>
                            <div className="absolute left-8 top-1/2 -translate-y-1/2 z-50 hidden group-hover/buyers:flex flex-col gap-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl min-w-[90px]">
                              {t1>0&&<div className="flex items-center justify-between gap-3"><span className="text-[10px] text-purple-400">Tier 1</span><span className="text-purple-300 text-xs font-bold">{t1}</span></div>}
                              <div className="flex items-center justify-between gap-3"><span className="text-[10px] text-blue-400">Tier 2</span><span className="text-blue-300 text-xs font-bold">{t2count}</span></div>
                              <div className="flex items-center justify-between gap-3"><span className="text-[10px] text-gray-500">Tier 3</span><span className="text-gray-400 text-xs font-bold">{t3count}</span></div>
                            </div>
                          </>
                        ) : <span className="text-red-500 text-sm font-bold">0</span>}
                      </div>

                      {/* Ready */}
                      <div className="px-2 flex items-center justify-center">
                        {r.pct>=85
                          ? <span className="text-[10px] font-semibold text-green-400 bg-green-900/30 border border-green-800/40 px-1.5 py-0.5 rounded-full whitespace-nowrap">✓ Blast Ready</span>
                          : r.blocker==='Photos'
                          ? <span className="text-[10px] font-semibold text-amber-400 bg-amber-900/30 border border-amber-800/40 px-1.5 py-0.5 rounded-full whitespace-nowrap">📷 Add Photos</span>
                          : r.blocker==='Buyers'
                          ? <span className="text-[10px] font-semibold text-red-400 bg-red-900/30 border border-red-800/40 px-1.5 py-0.5 rounded-full whitespace-nowrap">👥 No Buyers</span>
                          : r.blocker==='Value'
                          ? <span className="text-[10px] font-semibold text-blue-400 bg-blue-900/30 border border-blue-800/40 px-1.5 py-0.5 rounded-full whitespace-nowrap">💲 Add Value</span>
                          : r.blocker==='Access'
                          ? <span className="text-[10px] font-semibold text-purple-400 bg-purple-900/30 border border-purple-800/40 px-1.5 py-0.5 rounded-full whitespace-nowrap">🔑 Add Access</span>
                          : <span className="text-[10px] font-semibold text-gray-500 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">+ Fill Info</span>
                        }
                      </div>



                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddDeal&&<AddDealModal onClose={()=>setShowAddDeal(false)} onSuccess={()=>{setShowAddDeal(false);refetch();}}/>}
      </AnimatePresence>
    </div>
  );
}
