'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, TrendingUp, Zap, Star, DollarSign, Phone, Mail, Building2, RefreshCw, Brain, MapPin, Target, FileText, ChevronDown, ChevronUp, Save, CheckCircle, XCircle, AlertCircle, Activity, BarChart2, MessageSquare, Send, Sparkles } from 'lucide-react';
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
const ScoreBar = ({ label, score, color = 'bg-blue-500' }: any) => (<div className="space-y-1"><div className="flex justify-between text-xs"><span className="text-gray-500">{label}</span><span className="text-white font-medium">{score}/100</span></div><div className="h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} /></div></div>);

export default function BuyerProfilePage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const { id } = params;
  const [intelText, setIntelText] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [extractedPrefs, setExtractedPrefs] = useState<any[]>([]);
  const [recommendedDeals, setRecommendedDeals] = useState<string[]>([]);
  const [dealBreakers, setDealBreakers] = useState<string[]>([]);
  const [closeProbability, setCloseProbability] = useState(50);
  const [aiConfidence, setAiConfidence] = useState(0);
  const { data: buyer, isLoading, isError } = useQuery({ queryKey: ['buyer', id], queryFn: () => api.get(`/buyers/${id}`).then(r => r.data), retry: 1 });
  const { data: analytics } = useQuery({ queryKey: ['buyer-analytics', id], queryFn: () => api.get(`/buyers/${id}/analytics`).then(r => r.data), enabled: !!buyer, retry: 1 });
  useEffect(() => {
    if (buyer?.buyerIntelNotes) setIntelText(buyer.buyerIntelNotes);
    if (buyer?.aiSummary) setAiSummary(buyer.aiSummary);
    if (buyer?.dealBreakers?.length) setDealBreakers(buyer.dealBreakers);
    if (buyer) {
      let conf = 0;
      if ((buyer.buyerIntelNotes?.length || 0) > 200) conf += 25; else if ((buyer.buyerIntelNotes?.length || 0) > 50) conf += 15;
      if (buyer.marketPrimary) conf += 10;
      if (buyer.buyBox?.minPrice) conf += 10;
      if (buyer.buyBox?.rehabTolerance) conf += 10;
      if (buyer.preferredStrategies?.length) conf += 10;
      if (buyer.notes) conf += 5;
      if (buyer.buyBox?.zipCodes?.length) conf += 10;
      if (buyer.closeCount > 0) conf += 15;
      if (buyer.proofOfFundsUrl) conf += 5;
      setAiConfidence(Math.min(100, conf));
      let prob = 40;
      prob += Math.round(((buyer.reliabilityScore || 50) - 50) * 0.3);
      prob += Math.round(((buyer.liquidityScore || 50) - 50) * 0.2);
      prob += Math.round(((buyer.seriousnessScore || 50) - 50) * 0.3);
      if (buyer.closeCount > 0) prob += 15;
      if (buyer.cancelCount > 0) prob -= 10;
      if (buyer.ghostCount > 0) prob -= 10;
      if (buyer.proofOfFundsUrl) prob += 10;
      setCloseProbability(Math.max(5, Math.min(99, prob)));
    }
  }, [buyer]);
  const recalculate = useMutation({ mutationFn: () => api.post(`/buyers/${id}/recalculate-scores`).then(r => r.data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['buyer', id] }); toast.success('Recalculated'); } });
  const saveIntel = async () => { setSaving(true); try { await api.put(`/buyers/${id}`, { buyerIntelNotes: intelText, dealBreakers }); qc.invalidateQueries({ queryKey: ['buyer', id] }); toast.success('Saved'); } catch { toast.error('Failed'); } finally { setSaving(false); } };
  const generateAiIntel = async () => {
    if (!buyer) return;
    setGenerating(true);
    try {
      const notes = (buyer.buyerIntelNotes || 'None').substring(0, 1000);
      const mkt = buyer.marketPrimary || 'Unknown';
      const strats = (buyer.preferredStrategies || []).join(', ') || 'Unknown';
      const fund = buyer.notes || 'Unknown';
      const rehab = buyer.buyBox?.rehabTolerance || 'Unknown';
      const prompt = 'You are a senior real estate dispositions analyst. Analyze this buyer and respond ONLY in valid JSON with no other text.\n\nBuyer: ' + buyer.firstName + ' ' + buyer.lastName + '\nMarket: ' + mkt + '\nStrategies: ' + strats + '\nFunding: ' + fund + '\nRehab: ' + rehab + '\nScore: ' + buyer.compositeScore + '/100\nNotes: ' + notes + '\n\nRespond ONLY with this exact JSON structure:\n{"summary": "2-3 sentence professional buyer intelligence summary interpreting who this buyer is and what deal would excite them", "tags": ["tag1", "tag2", "tag3"], "recommendedDealTypes": ["deal type 1", "deal type 2", "deal type 3"], "dealBreakers": ["deal breaker 1", "deal breaker 2"], "extractedPrefs": [{"pref": "preference description", "confidence": 85, "verified": false, "source": "intel notes"}], "missingPriority": ["missing item 1", "missing item 2"]}'
      const response = await fetch('/api/anthropic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, maxTokens: 1000 }) });
      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean.substring(clean.indexOf('{'), clean.lastIndexOf('}') + 1));
      if (parsed.summary) setAiSummary(parsed.summary);
      if (parsed.tags) setAiTags(parsed.tags);
      if (parsed.recommendedDealTypes) setRecommendedDeals(parsed.recommendedDealTypes);
      if (parsed.dealBreakers?.length) setDealBreakers(parsed.dealBreakers);
      if (parsed.extractedPrefs) setExtractedPrefs(parsed.extractedPrefs);
      await api.put(`/buyers/${id}`, { aiSummary: parsed.summary, dealBreakers: parsed.dealBreakers || dealBreakers });
      qc.invalidateQueries({ queryKey: ['buyer', id] });
      toast.success('AI intelligence generated');
    } catch (e) { toast.error('Failed to generate'); } finally { setGenerating(false); }
  };
  if (isLoading) return <div className="p-6 text-gray-500 text-sm">Loading...</div>;
  if (isError || !buyer) return <div className="p-6 text-red-400 text-sm">Could not load buyer. <a href="/dashboard/buyers" className="underline">Go back</a></div>;
  const tierColor = buyer.tier === 'TIER_1' ? 'text-orange-400' : buyer.tier === 'TIER_2' ? 'text-blue-400' : 'text-gray-400';
  const tierBg = buyer.tier === 'TIER_1' ? 'bg-orange-500/10 border-orange-500/30' : buyer.tier === 'TIER_2' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-gray-500/10 border-gray-500/30';
  const tierLabel = buyer.tier === 'TIER_1' ? 'Tier 1' : buyer.tier === 'TIER_2' ? 'Tier 2' : 'Tier 3';
  const dn = (buyer.firstName === 'Unknown' || !buyer.firstName) ? (buyer.phone || buyer.email?.split('@')[0]) : buyer.lastName === 'Buyer' ? buyer.firstName : buyer.firstName + ' ' + buyer.lastName;
  const apt = (buyer.seriousnessScore || 50) >= 80 ? { label: 'HOT', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', dot: 'bg-red-500' } : (buyer.seriousnessScore || 50) >= 65 ? { label: 'ACTIVE', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', dot: 'bg-green-500' } : (buyer.seriousnessScore || 50) >= 50 ? { label: 'WARM', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', dot: 'bg-yellow-400' } : { label: 'DORMANT', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/30', dot: 'bg-gray-500' };
  const rel = (buyer.compositeScore || 50) >= 75 ? { label: 'Strong', color: 'text-green-400' } : (buyer.compositeScore || 50) >= 55 ? { label: 'Medium', color: 'text-yellow-400' } : { label: 'Weak', color: 'text-red-400' };
  const checks = [{ label: 'Primary market', done: !!buyer.marketPrimary, p: 3 }, { label: 'Price range', done: !!(buyer.buyBox?.minPrice || buyer.buyBox?.maxPrice), p: 5 }, { label: 'Rehab tolerance', done: !!buyer.buyBox?.rehabTolerance, p: 4 }, { label: 'Strategy confirmed', done: !!(buyer.preferredStrategies?.length), p: 3 }, { label: 'Funding type', done: !!buyer.notes, p: 4 }, { label: 'Proof of funds', done: !!buyer.proofOfFundsUrl, p: 5 }, { label: 'Zip codes', done: !!(buyer.buyBox?.zipCodes?.length), p: 3 }, { label: 'Intel notes', done: !!(buyer.buyerIntelNotes?.length > 50), p: 4 }, { label: 'Phone verified', done: !!buyer.phone, p: 2 }, { label: 'Close history', done: !!(buyer.closeCount > 0), p: 5 }];
  const completeness = Math.round((checks.filter(c => c.done).length / checks.length) * 100);
  const missing = checks.filter(c => !c.done).sort((a,b) => b.p - a.p).map(c => c.label);
  const cpColor = closeProbability >= 75 ? 'text-green-400' : closeProbability >= 50 ? 'text-yellow-400' : 'text-red-400';
  const cpBg = closeProbability >= 75 ? 'border-green-500/30 bg-green-500/5' : closeProbability >= 50 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-red-500/30 bg-red-500/5';
  const srReasons: string[] = [];
  if ((buyer.buyerIntelNotes?.length || 0) > 100) srReasons.push('Has detailed conversation history');
  if (buyer.marketPrimary) srReasons.push('Confirmed market: ' + buyer.marketPrimary);
  if (buyer.preferredStrategies?.length) srReasons.push('Strategy defined: ' + buyer.preferredStrategies[0]);
  if (buyer.buyBox?.minPrice) srReasons.push('Price range confirmed');
  if (!buyer.closeCount) srReasons.push('⚠ No verified close history');
  if (!buyer.buyBox?.zipCodes?.length) srReasons.push('⚠ Zip codes not confirmed');
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{dn}</h1>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${tierBg} ${tierColor}`}>{tierLabel}</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${apt.bg} ${apt.color} flex items-center gap-1.5`}><span className={`w-1.5 h-1.5 rounded-full ${apt.dot} animate-pulse`} />{apt.label}</span>
            <span className="text-xs px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400">AI Confidence: {aiConfidence}%</span>
          </div>
          {buyer.company && <p className="text-gray-400 text-sm mt-0.5">{buyer.company}</p>}
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            {buyer.phone && <span className="flex items-center gap-1 text-gray-400 text-xs"><Phone size={11} />{buyer.phone}</span>}
            {buyer.email && !buyer.email.includes('@import.dispoai.com') && <span className="flex items-center gap-1 text-gray-400 text-xs"><Mail size={11} />{buyer.email}</span>}
            {buyer.marketPrimary && <span className="flex items-center gap-1 text-gray-400 text-xs"><MapPin size={11} />{buyer.marketPrimary}</span>}
            <span className={`text-xs ${rel.color}`}>Relationship: {rel.label}</span>
          </div>
          {aiTags.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{aiTags.map(tag => <span key={tag} className="text-xs px-2 py-0.5 bg-gray-800 border border-gray-700/50 text-gray-300 rounded-full">{tag}</span>)}</div>}
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className={`border rounded-xl p-3 text-center min-w-28 ${cpBg}`}>
            <p className="text-gray-500 text-xs">Likely to Close</p>
            <p className={`text-2xl font-bold ${cpColor}`}>{closeProbability}%</p>
          </div>
          <button onClick={() => recalculate.mutate()} disabled={recalculate.isPending} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition"><RefreshCw size={11} className={recalculate.isPending ? 'animate-spin' : ''} />Recalculate</button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ScoreMeter label="Composite" score={buyer.compositeScore} icon={Star} color="text-yellow-400" />
        <ScoreMeter label="Reliability" score={buyer.reliabilityScore} icon={Shield} color="text-green-400" />
        <ScoreMeter label="Liquidity" score={buyer.liquidityScore} icon={DollarSign} color="text-blue-400" />
        <ScoreMeter label="Activity" score={buyer.activityScore} icon={Zap} color="text-purple-400" />
      </div>
      <SECTION title="AI Buyer Intelligence Summary" icon={Brain} iconColor="text-purple-400" badge={aiConfidence ? aiConfidence + '% confidence' : undefined}>
        {aiSummary ? (<div className="space-y-3"><p className="text-gray-300 text-sm leading-relaxed bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">{aiSummary}</p><button onClick={generateAiIntel} disabled={generating} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-40"><RefreshCw size={11} className={generating ? 'animate-spin' : ''} />{generating ? 'Regenerating...' : 'Regenerate Full Intel'}</button></div>) : (<div className="text-center py-5 space-y-3"><p className="text-gray-500 text-sm">No AI intelligence generated yet</p><button onClick={generateAiIntel} disabled={generating || !buyer.buyerIntelNotes} className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition disabled:opacity-50 mx-auto font-medium"><Sparkles size={14} />{generating ? 'Generating...' : 'Generate Buyer Intelligence'}</button>{!buyer.buyerIntelNotes && <p className="text-gray-600 text-xs">Add intel notes below first</p>}</div>)}
      </SECTION>
      {recommendedDeals.length > 0 && <SECTION title="What To Send This Buyer" icon={Send} iconColor="text-green-400"><div className="grid grid-cols-2 gap-2">{recommendedDeals.map((d, i) => <div key={i} className="flex items-center gap-2 bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2"><CheckCircle size={12} className="text-green-400 flex-shrink-0" /><span className="text-green-300 text-xs">{d}</span></div>)}</div></SECTION>}
      {(dealBreakers.length > 0 || (buyer.dealBreakers?.length || 0) > 0) && <SECTION title="Avoids / Deal Breakers" icon={XCircle} iconColor="text-red-400"><div className="grid grid-cols-2 gap-2">{(dealBreakers.length > 0 ? dealBreakers : buyer.dealBreakers || []).map((d: string, i: number) => <div key={i} className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2"><XCircle size={12} className="text-red-400 flex-shrink-0" /><span className="text-red-300 text-xs">{d}</span></div>)}</div></SECTION>}
      <SECTION title={'Profile Completeness — ' + completeness + '/100'} icon={Target} iconColor="text-blue-400">
        <div className="space-y-3"><div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${completeness >= 80 ? 'bg-green-500' : completeness >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: completeness + '%' }} /></div>
          {missing.length > 0 && <div><p className="text-gray-500 text-xs mb-2">Most important missing info:</p><div className="space-y-1">{missing.slice(0,5).map((m, i) => <div key={m} className="flex items-center gap-2 text-xs"><span className="w-4 h-4 rounded-full bg-gray-800 text-gray-500 flex items-center justify-center flex-shrink-0 text-xs">{i+1}</span><span className="text-amber-400">{m}</span></div>)}</div></div>}
          <div className="grid grid-cols-2 gap-1.5">{checks.filter(c => c.done).map(c => <div key={c.label} className="flex items-center gap-1.5 text-xs text-green-400"><CheckCircle size={11} />{c.label}</div>)}</div>
        </div>
      </SECTION>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SECTION title="Buy Box" icon={Building2} iconColor="text-blue-400">
          <div className="space-y-0">
            <Row label="Primary Market" value={buyer.marketPrimary} verified={!!buyer.marketPrimary} />
            <Row label="Secondary Markets" value={buyer.marketSecondary?.join(', ')} verified={false} />
            <Row label="States" value={buyer.buyBox?.states?.join(', ')} verified={false} />
            <Row label="Zip Codes" value={buyer.buyBox?.zipCodes?.join(', ')} verified={false} />
            <Row label="Price Range" value={(buyer.buyBox?.minPrice || buyer.buyBox?.maxPrice) ? (buyer.buyBox?.minPrice ? formatCurrency(buyer.buyBox.minPrice) : '—') + ' – ' + (buyer.buyBox?.maxPrice ? formatCurrency(buyer.buyBox.maxPrice) : '—') : null} verified={false} />
            <Row label="Rehab Tolerance" value={buyer.buyBox?.rehabTolerance} verified={false} />
            <Row label="Min Beds" value={buyer.buyBox?.minBeds ? buyer.buyBox.minBeds + '+' : null} verified={false} />
            <Row label="Strategy" value={buyer.preferredStrategies?.join(', ')} verified={false} />
            <Row label="Funding" value={buyer.notes} verified={false} />
            {(!buyer.buyBox && !buyer.marketPrimary) && <p className="text-gray-600 text-xs italic pt-2">No buy box data yet</p>}
          </div>
        </SECTION>
        <div className="space-y-4">
          <SECTION title="Reliability Breakdown" icon={Shield} iconColor="text-green-400">
            <div className="space-y-3">
              <ScoreBar label="Close Rate" score={buyer.closeCount > 0 ? Math.min(100, buyer.closeCount * 20) : 40} color="bg-green-500" />
              <ScoreBar label="EMD Performance" score={buyer.emdFailureCount === 0 ? 75 : Math.max(10, 75 - buyer.emdFailureCount * 20)} color="bg-blue-500" />
              <ScoreBar label="No Retrade Risk" score={buyer.retradeCount === 0 ? 80 : Math.max(10, 80 - buyer.retradeCount * 20)} color="bg-yellow-500" />
              <ScoreBar label="No Ghost Risk" score={buyer.ghostCount === 0 ? 80 : Math.max(10, 80 - buyer.ghostCount * 20)} color="bg-purple-500" />
              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">{[['Closed', buyer.closeCount ?? 0], ['Cancelled', buyer.cancelCount ?? 0], ['Retraded', buyer.retradeCount ?? 0]].map(([l,v]) => <div key={l} className="bg-gray-800 rounded p-2 text-center"><span className="text-gray-500 block">{l}</span><p className="text-white font-bold text-lg">{v}</p></div>)}</div>
            </div>
          </SECTION>
          <SECTION title="Liquidity Breakdown" icon={DollarSign} iconColor="text-blue-400">
            <div className="space-y-2">
              <Row label="Proof of Funds" value={buyer.proofOfFundsUrl ? '✓ Uploaded' : '✗ Not uploaded'} valueClass={buyer.proofOfFundsUrl ? 'text-green-400' : 'text-red-400'} verified={!!buyer.proofOfFundsUrl} />
              <Row label="Funding Type" value={buyer.notes} verified={false} />
              <Row label="Close Speed" value={buyer.avgCloseSpeedDays ? buyer.avgCloseSpeedDays + ' days avg' : 'Unknown'} verified={buyer.closeCount > 0} />
              <Row label="Preferred Title Co" value={buyer.preferredTitleCo} verified={false} />
              <ScoreBar label="Overall Liquidity" score={buyer.liquidityScore || 50} color="bg-blue-500" />
            </div>
          </SECTION>
        </div>
      </div>
      <SECTION title={'Buying Seriousness — ' + (buyer.seriousnessScore ?? 50) + '/100'} icon={Activity} iconColor="text-amber-400">
        <div className="space-y-3"><ScoreBar label="Seriousness Score" score={buyer.seriousnessScore ?? 50} color="bg-amber-500" /><div className="space-y-1.5">{srReasons.map((r, i) => <div key={i} className={`flex items-center gap-2 text-xs ${r.startsWith('⚠') ? 'text-amber-400' : 'text-gray-300'}`}>{r.startsWith('⚠') ? <AlertCircle size={11} /> : <CheckCircle size={11} className="text-green-400" />}{r.replace('⚠ ', '')}</div>)}</div></div>
      </SECTION>
      <SECTION title="Analytics" icon={BarChart2} iconColor="text-green-400">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[{ label: 'Deals Closed', value: buyer.closeCount ?? 0 }, { label: 'Close Rate', value: (analytics?.closeRate ?? 0) + '%' }, { label: 'Avg Fee', value: analytics?.avgFee ? formatCurrency(analytics.avgFee) : '—' }, { label: 'Ghost Count', value: buyer.ghostCount ?? 0 }].map(({ label, value }) => <div key={label} className="bg-gray-800 rounded-lg p-3"><span className="text-gray-500 text-xs">{label}</span><p className="text-white text-xl font-bold mt-1">{value}</p></div>)}</div>
      </SECTION>
      {extractedPrefs.length > 0 && <SECTION title="AI Extracted Preferences" icon={Brain} iconColor="text-purple-400" badge="Needs Review"><div className="space-y-2">{extractedPrefs.map((pref, i) => <div key={i} className="flex items-start justify-between bg-gray-800/60 rounded-lg p-3 border border-gray-700/50"><div className="flex-1"><p className="text-white text-xs">{pref.pref}</p><div className="flex items-center gap-2 mt-1"><span className="text-gray-500 text-xs">Confidence: {pref.confidence}%</span><span className={`text-xs px-1.5 py-0.5 rounded ${pref.verified ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-500'}`}>{pref.verified ? '✓ Verified' : '~ AI Inferred'}</span></div></div><div className="flex gap-2 ml-3"><button onClick={() => setExtractedPrefs(p => p.filter((_,j) => j !== i))} className="text-green-400 hover:text-green-300"><CheckCircle size={15} /></button><button onClick={() => setExtractedPrefs(p => p.filter((_,j) => j !== i))} className="text-red-400 hover:text-red-300"><XCircle size={15} /></button></div></div>)}</div></SECTION>}
      <SECTION title="Buyer Intelligence Notes" icon={MessageSquare} iconColor="text-purple-400">
        <div className="space-y-3"><p className="text-gray-600 text-xs">Paste call transcripts, SMS, meeting notes — AI reads and learns from all of this</p><textarea value={intelText} onChange={e => setIntelText(e.target.value)} placeholder="Paste transcripts, call notes, SMS conversations..." className="w-full h-40 bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg p-3 text-xs resize-none focus:outline-none focus:border-purple-500" /><div className="flex items-center justify-between"><button onClick={generateAiIntel} disabled={generating || !intelText} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1.5 disabled:opacity-40"><Sparkles size={11} />{generating ? 'Analyzing...' : 'Analyze & Generate Intel'}</button><button onClick={saveIntel} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg transition disabled:opacity-50"><Save size={11} />{saving ? 'Saving...' : 'Save Notes'}</button></div></div>
      </SECTION>
      <SECTION title="Activity Timeline" icon={FileText} iconColor="text-gray-400" defaultOpen={false}><ActivityTimeline buyerId={id} /></SECTION>
    </div>
  );
}