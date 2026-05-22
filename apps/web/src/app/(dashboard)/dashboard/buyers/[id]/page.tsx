'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield, TrendingUp, Zap, Star, MapPin, DollarSign,
  Phone, Mail, Building2, RefreshCw, AlertCircle, Brain,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ScoreMeter } from '@/components/buyer/ScoreMeter';
import { BuyBoxEditor } from '@/components/buyer/BuyBoxEditor';
import { ActivityTimeline } from '@/components/buyer/ActivityTimeline';
import { formatCurrency } from '@/lib/format';
import toast from 'react-hot-toast';

export default function BuyerProfilePage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const { id } = params;

  const { data: buyer, isLoading } = useQuery({
    queryKey: ['buyer', id],
    queryFn: () => api.get(`/buyers/${id}`).then(r => r.data),
  });

  const { data: scores } = useQuery({
    queryKey: ['buyer-scores', id],
    queryFn: () => api.get(`/buyers/${id}/scores`).then(r => r.data),
  });

  const { data: analytics } = useQuery({
    queryKey: ['buyer-analytics', id],
    queryFn: () => api.get(`/buyers/${id}/analytics`).then(r => r.data),
  });

  const { data: realBuyBox } = useQuery({
    queryKey: ['real-buy-box', id],
    queryFn: () => api.get(`/buyers/${id}/real-buy-box`).then(r => r.data),
  });

  const recalculate = useMutation({
    mutationFn: () => api.post(`/buyers/${id}/recalculate-scores`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buyer', id] });
      qc.invalidateQueries({ queryKey: ['buyer-scores', id] });
      toast.success('Scores recalculated');
    },
  });

  if (isLoading || !buyer) {
    return <div className="p-6 text-gray-500 text-sm">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xl font-bold">
            {buyer.firstName[0]}{buyer.lastName[0]}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{buyer.firstName} {buyer.lastName}</h1>
            {buyer.company && <p className="text-sm text-gray-400">{buyer.company}</p>}
            <div className="flex items-center gap-3 mt-1">
              {buyer.email && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Mail size={11} /> {buyer.email}
                </span>
              )}
              {buyer.phone && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Phone size={11} /> {buyer.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => recalculate.mutate()}
          disabled={recalculate.isLoading}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700 rounded-lg px-3 py-2 transition-colors"
        >
          <RefreshCw size={12} className={recalculate.isLoading ? 'animate-spin' : ''} />
          Recalculate scores
        </button>
      </div>

      {/* Scores row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ScoreMeter
          label="Reliability"
          score={buyer.reliabilityScore}
          icon={Shield}
          description="Close rate, retrade %, ghost rate, speed"
          color="blue"
        />
        <ScoreMeter
          label="Liquidity"
          score={buyer.liquidityScore}
          icon={TrendingUp}
          description="Cash capability, purchase history, funding"
          color="emerald"
        />
        <ScoreMeter
          label="Activity"
          score={buyer.activityScore}
          icon={Zap}
          description="30-day opens, saves, offers, engagement"
          color="amber"
        />
      </div>

      {/* Performance stats */}
      {analytics && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-white mb-4">Performance overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Deals viewed', value: analytics.totalDealsViewed },
              { label: 'Offers submitted', value: analytics.totalOffers },
              { label: 'Acceptance rate', value: `${analytics.offerAcceptanceRate}%` },
              { label: 'Avg assignment fee', value: formatCurrency(analytics.avgAssignmentFeePaid) },
              { label: 'Total purchased', value: analytics.totalPurchases },
              { label: 'Retrade rate', value: `${analytics.retradeRate}%` },
              { label: 'Ghost rate', value: `${analytics.ghostRate}%` },
              { label: 'Total fees paid', value: formatCurrency(analytics.totalAssignmentFeesPaid) },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-lg font-semibold text-white mt-0.5">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buy Box + Real Buy Box comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-white mb-1">Stated buy box</h2>
          <p className="text-xs text-gray-500 mb-4">What the buyer claims they want</p>
          <BuyBoxDisplay buyBox={realBuyBox?.stated} />
        </div>
        <div className="bg-gray-900 border border-blue-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Brain size={14} className="text-blue-400" />
            <h2 className="text-sm font-medium text-white">AI-learned buy box</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            What AI has learned they actually buy
            {realBuyBox?.divergenceScore > 20 && (
              <span className="ml-2 text-amber-400 flex items-center gap-1 inline-flex">
                <AlertCircle size={10} /> {Math.round(realBuyBox.divergenceScore)}% divergence from stated
              </span>
            )}
          </p>
          {realBuyBox?.dataPoints >= 3 ? (
            <RealBuyBoxDisplay realBuyBox={realBuyBox?.real} />
          ) : (
            <p className="text-sm text-gray-500">
              Needs at least 3 closed deals to build AI profile. Currently {realBuyBox?.dataPoints ?? 0} data points.
            </p>
          )}
        </div>
      </div>

      {/* Activity timeline */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-medium text-white mb-4">Activity timeline</h2>
        <ActivityTimeline buyerId={id} />
      </div>
    </div>
  );
}

function BuyBoxDisplay({ buyBox }: { buyBox: any }) {
  if (!buyBox) return <p className="text-sm text-gray-500">No buy box set</p>;
  return (
    <div className="space-y-2 text-sm">
      {buyBox.states?.length > 0 && <Row label="States" value={buyBox.states.join(', ')} />}
      {(buyBox.minPrice || buyBox.maxPrice) && (
        <Row label="Price range" value={`${formatCurrency(buyBox.minPrice)} – ${formatCurrency(buyBox.maxPrice)}`} />
      )}
      {buyBox.propertyTypes?.length > 0 && <Row label="Property types" value={buyBox.propertyTypes.join(', ')} />}
      {buyBox.rehabTolerance && <Row label="Rehab tolerance" value={buyBox.rehabTolerance} />}
      {buyBox.investmentStrategy?.length > 0 && <Row label="Strategy" value={buyBox.investmentStrategy.join(', ')} />}
    </div>
  );
}

function RealBuyBoxDisplay({ realBuyBox }: { realBuyBox: any }) {
  if (!realBuyBox) return <p className="text-sm text-gray-500">Not yet built</p>;
  return (
    <div className="space-y-2 text-sm">
      {realBuyBox.learnedZipCodes?.length > 0 && (
        <Row label="Actually buys in" value={realBuyBox.learnedZipCodes.slice(0, 5).join(', ')} highlight />
      )}
      {(realBuyBox.learnedPriceMin || realBuyBox.learnedPriceMax) && (
        <Row
          label="Actual price range"
          value={`${formatCurrency(realBuyBox.learnedPriceMin)} – ${formatCurrency(realBuyBox.learnedPriceMax)}`}
          highlight
        />
      )}
      {realBuyBox.learnedRehabDepth && <Row label="Actual rehab depth" value={realBuyBox.learnedRehabDepth} highlight />}
      <div className="pt-2 border-t border-gray-800">
        <p className="text-xs text-gray-500">Confidence: {Math.round((realBuyBox.confidenceScore ?? 0) * 100)}% ({realBuyBox.dataPointCount} data points)</p>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className={highlight ? 'text-blue-300 font-medium' : 'text-gray-300'}>{value}</span>
    </div>
  );
}
