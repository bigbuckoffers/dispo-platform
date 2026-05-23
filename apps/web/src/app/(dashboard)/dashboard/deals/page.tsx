'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, Zap, AlertCircle, Plus, Filter, RefreshCw, Target, BarChart3, ChevronDown, ChevronUp, Shield, Camera, ArrowRight } from 'lucide-react';
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
  DRAFT:'Saved but not reviewed.', NEEDS_INFO:'Missing key details.',
  READY_TO_MATCH:'Ready to run buyer matching.', MATCHED:'Buyer match ran — buyers found.',
  READY_TO_BLAST:'Buyers matched + blast requirements met.',
  CAMPAIGN_ACTIVE:'Blast is live.', OFFER_RECEIVED:'Buyer submitted an offer.',
};
const SRC_REL: Record<string,{label:string;color:string}> = {
  NEW_SOURCE:     {label:'New Source',      color:'text-blue-400'},
  TRUSTED_SOURCE: {label:'Trusted ✓',      color:'text-green-400'},
  GOOD_SOURCE:    {label:'Good',            color:'text-green-400'},
  SLOW_RESPONSE:  {label:'Slow Response',   color:'text-amber-400'},
  BAD_INFO_BEFORE:{label:'Bad Info Before', color:'text-orange-400'},
  LOW_QUALITY:    {label:'Low Quality',     color:'text-red-400'},
  CLOSED_BEFORE:  {label:'Closed Before ✓',color:'text-purple-400'},
  BLACKLIST:      {label:'Blacklist',       color:'text-red-500'},
};

function getScoreTier(s: number) {
  if (s>=85) return {label:'🔥 Hot',    text:'text-red-200',    bg:'bg-red-900/70 border-red-600/60',     hot:true};
  if (s>=75) return {label:'Strong',    text:'text-orange-200', bg:'bg-orange-900/60 border-orange-700/50',hot:false};
  if (s>=60) return {label:'Workable',  text:'text-yellow-200', bg:'bg-yellow-900/50 border-yellow-700/40',hot:false};
  if (s>=40) return {label:'Needs Info',text:'text-blue-300',   bg:'bg-blue-900/50 border-blue-700/40',   hot:false};
  return          {label:'Weak',        text:'text-gray-400',   bg:'bg-gray-800 border-gray-700',          hot:false};
}

function getReadiness(deal: any) {
  const checks = [
    {name:'Photos',     pts:20, ok:!!(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length)},
    {name:'Access',     pts:15, ok:!!deal.accessInfo},
    {name:'Description',pts:10, ok:!!deal.description},
    {name:'Ask price',  pts:15, ok:!!deal.askingPrice},
    {name:'Value est.', pts:15, ok:!!(deal.zillowEstimate||deal.realtorEstimate||deal.redfinEstimate||deal.rentcastEstimate||deal.arv)},
    {name:'Source conf.',pts:10,ok:!!(deal.sourceName||deal.sourceType==='OWN')},
    {name:'Permission', pts:5,  ok:deal.sourceType==='OWN'||!!(deal.dealSource?.permissionToMarket)},
    {name:'Buyers',     pts:10, ok:(deal.matchedBuyerCount||0)>0},
  ];
  const total = checks.reduce((s,c)=>s+c.pts,0);
  const earned = checks.filter(c=>c.ok).reduce((s,c)=>s+c.pts,0);
  const pct = Math.round((earned/total)*100);
  const blocker = checks.find(c=>!c.ok)?.name||null;
  const bar = pct>=85?'bg-green-500':pct>=65?'bg-amber-500':pct>=45?'bg-orange-500':'bg-red-500';
  const txt = pct>=85?'text-green-400':pct>=65?'text-amber-400':pct>=45?'text-orange-400':'text-red-400';
  return {pct, blocker, bar, txt};
}

function getDemand(deal: any) {
  const b = deal.matchedBuyerCount||0;
  if (b>=15) return {label:'Strong Demand',   txt:'text-green-300',  bg:'bg-green-900/30 border-green-700/30'};
  if (b>=8)  return {label:'Moderate Demand', txt:'text-blue-300',   bg:'bg-blue-900/30 border-blue-700/30'};
  if (b>=3)  return {label:'Some Interest',   txt:'text-amber-300',  bg:'bg-amber-900/30 border-amber-700/30'};
  if (b>=1)  return {label:'Weak Coverage',   txt:'text-orange-300', bg:'bg-orange-900/30 border-orange-700/30'};
  return          {label:'Buyer Gap',          txt:'text-red-400',    bg:'bg-red-900/25 border-red-800/30'};
}

function getSourceBadge(sourceType: string, reliabilityLabel?: string): {text:string;color:string} {
  if (sourceType==='OWN') return {text:'Own Deal', color:'text-green-400'};
  const t: Record<string,string> = {JV:'JV',FACEBOOK:'Facebook',SMS:'SMS',BIRD_DOG:'Bird Dog',WHOLESALER:'Wholesaler',AGENT:'Agent',MANUAL:'Manual'};
  const name = t[sourceType]||sourceType;
  if (!reliabilityLabel) return {text:name, color:'text-gray-500'};
  const rel = SRC_REL[reliabilityLabel];
  return {text:`${name} · ${rel?.label||'Unknown'}`, color:rel?.color||'text-gray-500'};
}

function getActionButton(deal: any, score: number): {label:string;cls:string} {
  const buyers = deal.matchedBuyerCount||0;
  const action = deal.nextBestAction||'';
  if (score>=75&&buyers>=3)                              return {label:'Sell This Deal →',    cls:'bg-blue-600 hover:bg-blue-500 text-white font-semibold'};
  if (deal.status==='READY_TO_BLAST'||action.toLowerCase().includes('blast')) return {label:'Generate Blast →',  cls:'bg-green-800/80 hover:bg-green-700 text-green-200 border border-green-700/50'};
  if (buyers===0||action.toLowerCase().includes('match'))return {label:'Run Match →',         cls:'bg-blue-900/60 hover:bg-blue-900/80 text-blue-200 border border-blue-700/40'};
  if (action.toLowerCase().includes('photo'))            return {label:'Request Photos →',    cls:'bg-amber-900/60 hover:bg-amber-900/80 text-amber-200 border border-amber-700/40'};
  if (action.toLowerCase().includes('buyer'))            return {label:'Find Buyers →',       cls:'bg-orange-900/60 hover:bg-orange-900/80 text-orange-200 border border-orange-700/40'};
  if (action.toLowerCase().includes('public')||action.toLowerCase().includes('zillow')) return {label:'Add Values →', cls:'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600'};
  if (action.toLowerCase().includes('permission')||action.toLowerCase().includes('jv')) return {label:'Confirm JV →', cls:'bg-purple-900/60 hover:bg-purple-900/80 text-purple-200 border border-purple-700/40'};
  return {label:'Review Deal →', cls:'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600'};
}

function getRead(deal: any): string {
  const b = deal.matchedBuyerCount||0;
  const t1 = deal.tier1MatchCount||0;
  const hasPhotos = !!(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length);
  const r = getReadiness(deal);
  if (b>=10&&r.pct>=75) return `${b} buyers matched${t1>0?`, ${t1} Tier 1`:''}. Mostly ready to sell.`;
  if (b>=5&&!hasPhotos) return `${b} buyers matched. Needs photos before blast.`;
  if (b>=5) return `${b} buyers matched${t1>0?`, ${t1} Tier 1`:''}. ${r.pct}% ready.`;
  if (b===0&&(deal.dealPriorityScore||0)>=60) return `Good price but buyer gap in ${deal.city||'this market'}.`;
  if (!hasPhotos&&(deal.dealPriorityScore||0)>=50) return `Needs photos and public values before marketing.`;
  if (r.blocker) return `Needs ${r.blocker.toLowerCase()} before moving forward.`;
  return `Score ${deal.dealPriorityScore||0} — ${deal.missingInfoCount||0} fields missing.`;
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
  if (l.includes('section 8')) return 'Section 8 / heavy rehab buyers';
  if (l.includes('subto')) return 'Subto buyers';
  if (l.includes('flip')) return 'fix & flip buyers';
  if (l.includes('cash')) return 'cash buyers';
  return need.slice(0,50)+(need.length>50?'…':'');
}

function StatusBadge({status}: {status:string}) {
  const [show,setShow]=useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <span className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap cursor-default ${STATUS_COLORS[status]||'bg-gray-800 text-gray-400'}`}>{(status||'DRAFT').replace(/_/g,' ')}</span>
      {show&&STATUS_TIPS[status]&&(
        <div className="absolute bottom-full left-0 mb-2 z-50 w-44 bg-gray-800 border border-gray-600 rounded-lg p-2 shadow-xl pointer-events-none">
          <p className="text-gray-200 text-xs">{STATUS_TIPS[status]}</p>
          <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-800"/>
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
      const key=d.marketKey||`${d.city||'?'}, ${d.state||''}`;
      if(!map[key]) map[key]={market:key,buyers:0,gapScore:0,need:''};
      map[key].buyers=Math.max(map[key].buyers,d.matchedBuyerCount||0);
      map[key].gapScore=Math.max(map[key].gapScore,d.buyerGapScore||0);
      if(d.marketBuyerNeedRecommendation) map[key].need=d.marketBuyerNeedRecommendation;
    }
    return Object.values(map).filter((m:any)=>m.buyers===0).sort((a:any,b:any)=>b.gapScore-a.gapScore).slice(0,4);
  },[deals]);

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

      {/* Summary Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
        {[
          {label:'Active',      value:stats.total,        icon:Building2, color:'text-white'},
          {label:'Ready Match', value:stats.match||'—',   icon:Target,    color:'text-blue-400'},
          {label:'Ready Blast', value:stats.blast||'—',   icon:Zap,       color:'text-green-400'},
          {label:'Trusted Src', value:stats.trusted||'—', icon:Shield,    color:'text-purple-400'},
          {label:'Has Buyers',  value:stats.buyers||'—',  icon:Users,     color:'text-orange-400'},
          {label:'Need Photos', value:stats.noPhoto||'—', icon:Camera,    color:'text-amber-400'},
        ].map(s=>(
          <div key={s.label} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <s.icon size={13} className={`${s.color} mb-1.5`}/>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Buyer Coverage Gap Strip */}
      {marketGaps.length > 0 && (
        <div className="border border-amber-800/25 rounded-xl overflow-hidden" style={{background:'rgba(120,80,0,0.04)'}}>
          <button onClick={()=>setShowGaps(!showGaps)} className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-amber-900/8 transition text-left">
            <BarChart3 size={12} className="text-amber-400 shrink-0"/>
            <span className="text-amber-300 text-xs font-medium shrink-0">Buyer Coverage Gaps:</span>
            <span className="text-amber-600/80 text-xs truncate flex-1">
              {marketGaps.map((m:any)=>`${m.market.split(',')[0]}: ${shortNeed(m.need)}`).join('  ·  ')}
            </span>
            <div className="shrink-0 flex items-center gap-1">
              <span className="text-xs text-amber-700 bg-amber-900/30 px-1.5 py-0.5 rounded">{marketGaps.length}</span>
              {showGaps?<ChevronUp size={11} className="text-amber-600"/>:<ChevronDown size={11} className="text-amber-600"/>}
            </div>
          </button>
          {showGaps&&(
            <div className="px-4 pb-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              {marketGaps.map((m:any,i:number)=>(
                <div key={i} className="bg-gray-900/60 rounded-lg p-2.5 border border-gray-800/50 text-xs">
                  <p className="text-white font-medium mb-0.5">{m.market}</p>
                  <p className="text-red-400">0 buyers</p>
                  {m.need&&<p className="text-amber-500/70 mt-0.5">{shortNeed(m.need)}</p>}
                </div>
              ))}
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
        <div className="hidden xl:grid gap-3 px-4 py-2.5 border-b border-gray-800 bg-gray-800/50 text-gray-500 text-xs font-medium"
          style={{gridTemplateColumns:'88px 1fr 80px 88px 88px 130px 110px 140px'}}>
          {['Score','Property + Deal','Ask','70% Value','Public Val','Buyers','Ready','Action'].map(h=>(
            <span key={h}>{h}</span>
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
              const ready = getReadiness(deal);
              const demand = getDemand(deal);
              const src = getSourceBadge(deal.sourceType||'MANUAL', deal.dealSource?.reliabilityLabel);
              const action = getActionButton(deal, score);
              const read = getRead(deal);
              const age = getAgeLabel(deal);
              const buyers = deal.matchedBuyerCount||0;
              const tier1 = deal.tier1MatchCount||0;

              const estimates = [deal.zillowEstimate,deal.realtorEstimate,deal.redfinEstimate,deal.rentcastEstimate]
                .filter((v):v is number=>typeof v==='number'&&v>0);
              const avgPublic = estimates.length>0 ? Math.round(estimates.reduce((a,b)=>a+b,0)/estimates.length) : null;
              const refVal = avgPublic || (deal.arv>0?deal.arv:null);
              const seventyPct = refVal ? Math.round(refVal*0.7) : null;
              const underSeventy = seventyPct&&deal.askingPrice ? deal.askingPrice<=seventyPct : null;

              return (
                <motion.div key={deal.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.03}}
                  className={`group transition ${tier.hot?'border-l-[3px] border-orange-500/70 bg-gradient-to-r from-orange-900/10 to-transparent hover:from-orange-900/15':'border-l-[3px] border-transparent hover:bg-gray-800/20'}`}>

                  {/* ── DESKTOP GRID ── */}
                  <div className="hidden xl:grid gap-3 px-4 py-4 items-start"
                    style={{gridTemplateColumns:'88px 1fr 80px 88px 88px 130px 110px 140px'}}>

                    {/* Score */}
                    <div className={`rounded-xl border px-2 py-2 text-center ${tier.bg}`}>
                      <p className={`text-2xl font-bold leading-none ${tier.text}`}>{score||'—'}</p>
                      <p className={`text-xs mt-1 font-medium ${tier.text} opacity-90`}>{tier.label}</p>
                    </div>

                    {/* Property + Deal */}
                    <Link href={`/dashboard/deals/${deal.id}`} className="block min-w-0 group/row">
                      <div className="flex items-start gap-2 mb-0.5">
                        <p className="text-white font-bold text-sm group-hover/row:text-blue-300 transition leading-snug">{deal.address||'No address'}</p>
                        {age&&<span className={`text-xs shrink-0 font-medium ${age.color} mt-0.5`}>{age.text}</span>}
                      </div>
                      <p className="text-gray-300 text-xs mb-0.5">{[deal.city,deal.state,deal.zipCode].filter(Boolean).join(', ')}</p>
                      {(deal.beds||deal.sqft)&&(
                        <p className="text-gray-400 text-xs mb-1.5">
                          {[deal.beds&&`${deal.beds}bd / ${deal.baths}ba`, deal.sqft&&`${deal.sqft.toLocaleString()} sqft`].filter(Boolean).join('  ·  ')}
                        </p>
                      )}
                      <p className="text-gray-500 text-xs italic leading-snug mb-2">{read}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={deal.status||'DRAFT'}/>
                        {deal.dealType&&<span className="text-xs text-indigo-400 font-medium">{deal.dealType}</span>}
                        {deal.overallCondition&&deal.overallCondition!=='UNKNOWN'&&(
                          <span className="text-xs text-gray-600">{deal.overallCondition.replace(/_/g,' ')}</span>
                        )}
                        <span className={`text-xs ${src.color}`}>{src.text}</span>
                      </div>
                    </Link>

                    {/* Ask */}
                    <div className="text-right pt-1">
                      <p className="text-white font-bold text-sm">{deal.askingPrice?formatCurrency(deal.askingPrice):'TBD'}</p>
                      {deal.repairEstimate>0&&<p className="text-gray-600 text-xs mt-0.5">Repairs:<br/>{formatCurrency(deal.repairEstimate)}</p>}
                    </div>

                    {/* 70% Value */}
                    <div className="text-right pt-1">
                      {seventyPct ? (
                        <>
                          <p className={`font-bold text-sm ${underSeventy?'text-green-400':'text-amber-400'}`}>{formatCurrency(seventyPct)}</p>
                          <p className={`text-xs mt-0.5 ${underSeventy?'text-green-600':'text-amber-600'}`}>{underSeventy?'Under 70%':'Over 70%'}</p>
                          {!avgPublic&&deal.arv>0&&<p className="text-gray-700 text-xs">from ARV</p>}
                        </>
                      ) : <span className="text-gray-700 text-xs">—</span>}
                    </div>

                    {/* Public Value */}
                    <div className="text-right pt-1">
                      {avgPublic ? (
                        <>
                          <p className="text-blue-300 text-sm font-medium">{formatCurrency(avgPublic)}</p>
                          <p className="text-gray-600 text-xs mt-0.5">{estimates.length} est.</p>
                        </>
                      ) : (
                        <Link href={`/dashboard/deals/${deal.id}`} onClick={e=>e.stopPropagation()} className="text-gray-600 text-xs hover:text-blue-400 transition leading-relaxed">
                          Add Zillow/<br/>Redfin
                        </Link>
                      )}
                    </div>

                    {/* Buyers */}
                    <div className="pt-1">
                      {buyers>0 ? (
                        <div className={`rounded-lg border px-2 py-1.5 ${demand.bg}`}>
                          <p className={`text-base font-bold ${demand.txt}`}>{buyers} Buyers</p>
                          {tier1>0&&<p className={`text-xs ${demand.txt} opacity-80`}>{tier1} Tier 1</p>}
                          <p className={`text-xs ${demand.txt} opacity-70 mt-0.5`}>{demand.label}</p>
                        </div>
                      ) : (
                        <div className="rounded-lg border bg-red-900/20 border-red-800/30 px-2 py-1.5">
                          <p className="text-red-400 text-sm font-bold">0 Buyers</p>
                          <p className="text-red-500 text-xs mt-0.5">Buyer Gap</p>
                        </div>
                      )}
                    </div>

                    {/* Readiness */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-bold ${ready.txt}`}>{ready.pct}%</span>
                        {ready.pct>=85&&<span className="text-green-500 text-xs">Blast Ready</span>}
                      </div>
                      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mb-1">
                        <div className={`h-full rounded-full transition-all ${ready.bar}`} style={{width:`${ready.pct}%`}}/>
                      </div>
                      {ready.blocker&&<p className="text-gray-600 text-xs">Missing: {ready.blocker}</p>}
                    </div>

                    {/* Action */}
                    <div className="pt-1">
                      <Link href={`/dashboard/deals/${deal.id}`}
                        className={`inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs transition w-full text-center ${action.cls}`}>
                        {action.label}
                      </Link>
                    </div>
                  </div>

                  {/* ── MOBILE ── */}
                  <Link href={`/dashboard/deals/${deal.id}`} className="xl:hidden block p-4">
                    <div className="flex gap-3">
                      <div className={`rounded-xl border px-2 py-1.5 text-center shrink-0 w-14 ${tier.bg}`}>
                        <p className={`text-lg font-bold leading-none ${tier.text}`}>{score||'—'}</p>
                        <p className={`text-xs ${tier.text} opacity-80`}>{tier.label.replace('🔥 ','')}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm leading-snug">{deal.address}</p>
                        <p className="text-gray-400 text-xs">{[deal.city,deal.state].filter(Boolean).join(', ')}</p>
                        <p className="text-gray-500 text-xs italic mt-1">{read}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <StatusBadge status={deal.status||'DRAFT'}/>
                          {buyers>0?<span className={`text-xs font-bold ${demand.txt}`}>{buyers} buyers</span>:<span className="text-xs text-red-400">Buyer gap</span>}
                          <span className={`text-xs ${ready.txt}`}>{ready.pct}% ready</span>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        {deal.askingPrice&&<p className="text-white text-sm font-bold">{formatCurrency(deal.askingPrice)}</p>}
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition ${action.cls}`}>{action.label}</span>
                      </div>
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
