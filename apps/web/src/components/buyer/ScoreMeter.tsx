'use client';
export function ScoreMeter({ label, score, icon: Icon, description, color }: { label: string; score: number; icon?: any; description?: string; color?: string }) {
  const c = color === 'emerald' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-blue-400';
  const bar = color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : 'bg-blue-500';
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className={c} />}
          <span className="text-sm text-gray-300">{label}</span>
        </div>
        <span className={`text-2xl font-bold ${c}`}>{Math.round(score)}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.round(score)}%` }} />
      </div>
      {description && <p className="text-xs text-gray-600">{description}</p>}
    </div>
  );
}
