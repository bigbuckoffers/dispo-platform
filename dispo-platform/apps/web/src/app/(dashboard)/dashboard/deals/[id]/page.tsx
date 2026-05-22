'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MapPin, DollarSign, Brain, Zap, ArrowLeft, Users, Send, TrendingUp, AlertTriangle, Home, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatRelativeTime, formatNumber } from '@/lib/format';
import toast from 'react-hot-toast';

export default function DealDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const qc = useQueryClient();

  const { data: deal, isLoading } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => api.get(`/deals/${id}`).then(r => r.data),
  });

  const { data: matchesData } = useQuery({
    queryKey: ['deal-matches', id],
    queryFn: () => api.get(`/deals/${id}/matches?limit=20`).then(r => r.data),
    enabled: !!id,
  });

  const triggerMatch = useMutation({
    mutationFn: () => api.post(`/deals/${id}/trigger-matching`).then(r => r.data),
    onSuccess: () => {
      toast.success('AI matching queued — results in ~10s');
      setTimeout(() => qc.invalidateQueries(['deal-matches', id]), 10000);
    },
  });

  const release = useMutation({
    mutationFn: (tier: number) => api.post(`/deals/${id}/release`, { tier }).then(r => r.data),
    onSuccess: (_, tier) => {
      toast.success(`Released to Tier ${tier} — campaign auto-sending`);
      qc.invalidateQueries(['deal', id]);
    },
  });

  const generateCampaign = useMutation({
    mutationFn: (tier: string) => api.post(`/deals/${id}/generate-campaign`, { tier }).then(r => r.data),
    onSuccess: (data) => {
      toast.success('AI campaign generated!');
      console.log('Campaign content:', data);
    },
  });

  if (isLoading || !deal) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const matches = matchesData || [];

  return (
    <div className="p-6 max-w-6xl space-y-6">
      {/* Back + header */}
      <div>
        <a href="/dashboard/deals" className="flex items-center gap-2 text-sm text-gray-500 hover:text-white mb-4 transition-colors">
          <ArrowLeft size={14} /> Back to deals
        </a>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">{deal.address}</h1>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
              <MapPin size={12} />{deal.city}, {deal.state} {deal.zipCode}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded border font-medium ${
            deal.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
            deal.status === 'DRAFT' ? 'text-gray-400 bg-gray-800 border-gray-700' :
            'text-amber-400 bg-amber-500/10 border-amber-500/20'
          }`}>{deal.status}</span>
        </div>
      </div>

      {/* Financials row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Asking price', value: formatCurrency(deal.askingPrice), icon: DollarSign, color: 'blue' },
          { label: 'ARV', value: deal.arv ? formatCurrency(deal.arv) : '—', icon: TrendingUp, color: 'emerald' },
          { label: 'Repairs', value: deal.repairEstimate ? formatCurrency(deal.repairEstimate) : '—', icon: Home, color: 'amber' },
          { label: 'Assignment fee', value: deal.assignmentFee ? formatCurrency(deal.assignmentFee) : '—', icon: DollarSign, color: 'violet' },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className="text-xl font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* AI scores */}
      {(deal.flipScore || deal.landlordScore) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={16} className="text-blue-400" />
            <h2 className="text-sm font-medium text-white">AI Property Analysis</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Flip Score', value: deal.flipScore, color: 'blue' },
              { label: 'Landlord Score', value: deal.landlordScore, color: 'emerald' },
              { label: 'Cash Buyer Demand', value: deal.cashBuyerDemand, color: 'violet' },
              { label: 'Risk Score', value: deal.riskScore, color: 'amber', invert: true },
            ].map(score => score.value && (
              <div key={score.label}>
                <p className="text-xs text-gray-500 mb-2">{score.label}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-${score.color}-500`} style={{ width: `${score.value}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-white">{Math.round(score.value)}</span>
                </div>
              </div>
            ))}
          </div>
          {deal.aiAnalysis?.summary && (
            <p className="text-sm text-gray-400 mt-4 border-t border-gray-800 pt-4">{deal.aiAnalysis.summary}</p>
          )}
        </div>
      )}

      {/* Property details */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-medium text-white mb-4">Property Details</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            { label: 'Type', value: deal.propertyType?.replace(/_/g, ' ') },
            { label: 'Beds / Baths', value: deal.beds ? `${deal.beds}bd / ${deal.baths}ba` : '—' },
            { label: 'Sqft', value: deal.sqft ? formatNumber(deal.sqft) : '—' },
            { label: 'Year built', value: deal.yearBuilt ?? '—' },
            { label: 'Occupancy', value: deal.occupancy?.replace(/_/g, ' ') },
            { label: 'Title status', value: deal.titleStatus },
            { label: 'Has liens', value: deal.hasLiens ? `Yes — ${formatCurrency(deal.lienAmount)}` : 'No' },
            { label: 'Closing deadline', value: deal.closingDeadline ? new Date(deal.closingDeadline).toLocaleDateString() : '—' },
          ].map(d => (
            <div key={d.label}>
              <p className="text-gray-500 text-xs">{d.label}</p>
              <p className="text-white mt-0.5">{d.value}</p>
            </div>
          ))}
        </div>
        {deal.sellerNotes && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 mb-1">Seller notes</p>
            <p className="text-sm text-gray-300">{deal.sellerNotes}</p>
          </div>
        )}
      </div>

      {/* Tier release */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-medium text-white mb-1">Release to Buyers</h2>
        <p className="text-xs text-gray-500 mb-4">Releasing triggers an AI-generated SMS + email campaign to matched buyers in that tier</p>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(tier => {
            const released = tier === 1 ? deal.tier1ReleasedAt : tier === 2 ? deal.tier2ReleasedAt : deal.tier3ReleasedAt;
            const tierLabels = { 1: 'VIP Buyers', 2: 'Active Buyers', 3: 'General Pool' };
            return (
              <div key={tier} className={`p-4 rounded-xl border ${released ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-gray-700 bg-gray-800/50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">Tier {tier}</span>
                  {released && <span className="text-xs text-emerald-400">✓ Released</span>}
                </div>
                <p className="text-xs text-gray-500 mb-3">{tierLabels[tier as keyof typeof tierLabels]}</p>
                {released ? (
                  <p className="text-xs text-gray-600">{formatRelativeTime(released)}</p>
                ) : (
                  <button onClick={() => release.mutate(tier as any)} disabled={release.isLoading}
                    className="w-full py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                    Release Now
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Matched Buyers */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-violet-400" />
            <h2 className="text-sm font-medium text-white">AI-Matched Buyers</h2>
            {matches.length > 0 && <span className="text-xs text-gray-500">({matches.length} matches)</span>}
          </div>
          <button onClick={() => triggerMatch.mutate()} disabled={triggerMatch.isLoading}
            className="text-xs text-violet-400 hover:text-violet-300 border border-violet-500/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            <Zap size={11} /> {triggerMatch.isLoading ? 'Running...' : 'Re-run matching'}
          </button>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-8">
            <Zap size={24} className="text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No matches yet</p>
            <p className="text-xs text-gray-600 mt-1">Click "Re-run matching" to find buyers</p>
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((match: any, i: number) => (
              <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-5">#{match.rank}</span>
                  <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                    {match.buyer?.firstName?.[0]}{match.buyer?.lastName?.[0]}
                  </div>
                  <div>
                    <p className="text-sm text-white">{match.buyer?.firstName} {match.buyer?.lastName}</p>
                    <p className="text-xs text-gray-500">{match.buyer?.investorType?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <p className="text-gray-500">Match score</p>
                    <p className="text-white font-semibold">{match.confidencePct}%</p>
                  </div>
                  {match.estimatedOfferMin && (
                    <div className="text-right">
                      <p className="text-gray-500">Est. offer</p>
                      <p className="text-emerald-400">{formatCurrency(match.estimatedOfferMin)}–{formatCurrency(match.estimatedOfferMax)}</p>
                    </div>
                  )}
                  <a href={`/dashboard/buyers/${match.buyer?.id}`}
                    className="text-blue-400 hover:text-blue-300 px-2 py-1 rounded border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                    View →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
