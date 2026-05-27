'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, TrendingUp, Zap, Star, DollarSign, Phone, Mail, Building2, RefreshCw, Brain, MapPin, Target, FileText, ChevronDown, ChevronUp, Save, CheckCircle, XCircle, AlertCircle, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import { ScoreMeter } from '@/components/buyer/ScoreMeter';
import { ActivityTimeline } from '@/components/buyer/ActivityTimeline';
import { formatCurrency } from '@/lib/format';
import toast from 'react-hot-toast';

const SECTION = ({ title, icon: Icon, iconColor = 'text-gray-400', children, defaultOpen = true }: any) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800/50 transition">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">{Icon && <Icon size={14} className={iconColor} />}{title}</h2>
        {open ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
};

const Row = ({ label, value, valueClass = 'text-white' }: any) => value != null && value !== '' ? (
  <div className="flex justify-between items-start py-1.5 border-b border-gray-800/50 last:border-0">
    <span className="text-gray-500 text-xs">{label}</span>
    <span className={`text-xs font-medium text-right max-w-xs ${valueClass}`}>{value}</span>
  </div>
) : null;

const ScoreBar = ({ label, score, color = 'bg-blue-500' }: any) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs"><span className="text-gray-500">{label}</span><span className="text-white font-medium">{score}/100</span></div>
    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} /></div>
  </div>
);

export default function BuyerProfilePage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const { id } = params;
  const [intelText, setIntelText] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [extractedPrefs, setExtractedPrefs] = useState<any[]>([]);

  const { data: buyer, isLoading, isError } = useQuery({
    queryKey: ['buyer', id],
    queryFn: () => api.get(`/buyers/${id}`).then(r => r.data),
    retry: 1,
  });

  const { data: analytics } = useQuery({
    queryKey: ['buyer-analytics', id],
    queryFn: () => api.get(`/buyers/${id}/analytics`).then(r => r.data),
    enabled: !!buyer, retry: 1,
  });

  useEffect(() => {
    if (buyer?.buyerIntelNotes) setIntelText(buyer.buyerIntelNotes);
    if (buyer?.aiSummary) setAiSummary(buyer.aiSummary);
  }, [buyer]);

  const recalculate = useMutation({
    mutationFn: () => api.post(`/buyers/${id}/recalculate-scores`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['buyer', id] }); toast.success('Scores recalculated'); },
  });

  const saveIntel = async () => {
    setSaving(true);
    try { await api.put(`/buyers/${id}`, { buyerIntelNotes: intelText }); qc.invalidateQueries({ queryKey: ['buyer', id] }); toast.success('Intel notes saved'); }
    catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const generateAiSummary = async () => {
    if (!buyer) return;
    setGeneratingSummary(true);
    try {
      const prompt = `You are a real estate dispositions analyst. Based on this buyer profile, write a 2-3 sentence summary interpreting WHO this buyer is, WHAT they actually buy, their seriousness, and what deal would excite them. Be specific.\n\nBuyer: ${buyer.firstName} ${buyer.lastName}\nMarket: ${buyer.marketPrimary || 'Unknown'}\nStrategies: ${(buyer.preferredStrategies||[]).join(', ')||'Unknown'}\nFunding: ${buyer.notes||'Unknown'}\nRehab: ${buyer.buyBox?.rehabTolerance||'Unknown'}\nScore: ${buyer.compositeScore}/100\n\nNotes:\n${(buyer.buyerIntelNotes||'No notes').substring(0,800)}\n\nRespond in JSON: {"summary": "...", "tags": ["tag1"], "extractedPrefs": [{"pref": "description", "confidence": 85, "source": "intel notes"}]}`;
      const response = await fetch('/api/anthropic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, maxTokens: 800 }) });
      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean.substring(clean.indexOf('{'), clean.lastIndexOf('}') + 1));
      setAiSummary(parsed.summary || '');
      setAiTags(parsed.tags || []);
      setExtractedPrefs(parsed.extractedPrefs || []);
      await api.put(`/buyers/${id}`, { aiSummary: parsed.summary });
      toast.success('AI summary generated');
    } catch { toast.error('Failed to generate summary'); }
    finally { setGeneratingSummary(false); }
  };

  if (isLoading) return <div className="p-6 text-gray-500 text-sm">Loading buyer...</div>;
  if (isError || !buyer) return <div className="p-6 text-red-400 text-sm">Could not load buyer. <a href="/dashboard/buyers" className="underline">Go back</a></div>;

  const tierColor = buyer.tier === 'TIER_1' ? 'text-orange-400' : buyer.tier === 'TIER_2' ? 'text-blue-400' : 'text-gray-400';
  const tierBg = buyer.tier === 'TIER_1' ? 'bg-orange-500/10 border-orange-500/30' : buyer.tier === 'TIER_2' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-gray-500/10 border-gray-500/30';
  const tierLabel = buyer.tier === 'TIER_1' ? '🔥 Tier 1' : buyer.tier === 'TIER_2' ? 'Tier 2' : 'Tier 3';
  const displayName = (buyer.firstName === 'Unknown' || !buyer.firstName) ? (buyer.phone || buyer.email?.split('@')[0]) : buyer.lastName === 'Buyer' ? buyer.firstName : `${buyer.firstName} ${buyer.lastName}`;

  const checks = [
    { label: 'Primary market', done: !!buyer.marketPrimary },
    { label: 'Price range', done: !!(buyer.buyBox?.minPrice || buyer.buyBox?.maxPrice) },
    { label: 'Rehab tolerance', done: !!buyer.buyBox?.rehabTolerance },
    { label: 'Strategy confirmed', done: !!(buyer.preferredStrategies?.length) },
    { label: 'Funding type', done: !!buyer.notes },
    { label: 'Zip codes', done: !!(buyer.buyBox?.zipCodes?.length) },
    { label: 'Min beds', done: !!buyer.buyBox?.minBeds },
    { label: 'Intel notes', done: !!(buyer.buyerIntelNotes?.length > 50) },
    { label: 'Phone verified', done: !!buyer.phone },
    { label: 'Close history', done: !!(buyer.closeCount > 0) },
  ];
  const completeness = Math.round((checks.filter(c => c.done).length / checks.length) * 100);
  const missing = checks.filter(c => !c.done).map(c => c.label);

  const appetite = buyer.seriousnessScore >= 80 ? { label: 'Hot', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: '🔥' }
    : buyer.seriousnessScore >= 65 ? { label: 'Active', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', icon: '⚡' }
    : buyer.seriousnessScore >= 50 ? { label: 'Warm', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '🌡️' }
    : { label: 'Dormant', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/30', icon: '😴' };

  const seriousnessReasons: string[] = [];
  if (buyer.buyerIntelNotes?.length > 100) seriousnessReasons.push('Has detailed conversation history');
  if (buyer.marketPrimary) seriousnessReasons.push(`Confirmed market: ${buyer.marketPrimary}`);
  if (buyer.preferredStrategies?.length) seriousnessReasons.push(`Strategy defined: ${buyer.preferredStrategies[0]}`);
  if (buyer.buyBox?.minPrice) seriousnessReasons.push('Price range confirmed');
  if (!buyer.closeCount) seriousnessReasons.push('⚠ No verified close history in platform');
  if (!buyer.buyBox?.zipCodes?.length) seriousnessReasons.push('⚠ Zip codes not confirmed');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{displayName}</h1>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${tierBg} ${tierColor}`}>{tierLabel}</span>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${appetite.bg} ${appetite.color}`}>{appetite.icon} {appetite.label}</span>
          </div>
          {buyer.company && <p className="text-gray-400 text-sm mt-0.5">{buyer.company}</p>}
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            {buyer.phone && <span className="flex items-center gap-1 text-gray-400 text-xs"><Phone size={11} />{buyer.phone}</span>}
            {buyer.email && !buyer.email.includes('@import.dispoai.com') && <span className="flex items-center gap-1 text-gray-400 text-xs"><Mail size={11} />{buyer.email}</span>}
            {buyer.marketPrimary && <span className="flex items-center gap-1 text-gray-400 text-xs"><MapPin size={11} />{buyer.marketPrimary}</span>}
          </div>
          {aiTags.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{aiTags.map(tag => <span key={tag} className="text-xs px-2 py-0.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-full">{tag}</span>)}</div>}
        </div>
        <button onClick={() => recalculate.mutate()} disabled={recalculate.isPending} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition">
          <RefreshCw size={12} className={recalculate.isPending ? 'animate-spin' : ''} />Recalculate
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ScoreMeter label="Composite" score={buyer.compositeScore} icon={Star} color="text-yellow-400" />
        <ScoreMeter label="Reliability" score={buyer.reliabilityScore} icon={Shield} color="text-green-400" />
        <ScoreMeter label="Liquidity" score={buyer.liquidityScore} icon={DollarSign} color="text-blue-400" />
        <ScoreMeter label="Activity" score={buyer.activityScore} icon={Zap} color="text-purple-400" />
      </div>

      <SECTION title="AI Buyer Intelligence Summary" icon={Brain} iconColor="text-purple-400">
        {aiSummary ? (
          <div className="space-y-3">
            <p className="text-gray-300 text-sm leading-relaxed bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">{aiSummary}</p>
            <button onClick={generateAiSummary} disabled={generatingSummary} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"><RefreshCw size={11} className={generatingSummary ? 'animate-spin' : ''} />{generatingSummary ? 'Regenerating...' : 'Regenerate'}</button>
          </div>
        ) : (
          <div className="text-center py-4 space-y-3">
            <p className="text-gray-500 text-sm">No AI summary yet</p>
            <button onClick={generateAiSummary} disabled={generatingSummary || !buyer.buyerIntelNotes} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition disabled:opacity-50 mx-auto">
              <Brain size={13} />{generatingSummary ? 'Generating...' : 'Generate AI Summary'}
            </button>
            {!buyer.buyerIntelNotes && <p className="text-gray-600 text-xs">Add intel notes first</p>}
          </div>
        )}
      </SECTION>

      <SECTION title={`Profile Completeness — ${completeness}/100`} icon={Target} iconColor="text-blue-400">
        <div className="space-y-3">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${completeness >= 80 ? 'bg-green-500' : completeness >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${completeness}%` }} /></div>
          {missing.length > 0 && <div><p className="text-gray-500 text-xs mb-2">Still needed:</p><div className="grid grid-cols-2 gap-1.5">{missing.map(m => <div key={m} className="flex items-center gap-1.5 text-xs text-amber-400"><AlertCircle size={11} />{m}</div>)}</div></div>}
          <div className="grid grid-cols-2 gap-1.5">{checks.filter(c => c.done).map(c => <div key={c.label} className="flex items-center gap-1.5 text-xs text-green-400"><CheckCircle size={11} />{c.label}</div>)}</div>
        </div>
      </SECTION>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SECTION title="Buy Box" icon={Building2} iconColor="text-blue-400">
          <div className="space-y-0">
            <Row label="Primary Market" value={buyer.marketPrimary} />
            <Row label="Secondary Markets" value={buyer.marketSecondary?.join(', ')} />
            <Row label="States" value={buyer.buyBox?.states?.join(', ')} />
            <Row label="Zip Codes" value={buyer.buyBox?.zipCodes?.join(', ')} />
            <Row label="Price Range" value={(buyer.buyBox?.minPrice || buyer.buyBox?.maxPrice) ? `${buyer.buyBox?.minPrice ? formatCurrency(buyer.buyBox.minPrice) : '—'} – ${buyer.buyBox?.maxPrice ? formatCurrency(buyer.buyBox.maxPrice) : '—'}` : null} />
            <Row label="Rehab Tolerance" value={buyer.buyBox?.rehabTolerance} />
            <Row label="Min Beds" value={buyer.buyBox?.minBeds ? `${buyer.buyBox.minBeds}+` : null} />
            <Row label="Strategy" value={buyer.preferredStrategies?.join(', ')} />
            <Row label="Funding" value={buyer.notes} />
            <Row label="Deal Breakers" value={buyer.dealBreakers?.join(', ')} valueClass="text-red-400" />
            {(!buyer.buyBox && !buyer.marketPrimary) && <p className="text-gray-600 text-xs italic pt-2">No buy box data yet</p>}
          </div>
        </SECTION>
        <div className="space-y-4">
          <SECTION title="Reliability Breakdown" icon={Shield} iconColor="text-green-400">
            <div className="space-y-3">
              <ScoreBar label="Close Rate" score={buyer.closeRate ? Math.round(buyer.closeRate) : 50} color="bg-green-500" />
              <ScoreBar label="EMD Performance" score={buyer.emdFailureCount === 0 ? 75 : 40} color="bg-blue-500" />
              <ScoreBar label="No Retrade Risk" score={buyer.retradeCount === 0 ? 80 : 30} color="bg-yellow-500" />
              <ScoreBar label="No Ghost Risk" score={buyer.ghostCount === 0 ? 80 : 30} color="bg-purple-500" />
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="bg-gray-800 rounded p-2"><span className="text-gray-500">Closed</span><p className="text-white font-bold text-lg">{buyer.closeCount ?? 0}</p></div>
                <div className="bg-gray-800 rounded p-2"><span className="text-gray-500">Cancelled</span><p className="text-white font-bold text-lg">{buyer.cancelCount ?? 0}</p></div>
              </div>
            </div>
          </SECTION>
          <SECTION title="Liquidity Breakdown" icon={DollarSign} iconColor="text-blue-400">
            <div className="space-y-2">
              <Row label="Proof of Funds" value={buyer.proofOfFundsUrl ? '✓ Uploaded' : '✗ Not uploaded'} valueClass={buyer.proofOfFundsUrl ? 'text-green-400' : 'text-red-400'} />
              <Row label="Funding Type" value={buyer.notes} />
              <Row label="Close Speed" value={buyer.avgCloseSpeedDays ? `${buyer.avgCloseSpeedDays} days avg` : 'Unknown'} />
              <Row label="Preferred Title Co" value={buyer.preferredTitleCo} />
              <ScoreBar label="Overall Liquidity" score={buyer.liquidityScore || 50} color="bg-blue-500" />
            </div>
          </SECTION>
        </div>
      </div>

      <SECTION title={`Seriousness — ${buyer.seriousnessScore ?? 50}/100`} icon={Activity} iconColor="text-amber-400">
        <div className="space-y-3">
          <ScoreBar label="Seriousness Score" score={buyer.seriousnessScore ?? 50} color="bg-amber-500" />
          <div className="space-y-1.5 pt-1">{seriousnessReasons.map((r, i) => <div key={i} className={`flex items-center gap-2 text-xs ${r.startsWith('⚠') ? 'text-amber-400' : 'text-gray-300'}`}>{r.startsWith('⚠') ? <AlertCircle size={11} /> : <CheckCircle size={11} className="text-green-400" />}{r.replace('⚠ ', '')}</div>)}</div>
        </div>
      </SECTION>

      <SECTION title="Analytics" icon={TrendingUp} iconColor="text-green-400">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[{ label: 'Deals Closed', value: analytics?.totalClosed ?? buyer.closeCount ?? 0 }, { label: 'Close Rate', value: `${analytics?.closeRate ?? 0}%` }, { label: 'Avg Fee', value: analytics?.avgFee ? formatCurrency(analytics.avgFee) : '—' }, { label: 'Ghost Count', value: buyer.ghostCount ?? 0 }].map(({ label, value }) => (
            <div key={label} className="bg-gray-800 rounded-lg p-3"><span className="text-gray-500 text-xs">{label}</span><p className="text-white text-xl font-bold mt-1">{value}</p></div>
          ))}
        </div>
      </SECTION>

      {extractedPrefs.length > 0 && (
        <SECTION title="AI Extracted Preferences" icon={Brain} iconColor="text-purple-400">
          <div className="space-y-2">{extractedPrefs.map((pref, i) => (
            <div key={i} className="flex items-start justify-between bg-gray-800 rounded-lg p-3">
              <div className="flex-1"><p className="text-white text-xs">{pref.pref}</p><p className="text-gray-500 text-xs mt-0.5">Confidence: {pref.confidence}% · {pref.source}</p></div>
              <div className="flex gap-2 ml-3"><button className="text-green-400 hover:text-green-300"><CheckCircle size={14} /></button><button className="text-red-400 hover:text-red-300"><XCircle size={14} /></button></div>
            </div>
          ))}</div>
        </SECTION>
      )}

      <SECTION title="Buyer Intelligence Notes" icon={Brain} iconColor="text-purple-400">
        <div className="space-y-3">
          <p className="text-gray-600 text-xs">Paste call transcripts, SMS, meeting notes — AI reads and learns from this</p>
          <textarea value={intelText} onChange={e => setIntelText(e.target.value)} placeholder="Paste call transcripts, SMS conversations, meeting notes..." className="w-full h-40 bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg p-3 text-xs resize-none focus:outline-none focus:border-purple-500" />
          <div className="flex items-center justify-between">
            <button onClick={generateAiSummary} disabled={generatingSummary || !intelText} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-40"><Brain size={11} />{generatingSummary ? 'Analyzing...' : 'Analyze & Extract Insights'}</button>
            <button onClick={saveIntel} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg transition disabled:opacity-50"><Save size={11} />{saving ? 'Saving...' : 'Save Notes'}</button>
          </div>
        </div>
      </SECTION>

      <SECTION title="Activity Timeline" icon={FileText} iconColor="text-gray-400">
        <ActivityTimeline buyerId={id} />
      </SECTION>
    </div>
  );
}