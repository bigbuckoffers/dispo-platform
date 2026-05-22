'use client';
export function ScoreBadge({ score, color }: { score: number; color?: string }) {
  const c = score >= 75 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
  return <span className={`text-xs font-medium ${c}`}>{Math.round(score)}</span>;
}
