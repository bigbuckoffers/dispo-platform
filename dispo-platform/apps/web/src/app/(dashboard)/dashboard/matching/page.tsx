'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Zap, Brain, TrendingUp, Shield, Target, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import toast from 'react-hot-toast';

export default function MatchingPage() {
  const [selectedDeal, setSelectedDeal] = useState('');

  const { data: dealsData } = useQuery({
    queryKey: ['deals-for-matching'],
    queryFn: () => api.get('/deals', { params: { limit: 50, status: 'ACTIVE' } }).then(r => r.data),
  });

  const { data: matches = [], isLoading: matchesLoading, refetch } = useQuery({
    queryKey: ['matches', selectedDeal],
    queryFn: () => api.get(`/deals/${selectedDeal}/matches?limit=25`).then(r => r.data),
    enabled: !!selectedDeal,
  });

  const triggerMatch = useMutation({
    mutationFn: () => api.post(`/deals/${selectedDeal}/trigger-matching`).then(r => r.data),
    onSuccess: () => {
      toast.success('Matching queued — refreshing in 10s');
      setTimeout(() => refetch(), 10000);
    },
  });

  const deals = dealsData?.data ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">AI Matching</h1>
        <p className="text-sm text-gray-500 mt-0.5">Select a deal to see AI-ranked buyer matches</p>
      </div>

      {/* How it works */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-blue-400" />
          <h2 className="text-sm font-medium text-white">How the matching algorithm works</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Vector similarity', weight: '35%', desc: 'Buyer embedding vs deal embedding', icon: Brain, color: 'blue' },
            { label: 'Geographic match', weight: '20%', desc: 'State → county → ZIP hierarchy', icon: Target, color: 'emerald' },
            { label: 'Price fit', weight: '15%', desc: 'Buy box min/max vs asking', icon: TrendingUp, color: 'violet' },
            { label: 'Reliability', weight: '15%', desc: 'Close rate, retrade %, speed', icon: Shield, color: 'amber' },
            { label: 'Activity', weight: '10%', desc: '30-day engagement score', icon: Zap, color: 'pink' },
            { label: 'Historical', weight: '5%', desc: 'Past similar purchases', icon: RefreshCw, color: 'gray' },
          ].map(factor => (
            <div key={factor.label} className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <factor.icon size={12} className={`text-${factor.color}-400`} />
                <span className={`text-xs font-bold text-${factor.color}-400`}>{factor.weight}</span>
              </div>
              <p className="text-xs font-medium text-white">{factor.label}</p>
              <p className="text-xs text-gray-600 mt-0.5">{factor.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Deal selector */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-2">Select a deal to match</label>
            <select value={selectedDeal} onChange={e => setSelectedDeal(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="">— Choose a deal —</option>
              {deals.map((deal: any) => (
                <option key={deal.id} value={deal.id}>
                  {deal.address}, {deal.city} — {formatCurrency(deal.askingPrice)}
                </option>
              ))}
            </select>
          </div>
          {selectedDeal && (
            <button onClick={() => triggerMatch.mutate()} disabled={triggerMatch.isLoading}
              className="mt-5 flex items-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50">
              <Zap size={14} />
              {triggerMatch.isLoading ? 'Running...' : 'Re-run AI matching'}
            </button>
          )}
        </div>
      </div>

      {/* Matches */}
      {selectedDeal && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">
              {matchesLoading ? 'Loading matches...' : `${matches.length} matched buyers`}
            </h2>
            <p className="text-xs text-gray-500">Ranked by AI match score</p>
          </div>
          {matchesLoading ? (
            <div className="p-8 text-center text-sm text-gray-600">Running AI matching...</div>
          ) : matches.length === 0 ? (
            <div className="p-12 text-center">
              <Zap size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No matches yet</p>
              <p className="text-gray-600 text-xs mt-1">Click "Re-run AI matching" to find buyers for this deal</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {matches.map((match: any) => (
                <div key={match.id} className="px-5 py-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-6">#{match.rank}</span>
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                        {match.buyer?.firstName?.[0]}{match.buyer?.lastName?.[0]}
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{match.buyer?.firstName} {match.buyer?.lastName}</p>
                        <p className="text-xs text-gray-500">{match.buyer?.investorType?.replace(/_/g, ' ')} · {match.buyer?.tier?.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-xs">
                      {/* Score breakdown */}
                      <div className="hidden sm:flex items-center gap-4">
                        {[
                          { label: 'Vector', value: match.vectorScore, color: 'blue' },
                          { label: 'Geo', value: match.geoScore, color: 'emerald' },
                          { label: 'Price', value: match.priceScore, color: 'violet' },
                        ].map(s => (
                          <div key={s.label} className="text-center">
                            <p className="text-gray-600">{s.label}</p>
                            <p className={`text-${s.color}-400 font-medium`}>{(s.value * 100).toFixed(0)}%</p>
                          </div>
                        ))}
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500">Match</p>
                        <p className="text-white font-bold text-base">{match.confidencePct}%</p>
                      </div>
                      {match.estimatedOfferMin && (
                        <div className="text-right">
                          <p className="text-gray-500">Est. offer</p>
                          <p className="text-emerald-400">{formatCurrency(match.estimatedOfferMin)}</p>
                        </div>
                      )}
                      <a href={`/dashboard/buyers/${match.buyer?.id}`}
                        className="text-blue-400 hover:text-blue-300 border border-blue-500/20 px-2 py-1 rounded transition-colors">
                        Profile →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedDeal && (
        <div className="text-center py-16 text-gray-600">
          <Brain size={40} className="mx-auto mb-3 text-gray-700" />
          <p className="text-sm">Select a deal above to see AI-ranked buyer matches</p>
        </div>
      )}
    </div>
  );
}
