'use client';
export function TierBadge({ tier }: { tier: string }) {
  const m: any = { TIER_1: ['VIP','text-violet-300 bg-violet-500/10 border-violet-500/20'], TIER_2: ['Active','text-blue-300 bg-blue-500/10 border-blue-500/20'], TIER_3: ['General','text-gray-400 bg-gray-500/10 border-gray-500/20'] };
  const [label, cls] = m[tier] ?? m.TIER_3;
  return <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${cls}`}>{label}</span>;
}
