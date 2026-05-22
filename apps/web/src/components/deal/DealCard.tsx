'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, DollarSign, Brain, Zap, ChevronRight, Flame, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'text-gray-400 bg-gray-800 border-gray-700',
  ACTIVE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  UNDER_CONTRACT: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  CLOSED: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  DEAD: 'text-red-400 bg-red-500/10 border-red-500/20',
};

export function DealCard({ deal, onUpdate }: { deal: any; onUpdate?: () => void }) {
  const qc = useQueryClient();

  const release = useMutation({
    mutationFn: (tier: number) =>
      api.post(`/deals/${deal.id}/release`, { tier }).then(r => r.data),
    onSuccess: (_, tier) => {
      toast.success(`Released to Tier ${tier}`);
      onUpdate?.();
    },
    onError: () => toast.error('Release failed'),
  });

  const triggerMatch = useMutation({
    mutationFn: () => api.post(`/deals/${deal.id}/trigger-matching`).then(r => r.data),
    onSuccess: () => toast.success('Matching queued — results in ~10s'),
  });

  const matchCount = deal._count?.matchResults ?? 0;

  return (
    <a
      href={`/dashboard/deals/${deal.id}`}
      className="block bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-all group overflow-hidden"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-800">
        <span className={cn('text-xs px-2 py-0.5 rounded border font-medium', STATUS_COLORS[deal.status] ?? STATUS_COLORS.DRAFT)}>
          {deal.status}
        </span>
        <span className="text-xs text-gray-500">{formatRelativeTime(deal.createdAt)}</span>
      </div>

      {/* Address */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-1.5">
          <MapPin size={12} className="text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-white leading-tight">{deal.address}</p>
            <p className="text-xs text-gray-500">{deal.city}, {deal.state} {deal.zipCode}</p>
          </div>
        </div>
      </div>

      {/* Financials */}
      <div className="px-4 pb-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-gray-600">Asking</p>
          <p className="text-white font-semibold">{formatCurrency(deal.askingPrice)}</p>
        </div>
        <div>
          <p className="text-gray-600">ARV</p>
          <p className="text-gray-300">{deal.arv ? formatCurrency(deal.arv) : '—'}</p>
        </div>
        <div>
          <p className="text-gray-600">Repairs</p>
          <p className="text-gray-300">{deal.repairEstimate ? formatCurrency(deal.repairEstimate) : '—'}</p>
        </div>
      </div>

      {/* AI scores */}
      {(deal.flipScore || deal.landlordScore) && (
        <div className="px-4 pb-3 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Brain size={11} className="text-blue-400" />
            <span className="text-xs text-gray-500">Flip</span>
            <AiScoreBar score={deal.flipScore} color="blue" />
          </div>
          <div className="flex items-center gap-1.5">
            <Flame size={11} className="text-amber-400" />
            <span className="text-xs text-gray-500">LL</span>
            <AiScoreBar score={deal.landlordScore} color="amber" />
          </div>
          {matchCount > 0 && (
            <div className="flex items-center gap-1.5 ml-auto">
              <Zap size={11} className="text-violet-400" />
              <span className="text-xs text-violet-300">{matchCount} matched</span>
            </div>
          )}
        </div>
      )}

      {/* Tier release buttons */}
      <div
        className="px-4 pb-4 flex gap-1.5"
        onClick={e => e.preventDefault()}
      >
        {[1, 2, 3].map(tier => {
          const released = tier === 1 ? deal.tier1ReleasedAt : tier === 2 ? deal.tier2ReleasedAt : deal.tier3ReleasedAt;
          return (
            <button
              key={tier}
              onClick={(e) => { e.stopPropagation(); if (!released) release.mutate(tier as any); }}
              disabled={!!released || release.isPending}
              className={cn(
                'flex-1 text-xs py-1.5 rounded-md border font-medium transition-colors',
                released
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 cursor-default'
                  : 'text-gray-400 bg-gray-800 border-gray-700 hover:text-white hover:border-gray-600'
              )}
            >
              {released ? `T${tier} ✓` : `Release T${tier}`}
            </button>
          );
        })}
      </div>
    </a>
  );
}

function AiScoreBar({ score, color }: { score?: number; color: string }) {
  if (!score) return null;
  const colorMap: Record<string, string> = { blue: 'bg-blue-500', amber: 'bg-amber-500' };
  return (
    <div className="flex items-center gap-1">
      <div className="w-12 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', colorMap[color])} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-500">{Math.round(score)}</span>
    </div>
  );
}
