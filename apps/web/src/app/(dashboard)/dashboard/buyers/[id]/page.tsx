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
  const [tempNote, setTempNote] = useState('');
  const [savingTier, setSavingTier] = useState(false);
  const [tierOpen, setTierOpen] = useState(false);
  const [savingTemp, setSavingTemp] = useState(false);
  const [analyzingTemp, setAnalyzingTemp] = useState(false);
  const [tempAnalysis, setTempAnalysis] = useState<any>(null);
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
    if (buyer?.temperatureNotes) setTempNote(buyer.temperatureNotes);
    if (buyer?.dealBreakers?.length) setDealBreakers(buyer.dealBreakers);
    if (buyer) {
      (() => {
        let statusData: any = {};
        try { if (buyer.temperatureNotes) statusData = JSON.parse(buyer.temperatureNotes); } catch {}
        setBbForm({ marketPrimary: buyer.marketPrimary||'', marketSecondary: (buyer.marketSecondary||[]).join(', '), states: (buyer.buyBox?.states||[]).join(', '), zipCodes: (buyer.buyBox?.zipCodes||[]).join(', '), minPrice: buyer.buyBox?.minPrice||'', maxPrice: buyer.buyBox?.maxPrice||'', rehabTolerance: buyer.buyBox?.rehabTolerance||'', minBeds: buyer.buyBox?.minBeds||'', strategies: (buyer.preferredStrategies||[]).join(', '), funding: buyer.notes||'', closeSpeed: buyer.avgCloseSpeedDays||'', buyingStatus: statusData.buyingStatus||'', buyerTemperature: statusData.buyerTemperature||'', monthlyCapacity: statusData.monthlyCapacity||'', resumeDate: statusData.resumeDate||'', occupancy: statusData.occupancy||'', hoaOk: statusData.hoaOk||'', minArv: statusData.minArv||'', minProfit: statusData.minProfit||'', maxRehab: statusData.maxRehab||'', minCashFlow: statusData.minCashFlow||'', hardNoCriteria: statusData.hardNoCriteria||'', maxEmd: statusData.maxEmd||'', inspectionDays: statusData.inspectionDays||'', preferredContact: statusData.preferredContact||'', dealSendFreq: statusData.dealSendFreq||'', excludedAreas: statusData.excludedAreas||'', privateNotes: statusData.privateNotes||'', propertyTypes: statusData.propertyTypes||'', minYearBuilt: statusData.minYearBuilt||'', maxYearBuilt: statusData.maxYearBuilt||'', anyZipOk: buyer.buyBox?.anyZipOk||false, anyPrice: buyer.buyBox?.anyPrice||false, proofOfFundsWaived: buyer.proofOfFundsWaived||false });
      })();
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
      if (!buyer.proofOfFundsUrl && !buyer.proofOfFundsWaived) neg.push('No verified proof of funds');
      if (!buyer.buyBox?.zipCodes?.length && !buyer.buyBox?.anyZipOk) neg.push('Zip code preferences unconfirmed');
      if (buyer.ghostCount>0) neg.push('Has ghosted '+buyer.ghostCount+' time(s)');
      if (buyer.cancelCount>0) neg.push('Has cancelled '+buyer.cancelCount+' deal(s)');
      setClosePosReasons(pos); setCloseNegReasons(neg);
    }
  }, [buyer]);
  const recalculate = useMutation({ mutationFn: () => api.post(`/buyers/${id}/recalculate-scores`).then(r=>r.data), onSuccess: () => { qc.invalidateQueries({queryKey:['buyer',id]}); toast.success('Recalculated'); } });
  const deleteBuyer = async () => {
    if (!confirm('Delete this buyer permanently? This cannot be undone.')) return;
    try { await api.delete(`/buyers/${id}`); toast.success('Buyer deleted'); window.location.href = '/dashboard/buyers'; }
    catch { toast.error('Failed to delete buyer'); }
  };
  const saveIntel = async () => { setSaving(true); try { await api.put(`/buyers/${id}`,{buyerIntelNotes:intelText,dealBreakers}); qc.invalidateQueries({queryKey:['buyer',id]}); toast.success('Saved'); } catch { toast.error('Failed'); } finally { setSaving(false); } };
  const saveBuyBox = async () => { setSavingBb(true); try {
    // Build structured temperature notes with all status fields
    const statusData = {
      buyingStatus: bbForm.buyingStatus||null,
      buyerTemperature: bbForm.buyerTemperature||null,
      monthlyCapacity: bbForm.monthlyCapacity||null,
      resumeDate: bbForm.resumeDate||null,
      occupancy: bbForm.occupancy||null,
      hoaOk: bbForm.hoaOk||null,
      minArv: bbForm.minArv||null,
      minProfit: bbForm.minProfit||null,
      maxRehab: bbForm.maxRehab||null,
      minCashFlow: bbForm.minCashFlow||null,
      hardNoCriteria: bbForm.hardNoCriteria||null,
      maxEmd: bbForm.maxEmd||null,
      inspectionDays: bbForm.inspectionDays||null,
      preferredContact: bbForm.preferredContact||null,
      dealSendFreq: bbForm.dealSendFreq||null,
      excludedAreas: bbForm.excludedAreas||null,
      privateNotes: bbForm.privateNotes||null,
      propertyTypes: bbForm.propertyTypes||null,
      minYearBuilt: bbForm.minYearBuilt||null,
      maxYearBuilt: bbForm.maxYearBuilt||null,
    };
    const structuredNote = JSON.stringify(statusData);
    // Sync wholesaler tag based on buying status
    const currentTags = buyer.tags || [];
    let updatedTags = currentTags.filter((t:string) => t !== 'wholesaler');
    if (bbForm.buyingStatus === 'wholesaler') updatedTags = [...updatedTags, 'wholesaler'];
    await api.put(`/buyers/${id}`, {
      marketPrimary: bbForm.marketPrimary||null,
      marketSecondary: bbForm.marketSecondary?bbForm.marketSecondary.split(',').map((s:string)=>s.trim()).filter(Boolean):[],
      preferredStrategies: bbForm.strategies?bbForm.strategies.split(',').map((s:string)=>s.trim()).filter(Boolean):[],
      notes: bbForm.funding||null,
      temperatureNotes: structuredNote,
      avgCloseSpeedDays: bbForm.closeSpeed?parseInt(bbForm.closeSpeed):null,
      tags: updatedTags,
    });
    (() => { const bb: any = { states: bbForm.states?bbForm.states.split(',').map((s:string)=>s.trim()).filter(Boolean):[], zipCodes: bbForm.zipCodes?bbForm.zipCodes.split(',').map((s:string)=>s.trim()).filter(Boolean):[] }; bb.minPrice = bbForm.minPrice ? parseInt(bbForm.minPrice) : null; bb.maxPrice = bbForm.maxPrice ? parseInt(bbForm.maxPrice) : null; bb.rehabTolerance = bbForm.rehabTolerance || null; bb.minBeds = bbForm.minBeds ? parseInt(bbForm.minBeds) : null; bb.minBaths = bbForm.minBaths ? parseInt(bbForm.minBaths) : null; bb.anyZipOk = !!bbForm.anyZipOk; bb.anyPrice = !!bbForm.anyPrice; return api.put(`/buyers/${id}/buy-box`, bb); })(); if (bbForm.proofOfFundsWaived !== undefined) { await api.put(`/buyers/${id}`, {proofOfFundsWaived: !!bbForm.proofOfFundsWaived}); } await qc.invalidateQueries({queryKey:['buyer',id]});
        toast.success('Buy box saved ✓'); setEditingBuyBox(false); } catch (e:any) { toast.error('Failed: '+e?.message); } finally { setSavingBb(false); } };
  const saveLiquidity = async () => { setSavingLiq(true); try { await api.put(`/buyers/${id}`, { avgCloseSpeedDays: liqForm.closeSpeed?parseInt(liqForm.closeSpeed):null, preferredTitleCo: liqForm.titleCo, preferredLender: liqForm.lender }); qc.invalidateQueries({queryKey:['buyer',id]}); setEditingLiquidity(false); toast.success('Liquidity saved'); } catch { toast.error('Failed'); } finally { setSavingLiq(false); } };
  const saveHistory = async () => { setSavingHist(true); try { await api.put(`/buyers/${id}`, { closeCount: parseInt(histForm.closeCount)||0, cancelCount: parseInt(histForm.cancelCount)||0, retradeCount: parseInt(histForm.retradeCount)||0, ghostCount: parseInt(histForm.ghostCount)||0 }); qc.invalidateQueries({queryKey:['buyer',id]}); setEditingHistory(false); toast.success('History saved'); } catch { toast.error('Failed'); } finally { setSavingHist(false); } };
  const uploadPof = async (e: any) => { const file = e.target.files?.[0]; if (!file) return; setUploadingPof(true); try { const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', 'dispoai_photos'); fd.append('folder', 'pof'); const r = await fetch('https://api.cloudinary.com/v1_1/dhueussrm/auto/upload', {method:'POST',body:fd}); const d = await r.json(); if (d.secure_url) { await api.put(`/buyers/${id}`, { proofOfFundsUrl: d.secure_url }); qc.invalidateQueries({queryKey:['buyer',id]}); toast.success('POF uploaded'); } } catch { toast.error('Upload failed'); } finally { setUploadingPof(false); } };
  const markReviewed = async () => { try { const tags = [...(buyer.tags||[])]; if (tags.includes('profile_reviewed')) { const updated = tags.filter((t:string) => t !== 'profile_reviewed'); await api.put(`/buyers/${id}`, { tags: updated }); qc.invalidateQueries({queryKey:['buyer',id]}); toast.success('Moved back to Needs Review'); } else { tags.push('profile_reviewed'); await api.put(`/buyers/${id}`, { tags }); qc.invalidateQueries({queryKey:['buyer',id]}); toast.success('Marked as reviewed'); } } catch { toast.error('Failed'); } };
  const changeTier = async (newTier: string) => { setSavingTier(true); try { await api.put(`/buyers/${id}`, { tier: newTier }); qc.invalidateQueries({queryKey:['buyer',id]}); toast.success('Tier updated'); } catch { toast.error('Failed'); } finally { setSavingTier(false); } };
  const saveTempNote = async () => { setSavingTemp(true); try { await api.put(`/buyers/${id}`, { temperatureNotes: tempNote }); qc.invalidateQueries({queryKey:['buyer',id]}); toast.success('Saved'); } catch { toast.error('Failed'); } finally { setSavingTemp(false); } };
  const analyzeTempNote = async () => { if (!tempNote) return; setAnalyzingTemp(true); try { const prompt = 'Parse this buyer temperature note and respond ONLY in JSON.\n\nBuyer: '+buyer.firstName+' '+buyer.lastName+'\nNote: '+tempNote+'\n\nJSON: {"temperature":"HOT|ACTIVE|WARM|HIBERNATING|COLD","trend":"Heating Up|Stable|Cooling Down|Hibernating","reactivationDate":"timeframe or null","reasonForPause":"reason or null","nextAction":"specific action","dealPriority":"HIGH|MEDIUM|LOW|HOLD","followUpTiming":"timing","summary":"1 sentence status"}'; const r = await fetch('/api/anthropic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,maxTokens:500})}); const d = await r.json(); const t = d.content?.[0]?.text||''; const cl = t.replace(/```json|```/g,'').trim(); const p = JSON.parse(cl.substring(cl.indexOf('{'),cl.lastIndexOf('}')+1)); setTempAnalysis(p); toast.success('Analysis complete'); } catch { toast.error('Analysis failed'); } finally { setAnalyzingTemp(false); } };
  const [tempApplied, setTempApplied] = useState(false);
  const applyTempAnalysis = async () => { if (!tempAnalysis) return; try { await api.put(`/buyers/${id}`,{temperatureNotes:tempNote,aiTemperatureAnalysis:JSON.stringify(tempAnalysis)}); qc.invalidateQueries({queryKey:['buyer',id]}); toast.success('Applied to profile'); setTempApplied(true); } catch { toast.error('Failed'); } };
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
  const tierColor = buyer.tier==='VIP'?'text-yellow-300':buyer.tier==='TIER_1'?'text-orange-400':buyer.tier==='TIER_2'?'text-blue-400':buyer.tier==='TIER_3'?'text-gray-400':'text-gray-500';
  const tierBg = buyer.tier==='VIP'?'bg-yellow-500/10 border-yellow-500/30':buyer.tier==='TIER_1'?'bg-orange-500/10 border-orange-500/30':buyer.tier==='TIER_2'?'bg-blue-500/10 border-blue-500/30':buyer.tier==='TIER_3'?'bg-gray-500/10 border-gray-500/30':'bg-gray-600/10 border-gray-600/30';
  const tierLabel = buyer.tier==='VIP'?'⭐ VIP':buyer.tier==='TIER_1'?'🔥 Tier 1':buyer.tier==='TIER_2'?'Tier 2':buyer.tier==='TIER_3'?'Tier 3':'Tier 4';
  const dn = (buyer.firstName==='Unknown'||!buyer.firstName)?(buyer.phone||buyer.email?.split('@')[0]):buyer.lastName==='Buyer'?buyer.firstName:buyer.firstName+' '+buyer.lastName;
  const apt = (buyer.seriousnessScore||50)>=80?{label:'HOT',color:'text-red-400',bg:'bg-red-500/10 border-red-500/30',dot:'bg-red-400'}:(buyer.seriousnessScore||50)>=65?{label:'ACTIVE',color:'text-green-400',bg:'bg-green-500/10 border-green-500/30',dot:'bg-green-400'}:(buyer.seriousnessScore||50)>=50?{label:'WARM',color:'text-yellow-400',bg:'bg-yellow-500/10 border-yellow-500/30',dot:'bg-yellow-400'}:{label:'DORMANT',color:'text-gray-400',bg:'bg-gray-500/10 border-gray-500/30',dot:'bg-gray-500'};
  const rel = (buyer.compositeScore||50)>=75?{label:'Strong',color:'text-green-400'}:(buyer.compositeScore||50)>=55?{label:'Medium',color:'text-yellow-400'}:{label:'Weak',color:'text-red-400'};
  const matColor = maturity==='Highly Verified'?'text-green-400 bg-green-500/10 border-green-500/30':maturity==='Mature'?'text-blue-400 bg-blue-500/10 border-blue-500/30':maturity==='Growing'?'text-yellow-400 bg-yellow-500/10 border-yellow-500/30':'text-gray-400 bg-gray-500/10 border-gray-500/30';
  const checks=[{label:'Primary market',done:!!buyer.marketPrimary,p:3},{label:'Price range',done:!!(buyer.buyBox?.minPrice||buyer.buyBox?.maxPrice),p:5},{label:'Rehab tolerance',done:!!buyer.buyBox?.rehabTolerance,p:4},{label:'Strategy confirmed',done:!!(buyer.preferredStrategies?.length),p:3},{label:'Funding type',done:!!buyer.notes,p:4},{label:'Proof of funds',done:!!buyer.proofOfFundsUrl,p:5},{label:'Zip codes',done:!!(buyer.buyBox?.zipCodes?.length),p:3},{label:'Intel notes',done:!!(buyer.buyerIntelNotes?.length>50),p:4},{label:'Phone verified',done:!!buyer.phone,p:2}];
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
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${apt.bg} ${apt.color} flex items-center gap-1.5`}><span className={`w-1.5 h-1.5 rounded-full ${apt.dot} animate-pulse`} />{apt.label}</span>{(buyer.tags||[]).includes('wholesaler') && <span title="Wholesaler / JV Partner — pitch as JV opportunity, they have end buyers" className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-purple-500/20 text-purple-300 border-purple-500/40">🤝 Wholesaler</span>}
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
          <div className="flex items-center gap-2 mt-2 flex-wrap"><span className="text-gray-500 text-xs">Tier:</span>{[['VIP','⭐ VIP','bg-yellow-500/20 text-yellow-300 border-yellow-500/40','Has closed a deal with us before'],['TIER_1','🔥 T1','bg-orange-500/20 text-orange-300 border-orange-500/40','Verified funds, confirmed buy box, fast closer, highly responsive'],['TIER_2','T2','bg-blue-500/20 text-blue-300 border-blue-500/40','Buy box confirmed, engaged, has not yet closed with us'],['TIER_3','T3','bg-gray-500/20 text-gray-300 border-gray-500/40','Has shown interest, buy box partially known, unverified'],['TIER_4','T4','bg-gray-600/20 text-gray-400 border-gray-600/40','Cold, dormant, or low engagement']].map(([val,label,cls,tip])=>(<button key={val} data-tooltip={tip} onClick={()=>changeTier(val)} disabled={savingTier} className={`group/tier relative text-xs px-2 py-0.5 rounded-full border transition ${cls} ${buyer.tier===val?'ring-1 ring-white/30 opacity-100':'opacity-60 hover:opacity-100 font-medium'}`}>{label}{buyer.tier===val?' ✓':''}<span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 border border-gray-700 text-gray-200 text-xs px-2 py-1 rounded opacity-0 group-hover/tier:opacity-100 transition-opacity z-50">{tip}</span></button>))}</div>
      </div>
      <div className="flex flex-col gap-2 items-end">
        <div className={`border rounded-xl p-3 text-center min-w-28 ${cpBg}`}><p className="text-gray-500 text-xs">Likely to Close</p><p className={`text-2xl font-bold ${cpColor}`}>{closeProbability}%</p></div>
        <button onClick={()=>recalculate.mutate()} disabled={recalculate.isPending} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition"><RefreshCw size={11} className={recalculate.isPending?'animate-spin':''} />Recalculate</button><button onClick={markReviewed} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition border font-medium ${ (buyer.tags||[]).includes('profile_reviewed') ? 'bg-green-600 text-white border-green-500' : 'bg-yellow-500 hover:bg-yellow-400 text-black border-yellow-400' }`}><CheckCircle size={11} />{(buyer.tags||[]).includes('profile_reviewed')?'✓ Reviewed':'Mark Reviewed'}</button><button onClick={deleteBuyer} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/60 border border-red-700/40 text-red-400 text-xs rounded-lg transition">🗑 Delete</button>
      </div>
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
    <SECTION title="Buy Box — Call Form" icon={Building2} iconColor="text-blue-400">
      <div className="space-y-6">

        {/* Buyer Status */}
        <div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mb-3">
            <p className="text-yellow-400 text-xs font-medium">📞 Ask: "Are you actively looking at deals right now, or more on pause unless something really strong comes through?"</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Buying Status</label>
              <select value={bbForm.buyingStatus||''} onChange={e=>setBbForm((p:any)=>({...p,buyingStatus:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500">
                <option value="">Unknown</option>
                <option value="actively_buying">Actively Buying</option>
                <option value="buying_soon">Buying Soon</option>
                <option value="paused">Paused</option>
                <option value="not_buying">Not Buying</option>
                <option value="wholesaler">Wholesaler / JV Partner</option>
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Temperature</label>
              <select value={bbForm.buyerTemperature||''} onChange={e=>setBbForm((p:any)=>({...p,buyerTemperature:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500">
                <option value="">Unknown</option>
                <option value="hot">🔥 Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
                <option value="dead">Dead</option>
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Deals/Month Capacity</label>
              <input type="number" value={bbForm.monthlyCapacity||''} onChange={e=>setBbForm((p:any)=>({...p,monthlyCapacity:e.target.value}))} placeholder="e.g. 2" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">If Paused — Resume Date</label>
              <input type="text" value={bbForm.resumeDate||''} onChange={e=>setBbForm((p:any)=>({...p,resumeDate:e.target.value}))} placeholder="e.g. July 2026" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Market */}
        <div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mb-3">
            <p className="text-yellow-400 text-xs font-medium">📞 Ask: "What are your main markets? Any zip codes or neighborhoods you don't want us sending?"</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Primary Market</label>
              <input value={bbForm.marketPrimary||''} onChange={e=>setBbForm((p:any)=>({...p,marketPrimary:e.target.value}))} placeholder="e.g. Birmingham" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Secondary Markets</label>
              <input value={bbForm.marketSecondary||''} onChange={e=>setBbForm((p:any)=>({...p,marketSecondary:e.target.value}))} placeholder="comma separated" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">States</label>
              <input value={bbForm.states||''} onChange={e=>setBbForm((p:any)=>({...p,states:e.target.value}))} placeholder="e.g. AL, FL" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Zip Codes</label>
              <input value={bbForm.zipCodes||''} onChange={e=>setBbForm((p:any)=>({...p,zipCodes:e.target.value}))} placeholder="comma separated" disabled={bbForm.anyZipOk} className={`w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 ${bbForm.anyZipOk?'opacity-40':''}`} />
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer"><input type="checkbox" checked={!!bbForm.anyZipOk} onChange={e=>setBbForm((p:any)=>({...p,anyZipOk:e.target.checked}))} className="accent-blue-500" /><span className="text-gray-400 text-xs">Any zip OK — entire market</span></label>
            </div>
            <div className="col-span-2">
              <label className="text-gray-500 text-xs block mb-1">Excluded Areas</label>
              <input value={bbForm.excludedAreas||''} onChange={e=>setBbForm((p:any)=>({...p,excludedAreas:e.target.value}))} placeholder="e.g. no hoods, no rural" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Property */}
        <div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mb-3">
            <p className="text-yellow-400 text-xs font-medium">📞 Ask: "What property types are you buying? Any minimum year built? Okay with tenant-occupied or prefer vacant?"</p>
          </div>
          <div className="mb-3">
            <label className="text-gray-500 text-xs block mb-2">Property Types</label>
            <div className="flex flex-wrap gap-2">
              {['SFH','Duplex','Triplex','Fourplex','Multi-Family (5+)','Mobile Home','Condo','Townhouse','Land','Commercial','Mixed Use'].map(pt=>{
                const selected = (bbForm.propertyTypes||'').includes(pt);
                return <button key={pt} type="button" onClick={()=>{ const cur = bbForm.propertyTypes ? bbForm.propertyTypes.split(',').map((s:string)=>s.trim()).filter(Boolean) : []; const updated = selected ? cur.filter((s:string)=>s!==pt) : [...cur, pt]; setBbForm((p:any)=>({...p, propertyTypes: updated.join(', ')})); }} className={`text-xs px-2.5 py-1 rounded-full border transition ${selected ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'}`}>{pt}</button>;
              })}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Min Beds</label>
              <input type="number" value={bbForm.minBeds||''} onChange={e=>setBbForm((p:any)=>({...p,minBeds:e.target.value}))} placeholder="e.g. 3" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Min Baths</label>
              <input type="number" value={bbForm.minBaths||''} onChange={e=>setBbForm((p:any)=>({...p,minBaths:e.target.value}))} placeholder="e.g. 1" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Min Sqft</label>
              <input type="number" value={bbForm.minSqft||''} onChange={e=>setBbForm((p:any)=>({...p,minSqft:e.target.value}))} placeholder="e.g. 1000" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Min Year Built</label>
              <input type="number" value={bbForm.minYearBuilt||''} onChange={e=>setBbForm((p:any)=>({...p,minYearBuilt:e.target.value}))} placeholder="e.g. 1975" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Max Year Built</label>
              <input type="number" value={bbForm.maxYearBuilt||''} onChange={e=>setBbForm((p:any)=>({...p,maxYearBuilt:e.target.value}))} placeholder="e.g. 2010" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">HOA OK?</label>
              <select value={bbForm.hoaOk||''} onChange={e=>setBbForm((p:any)=>({...p,hoaOk:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none">
                <option value="">Unknown</option>
                <option value="yes">Yes</option>
                <option value="no">No HOA</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-gray-500 text-xs block mb-1">Occupancy</label>
              <select value={bbForm.occupancy||''} onChange={e=>setBbForm((p:any)=>({...p,occupancy:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none">
                <option value="">No preference</option>
                <option value="vacant_only">Vacant Only</option>
                <option value="tenant_ok">Tenant OK</option>
                <option value="section8_ok">Section 8 OK</option>
                <option value="no_tenants">No Tenants</option>
              </select>
            </div>
          </div>
        </div>

        {/* Price */}
        <div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mb-3">
            <p className="text-yellow-400 text-xs font-medium">📞 Ask: "What price range are you most comfortable buying in? Is there a minimum profit or spread you need before it's worth your time?"</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Min Purchase Price</label>
              <input type="number" value={bbForm.minPrice||''} onChange={e=>setBbForm((p:any)=>({...p,minPrice:e.target.value}))} placeholder="e.g. 30000" disabled={bbForm.anyPrice} className={`w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 ${bbForm.anyPrice?'opacity-40':''}`} />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Max Purchase Price</label>
              <input type="number" value={bbForm.maxPrice||''} onChange={e=>setBbForm((p:any)=>({...p,maxPrice:e.target.value}))} placeholder="e.g. 150000" disabled={bbForm.anyPrice} className={`w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 ${bbForm.anyPrice?'opacity-40':''}`} />
            </div>
            <div className="col-span-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!bbForm.anyPrice} onChange={e=>setBbForm((p:any)=>({...p,anyPrice:e.target.checked}))} className="accent-blue-500" /><span className="text-gray-400 text-xs">No price limit — buys at any price point</span></label></div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Min ARV</label>
              <input type="number" value={bbForm.minArv||''} onChange={e=>setBbForm((p:any)=>({...p,minArv:e.target.value}))} placeholder="e.g. 100000" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Min Projected Profit</label>
              <input type="number" value={bbForm.minProfit||''} onChange={e=>setBbForm((p:any)=>({...p,minProfit:e.target.value}))} placeholder="e.g. 25000" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Max Rehab Budget</label>
              <input type="number" value={bbForm.maxRehab||''} onChange={e=>setBbForm((p:any)=>({...p,maxRehab:e.target.value}))} placeholder="e.g. 50000" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Min Cash Flow (rentals)</label>
              <input type="number" value={bbForm.minCashFlow||''} onChange={e=>setBbForm((p:any)=>({...p,minCashFlow:e.target.value}))} placeholder="e.g. 300" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Strategy + Rehab */}
        <div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mb-3">
            <p className="text-yellow-400 text-xs font-medium">📞 Ask: "What's your main strategy right now? What rehab level are you comfortable with? Any automatic nos — foundation, fire, flood, mold, title issues?"</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Strategies</label>
              <input value={bbForm.strategies||''} onChange={e=>setBbForm((p:any)=>({...p,strategies:e.target.value}))} placeholder="e.g. Fix & Flip, Buy & Hold" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Rehab Tolerance</label>
              <select value={bbForm.rehabTolerance||''} onChange={e=>setBbForm((p:any)=>({...p,rehabTolerance:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none">
                <option value="">Unknown</option>
                <option value="COSMETIC_ONLY">Turnkey / Cosmetic Only</option>
                <option value="LIGHT">Light Rehab</option>
                <option value="MEDIUM">Medium Rehab</option>
                <option value="HEAVY">Heavy Rehab</option>
                <option value="FULL_GUT">Full Gut</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-gray-500 text-xs block mb-1">Hard No Criteria</label>
              <input value={bbForm.hardNoCriteria||''} onChange={e=>setBbForm((p:any)=>({...p,hardNoCriteria:e.target.value}))} placeholder="e.g. no foundation issues, no fire damage, no mold" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Funding */}
        <div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mb-3">
            <p className="text-yellow-400 text-xs font-medium">📞 Ask: "How are you typically funding deals? Do you have proof of funds we can keep on file? How fast can you close?"</p>
          </div>
          <div className="mb-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!bbForm.proofOfFundsWaived} onChange={e=>setBbForm((p:any)=>({...p,proofOfFundsWaived:e.target.checked}))} className="accent-blue-500" /><span className="text-gray-400 text-xs">Waive proof of funds — trusted buyer, not required</span></label></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Funding Type</label>
              <input value={bbForm.funding||''} onChange={e=>setBbForm((p:any)=>({...p,funding:e.target.value}))} placeholder="e.g. Cash, Hard Money, DSCR" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Close Speed (days)</label>
              <input type="number" value={bbForm.closeSpeed||''} onChange={e=>setBbForm((p:any)=>({...p,closeSpeed:e.target.value}))} placeholder="e.g. 14" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Max EMD</label>
              <input type="number" value={bbForm.maxEmd||''} onChange={e=>setBbForm((p:any)=>({...p,maxEmd:e.target.value}))} placeholder="e.g. 2500" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Inspection Period (days)</label>
              <input type="number" value={bbForm.inspectionDays||''} onChange={e=>setBbForm((p:any)=>({...p,inspectionDays:e.target.value}))} placeholder="e.g. 7" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Deal Send Preferences */}
        <div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mb-3">
            <p className="text-yellow-400 text-xs font-medium">📞 Ask: "How do you prefer we send deals — text, call, email? Do you want every match or only the strongest ones? What do you want first — photos, numbers, comps?"</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Preferred Contact</label>
              <select value={bbForm.preferredContact||''} onChange={e=>setBbForm((p:any)=>({...p,preferredContact:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none">
                <option value="">Unknown</option>
                <option value="sms">Text / SMS</option>
                <option value="call">Phone Call</option>
                <option value="email">Email</option>
                <option value="facebook">Facebook</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Deal Send Frequency</label>
              <select value={bbForm.dealSendFreq||''} onChange={e=>setBbForm((p:any)=>({...p,dealSendFreq:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none">
                <option value="">Unknown</option>
                <option value="every_match">Every Match</option>
                <option value="only_best">Only Best Deals</option>
                <option value="call_first">Call Me First</option>
                <option value="do_not_blast">Do Not Blast</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-gray-500 text-xs block mb-1">Private Notes</label>
              <textarea value={bbForm.privateNotes||''} onChange={e=>setBbForm((p:any)=>({...p,privateNotes:e.target.value}))} placeholder="Anything else to know about this buyer..." rows={3} className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 resize-none" />
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-800">
          <button onClick={saveBuyBox} disabled={savingBb} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition disabled:opacity-50 font-medium">{savingBb?'Saving...':'💾 Save Buy Box'}</button>
          <button onClick={markReviewed} className={`px-4 py-2 text-sm rounded-lg transition border font-medium ${ (buyer.tags||[]).includes('profile_reviewed') ? 'bg-green-600 text-white border-green-500' : 'bg-yellow-500 hover:bg-yellow-400 text-black border-yellow-400' }`}><CheckCircle size={13} className="inline mr-1" />{(buyer.tags||[]).includes('profile_reviewed')?'✓ Reviewed':'Mark Reviewed'}</button>
        </div>

      </div>
    </SECTION>

    <SECTION title={'Buying Seriousness — '+(buyer.seriousnessScore??50)+'/100'} icon={Activity} iconColor="text-amber-400"><div className="space-y-3"><SBar label="Seriousness" score={buyer.seriousnessScore??50} color="bg-amber-500" /><div className="space-y-1.5">{(buyer.buyerIntelNotes?.length||0)>100&&<div className="flex items-center gap-2 text-xs text-gray-300"><CheckCircle size={11} className="text-green-400" />Has detailed conversation history</div>}{buyer.marketPrimary&&<div className="flex items-center gap-2 text-xs text-gray-300"><CheckCircle size={11} className="text-green-400" />Confirmed market: {buyer.marketPrimary}</div>}{!buyer.buyBox?.zipCodes?.length&&<div className="flex items-center gap-2 text-xs text-amber-400"><AlertCircle size={11} />Zip codes not confirmed</div>}</div></div></SECTION>
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