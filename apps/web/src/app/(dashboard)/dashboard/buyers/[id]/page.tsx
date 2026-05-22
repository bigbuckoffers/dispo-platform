'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield, TrendingUp, Zap, Star, MapPin, DollarSign,
  Phone, Mail, Building2, RefreshCw, AlertCircle, Brain,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ScoreMeter } from '@/components/buyer/ScoreMeter';
import { ActivityTimeline } from '@/components/buyer/ActivityTimeline';
import { formatCurrency } from '@/lib/format';
import toast from 'react-hot-toast';

export default function BuyerProfilePage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const { id } = params;

  const { data: buyer, isLoading, isError } = useQuery({
    queryKey: ['buyer', id],
    queryFn: () => api.get(`/buyers/${id}`).then(r => r.data),
    retry: 1,
  });

  const { data: scores } = useQuery({
    queryKey: ['buyer-scores', id],
    queryFn: () => api.get(`/buyers/${id}/scores`).then(r => r.data),
    enabled: !!buyer,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buyer', id] });
      qc.invalidateQueries({ queryKey: ['buyer-scores', id] });
      toast.success('Scores recalculated');
    },
  });

  if (isLoading) return <div className="p-6 text-gray-500 text-sm">Loading buyer...</div>;
  if (isError || !buyer) return <div className="p-6 text-red-400 text-sm">Could not load buyer. <a href="/dashboard/buyers" className="underline">Go back</a></div>;

  const tierColor = buyer.tier === 'TIER_1' ? 'text-orange-400' : buyer.tier === 'TIER_2' ? 'text-blue-400' : 'text-gray-400';
  const tierLabel = buyer.tier === 'TIER_1' ? '🔥 Tier 1' : buyer.tier === 'TIER_2' ? 'Tier 2' : 'Tier 3';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{buyer.firstName} {buyer.lastName}</h1>
          {buyer.company && <p className="text-gray-400 text-sm">{buyer.company}</p>}
          <div className="flex items-center gap-3 mt-1">
            {buyer.email && <span className="flex items-center gap-1 text-gray-400 text-sm"><Mail size={14}/>{buyer.email}</span>}
            {buyer.phone && <span className="flex items-center gap-1 text-gray-400 text-sm"><Phone size={14}/>{buyer.phone}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-semibold ${tierColor}`}>{tierLabel}</span>
          <button
            onClick={() => recalculate.mutate()}
            disabled={recalculate.isPending}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition"
          >
            <RefreshCw size={14} className={recalculate.isPending ? 'animate-spin' : ''} />
            Recalculate
          </button>
        </div>
      </motion.div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreMeter label="Composite" value={buyer.compositeScore} icon={Star} color="text-yellow-400" />
        <ScoreMeter label="Reliability" value={buyer.reliabilityScore} icon={Shield} color="text-green-400" />
        <ScoreMeter label="Liquidity" value={buyer.liquidityScore} icon={DollarSign} color="text-blue-400" />
        <ScoreMeter label="Activity" value={buyer.activityScore} icon={Zap} color="text-purple-400" />
      </div>

      {/* Buy Box */}
      {buyer.buyBox && (
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Building2 size={16}/>Buy Box</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {buyer.buyBox.states?.length > 0 && (
              <div><span className="text-gray-500">Markets</span><p className="text-white mt-1">{buyer.buyBox.states.join(', ')}</p></div>
            )}
            {(buyer.buyBox.minPrice || buyer.buyBox.maxPrice) && (
              <div><span className="text-gray-500">Price Range</span><p className="text-white mt-1">{buyer.buyBox.minPrice ? formatCurrency(buyer.buyBox.minPrice) : '—'} – {buyer.buyBox.maxPrice ? formatCurrency(buyer.buyBox.maxPrice) : '—'}</p></div>
            )}
            {buyer.buyBox.propertyTypes?.length > 0 && (
              <div><span className="text-gray-500">Property Types</span><p className="text-white mt-1">{buyer.buyBox.propertyTypes.join(', ')}</p></div>
            )}
            {buyer.buyBox.rehabTolerance && (
              <div><span className="text-gray-500">Rehab Tolerance</span><p className="text-white mt-1">{buyer.buyBox.rehabTolerance}</p></div>
            )}
          </div>
        </div>
      )}

      {/* Analytics */}
      {analytics && (
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><TrendingUp size={16}/>Analytics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">Deals Closed</span><p className="text-white text-xl font-bold mt-1">{analytics.totalClosed ?? 0}</p></div>
            <div><span className="text-gray-500">Close Rate</span><p className="text-white text-xl font-bold mt-1">{analytics.closeRate ?? 0}%</p></div>
            <div><span className="text-gray-500">Avg Fee</span><p className="text-white text-xl font-bold mt-1">{analytics.avgFee ? formatCurrency(analytics.avgFee) : '—'}</p></div>
            <div><span className="text-gray-500">Ghost Rate</span><p className="text-white text-xl font-bold mt-1">{analytics.ghostRate ?? 0}%</p></div>
          </div>
        </div>
      )}

      {/* Activity */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Brain size={16}/>Activity Timeline</h2>
        <ActivityTimeline buyerId={id} />
      </div>
    </div>
  );
}
