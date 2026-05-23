'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, Zap, Plus, Filter, RefreshCw, Target, Shield, Camera, ChevronRight, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import Link from 'next/link';
import AddDealModal from '@/components/deal/AddDealModal';

function getScoreTier(s: number) {
  if (s>=85) return {label:'🔥 Hot',    text:'text-red-200',    bg:'bg-red-900/80 border-red-600/70',     hot:true};
  if (s>=75) return {label:'Strong',    text:'text-orange-200', bg:'bg-orange-900/70 border-orange-700/60',hot:false};
  if (s>=60) return {label:'Workable',  text:'text-yellow-200', bg:'bg-yellow-900/60 border-yellow-700/50',hot:false};
  if (s>=40) return {label:'Needs Info',text:'text-blue-300',   bg:'bg-blue-900/60 border-blue-700/50',   hot:false};
  return          {label:'Weak',        text:'text-gray-500',   bg:'bg-gray-800 border-gray-700',          hot:false};
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
  return Math.round((earned/total)*100);
}

function getDemandColor(b: number) {
  if (b>=15) return 'text-green-400';
  if (b>=8)  return 'text-blue-400';
  if (b>=3)  return 'text-amber-400';
  if (b>=1)  return 'text-orange-400';
  return 'text-red-400';
}

function getActionButton(deal: any, score: number): {label:string;cls:string} {
  const b = deal.matchedBuyerCount||0;
  const action = deal.nextBestAction||'';
  if (score>=75&&b>=3)  return {label:'Sell This Deal',cls:'bg-blue-600 hover:bg-blue-500 text-white'};
  if (deal.status==='READY_TO_BLAST'||action.toLowerCase().includes('blast')) return {label:'Generate Blast',cls:'bg-green-800 hover:bg-green-700 text-green-200 border border-green-700/50'};
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
  if (b>=10&&r>=75) return `${b} buyers matched${t1>0?`, ${t1} Tier 1`:''}. Ready to sell.`;
  if (b>=5&&!hasPhotos) return `${b} buyers matched. Get photos to blast.`;
  if (b>=5) return `${b} buyers matched${t1>0?`, ${t1} Tier 1`:''}. ${r}% ready.`;
  if (b===0&&(deal.dealPriorityScore||0)>=60) return `Good deal. No buyers yet in ${deal.city||'this market'}.`;
  if (!hasPhotos) return 'Missing photos. Add photos to unlock blast.';
  return `${deal.missingInfoCount||0} fields missing before matching.`;
}

function shortNeed(need: string): string {
  if (!need) return 'buyers needed';
  const l = need.toLowerCase();
  if (l.includes('cash')&&l.includes('landlord')) return 'cash buyers / landlords';
  if (l.includes('section 8')) return 'Section 8 / heavy rehab buyers';
  if (l.includes('subto')) return 'Subto buyers';
  if (l.includes('cash')) return 'cash buyers';
  return need.slice(0,45)+(need.length>45?'…':'');
}

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
    total:   deals.filter((d:any)=>!['DEAD','CLOSED','DRAFT'].includes(d.status)).length,
    blast:   deals.filter((d:any)=>d.status==='READY_TO_BLAST').length,
    buyers:  deals.filter((d:any)=>(d.matchedBuyerCount||0)>=3).length,
    noPhoto: deals.filter((d:any)=>!(d.photosUrl||d.googleDriveUrl||d.photos?.length)&&(d.dealPriorityScore||0)>=50).length,
  }),[deals]);

  const marketGaps = useMemo(()=>{
    const map:Record<string,any>={};
    for (const d of deals) {
      if ((d.dealPriorityScore||0)<40) continue;
      const key=d.marketKey||`${d.city||'?'}, ${d.state||''}`;
      if(!map[key]) map[key]={market:key,buyers:0,need:''};
      map[key].buyers=Math.max(map[key].buyers,d.matchedBuyerCount||0);
      if(d.marketBuyerNeedRecommendation) map[key].need=d.marketBuyerNeedRecommendation;
    }
    return Object.values(map).filter((m:any)=>m.buyers===0).slice(0,4);
  },[deals]);

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Deals</h1>
          <p className="text-gray-500 text-xs mt-0.5">Best opportunities first — click to work a deal</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>refetch()} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400"><RefreshCw size={14}/></button>
          <button onClick={()=>setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${showFilters?'bg-blue-600 text-white':'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}><Filter size={12}/> Sort</button>
          <button onClick={()=>setShowAddDeal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg font-medium"><Plus size={14}/> Add Deal</button>
        </div>
      </div>

      {/* 4 key stats */}
      <div className="grid grid-cols-4 gap-2.5">
        {[
          {label:'Active Deals',  value:stats.total,        icon:Building2, color:'text-white'},
          {label:'Ready to Blast',value:stats.blast||'—',   icon:Zap,       color:'text-green-400'},
          {label:'Has Buyers',    value:stats.buyers||'—',  icon:Users,     color:'text-blue-400'},
          {label:'Need Photos',   value:stats.noPhoto||'—', icon:Camera,    color:'text-amber-400'},
        ].map(s=>(
          <div key={s.label} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <s.icon size={13} className={`${s.color} mb-1.5`}/>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Buyer gap strip */}
      {marketGaps.length>0&&(
        <div className="border border-amber-800/25 rounded-xl overflow-hidden" style={{background:'rgba(120,80,0,0.04)'}}>
          <button onClick={()=>setShowGaps(!showGaps)} className="w-full px-4 py-2.5 flex items-center gap-2 text-left hover:bg-amber-900/8 transition">
            <BarChart3 size={12} className="text-amber-400 shrink-0"/>
            <span className="text-amber-300 text-xs font-medium shrink-0">Buyer Gaps:</span>
            <span className="text-amber-600/80 text-xs truncate flex-1">
              {marketGaps.map((m:any)=>`${m.market.split(',')[0]} needs ${shortNeed(m.need)}`).join('  ·  ')}
            </span>
            {showGaps?<ChevronUp size={11} className="text-amber-600 shrink-0"/>:<ChevronDown size={11} className="text-amber-600 shrink-0"/>}
          </button>
          {showGaps&&(
            <div className="px-4 pb-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              {marketGaps.map((m:any,i:number)=>(
                <div key={i} className="bg-gray-900/60 rounded-lg p-2.5 border border-gray-800/50 text-xs">
                  <p className="text-white font-medium">{m.market}</p>
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
              <label className="text-gray-500 text-xs">Sort by</label>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 border border-gray-700">
                <option value="dealPriorityScore">Priority Score</option>
                <option value="matchedBuyerCount">Buyer Count</option>
                <option value="closingDate">Closing Date</option>
                <option value="createdAt">Newest First</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deal list */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Loading...</div>
        ) : deals.length===0 ? (
          <div className="p-12 text-center">
            <Building2 size={28} className="text-gray-700 mx-auto mb-3"/>
            <p className="text-gray-400 text-sm font-medium">No deals yet</p>
            <button onClick={()=>setShowAddDeal(true)} className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg">+ Add Deal</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {deals.map((deal:any, i:number)=>{
              const score = deal.dealPriorityScore||0;
              const tier = getScoreTier(score);
              const ready = getReadiness(deal);
              const buyers = deal.matchedBuyerCount||0;
              const tier1 = deal.tier1MatchCount||0;
              const demandColor = getDemandColor(buyers);
              const action = getActionButton(deal, score);
              const signal = getSignal(deal);
              const age = (() => {
                const now = Date.now();
                if (deal.closingDate) {
                  const d = Math.ceil((new Date(deal.closingDate).getTime()-now)/86400000);
                  if (d<=0) return {text:'COE passed',color:'text-red-400'};
                  if (d<=7) return {text:`COE ${d}d`,color:d<=3?'text-red-400':'text-amber-400'};
                }
                const a = Math.floor((now-new Date(deal.createdAt||now).getTime())/86400000);
                if (a===0) return {text:'Today',color:'text-green-400'};
                if (a>=14) return {text:`${a}d old`,color:'text-amber-500'};
                return null;
              })();

              return (
                <motion.div key={deal.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.02}}
                  className={`group transition-colors ${tier.hot?'border-l-[3px] border-orange-500/80 bg-orange-950/20 hover:bg-orange-950/30':'border-l-[3px] border-transparent hover:bg-gray-800/30'}`}>
                  <Link href={`/dashboard/deals/${deal.id}`} className="flex items-center gap-4 px-5 py-4">

                    {/* Score */}
                    <div className={`rounded-xl border text-center shrink-0 w-[72px] py-2 px-1 ${tier.bg}`}>
                      <p className={`text-2xl font-bold leading-none ${tier.text}`}>{score||'—'}</p>
                      <p className={`text-xs mt-1 font-medium leading-tight ${tier.text} opacity-90`}>{tier.label}</p>
                    </div>

                    {/* Property */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <p className="text-white font-bold text-base leading-snug group-hover:text-blue-300 transition">{deal.address||'No address'}</p>
                        {age&&<span className={`text-xs font-medium shrink-0 ${age.color}`}>{age.text}</span>}
                      </div>
                      <p className="text-gray-300 text-sm mb-0.5">{[deal.city,deal.state,deal.zipCode].filter(Boolean).join(', ')}</p>
                      <p className="text-gray-500 text-xs italic leading-snug">{signal}</p>
                    </div>

                    {/* Ask */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-white font-bold text-base">{deal.askingPrice?formatCurrency(deal.askingPrice):'TBD'}</p>
                      <p className="text-gray-600 text-xs">{deal.dealType||'Wholesale'}</p>
                    </div>

                    {/* Buyers */}
                    <div className="text-center shrink-0 w-20 hidden md:block">
                      {buyers>0 ? (
                        <>
                          <p className={`text-xl font-bold ${demandColor}`}>{buyers}</p>
                          {tier1>0&&<p className={`text-xs ${demandColor} opacity-80`}>{tier1} Tier 1</p>}
                          <p className="text-gray-600 text-xs">buyers</p>
                        </>
                      ) : (
                        <div>
                          <p className="text-red-400 text-sm font-bold">0</p>
                          <p className="text-red-600 text-xs">Buyer gap</p>
                        </div>
                      )}
                    </div>

                    {/* Readiness */}
                    <div className="shrink-0 w-20 hidden lg:block">
                      <p className={`text-base font-bold ${ready>=85?'text-green-400':ready>=65?'text-amber-400':ready>=45?'text-orange-400':'text-red-400'}`}>{ready}%</p>
                      <div className="w-full h-1 bg-gray-700 rounded-full mt-1 mb-0.5">
                        <div className={`h-full rounded-full ${ready>=85?'bg-green-500':ready>=65?'bg-amber-500':ready>=45?'bg-orange-500':'bg-red-500'}`} style={{width:`${ready}%`}}/>
                      </div>
                      <p className="text-gray-600 text-xs">{ready>=85?'Blast ready':'Not ready'}</p>
                    </div>

                    {/* Action */}
                    <div className="shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${action.cls}`}>
                        {action.label} <ChevronRight size={12}/>
                      </span>
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
