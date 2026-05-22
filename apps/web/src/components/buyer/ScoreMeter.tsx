'use client';
export function ScoreMeter({ label, score }: { label: string; score: number }) {
  return <div className="text-sm text-gray-400">{label}: {score}</div>;
}
