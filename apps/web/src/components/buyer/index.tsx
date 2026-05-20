// ScoreBadge.tsx
import { cn } from '@/lib/utils';

interface ScoreBadgeProps {
  score: number;
  color?: 'blue' | 'emerald' | 'amber' | 'red';
  size?: 'sm' | 'md';
}

export function ScoreBadge({ score, color, size = 'sm' }: ScoreBadgeProps) {
  const effectiveColor = color ?? (score >= 75 ? 'emerald' : score >= 50 ? 'amber' : 'red');
  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    red: 'bg-red-500/10 text-red-300 border-red-500/20',
  };
  return (
    <span className={cn(
      'inline-flex items-center border rounded font-medium',
      size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1',
      colorMap[effectiveColor]
    )}>
      {Math.round(score)}
    </span>
  );
}

// TierBadge.tsx
export function TierBadge({ tier }: { tier: string }) {
  const config = {
    TIER_1: { label: 'VIP', cls: 'bg-violet-500/10 text-violet-300 border-violet-500/20' },
    TIER_2: { label: 'Active', cls: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
    TIER_3: { label: 'General', cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  };
  const c = config[tier as keyof typeof config] ?? config.TIER_3;
  return (
    <span className={cn('text-xs px-1.5 py-0.5 rounded border font-medium', c.cls)}>
      {c.label}
    </span>
  );
}

// ScoreMeter.tsx
import { LucideIcon } from 'lucide-react';

interface ScoreMeterProps {
  label: string;
  score: number;
  icon: LucideIcon;
  description: string;
  color: 'blue' | 'emerald' | 'amber';
}

export function ScoreMeter({ label, score, icon: Icon, description, color }: ScoreMeterProps) {
  const colorMap = {
    blue: { bar: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/10' },
    emerald: { bar: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    amber: { bar: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/10' },
  };
  const c = colorMap[color];
  const rounded = Math.round(score);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg', c.bg)}>
            <Icon size={14} className={c.text} />
          </div>
          <span className="text-sm text-gray-300">{label}</span>
        </div>
        <span className={cn('text-2xl font-bold', c.text)}>{rounded}</span>
      </div>

      {/* Circular-style progress via arc SVG */}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
        <div
          className={cn('h-full rounded-full transition-all duration-500', c.bar)}
          style={{ width: `${rounded}%` }}
        />
      </div>

      <p className="text-xs text-gray-600">{description}</p>

      {/* Score label */}
      <div className="mt-2">
        <span className={cn(
          'text-xs font-medium',
          rounded >= 75 ? 'text-emerald-400' : rounded >= 50 ? 'text-amber-400' : 'text-red-400'
        )}>
          {rounded >= 75 ? 'Excellent' : rounded >= 50 ? 'Average' : 'Needs attention'}
        </span>
      </div>
    </div>
  );
}

// TopBuyersTable.tsx
export function TopBuyersTable({ buyers }: { buyers: any[] }) {
  if (!buyers.length) return <p className="text-sm text-gray-500">No data</p>;
  return (
    <div className="space-y-2">
      {buyers.map((buyer, i) => (
        <a
          key={buyer.id}
          href={`/dashboard/buyers/${buyer.id}`}
          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-800 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold flex-shrink-0">
              {buyer.firstName?.[0]}{buyer.lastName?.[0]}
            </div>
            <div>
              <p className="text-sm text-white leading-none">{buyer.firstName} {buyer.lastName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{buyer._count?.purchases ?? 0} closed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TierBadge tier={buyer.tier} />
            <span className="text-sm font-semibold text-white">{Math.round(buyer.compositeScore)}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
