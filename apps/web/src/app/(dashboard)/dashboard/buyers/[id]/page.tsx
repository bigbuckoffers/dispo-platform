'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, TrendingUp, Zap, Star, DollarSign, Phone, Mail, Building2, RefreshCw, Brain, MapPin, Target, FileText, ChevronDown, ChevronUp, Save, CheckCircle, XCircle, AlertCircle, Activity, BarChart2, MessageSquare, Send, Sparkles, ThumbsUp, ThumbsDown, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { ScoreMeter } from '@/components/buyer/ScoreMeter';
import { ActivityTimeline } from '@/components/buyer/ActivityTimeline';
import { formatCurrency } from '@/lib/format';
import toast from 'react-hot-toast';

const SECTION = ({ title, icon: Icon, iconColor = 'text-gray-400', children, defaultOpen = true, badge }: any) => {
  const [open, setOpen] = useState(defaultOpen);
  return (<div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"><button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800/40 transition"><h2 className="text-white font-semibold text-sm flex items-center gap-2">{Icon && <Icon size={14} className={iconColor} />}{title}{badge && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 ml-1">{badge}</span>}</h2>{open ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}</button>{open && <div className="px-5 pb-5">{children}</div>}</div>);
};
const Row = ({ label, value, valueClass = 'text-white', verified }: any) => value != null && value !== '' ? (<div className="flex justify-between items-start py-1.5 border-b border-gray-800/50 last:border-0"><span className="text-gray-500 text-xs">{label}</span><div className="flex items-center gap-1.5 text-right max-w-xs"><span className={`text-xs font-medium ${valueClass}`}>{value}</span>{verified !== undefined && <span className={`text-xs px-1.5 py-0.5 rounded ${verified ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-500'}`}>{verified ? '✓' : '~'}</span>}</div></div>) : null;
const SBar = ({ label, score, color = 'bg-blue-500' }: any) => (<div className="space-y-1"><div className="flex justify-between text-xs"><span className="text-gray-500">{label}</span><span className="text-white font-medium">{score}/100</span></div><div className="h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: score + '%' }} /></div></div>);

export default function BuyerProfilePage({ params }: { params: { id: string } }) {
  const qc = useQueryClient(); const { id } = params;
  const [intelText, setIntelText] = useState('');
  const [saving, setSaving] = useState(false); const [generating, setGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState(''); const [aiTags, setAiTags] = useState<string[]>([]);
  const [extractedPrefs, setExtractedPrefs] = useState<any[]>([]);
  const [recommendedDeals, setRecommendedDeals] = useState<string[]>([]);
  const [notIdealFor, setNotIdealFor] = useState<string[]>([]);
  const [dealBreakers, setDealBreakers] = useState<string[]>([]);
  const [nextActions, setNextActions] = useState<string[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [risks, setRisks] = useState<string[]>([]);
  const [dispoStrategy, setDispoStrategy] = useState('');
  const [bestFirstDeal, setBestFirstDeal] = useState('');
  const [closePosReasons, setClosePosReasons] = useState<string[]>([]);
  const [closeNegReasons, setCloseNegReasons] = useState<string[]>([]);
  const [closeProbability, setCloseProbability] = useState(50);
  const [aiConfidence, setAiConfidence] = useState(0);
  const [maturity, setMaturity] = useState('Early Stage');
  const [editingBuyBox, setEditingBuyBox] = useState(false);
  const [editingLiquidity, setEditingLiquidity] = useState(false);
  const [editingHistory, setEditingHistory] = useState(false);
  const [bbForm, setBbForm] = useState<any>({});
  const [liqForm, setLiqForm] = useState<any>({});
  const [histForm, setHistForm] = useState<any>({});
  const [savingBb, setSavingBb] = useState(false);
  const [savingLiq, setSavingLiq] = useState(false);
  const [savingHist, setSavingHist] = useState(false);
  const [uploadingPof, setUploadingPof] = useState(false);
  const { data: buyer, isLoading, isError } = useQuery({ queryKey: ['buyer', id], queryFn: () => api.get(`/buyers/${id}`).then(r => r.data), retry: 1 });
  const { data: analytics } = useQuery({ queryKey: ['buyer-analytics', id], queryFn: () => api.get(`/buyers/${id}/analytics`).then(r => r.data), enabled: !!buyer, retry: 1 });
  useEffect(() => {
    if (buyer?.buyerIntelNotes) setIntelText(buyer.buyerIntelNotes);
    if (buyer?.aiSummary) setAiSummary(buyer.aiSummary);
    if (buyer?.dealBreakers?.length) setDealBreakers(buyer.dealBreakers);
    if (buyer) {
      setBbForm({ marketPrimary: buyer.marketPrimary||'', marketSecondary: (buyer.marketSecondary||[]).join(', '), states: (buyer.buyBox?.states||[]).join(', '), zipCodes: (buyer.buyBox?.zipCodes||[]).join(', '), minPrice: buyer.buyBox?.minPrice||'', maxPrice: buyer.buyBox?.maxPrice||'', rehabTolerance: buyer.buyBox?.rehabTolerance||'', minBeds: buyer.buyBox?.minBeds||'', strategies: (buyer.preferredStrategies||[]).join(', '), funding: buyer.notes||'' });
      setLiqForm({ closeSpeed: buyer.avgCloseSpeedDays||'', titleCo: buyer.preferredTitleCo||'', maxEmd: buyer.maxEmd||'', lender: buyer.preferredLender||'' });
      setHistForm({ closeCount: buyer.closeCount||0, cancelCount: buyer.cancelCount||0, retradeCount: buyer.retradeCount||0, ghostCount: buyer.ghostCount||0, avgFee: buyer.avgAssignmentFee||'' });
    }
    if (buyer) {
      let conf = 0;
      if ((buyer.buyerIntelNotes?.length||0)>200) conf+=25; else if ((buyer.buyerIntelNotes?.length||0)>50) conf+=15;
      if (buyer.marketPrimary) conf+=10; if (buyer.buyBox?.minPrice) conf+=10;
      if (buyer.buyBox?.rehabTolerance) conf+=10; if (buyer.preferredStrategies?.length) conf+=10;
      if (buyer.notes) conf+=5; if (buyer.buyBox?.zipCodes?.length) conf+=10;
      if (buyer.closeCount>0) conf+=15; if (buyer.proofOfFundsUrl) conf+=5;
      setAiConfidence(Math.min(100,conf));
      let prob=40;
      prob+=Math.round(((buyer.reliabilityScore||50)-50)*0.3);
      prob+=Math.round(((buyer.liquidityScore||50)-50)*0.2);
      prob+=Math.round(((buyer.seriousnessScore||50)-50)*0.3);
      if (buyer.closeCount>0) prob+=15; if (buyer.cancelCount>0) prob-=10;
      if (buyer.ghostCount>0) prob-=10; if (buyer.proofOfFundsUrl) prob+=10;
      setCloseProbability(Math.max(5,Math.min(99,prob)));
      setMaturity(conf>=70?'Highly Verified':conf>=50?'Mature':conf>=30?'Growing':'Early Stage');
      const pos: string[]=[], neg: string[]=[];
      if ((buyer.buyerIntelNotes?.length||0)>100) pos.push('Detailed conversation history available');
      if (buyer.marketPrimary) pos.push('Confirmed primary market: '+buyer.marketPrimary);
      if (buyer.preferredStrategies?.length) pos.push('Strategy clearly defined: '+buyer.preferredStrategies[0]);
      if (buyer.buyBox?.rehabTolerance) pos.push('Rehab tolerance confirmed');
      if (buyer.notes) pos.push('Funding type identified: '+buyer.notes);
      if (!buyer.proofOfFundsUrl) neg.push('No verified proof of funds');
      if (!buyer.closeCount) neg.push('No verified close history on platform');
      if (!buyer.buyBox?.zipCodes?.length) neg.push('Zip code preferences unconfirmed');
      if (buyer.ghostCount>0) neg.push('Has ghosted '+buyer.ghostCount+' time(s)');
      if (buyer.cancelCount>0) neg.push('Has cancelled '+buyer.cancelCount+' deal(s)');
      setClosePosReasons(pos); setCloseNegReasons(neg);
    }
  }, [buyer]);
  const recalculate = useMutation({ mutationFn: () => api.post(`/buyers/${id}/recalculate-scores`).then(r=>r.data), onSuccess: () => { qc.invalidateQueries({queryKey:['buyer',id]}); toast.success('Recalculated'); } });
  const saveIntel = async () => { setSaving(true); try { await api.put(`/buyers/${id}`,{buyerIntelNotes:intelText,dealBreakers}); qc.invalidateQueries({queryKey:['buyer',id]}); toast.success('Saved'); } catch { toast.error('Failed'); } finally { setSaving(false); } };
  const saveBuyBox = async () => { setSavingBb(true); try { await api.put(`/buyers/${id}`, { marketPrimary: bbForm.marketPrimary||null, marketSecondary: bbForm.marketSecondary?bbForm.marketSecondary.split(',').map((s:string)=>s.trim()).filter(Boolean):[], preferredStrategies: bbForm.strategies?bbForm.strategies.split(',').map((s:string)=>s.trim()).filter(Boolean):[], notes: bbForm.funding||null }); (() => { const bb: any = { states: bbForm.states?bbForm.states.split(',').map((s:string)=>s.trim()).filter(Boolean):[], zipCodes: bbForm.zipCodes?bbForm.zipCodes.split(',').map((s:string)=>s.trim()).filter(Boolean):[] }; if (bbForm.minPrice) bb.minPrice = parseInt(bbForm.minPrice); if (bbForm.maxPrice) bb.maxPrice = parseInt(bbForm.maxPrice); if (bbForm.rehabTolerance) bb.rehabTolerance = bbForm.rehabTolerance; if (bbForm.minBeds) bb.minBeds = parseInt(bbForm.minBeds); return api.put(`/buyers/${id}/buy-box`, bb); })(); await qc.invalidateQueries({queryKey:['buyer',id]}); await qc.refetchQueries({queryKey:['buyer',id]}); setEditingBuyBox(false); toast.success('Buy box saved'); } catch (e:any) { toast.error('Failed: '+e?.message); } finally { setSavingBb(false); } };
  const saveLiquidity = async () => { setSavingLiq(true); try { await api.put(`/buyers/${id}`, { avgCloseSpeedDays: liqForm.closeSpeed?parseInt(liqForm.closeSpeed):null, preferredTitleCo: liqForm.titleCo, preferredLender: liqForm.lender }); qc.invalidateQueries({queryKey:['buyer',id]}); setEditingLiquidity(false); toast.success('Liquidity saved'); } catch { toast.error('Failed'); } finally { setSavingLiq(false); } };
  const saveHistory = async () => { setSavingHist(true); try { await api.put(`/buyers/${id}`, { closeCount: parseInt(histForm.closeCount)||0, cancelCount: parseInt(histForm.cancelCount)||0, retradeCount: parseInt(histForm.retradeCount)||0, ghostCount: parseInt(histForm.ghostCount)||0 }); qc.invalidateQueries({queryKey:['buyer',id]}); setEditingHistory(false); toast.success('History saved'); } catch { toast.error('Failed'); } finally { setSavingHist(false); } };
  const uploadPof = async (e: any) => { const file = e.target.files?.[0]; if (!file) return; setUploadingPof(true); try { const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', 'dispoai_photos'); fd.append('folder', 'pof'); const r = await fetch('https://api.cloudinary.com/v1_1/dhueussrm/auto/upload', {method:'POST',body:fd}); const d = await r.json(); if (d.secure_url) { await api.put(`/buyers/${id}`, { proofOfFundsUrl: d.secure_url }); qc.invalidateQueries({queryKey:['buyer',id]}); toast.success('POF uploaded'); } } catch { toast.error('Upload failed'); } finally { setUploadingPof(false); } };
  const generateAiIntel = async () => {
    if (!buyer) return; setGenerating(true);
    try {
      const notes = (intelText || buyer.buyerIntelNotes||'None').substring(0,1200);
      const prompt = 'You are a senior real estate dispositions analyst. Analyze this buyer and respond ONLY in valid JSON with no other text or markdown.\n\nBuyer: '+buyer.firstName+' '+buyer.lastName+'\nMarket: '+(buyer.marketPrimary||'Unknown')+'\nSecondary: '+(buyer.marketSecondary||[]).join(', ')+'\nStrategies: '+(buyer.preferredStrategies||[]).join(', ')+'\nFunding: '+(buyer.notes||'Unknown')+'\nRehab: '+(buyer.buyBox?.rehabTolerance||'Unknown')+'\nScore: '+buyer.compositeScore+'/100\nNotes:\n'+notes+'\n\nRespond ONLY with JSON: {"summary":"2-3 sentence buyer intelligence summary","tags":["tag1"],"recommendedDealTypes":["type1"],"bestFirstDeal":"specific best first deal description","notIdealFor":["bad match1"],"dealBreakers":["breaker1"],"nextActions":["action1","action2","action3"],"strengths":["strength1"],"risks":["risk1"],"dispoStrategy":"how to sell deals to this buyer","extractedPrefs":[{"pref":"pref desc","confidence":85,"verified":false,"source":"intel notes"}]}';
      const response = await fetch('/api/anthropic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,maxTokens:2500})});
      const data = await response.json();
      const text = data.content?.[0]?.text||'';
      const clean = text.replace(/```json|```/g,'').trim();
      let parsed: any = {};
      try {
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}');
        if (start !== -1 && end !== -1) parsed = JSON.parse(clean.substring(start, end + 1));
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr, 'Raw:', text.substring(0, 500));
        toast.error('AI response could not be parsed - try again');
        setGenerating(false); return;
      }
      if (parsed.summary) setAiSummary(parsed.summary);
      if (parsed.tags) setAiTags(parsed.tags);
      if (parsed.recommendedDealTypes) setRecommendedDeals(parsed.recommendedDealTypes);
      if (parsed.bestFirstDeal) setBestFirstDeal(parsed.bestFirstDeal);
      if (parsed.notIdealFor) setNotIdealFor(parsed.notIdealFor);
      if (parsed.dealBreakers?.length) setDealBreakers(parsed.dealBreakers);
      if (parsed.nextActions) setNextActions(parsed.nextActions);
      if (parsed.strengths) setStrengths(parsed.strengths);
      if (parsed.risks) setRisks(parsed.risks);
      if (parsed.dispoStrategy) setDispoStrategy(parsed.dispoStrategy);
      if (parsed.extractedPrefs) setExtractedPrefs(parsed.extractedPrefs);
      await api.put(`/buyers/${id}`,{aiSummary:parsed.summary,dealBreakers:parsed.dealBreakers||dealBreakers});
      qc.invalidateQueries({queryKey:['buyer',id]}); toast.success('Full intelligence report generated');
    } catch { toast.error('Failed to generate'); } finally { setGenerating(false); }
  };
  if (isLoading) return <div className="p-6 text-gray-500 text-sm">Loading...</div>;
  if (isError||!buyer) return <div className="p-6 text-red-400 text-sm">Could not load buyer. <a href="/dashboard/buyers" className="underline">Go back</a></div>;
  const tierColor = buyer.tier==='TIER_1'?'text-orange-400':buyer.tier==='TIER_2'?'text-blue-400':'text-gray-400';
  const tierBg = buyer.tier==='TIER_1'?'bg-orange-500/10 border-orange-500/30':buyer.tier==='TIER_2'?'bg-blue-500/10 border-blue-500/30':'bg-gray-500/10 border-gray-500/30';
  const tierLabel = buyer.tier==='TIER_1'?'Tier 1':buyer.tier==='TIER_2'?'Tier 2':'Tier 3';
  const dn = (buyer.firstName==='Unknown'||!buyer.firstName)?(buyer.phone||buyer.email?.split('@')[0]):buyer.lastName==='Buyer'?buyer.firstName:buyer.firstName+' '+buyer.lastName;
  const apt = (buyer.seriousnessScore||50)>=80?{label:'HOT',color:'text-red-400',bg:'bg-red-500/10 border-red-500/30',dot:'bg-red-400'}:(buyer.seriousnessScore||50)>=65?{label:'ACTIVE',color:'text-green-400',bg:'bg-green-500/10 border-green-500/30',dot:'bg-green-400'}:(buyer.seriousnessScore||50)>=50?{label:'WARM',color:'text-yellow-400',bg:'bg-yellow-500/10 border-yellow-500/30',dot:'bg-yellow-400'}:{label:'DORMANT',color:'text-gray-400',bg:'bg-gray-500/10 border-gray-500/30',dot:'bg-gray-500'};
  const rel = (buyer.compositeScore||50)>=75?{label:'Strong',color:'text-green-400'}:(buyer.compositeScore||50)>=55?{label:'Medium',color:'text-yellow-400'}:{label:'Weak',color:'text-red-400'};
  const matColor = maturity==='Highly Verified'?'text-green-400 bg-green-500/10 border-green-500/30':maturity==='Mature'?'text-blue-400 bg-blue-500/10 border-blue-500/30':maturity==='Growing'?'text-yellow-400 bg-yellow-500/10 border-yellow-500/30':'text-gray-400 bg-gray-500/10 border-gray-500/30';
  const checks=[{label:'Primary market',done:!!buyer.marketPrimary,p:3},{label:'Price range',done:!!(buyer.buyBox?.minPrice||buyer.buyBox?.maxPrice),p:5},{label:'Rehab tolerance',done:!!buyer.buyBox?.rehabTolerance,p:4},{label:'Strategy confirmed',done:!!(buyer.preferredStrategies?.length),p:3},{label:'Funding type',done:!!buyer.notes,p:4},{label:'Proof of funds',done:!!buyer.proofOfFundsUrl,p:5},{label:'Zip codes',done:!!(buyer.buyBox?.zipCodes?.length),p:3},{label:'Intel notes',done:!!(buyer.buyerIntelNotes?.length>50),p:4},{label:'Phone verified',done:!!buyer.phone,p:2},{label:'Close history',done:!!(buyer.closeCount>0),p:5}];
  const completeness=Math.round((checks.filter(c=>c.done).length/checks.length)*100);
  const missing=checks.filter(c=>!c.done).sort((a,b)=>b.p-a.p).map(c=>c.label);
  const cpColor=closeProbability>=75?'text-green-400':closeProbability>=50?'text-yellow-400':'text-red-400';
  const cpBg=closeProbability>=75?'border-green-500/30 bg-green-500/5':closeProbability>=50?'border-yellow-500/30 bg-yellow-500/5':'border-red-500/30 bg-red-500/5';
  return (<div className="p-6 max-w-5xl mx-auto space-y-4">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-white">{dn}</h1>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${tierBg} ${tierColor}`}>{tierLabel}</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${apt.bg} ${apt.color} flex items-center gap-1.5`}><span className={`w-1.5 h-1.5 rounded-full ${apt.dot} animate-pulse`} />{apt.label}</span>
          <span className={`text-xs px-2 py-1 rounded-full border ${matColor}`}>{maturity}</span>
          <span className="text-xs px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400">AI: {aiConfidence}%</span>
        </div>
        {buyer.company && <p className="text-gray-400 text-sm mt-0.5">{buyer.company}</p>}
        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
          {buyer.phone && <span className="flex items-center gap-1 text-gray-400 text-xs"><Phone size={11} />{buyer.phone}</span>}
          {buyer.email && !buyer.email.includes('@import.dispoai.com') && <span className="flex items-center gap-1 text-gray-400 text-xs"><Mail size={11} />{buyer.email}</span>}
          {buyer.marketPrimary && <span className="flex items-center gap-1 text-gray-400 text-xs"><MapPin size={11} />{buyer.marketPrimary}</span>}
          <span className={`text-xs ${rel.color}`}>Rel: {rel.label}</span>
        </div>
        {aiTags.length>0 && <div className="flex flex-wrap gap-1.5 mt-2">{aiTags.map(tag=><span key={tag} className="text-xs px-2 py-0.5 bg-gray-800 border border-gray-700/50 text-gray-300 rounded-full">{tag}</span>)}</div>}
      </div>
      <div className="flex flex-col gap-2 items-end">
        <div className={`border rounded-xl p-3 text-center min-w-28 ${cpBg}`}><p className="text-gray-500 text-xs">Likely to Close</p><p className={`text-2xl font-bold ${cpColor}`}>{closeProbability}%</p></div>
        <button onClick={()=>recalculate.mutate()} disabled={recalculate.isPending} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition"><RefreshCw size={11} className={recalculate.isPending?'animate-spin':''} />Recalculate</button>
      </div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <ScoreMeter label="Composite" score={buyer.compositeScore} icon={Star} color="text-yellow-400" />
      <ScoreMeter label="Reliability" score={buyer.reliabilityScore} icon={Shield} color="text-green-400" />
      <ScoreMeter label="Liquidity" score={buyer.liquidityScore} icon={DollarSign} color="text-blue-400" />
      <ScoreMeter label="Activity" score={buyer.activityScore} icon={Zap} color="text-purple-400" />
    </div>
    <SECTION title="AI Buyer Intelligence Summary" icon={Brain} iconColor="text-purple-400" badge={aiConfidence?aiConfidence+'% confidence':undefined}>
      {aiSummary?(<div className="space-y-3"><p className="text-gray-300 text-sm leading-relaxed bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">{aiSummary}</p><button onClick={generateAiIntel} disabled={generating} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-40"><RefreshCw size={11} className={generating?'animate-spin':''} />{generating?'Regenerating...':'Regenerate Full Intel Report'}</button></div>):(<div className="text-center py-5 space-y-3"><p className="text-gray-500 text-sm">No AI intelligence report generated yet</p><button onClick={generateAiIntel} disabled={generating} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition disabled:opacity-50 mx-auto font-medium"><Sparkles size={14} />{generating?'Generating Report...':'Generate Full Intelligence Report'}</button>{!buyer.buyerIntelNotes&&<p className="text-gray-600 text-xs">Add intel notes below first</p>}</div>)}
    </SECTION>
    <SECTION title={'Likelihood to Close — '+closeProbability+'%'} icon={Target} iconColor={cpColor}>
      <div className="space-y-4">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${closeProbability>=75?'bg-green-500':closeProbability>=50?'bg-yellow-500':'bg-red-500'}`} style={{width:closeProbability+'%'}} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {closePosReasons.length>0&&(<div><p className="text-green-400 text-xs font-medium mb-2 flex items-center gap-1"><ThumbsUp size={11} />Increasing confidence</p><div className="space-y-1">{closePosReasons.map((r,i)=><div key={i} className="flex items-center gap-2 text-xs text-gray-300"><CheckCircle size={11} className="text-green-400 flex-shrink-0" />{r}</div>)}</div></div>)}
          {closeNegReasons.length>0&&(<div><p className="text-red-400 text-xs font-medium mb-2 flex items-center gap-1"><ThumbsDown size={11} />Lowering confidence</p><div className="space-y-1">{closeNegReasons.map((r,i)=><div key={i} className="flex items-center gap-2 text-xs text-gray-300"><AlertCircle size={11} className="text-red-400 flex-shrink-0" />{r}</div>)}</div></div>)}
        </div>
        <p className="text-gray-600 text-xs italic">Score based on available data. More verified info improves accuracy.</p>
      </div>
    </SECTION>
    {nextActions.length>0&&(<SECTION title="Recommended Next Actions" icon={ArrowRight} iconColor="text-blue-400"><div className="space-y-2">{nextActions.map((action,i)=><div key={i} className="flex items-center gap-3 bg-blue-500/5 border border-blue-500/15 rounded-lg px-3 py-2.5"><span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">{i+1}</span><span className="text-gray-300 text-xs">{action}</span></div>)}</div></SECTION>)}
    {bestFirstDeal&&(<SECTION title="Best First Deal to Send" icon={Send} iconColor="text-green-400"><div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4"><p className="text-green-300 text-sm leading-relaxed">{bestFirstDeal}</p></div></SECTION>)}
    {(recommendedDeals.length>0||notIdealFor.length>0)&&(<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{recommendedDeals.length>0&&(<SECTION title="Send These Deals" icon={CheckCircle} iconColor="text-green-400"><div className="space-y-1.5">{recommendedDeals.map((d,i)=><div key={i} className="flex items-center gap-2 text-xs text-gray-300"><CheckCircle size={11} className="text-green-400 flex-shrink-0" />{d}</div>)}</div></SECTION>)}{notIdealFor.length>0&&(<SECTION title="Not Ideal For" icon={XCircle} iconColor="text-red-400"><div className="space-y-1.5">{notIdealFor.map((d,i)=><div key={i} className="flex items-center gap-2 text-xs text-gray-300"><XCircle size={11} className="text-red-400 flex-shrink-0" />{d}</div>)}</div></SECTION>)}</div>)}
    {dispoStrategy&&(<SECTION title="AI Dispo Strategy" icon={MessageSquare} iconColor="text-amber-400"><div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4"><p className="text-amber-200 text-sm leading-relaxed">{dispoStrategy}</p></div></SECTION>)}
    {(strengths.length>0||risks.length>0)&&(<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{strengths.length>0&&(<SECTION title="Buyer Strengths" icon={ThumbsUp} iconColor="text-green-400"><div className="space-y-1.5">{strengths.map((s,i)=><div key={i} className="flex items-center gap-2 text-xs text-gray-300"><CheckCircle size={11} className="text-green-400 flex-shrink-0" />{s}</div>)}</div></SECTION>)}{risks.length>0&&(<SECTION title="Risk Factors" icon={AlertCircle} iconColor="text-red-400"><div className="space-y-1.5">{risks.map((r,i)=><div key={i} className="flex items-center gap-2 text-xs text-gray-300"><AlertCircle size={11} className="text-red-400 flex-shrink-0" />{r}</div>)}</div></SECTION>)}</div>)}
    {(dealBreakers.length>0||(buyer.dealBreakers?.length||0)>0)&&(<SECTION title="Avoids / Deal Breakers" icon={XCircle} iconColor="text-red-400"><div className="grid grid-cols-2 gap-2">{(dealBreakers.length>0?dealBreakers:buyer.dealBreakers||[]).map((d:string,i:number)=><div key={i} className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2"><XCircle size={12} className="text-red-400 flex-shrink-0" /><span className="text-red-300 text-xs">{d}</span></div>)}</div></SECTION>)}
    <SECTION title={'Profile Completeness — '+completeness+'/100'} icon={Target} iconColor="text-blue-400"><div className="space-y-3"><div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${completeness>=80?'bg-green-500':completeness>=50?'bg-yellow-500':'bg-red-500'}`} style={{width:completeness+'%'}} /></div>{missing.length>0&&<div><p className="text-gray-500 text-xs mb-2">Most important missing info:</p><div className="space-y-1">{missing.slice(0,5).map((m,i)=><div key={m} className="flex items-center gap-2 text-xs"><span className="w-4 h-4 rounded-full bg-gray-800 text-gray-500 flex items-center justify-center flex-shrink-0">{i+1}</span><span className="text-amber-400">{m}</span></div>)}</div></div>}<div className="grid grid-cols-2 gap-1.5">{checks.filter(c=>c.done).map(c=><div key={c.label} className="flex items-center gap-1.5 text-xs text-green-400"><CheckCircle size={11} />{c.label}</div>)}</div></div></SECTION>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SECTION title="Buy Box" icon={Building2} iconColor="text-blue-400">
        {!editingBuyBox ? (
          <div className="space-y-0">
            <Row label="Primary Market" value={buyer.marketPrimary} verified={!!buyer.marketPrimary} />
            <Row label="Secondary Markets" value={buyer.marketSecondary?.join(', ')} verified={false} />
            <Row label="States" value={buyer.buyBox?.states?.join(', ')} verified={false} />
            <Row label="Zip Codes" value={buyer.buyBox?.zipCodes?.join(', ')} verified={false} />
            <Row label="Price Range" value={(buyer.buyBox?.minPrice||buyer.buyBox?.maxPrice)?(buyer.buyBox?.minPrice?formatCurrency(buyer.buyBox.minPrice):'—')+' – '+(buyer.buyBox?.maxPrice?formatCurrency(buyer.buyBox.maxPrice):'—'):null} verified={false} />
            <Row label="Rehab Tolerance" value={buyer.buyBox?.rehabTolerance} verified={false} />
            <Row label="Min Beds" value={buyer.buyBox?.minBeds?buyer.buyBox.minBeds+'+':null} verified={false} />
            <Row label="Strategy" value={buyer.preferredStrategies?.join(', ')} verified={false} />
            <Row label="Funding" value={buyer.notes} verified={false} />
            <button onClick={()=>setEditingBuyBox(true)} className="mt-3 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><span>✏️</span>Edit Buy Box</button>
          </div>
        ) : (
          <div className="space-y-3">
            {[['Primary Market','marketPrimary','text'],['Secondary Markets (comma sep)','marketSecondary','text'],['States (comma sep)','states','text'],['Zip Codes (comma sep)','zipCodes','text'],['Min Price','minPrice','number'],['Max Price','maxPrice','number'],['Min Beds','minBeds','number'],['Strategies (comma sep)','strategies','text'],['Funding Type','funding','text']].map(([label,key,type])=>(
              <div key={key as string}>
                <label className="text-gray-500 text-xs block mb-1">{label as string}</label>
                <input type={type as string} value={bbForm[key as string]||''} onChange={e=>setBbForm((p:any)=>({...p,[key as string]:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
              </div>
            ))}
            <div>
              <label className="text-gray-500 text-xs block mb-1">Rehab Tolerance</label>
              <select value={bbForm.rehabTolerance||''} onChange={e=>setBbForm((p:any)=>({...p,rehabTolerance:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none">
                <option value="">Unknown</option>
                <option value="COSMETIC_ONLY">Turnkey/Cosmetic Only</option>
                <option value="LIGHT">Light/Cosmetic</option>
                <option value="MEDIUM">Medium Rehab</option>
                <option value="HEAVY">Heavy Rehab</option>
                <option value="FULL_GUT">Full Gut</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveBuyBox} disabled={savingBb} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition disabled:opacity-50">{savingBb?'Saving...':'Save Buy Box'}</button>
              <button onClick={()=>setEditingBuyBox(false)} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition">Cancel</button>
            </div>
          </div>
        )}
      </SECTION>
      <div className="space-y-4">
        <SECTION title="Reliability Breakdown" icon={Shield} iconColor="text-green-400"><div className="space-y-3"><SBar label="Close Rate" score={buyer.closeCount>0?Math.min(100,buyer.closeCount*20):40} color="bg-green-500" /><SBar label="EMD Performance" score={buyer.emdFailureCount===0?75:Math.max(10,75-buyer.emdFailureCount*20)} color="bg-blue-500" /><SBar label="No Retrade Risk" score={buyer.retradeCount===0?80:Math.max(10,80-buyer.retradeCount*20)} color="bg-yellow-500" /><SBar label="No Ghost Risk" score={buyer.ghostCount===0?80:Math.max(10,80-buyer.ghostCount*20)} color="bg-purple-500" /><div className="grid grid-cols-3 gap-2 pt-1">{[['Closed',buyer.closeCount??0],['Cancelled',buyer.cancelCount??0],['Retraded',buyer.retradeCount??0]].map(([l,v])=><div key={l as string} className="bg-gray-800 rounded p-2 text-center"><span className="text-gray-500 block text-xs">{l}</span><p className="text-white font-bold text-lg">{v}</p></div>)}</div></div></SECTION>
        <SECTION title="Liquidity Breakdown" icon={DollarSign} iconColor="text-blue-400">
          {!editingLiquidity ? (
            <div className="space-y-2">
              <Row label="Proof of Funds" value={buyer.proofOfFundsUrl?'✓ Uploaded':'✗ Not uploaded'} valueClass={buyer.proofOfFundsUrl?'text-green-400':'text-red-400'} verified={!!buyer.proofOfFundsUrl} />
              <Row label="Funding Type" value={buyer.notes} verified={false} />
              <Row label="Close Speed" value={buyer.avgCloseSpeedDays?buyer.avgCloseSpeedDays+' days avg':'Unknown'} verified={buyer.closeCount>0} />
              <Row label="Preferred Title Co" value={buyer.preferredTitleCo} verified={false} />
              <Row label="Preferred Lender" value={buyer.preferredLender} verified={false} />
              <SBar label="Overall Liquidity" score={buyer.liquidityScore||50} color="bg-blue-500" />
              <div className="flex gap-2 pt-2">
                <label className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer transition flex items-center gap-1.5 ${uploadingPof?'bg-gray-700 text-gray-500':'bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30'}`}>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={uploadPof} disabled={uploadingPof} />
                  {uploadingPof?'Uploading...':'📄 Upload POF'}
                </label>
                <button onClick={()=>setEditingLiquidity(true)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">✏️ Edit</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[['Close Speed (days)','closeSpeed','number'],['Preferred Title Company','titleCo','text'],['Max EMD Available','maxEmd','text'],['Preferred Lender','lender','text']].map(([label,key,type])=>(
                <div key={key as string}>
                  <label className="text-gray-500 text-xs block mb-1">{label as string}</label>
                  <input type={type as string} value={liqForm[key as string]||''} onChange={e=>setLiqForm((p:any)=>({...p,[key as string]:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button onClick={saveLiquidity} disabled={savingLiq} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg disabled:opacity-50">{savingLiq?'Saving...':'Save'}</button>
                <button onClick={()=>setEditingLiquidity(false)} className="px-3 py-1.5 bg-gray-700 text-gray-300 text-xs rounded-lg">Cancel</button>
              </div>
            </div>
          )}
        </SECTION>
      </div>
    </div>
    <SECTION title={'Buying Seriousness — '+(buyer.seriousnessScore??50)+'/100'} icon={Activity} iconColor="text-amber-400"><div className="space-y-3"><SBar label="Seriousness" score={buyer.seriousnessScore??50} color="bg-amber-500" /><div className="space-y-1.5">{(buyer.buyerIntelNotes?.length||0)>100&&<div className="flex items-center gap-2 text-xs text-gray-300"><CheckCircle size={11} className="text-green-400" />Has detailed conversation history</div>}{buyer.marketPrimary&&<div className="flex items-center gap-2 text-xs text-gray-300"><CheckCircle size={11} className="text-green-400" />Confirmed market: {buyer.marketPrimary}</div>}{!buyer.closeCount&&<div className="flex items-center gap-2 text-xs text-amber-400"><AlertCircle size={11} />No verified close history</div>}{!buyer.buyBox?.zipCodes?.length&&<div className="flex items-center gap-2 text-xs text-amber-400"><AlertCircle size={11} />Zip codes not confirmed</div>}</div></div></SECTION>
    <SECTION title="Deal History & Analytics" icon={BarChart2} iconColor="text-green-400">
      {!editingHistory ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[{label:'Deals Closed',value:buyer.closeCount??0},{label:'Cancelled',value:buyer.cancelCount??0},{label:'Retraded',value:buyer.retradeCount??0},{label:'Ghosted',value:buyer.ghostCount??0}].map(({label,value})=><div key={label} className="bg-gray-800 rounded-lg p-3"><span className="text-gray-500 text-xs">{label}</span><p className="text-white text-xl font-bold mt-1">{value}</p></div>)}</div>
          <button onClick={()=>setEditingHistory(true)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">✏️ Log Deal History</button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-gray-500 text-xs">Manually log deal history for deals closed outside the platform.</p>
          <div className="grid grid-cols-2 gap-3">
            {[['Deals Closed','closeCount'],['Deals Cancelled','cancelCount'],['Retraded','retradeCount'],['Ghosted','ghostCount']].map(([label,key])=>(
              <div key={key as string}>
                <label className="text-gray-500 text-xs block mb-1">{label as string}</label>
                <input type="number" min="0" value={histForm[key as string]||0} onChange={e=>setHistForm((p:any)=>({...p,[key as string]:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
              </div>
            ))}
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1">Avg Assignment Fee ($)</label>
            <input type="number" value={histForm.avgFee||''} onChange={e=>setHistForm((p:any)=>({...p,avgFee:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={saveHistory} disabled={savingHist} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg disabled:opacity-50">{savingHist?'Saving...':'Save History'}</button>
            <button onClick={()=>setEditingHistory(false)} className="px-3 py-1.5 bg-gray-700 text-gray-300 text-xs rounded-lg">Cancel</button>
          </div>
        </div>
      )}
    </SECTION>
    {extractedPrefs.length>0&&(<SECTION title="AI Extracted Preferences" icon={Brain} iconColor="text-purple-400" badge="Needs Review"><p className="text-gray-600 text-xs mb-3">Approve or reject each AI-detected preference.</p><div className="space-y-2">{extractedPrefs.map((pref,i)=><div key={i} className="flex items-start justify-between bg-gray-800/60 rounded-lg p-3 border border-gray-700/50"><div className="flex-1"><p className="text-white text-xs">{pref.pref}</p><div className="flex items-center gap-2 mt-1"><span className="text-gray-500 text-xs">Confidence: {pref.confidence}%</span><span className={`text-xs px-1.5 py-0.5 rounded ${pref.verified?'bg-green-500/10 text-green-400':'bg-yellow-500/10 text-yellow-500'}`}>{pref.verified?'✓ Verified':'~ AI Inferred'}</span>{pref.source&&<span className="text-gray-600 text-xs">· {pref.source}</span>}</div></div><div className="flex gap-2 ml-3"><button onClick={()=>setExtractedPrefs(p=>p.filter((_,j)=>j!==i))} className="text-green-400 hover:text-green-300"><CheckCircle size={15} /></button><button onClick={()=>setExtractedPrefs(p=>p.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-300"><XCircle size={15} /></button></div></div>)}</div></SECTION>)}
    <SECTION title="Buyer Intelligence Notes" icon={MessageSquare} iconColor="text-purple-400"><div className="space-y-3"><p className="text-gray-600 text-xs">Paste call transcripts, SMS, meeting notes, objections, feedback — AI reads all of this</p><textarea value={intelText} onChange={e=>setIntelText(e.target.value)} placeholder="Paste transcripts, call notes, SMS conversations..." className="w-full h-40 bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg p-3 text-xs resize-none focus:outline-none focus:border-purple-500" /><div className="flex items-center justify-between"><button onClick={generateAiIntel} disabled={generating} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1.5 disabled:opacity-40"><Sparkles size={11} />{generating?'Generating...':'Analyze & Generate Full Intel Report'}</button><button onClick={saveIntel} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg transition disabled:opacity-50"><Save size={11} />{saving?'Saving...':'Save Notes'}</button></div></div></SECTION>
    <SECTION title="Activity Timeline" icon={FileText} iconColor="text-gray-400" defaultOpen={false}><ActivityTimeline buyerId={id} /></SECTION>
  </div>);
}