'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, Zap, AlertCircle, Plus, Filter,
  ChevronRight, MapPin, RefreshCw, Target, BarChart3,
  ChevronDown, ChevronUp, Shield, Camera, ArrowRight, Info
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import Link from 'next/link';
import AddDealModal from '@/components/deal/AddDealModal';

// ── helpers ──────────────────────────────────────────────────────

const STATUS_COLORS: Record<string,string> = {
  DRAFT:'bg-gray-700 text-gray-400', NEEDS_INFO:'bg-amber-900/50 text-amber-300',
  READY_TO_MATCH:'bg-blue-900/50 text-blue-300', MATCHED:'bg-purple-900/50 text-purple-300',
  READY_TO_BLAST:'bg-green-900/50 text-green-300', CAMPAIGN_ACTIVE:'bg-emerald-900/50 text-emerald-400',
  OFFER_RECEIVED:'bg-orange-900/50 text-orange-300', ACTIVE:'bg-blue-900/50 text-blue-300',
  CLOSED:'bg-gray-700 text-gray-400', DEAD:'bg-red-900/40 text-red-500',
};
const STATUS_TIPS: Record<string,string> = {
  DRAFT:'Saved but not reviewed.', NEEDS_INFO:'Missing key details.',
  READY_TO_MATCH:'Ready to run buyer matching.',
  MATCHED:'Buyer match ran, buyers found.',
  READY_TO_BLAST:'Buyers matched + all blast requirements met.',
  CAMPAIGN_ACTIVE:'Blast is live.', OFFER_RECEIVED:'A buyer submitted an offer.',
};
const SRC_BADGE: Record<string,{label:string;cls:string}> = {
  NEW_SOURCE:     {label:'New Source',      cls:'bg-blue-900/40 text-blue-300 border-blue-700/40'},
  TRUSTED_SOURCE: {label:'Trusted',         cls:'bg-green-900/40 text-green-300 border-green-700/40'},
  GOOD_SOURCE:    {label:'Good',            cls:'bg-green-900/30 text-green-400 border-green-800/40'},
  SLOW_RESPONSE:  {label:'Slow Response',   cls:'bg-amber-900/40 text-amber-300 border-amber-700/40'},
  BAD_INFO_BEFORE:{label:'Bad Info Before', cls:'bg-orange-900/40 text-orange-300 border-orange-700/40'},
  LOW_QUALITY:    {label:'Low Quality',     cls:'bg-red-900/40 text-red-300 border-red-700/40'},
  CLOSED_BEFORE:  {label:'Closed Before',   cls:'bg-purple-900/40 text-purple-300 border-purple-700/40'},
  BLACKLIST:      {label:'Blacklist',       cls:'bg-red-900/60 text-red-200 border-red-600'},
};

function getOpportunityLabel(deal: any): {label:string;color:string;bg:string} {
  const score = deal.dealPriorityScore || 0;
  const buyers = deal.matchedBuyerCount || 0;
  const tier1 = deal.tier1MatchCount || 0;
  const blast = getBlastReadiness(deal);
  const badSource = ['BAD_INFO_BEFORE','LOW_QUALITY','BLACKLIST'].includes(deal.dealSource?.reliabilityLabel);
  const missing = deal.missingInfoCount || 0;

  if (badSource) return {label:'⚠ Needs Work',    color:'text-red-300',    bg:'bg-red-900/40 border-red-700/40'};
  if (score >= 80 && buyers >= 5 && blast.pct >= 70)
    return {label:'🔥 Hot Opportunity', color:'text-red-200',    bg:'bg-red-900/60 border-red-600/60'};
  if (score >= 70 && buyers >= 3 && blast.pct >= 60)
    return {label:'💰 Strong Dispo Play',color:'text-orange-200', bg:'bg-orange-900/50 border-orange-700/50'};
  if (deal.status === 'READY_TO_BLAST' && buyers > 0)
    return {label:'✅ Ready to Sell',   color:'text-green-200',  bg:'bg-green-900/50 border-green-700/50'};
  if (score >= 60 && missing <= 2)
    return {label:'👀 Worth Reviewing', color:'text-blue-200',   bg:'bg-blue-900/40 border-blue-700/40'};
  if (missing > 3 || score < 40)
    return {label:'🧊 Cold / Not Ready',color:'text-gray-400',   bg:'bg-gray-800 border-gray-700'};
  return {label:'⚠ Needs Work',        color:'text-amber-300',  bg:'bg-amber-900/40 border-amber-700/40'};
}

function getBlastReadiness(deal: any) {
  const checks = [
    {name:'Photos',              pts:20, ok:!!(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length)},
    {name:'Access info',         pts:15, ok:!!deal.accessInfo},
    {name:'Description',         pts:10, ok:!!deal.description},
    {name:'Asking price',        pts:15, ok:!!deal.askingPrice},
    {name:'Public estimate',     pts:15, ok:!!(deal.zillowEstimate||deal.realtorEstimate||deal.redfinEstimate||deal.rentcastEstimate||deal.arv)},
    {name:'Source confirmed',    pts:10, ok:!!(deal.sourceName||deal.sourceType==='OWN')},
    {name:'Permission to market',pts:5,  ok:deal.sourceType==='OWN'||!!(deal.dealSource?.permissionToMarket)},
    {name:'Buyer matches',       pts:10, ok:(deal.matchedBuyerCount||0)>0},
  ];
  const total = checks.reduce((s,c)=>s+c.pts,0);
  const earned = checks.filter(c=>c.ok).reduce((s,c)=>s+c.pts,0);
  const pct = Math.round((earned/total)*100);
  const missing = checks.filter(c=>!c.ok).map(c=>c.name);
  const color = pct>=85?'text-green-400':pct>=65?'text-amber-400':pct>=45?'text-orange-400':'text-red-400';
  const bar = pct>=85?'bg-green-500':pct>=65?'bg-amber-500':pct>=45?'bg-orange-500':'bg-red-500';
  const label = pct>=85?`${pct}% ready`:missing[0]?`${pct}% — needs ${missing[0]}`:`${pct}%`;
  return {pct,label,color,bar,missing};
}

function getBuyerDemand(deal: any): {label:string;color:string;cls:string} {
  const b = deal.matchedBuyerCount || 0;
  const t = deal.tier1MatchCount || 0;
  if (b >= 15) return {label:'Strong buyer demand', color:'text-green-300', cls:'bg-green-900/40 text-green-300 border-green-700/40'};
  if (b >= 8)  return {label:'Moderate demand',     color:'text-blue-300',  cls:'bg-blue-900/40 text-blue-300 border-blue-700/40'};
  if (b >= 3)  return {label:'Some interest',       color:'text-amber-300', cls:'bg-amber-900/40 text-amber-300 border-amber-700/40'};
  if (b >= 1)  return {label:'Weak demand',         color:'text-orange-300',cls:'bg-orange-900/40 text-orange-300 border-orange-700/40'};
  return {label:'Buyer gap',                         color:'text-red-400',   cls:'bg-red-900/30 text-red-300 border-red-800/40'};
}

function getSourceLabel(sourceType: string, reliabilityLabel?: string): {combined:string;cls:string} {
  if (sourceType==='OWN') return {combined:'Own Deal',cls:'bg-green-900/30 text-green-400 border-green-800/40'};
  const typeMap: Record<string,string> = {JV:'JV',FACEBOOK:'Facebook',SMS:'SMS',BIRD_DOG:'Bird Dog',WHOLESALER:'Wholesaler',AGENT:'Agent',MANUAL:'Manual'};
  const typeName = typeMap[sourceType]||sourceType;
  if (!reliabilityLabel) return {combined:typeName, cls:'bg-gray-800 text-gray-400 border-gray-700'};
  const rel = SRC_BADGE[reliabilityLabel];
  if (!rel) return {combined:typeName, cls:'bg-gray-800 text-gray-400 border-gray-700'};
  return {combined:`${typeName} · ${rel.label}`, cls:rel.cls};
}

function getActionButton(deal: any): {label:string;color:string} {
  const action = deal.nextBestAction||'';
  const buyers = deal.matchedBuyerCount||0;
  const opp = getOpportunityLabel(deal);

  if (opp.label.includes('Hot') || opp.label.includes('Ready to Sell')) return {label:'Review Deal',color:'text-white bg-blue-600 hover:bg-blue-500'};
  if (action.toLowerCase().includes('blast')||deal.status==='READY_TO_BLAST') return {label:'Generate blast',color:'text-green-200 bg-green-900/60 hover:bg-green-900/80 border border-green-700/50'};
  if (action.toLowerCase().includes('match')||buyers===0) return {label:'Run buyer match',color:'text-blue-200 bg-blue-900/50 hover:bg-blue-900/70 border border-blue-700/40'};
  if (action.toLowerCase().includes('photo')) return {label:'Request photos',color:'text-amber-200 bg-amber-900/50 hover:bg-amber-900/70 border border-amber-700/40'};
  if (action.toLowerCase().includes('public')||action.toLowerCase().includes('estimate')) return {label:'Add public values',color:'text-blue-200 bg-blue-900/40 hover:bg-blue-900/60 border border-blue-700/40'};
  if (action.toLowerCase().includes('follow')) return {label:'Send follow-up',color:'text-amber-200 bg-amber-900/50 hover:bg-amber-900/70 border border-amber-700/40'};
  if (action.toLowerCase().includes('permission')||action.toLowerCase().includes('jv')) return {label:'Confirm JV permission',color:'text-purple-200 bg-purple-900/50 hover:bg-purple-900/70 border border-purple-700/40'};
  if (action.toLowerCase().includes('find buyer')) return {label:'Find buyers',color:'text-orange-200 bg-orange-900/50 hover:bg-orange-900/70 border border-orange-700/40'};
  return {label:'Review deal',color:'text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700'};
}

function getOpportunityReason(deal: any): string {
  const buyers = deal.matchedBuyerCount||0;
  const tier1 = deal.tier1MatchCount||0;
  const blast = getBlastReadiness(deal);
  const hasPhotos = !!(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length);
  const opp = getOpportunityLabel(deal);

  if (opp.label.includes('Hot')) {
    const parts = [];
    if (buyers > 0) parts.push(`${buyers} buyers matched${tier1>0?`, ${tier1} Tier 1`:''}`);
    if (deal.dealType) parts.push(deal.dealType.toLowerCase());
    if (deal.overallCondition&&deal.overallCondition!=='UNKNOWN') parts.push(deal.overallCondition.replace(/_/g,' ').toLowerCase());
    if (blast.pct>=75) parts.push('blast ready');
    return parts.length>0 ? parts.join(' · ') + '.' : 'Strong deal with good buyer coverage.';
  }
  if (opp.label.includes('Strong')) {
    return `${buyers} buyers matched, mostly ready to blast. ${!hasPhotos?'Get photos to finish.':''}`;
  }
  if (opp.label.includes('Ready')) {
    return `Buyers matched and blast requirements met. Ready to send to your list.`;
  }
  if (buyers===0) {
    return `Good deal but no matched buyers yet. Run buyer match or find buyers in ${deal.city||'this market'}.`;
  }
  if (!hasPhotos) {
    return `${buyers>0?`${buyers} buyers matched, but`:'Deal looks solid, but'} missing photos. Buyer blast may convert poorly without them.`;
  }
  return `Score ${deal.dealPriorityScore||0} — ${deal.missingInfoCount||0} missing field${deal.missingInfoCount!==1?'s':''}.`;
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
  if (l.includes('subto')||l.includes('creative')) return 'Subto / creative buyers';
  if (l.includes('flip')) return 'fix & flip buyers';
  if (l.includes('cash')) return 'cash buyers';
  return need.slice(0,40)+(need.length>40?'…':'');
}

function StatusBadge({status}: {status:string}) {
  const [show,setShow]=useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <span className={`text-xs px-2 py-0.5 rounded-full cursor-default whitespace-nowrap ${STATUS_COLORS[status]||'bg-gray-800 text-gray-400'}`}>{(status||'DRAFT').replace(/_/g,' ')}</span>
      {show&&STATUS_TIPS[status]&&(
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-44 bg-gray-800 border border-gray-600 rounded-lg p-2 shadow-xl pointer-events-none">
          <p className="text-gray-200 text-xs">{STATUS_TIPS[status]}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"/>
        </div>
      )}
    </div>
  );
}

// Top Opportunity Card
function OpportunityCard({deal}: {deal:any}) {
  const blast = getBlastReadiness(deal);
  const demand = getBuyerDemand(deal);
  const src = getSourceLabel(deal.sourceType||'MANUAL', deal.dealSource?.reliabilityLabel);
  const reason = getOpportunityReason(deal);
  const actionBtn = getActionButton(deal);
  const buyers = deal.matchedBuyerCount||0;
  const tier1 = deal.tier1MatchCount||0;
  const estimates = [deal.zillowEstimate,deal.realtorEstimate,deal.redfinEstimate,deal.rentcastEstimate].filter((v):v is number=>typeof v==='number'&&v>0);
  const avgPublic = estimates.length>0?estimates.reduce((a,b)=>a+b,0)/estimates.length:null;

  return (
    <Link href={`/dashboard/deals/${deal.id}`} className="block bg-gray-900 border border-gray-700 rounded-xl p-4 hover:border-blue-600/50 hover:bg-gray-800/60 transition group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold text-orange-300">🔥 Top Opportunity</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 font-mono">{deal.dealPriorityScore}</span>
            <StatusBadge status={deal.status||'DRAFT'}/>
          </div>
          <h3 className="text-white font-bold text-base">{deal.address}</h3>
          <p className="text-gray-400 text-xs mt-0.5">{[deal.city,deal.state,deal.zipCode].filter(Boolean).join(', ')} · {deal.dealType||'Wholesale'} · {deal.overallCondition?.replace(/_/g,' ')||'Unknown condition'}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-white font-bold text-lg">{deal.askingPrice?formatCurrency(deal.askingPrice):'TBD'}</p>
          <p className="text-gray-500 text-xs">asking</p>
          {avgPublic&&<p className="text-blue-400 text-xs mt-0.5">avg public: {formatCurrency(avgPublic)}</p>}
        </div>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        {/* Buyer demand */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border ${demand.cls}`}>
          <Users size={11}/>
          <span>{buyers > 0 ? `${buyers} matched${tier1>0?` · ${tier1} Tier 1`:''}` : 'No buyers yet'}</span>
        </div>
        {/* Blast readiness */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border ${blast.pct>=75?'bg-green-900/30 text-green-300 border-green-700/40':blast.pct>=50?'bg-amber-900/30 text-amber-300 border-amber-700/40':'bg-orange-900/30 text-orange-300 border-orange-700/40'}`}>
          <Zap size={11}/>
          <span>{blast.label}</span>
        </div>
        {/* Source */}
        <span className={`text-xs px-2 py-1 rounded-lg border ${src.cls}`}>{src.combined}</span>
      </div>

      {/* Opportunity reason */}
      <div className="bg-gray-800/60 rounded-lg px-3 py-2 mb-3">
        <p className="text-gray-300 text-xs leading-relaxed italic">"{reason}"</p>
      </div>

      {/* Action button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!!(deal.photosUrl||deal.googleDriveUrl) ? <span className="text-xs text-green-500 flex items-center gap-0.5"><Camera size={10}/> Photos</span> : <span className="text-xs text-amber-600 flex items-center gap-0.5"><Camera size={10}/> No Photos</span>}
          <span className={`text-xs ${blast.color}`}>{blast.pct}% blast ready</span>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${actionBtn.color}`}>
          {actionBtn.label} <ArrowRight size={12}/>
        </span>
      </div>
    </Link>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
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
      trusted:deals.filter((d:any)=>d.sourceType==='OWN'||['TRUSTED_SOURCE','GOOD_SOURCE','CLOSED_BEFORE'].includes(d.dealSource?.reliabilityLabel)).length,
      hasBuyers:deals.filter((d:any)=>(d.matchedBuyerCount||0)>=3).length,
      needsInfo:deals.filter((d:any)=>(d.missingInfoCount||0)>2).length,
    };
  },[deals]);

  // Top opportunities — best 2-3 deals with buyers
  const topOpportunities = useMemo(()=>
    deals.filter((d:any)=>{
      const opp = getOpportunityLabel(d);
      return (d.dealPriorityScore||0)>=60
        && !['BLACKLIST','BAD_INFO_BEFORE','LOW_QUALITY'].includes(d.dealSource?.reliabilityLabel||'')
        && (d.matchedBuyerCount||0)>=1;
    }).slice(0,2)
  ,[deals]);

  const marketGaps = useMemo(()=>{
    const map:Record<string,any>={};
    for (const d of deals) {
      if (!d.dealPriorityScore||d.dealPriorityScore<40) continue;
      const key=d.marketKey||`${d.city||'Unknown'}, ${d.state||''}`;
      if(!map[key]) map[key]={market:key,deals:0,totalScore:0,buyers:0,tier1:0,gapScore:0,need:''};
      map[key].deals++;map[key].totalScore+=d.dealPriorityScore||0;
      map[key].buyers=Math.max(map[key].buyers,d.matchedBuyerCount||0);
      map[key].tier1=Math.max(map[key].tier1,d.tier1MatchCount||0);
      map[key].gapScore=Math.max(map[key].gapScore,d.buyerGapScore||0);
      if(d.marketBuyerNeedRecommendation) map[key].need=d.marketBuyerNeedRecommendation;
    }
    return Object.values(map).sort((a:any,b:any)=>b.gapScore-a.gapScore).slice(0,6);
  },[deals]);

  const gapMarkets = marketGaps.filter((m:any)=>m.buyers===0);
  const noBuyerDeals = deals.filter((d:any)=>(d.dealPriorityScore||0)>=55&&(d.matchedBuyerCount||0)===0);

  return (
    <div className="p-5 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Deals</h1>
          <p className="text-gray-500 text-xs mt-0.5">Your dispo pipeline — best opportunities first</p>
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
          {label:'Active',     value:stats.total,           icon:Building2,  color:'text-white'},
          {label:'Ready Match',value:stats.readyToMatch||'—',icon:Target,     color:'text-blue-400'},
          {label:'Ready Blast',value:stats.readyToBlast||'—',icon:Zap,        color:'text-green-400'},
          {label:'Trusted Src',value:stats.trusted||'—',    icon:Shield,      color:'text-purple-400'},
          {label:'Has Buyers', value:stats.hasBuyers||'—',  icon:Users,       color:'text-orange-400'},
          {label:'Needs Info', value:stats.needsInfo||'—',  icon:AlertCircle, color:'text-amber-400'},
        ].map(s=>(
          <div key={s.label} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <s.icon size={13} className={`${s.color} mb-1.5`}/>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* TOP OPPORTUNITIES */}
      {topOpportunities.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-white font-semibold text-sm">Top Opportunities</h2>
            <span className="text-gray-500 text-xs">— Work these first</span>
          </div>
          <div className={`grid gap-3 ${topOpportunities.length>=2?'md:grid-cols-2':'grid-cols-1'}`}>
            {topOpportunities.map((d:any)=><OpportunityCard key={d.id} deal={d}/>)}
          </div>
        </div>
      )}

      {/* Buyer Gap Detected — amber */}
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

      {/* Buyer Coverage Gaps */}
      {marketGaps.length > 0 && (
        <div className="border border-amber-800/25 rounded-xl overflow-hidden" style={{background:'rgba(120,80,0,0.04)'}}>
          <button onClick={()=>setShowGaps(!showGaps)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-900/10 transition">
            <div className="flex items-start gap-2 flex-col sm:flex-row sm:items-center min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <BarChart3 size={13} className="text-amber-400"/>
                <span className="text-amber-300 font-medium text-xs">
                  Buyer Coverage Gaps: {gapMarkets.length>0?`${gapMarkets.length} market${gapMarkets.length!==1?'s':''} need buyers`:`${marketGaps.length} markets tracked`}
                </span>
              </div>
              {!showGaps && gapMarkets.length>0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {gapMarkets.slice(0,3).map((m:any,i:number)=>(
                    <span key={i} className="text-amber-600/80">{m.market.split(',')[0]}: {shortNeed(m.need)}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-xs text-amber-600 bg-amber-900/30 px-2 py-0.5 rounded">{marketGaps.length}</span>
              {showGaps?<ChevronUp size={13} className="text-amber-600"/>:<ChevronDown size={13} className="text-amber-600"/>}
            </div>
          </button>
          {showGaps && (
            <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {marketGaps.map((m:any,i:number)=>{
                const avgScore=m.deals>0?Math.round(m.totalScore/m.deals):0;
                const cov=m.buyers>=10&&m.tier1>=2?'Strong':m.buyers>=5?'Moderate':m.buyers>=1?'Weak':'Gap';
                const cc=cov==='Strong'?'text-green-400':cov==='Moderate'?'text-yellow-400':cov==='Weak'?'text-orange-400':'text-red-400';
                return (
                  <div key={i} className="bg-gray-900/70 rounded-lg p-3 border border-gray-800/60">
                    <div className="flex items-start justify-between mb-1.5"><p className="text-white text-xs font-semibold">{m.market}</p><span className={`text-xs font-medium ${cc}`}>{cov}</span></div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-2">
                      <div><span className="text-gray-600">Deals</span><span className="text-white ml-1">{m.deals}</span></div>
                      <div><span className="text-gray-600">Avg Score</span><span className="text-white ml-1">{avgScore}</span></div>
                      <div><span className="text-gray-600">Buyers</span><span className={`ml-1 ${m.buyers===0?'text-red-400':'text-white'}`}>{m.buyers||'None'}</span></div>
                      <div><span className="text-gray-600">Tier 1</span><span className={`ml-1 ${m.tier1===0?'text-red-400':'text-white'}`}>{m.tier1||'None'}</span></div>
                    </div>
                    {m.need&&<p className="text-amber-400/70 text-xs">{shortNeed(m.need)}</p>}
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

      {/* Full Deal Pipeline */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-white font-semibold text-sm">Full Pipeline</h2>
          <span className="text-gray-500 text-xs">— {deals.length} deal{deals.length!==1?'s':''}</span>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Loading deals...</div>
          ) : deals.length===0 ? (
            <div className="p-12 text-center">
              <Building2 size={28} className="text-gray-700 mx-auto mb-3"/>
              <p className="text-gray-400 font-medium text-sm">No deals yet</p>
              <button onClick={()=>setShowAddDeal(true)} className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition">+ Add Deal</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/40">
              {deals.map((deal:any, i:number)=>{
                const opp = getOpportunityLabel(deal);
                const blast = getBlastReadiness(deal);
                const demand = getBuyerDemand(deal);
                const src = getSourceLabel(deal.sourceType||'MANUAL', deal.dealSource?.reliabilityLabel);
                const actionBtn = getActionButton(deal);
                const reason = getOpportunityReason(deal);
                const age = getAgeLabel(deal);
                const buyers = deal.matchedBuyerCount||0;
                const tier1 = deal.tier1MatchCount||0;
                const hasPhotos = !!(deal.photosUrl||deal.googleDriveUrl||deal.photos?.length);
                const estimates = [deal.zillowEstimate,deal.realtorEstimate,deal.redfinEstimate,deal.rentcastEstimate].filter((v):v is number=>typeof v==='number'&&v>0);
                const avgPublic = estimates.length>0?estimates.reduce((a,b)=>a+b,0)/estimates.length:null;
                const isHot = opp.label.includes('Hot')||opp.label.includes('Strong Dispo');

                return (
                  <motion.div key={deal.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.03}}
                    className={`group transition ${isHot?'border-l-2 border-orange-500/60 bg-orange-900/5 hover:bg-orange-900/10':'hover:bg-gray-800/20'}`}>
                    <div className="flex items-start gap-3 p-4">

                      {/* LEFT: Opportunity badge + score */}
                      <div className="w-24 shrink-0 space-y-1">
                        <div className={`text-xs font-bold px-2 py-1 rounded-lg border text-center ${opp.bg}`}>
                          <span className={opp.color}>{opp.label}</span>
                        </div>
                        <p className="text-gray-600 text-xs text-center font-mono">{deal.dealPriorityScore||'—'}</p>
                      </div>

                      {/* MIDDLE: Deal info */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/dashboard/deals/${deal.id}`} className="block">
                          {/* Address + age */}
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className={`font-semibold text-sm hover:text-blue-300 transition ${isHot?'text-white':'text-gray-200'}`}>{deal.address||'No address'}</p>
                            {age&&<span className={`text-xs ${age.color}`}>{age.text}</span>}
                          </div>

                          {/* Location + property */}
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="flex items-center gap-1 text-gray-500 text-xs"><MapPin size={9}/>{[deal.city,deal.state,deal.zipCode].filter(Boolean).join(', ')}</span>
                            {deal.beds&&<span className="text-gray-600 text-xs">{deal.beds}bd/{deal.baths}ba</span>}
                            {deal.sqft&&<span className="text-gray-600 text-xs">{deal.sqft?.toLocaleString()}sf</span>}
                            {deal.dealType&&<span className="text-indigo-400 text-xs font-medium">{deal.dealType}</span>}
                            {deal.overallCondition&&deal.overallCondition!=='UNKNOWN'&&<span className="text-gray-600 text-xs">{deal.overallCondition.replace(/_/g,' ')}</span>}
                          </div>

                          {/* Why it matters */}
                          <p className="text-gray-500 text-xs italic mb-2 leading-relaxed">{reason}</p>

                          {/* Badges row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={deal.status||'DRAFT'}/>
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${src.cls}`}>{src.combined}</span>
                            {hasPhotos?<span className="text-xs text-green-500 flex items-center gap-0.5"><Camera size={9}/> Photos</span>:<span className="text-xs text-amber-600 flex items-center gap-0.5"><Camera size={9}/> No Photos</span>}
                          </div>
                        </Link>
                      </div>

                      {/* RIGHT: Metrics + action */}
                      <div className="hidden md:flex flex-col items-end gap-2 shrink-0 w-48">
                        {/* Price */}
                        <div className="text-right">
                          <p className="text-white text-sm font-bold">{deal.askingPrice?formatCurrency(deal.askingPrice):'TBD'}</p>
                          {avgPublic?<p className="text-blue-400 text-xs">avg public: {formatCurrency(avgPublic)}</p>:<Link href={`/dashboard/deals/${deal.id}`} className="text-gray-600 text-xs hover:text-blue-400 transition">+ Add Zillow/Redfin</Link>}
                        </div>

                        {/* Buyer demand badge */}
                        <span className={`text-xs px-2 py-1 rounded-lg border ${demand.cls} text-center w-full`}>
                          {buyers>0?`${buyers} buyers${tier1>0?` · ${tier1} T1`:''}`:demand.label}
                        </span>

                        {/* Blast readiness bar */}
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-xs ${blast.color}`}>{blast.pct}% blast ready</span>
                          </div>
                          <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${blast.bar}`} style={{width:`${blast.pct}%`}}/>
                          </div>
                        </div>

                        {/* Action button */}
                        <Link href={`/dashboard/deals/${deal.id}`}
                          className={`w-full text-center inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${actionBtn.color}`}>
                          {actionBtn.label} <ArrowRight size={11}/>
                        </Link>
                      </div>

                      <ChevronRight size={14} className="text-gray-700 group-hover:text-gray-400 transition shrink-0 mt-1 hidden md:block"/>
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
