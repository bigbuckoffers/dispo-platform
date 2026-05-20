// ActivityTimeline.tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@/lib/format';
import {
  Eye, Heart, Send, CheckCircle, Mail, MessageSquare,
  UserPlus, AlertTriangle, ShoppingCart,
} from 'lucide-react';

const EVENT_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  DEAL_VIEWED: { label: 'Viewed a deal', icon: Eye, color: 'text-blue-400' },
  DEAL_SAVED: { label: 'Saved a deal', icon: Heart, color: 'text-pink-400' },
  OFFER_SUBMITTED: { label: 'Submitted offer', icon: Send, color: 'text-violet-400' },
  OFFER_ACCEPTED: { label: 'Offer accepted', icon: CheckCircle, color: 'text-emerald-400' },
  EMAIL_OPENED: { label: 'Opened email', icon: Mail, color: 'text-gray-400' },
  SMS_OPENED: { label: 'Opened SMS', icon: MessageSquare, color: 'text-gray-400' },
  PROFILE_CREATED: { label: 'Profile created', icon: UserPlus, color: 'text-blue-400' },
  OFFER_RETRADED: { label: 'Retraded', icon: AlertTriangle, color: 'text-red-400' },
  DEAL_PURCHASED: { label: 'Closed a deal', icon: ShoppingCart, color: 'text-emerald-400' },
};

export function ActivityTimeline({ buyerId }: { buyerId: string }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['buyer-activity', buyerId],
    queryFn: () => api.get(`/buyers/${buyerId}/activity`).then(r => r.data),
  });

  if (isLoading) return <div className="text-sm text-gray-500">Loading...</div>;
  if (!events.length) return <p className="text-sm text-gray-500">No activity yet</p>;

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
      {events.map((ev: any) => {
        const config = EVENT_CONFIG[ev.eventType] ?? { label: ev.eventType, icon: Eye, color: 'text-gray-400' };
        return (
          <div key={ev.id} className="flex items-center gap-3">
            <div className={`flex-shrink-0 ${config.color}`}>
              <config.icon size={14} />
            </div>
            <p className="text-sm text-gray-300 flex-1">{config.label}</p>
            <span className="text-xs text-gray-600 flex-shrink-0">{formatRelativeTime(ev.createdAt)}</span>
          </div>
        );
      })}
    </div>
  );
}

// BuyerActivityChart.tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';

export function BuyerActivityChart() {
  const { data: velocity = [] } = useQuery({
    queryKey: ['deal-velocity'],
    queryFn: () => api.get('/analytics/deal-velocity').then(r => r.data),
  });

  if (!velocity.length) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-gray-600">
        Add deals to see activity
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={velocity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorDeals" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false}
            tickFormatter={v => v.slice(5)} />
          <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Area type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={1.5} fill="url(#colorDeals)" name="Deals" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// RecentDeals.tsx
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
        <a key={deal.id} href={`/dashboard/deals/${deal.id}`}
          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-800 transition-colors">
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
