'use client';
import { TierBadge } from './TierBadge';
export function TopBuyersTable({ buyers }: { buyers: any[] }) {
  if (!buyers?.length) return <p className="text-sm text-gray-500">No data</p>;
  return (
    <div className="space-y-2">
      {buyers.map(b => (
        <a key={b.id} href={`/dashboard/buyers/${b.id}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-800 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
              {b.firstName?.[0]}{b.lastName?.[0]}
            </div>
            <div>
              <p className="text-sm text-white">{b.firstName} {b.lastName}</p>
              <p className="text-xs text-gray-500">{b._count?.purchases ?? 0} closed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TierBadge tier={b.tier} />
            <span className="text-sm font-semibold text-white">{Math.round(b.compositeScore)}</span>
          </div>
        </a>
      ))}
    </div>
  );
}
