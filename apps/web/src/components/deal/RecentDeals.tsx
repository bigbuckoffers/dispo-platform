'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatRelativeTime } from '@/lib/format';

export function RecentDeals() {
  const { data, isLoading } = useQuery({
    queryKey: ['deals', { page: 1, limit: 5 }],
    queryFn: () => api.get('/deals', { params: { limit: 5, page: 1 } }).then(r => r.data),
  });
  const deals = data?.data ?? [];
  if (isLoading) return <div className="space-y-2">{Array.from({length:4}).map((_,i)=><div key={i} className="h-10 bg-gray-800 rounded animate-pulse"/>)}</div>;
  if (!deals.length) return <p className="text-sm text-gray-500">No deals yet</p>;
  return (
    <div className="space-y-1">
      {deals.map((deal: any) => (
        <a key={deal.id} href={`/dashboard/deals/${deal.id}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-800 transition-colors">
          <div>
            <p className="text-sm text-white leading-none truncate max-w-[180px]">{deal.address}</p>
            <p className="text-xs text-gray-500 mt-0.5">{deal.city}, {deal.state}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white">{formatCurrency(deal.askingPrice)}</p>
            <p className="text-xs text-gray-600">{formatRelativeTime(deal.createdAt)}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
