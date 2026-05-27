'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, TrendingUp, Zap, Star, DollarSign, Phone, Mail, Building2, RefreshCw, Brain, MapPin, Target, FileText, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { ScoreMeter } from '@/components/buyer/ScoreMeter';
import { ActivityTimeline } from '@/components/buyer/ActivityTimeline';
import { formatCurrency } from '@/lib/format';
import toast from 'react-hot-toast';

export default function BuyerProfilePage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const { id } = params;
  const [intelText, setIntelText] = useState('');
  const [showIntel, setShowIntel] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: buyer, isLoading, isError } = useQuery({
    queryKey: ['buyer', id],
    queryFn: () => api.get(`/buyers/${id}`).then(r => r.data),
    retry: 1,
  });

  const { data: analytics } = useQuery({
    queryKey: ['buyer-analytics', id],
    queryFn: () => api.get(`/buyers/${id}/analytics`).then(r => r.data),
    enabled: !!buyer,
    retry: 1,
  });

  const recalculate = useMutation({
    mutationFn: () => api.post(`/buyers/${id}/recalculate-scores`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['buyer', id] }); toast.success('Scores recalculated'); },
  });

  const saveIntel = async () => {
    setSaving(true);
    try {
      await api.put(`/buyers/${id}`, { buyerIntelNotes: intelText });
      qc.invalidateQueries({ queryKey: ['buyer', id] });
      toast.success('Intel notes saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  if (isLoading) return <div className="p-6 text-gray-500 text-sm">Loading buyer...</div>;
  if (isError || !buyer) return <div className="p-6 text-red-400 text-sm">Could not load buyer. <a href="/dashboard/buyers" className="underline">Go back</a></div>;

  const tierColor = buyer.tier === 'TIER_1' ? 'text-orange-400' : buyer.tier === 'TIER_2' ? 'text-blue-400' : 'text-gray-400';
  const tierLabel = buyer.tier === 'TIER_1' ? '🔥 Tier 1' : buyer.tier === 'TIER_2' ? 'Tier 2' : 'Tier 3';
  const displayName = (buyer.firstName === 'Unknown' || !buyer.firstName)
    ? (buyer.phone || buyer.email?.split('@')[0])
    : buyer.lastName === 'Buyer' ? buyer.firstName : `${buyer.firstName} ${buyer.lastName}`;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{displayName}</h1>
            <span className={`text-sm font-semibold ${tierColor}`}>{tierLabel}</span>
          </div>
          {buyer.company && <p className="text-gray-400 text-sm">{buyer.company}</p>}
          <div className="flex items-center gap-4 mt-1">
            {buyer.phone && <span className="flex items-center gap-1 text-gray-400 text-sm"><Phone size={13} />{buyer.phone}</span>}
            {buyer.email && !buyer.email.includes('@import.dispoai.com') && <span className="flex items-center gap-1 text-gray-400 text-sm"><Mail size={13} />{buyer.email}</span>}
            {buyer.marketPrimary && <span className="flex items-center gap-1 text-gray-400 text-sm"><MapPin size={13} />{buyer.marketPrimary}</span>}
          </div>
        </div>
        <button onClick={() => recalculate.mutate()} disabled={recalculate.isPending}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
          <RefreshCw size={14} className={recalculate.isPending ? 'animate-spin' : ''} />Recalculate
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreMeter label="Composite" score={buyer.compositeScore} icon={Star} color="text-yellow-400" />
        <ScoreMeter label="Reliability" score={buyer.reliabilityScore} icon={Shield} color="text-green-400" />
        <ScoreMeter label="Liquidity" score={buyer.liquidityScore} icon={DollarSign} color="text-blue-400" />
        <ScoreMeter label="Activity" score={buyer.activityScore} icon={Zap} color="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Building2 size={15} />Buy Box</h2>
          <div className="space-y-3 text-sm">
            {buyer.marketPrimary && <div className="flex justify-between"><span className="text-gray-500">Primary Market</span><span className="text-white">{buyer.marketPrimary}</span></div>}
            {buyer.marketSecondary?.length > 0 && <div className="flex justify-between"><span className="text-gray-500">Secondary Markets</span><span className="text-white text-right">{buyer.marketSecondary.join(', ')}</span></div>}
            {buyer.buyBox?.states?.length > 0 && <div className="flex justify-between"><span className="text-gray-500">States</span><span className="text-white">{buyer.buyBox.states.join(', ')}</span></div>}
            {buyer.buyBox?.zipCodes?.length > 0 && <div className="flex justify-between"><span className="text-gray-500">Zip Codes</span><span className="text-white text-right">{buyer.buyBox.zipCodes.join(', ')}</span></div>}
            {(buyer.buyBox?.minPrice || buyer.buyBox?.maxPrice) && <div className="flex justify-between"><span className="text-gray-500">Price Range</span><span className="text-white">{buyer.buyBox?.minPrice ? formatCurrency(buyer.buyBox.minPrice) : '—'} – {buyer.buyBox?.maxPrice ? formatCurrency(buyer.buyBox.maxPrice) : '—'}</span></div>}
            {buyer.buyBox?.rehabTolerance && <div className="flex justify-between"><span className="text-gray-500">Rehab Tolerance</span><span className="text-white">{buyer.buyBox.rehabTolerance}</span></div>}
            {buyer.buyBox?.minBeds && <div className="flex justify-between"><span className="text-gray-500">Min Beds</span><span className="text-white">{buyer.buyBox.minBeds}+</span></div>}
            {buyer.preferredStrategies?.length > 0 && <div className="flex justify-between"><span className="text-gray-500">Strategy</span><span className="text-white text-right">{buyer.preferredStrategies.join(', ')}</span></div>}
            {buyer.notes && <div className="flex justify-between"><span className="text-gray-500">Funding</span><span className="text-white">{buyer.notes}</span></div>}
            {(!buyer.buyBox && !buyer.marketPrimary && !buyer.preferredStrategies?.length) && <p className="text-gray-600 text-xs italic">No buy box data yet</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><TrendingUp size={15} />Analytics</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 text-xs">Deals Closed</span><p className="text-white text-xl font-bold mt-1">{analytics?.totalClosed ?? buyer.closeCount ?? 0}</p></div>
              <div><span className="text-gray-500 text-xs">Close Rate</span><p className="text-white text-xl font-bold mt-1">{analytics?.closeRate ?? 0}%</p></div>
              <div><span className="text-gray-500 text-xs">Avg Fee</span><p className="text-white text-xl font-bold mt-1">{analytics?.avgFee ? formatCurrency(analytics.avgFee) : '—'}</p></div>
              <div><span className="text-gray-500 text-xs">Ghost Rate</span><p className="text-white text-xl font-bold mt-1">{buyer.ghostCount ?? 0}</p></div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2"><Target size={15} />Buyer Signals</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Seriousness</span><span className="text-green-400 font-bold">{buyer.seriousnessScore ?? 50}/100</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Intent Score</span><span className="text-blue-400 font-bold">{buyer.intentScore ?? 50}/100</span></div>
              <div className="flex justify-between"><span className="text-gray-500">GHL Buyer Score</span><span className="text-yellow-400 font-bold">{buyer.compositeScore ?? 50}/100</span></div>
              {buyer.dealBreakers?.length > 0 && <div><span className="text-gray-500">Deal Breakers</span><p className="text-red-400 text-xs mt-1">{buyer.dealBreakers.join(', ')}</p></div>}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <button onClick={() => setShowIntel(!showIntel)} className="w-full flex items-center justify-between p-5 text-left">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Brain size={15} className="text-purple-400" />
            Buyer Intelligence Notes
            <span className="text-xs text-gray-500 font-normal ml-2">Paste transcripts, call notes, SMS — AI reads this</span>
          </h2>
          {showIntel ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </button>
        {showIntel && (
          <div className="px-5 pb-5 space-y-3">
            <textarea
              value={intelText || (buyer.buyerIntelNotes ?? '')}
              onChange={e => setIntelText(e.target.value)}
              placeholder="Paste call transcripts, SMS conversations, meeting notes, objections, feedback on deals..."
              className="w-full h-48 bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg p-4 text-sm resize-none focus:outline-none focus:border-purple-500"
            />
            <div className="flex items-center justify-between">
              <p className="text-gray-600 text-xs">AI analyzes this to improve match scoring and buyer insights</p>
              <button onClick={saveIntel} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition disabled:opacity-50">
                <Save size={13} />{saving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><FileText size={15} />Activity Timeline</h2>
        <ActivityTimeline buyerId={id} />
      </div>
    </div>
  );
}
