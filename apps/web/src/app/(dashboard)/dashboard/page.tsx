'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, Home, TrendingUp, DollarSign, Zap, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/format';
import { BuyerActivityChart } from '@/components/analytics/BuyerActivityChart';
import { TopBuyersTable } from '@/components/buyer/TopBuyersTable';
import { RecentDeals } from '@/components/deal/RecentDeals';

export default function DashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get('/analytics/overview').then(r => r.data),
  });

  const metrics = [
    {
      label: 'Active buyers',
      value: formatNumber(overview?.buyers?.active ?? 0),
      sub: `${overview?.buyers?.activePct ?? 0}% of total`,
      icon: Users,
      color: 'blue',
      trend: +3.2,
    },
    {
      label: 'Active deals',
      value: formatNumber(overview?.deals?.active ?? 0),
      sub: `${overview?.deals?.total ?? 0} total`,
      icon: Home,
      color: 'emerald',
      trend: +12.5,
    },
    {
      label: 'Offer conversion',
      value: `${overview?.offers?.conversionRate ?? 0}%`,
      sub: `${overview?.offers?.accepted ?? 0} accepted`,
      icon: TrendingUp,
      color: 'violet',
      trend: -2.1,
    },
    {
      label: 'Email open rate',
      value: `${overview?.outreach?.openRate ?? 0}%`,
      sub: `${overview?.outreach?.replyRate ?? 0}% reply rate`,
      icon: Zap,
      color: 'amber',
      trend: +5.8,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Last 30 days performance</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                <p className="text-2xl font-semibold text-white">{isLoading ? '—' : m.value}</p>
                <p className="text-xs text-gray-500 mt-1">{m.sub}</p>
              </div>
              <div className={`p-2 rounded-lg bg-${m.color}-500/10`}>
                <m.icon size={18} className={`text-${m.color}-400`} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1">
              {m.trend >= 0
                ? <ArrowUpRight size={12} className="text-emerald-400" />
                : <ArrowDownRight size={12} className="text-red-400" />
              }
              <span className={`text-xs ${m.trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {Math.abs(m.trend)}% vs last month
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-white mb-4">Buyer activity — 30 days</h3>
          <BuyerActivityChart />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-white mb-4">Top zip codes</h3>
          <TopZipCodes zips={overview?.topZipCodes ?? []} />
        </div>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">Top buyers</h3>
            <a href="/dashboard/buyers" className="text-xs text-blue-400 hover:text-blue-300">View all →</a>
          </div>
          <TopBuyersTable buyers={overview?.topBuyers ?? []} />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">Recent deals</h3>
            <a href="/dashboard/deals" className="text-xs text-blue-400 hover:text-blue-300">View all →</a>
          </div>
          <RecentDeals />
        </div>
      </div>
    </div>
  );
}

function TopZipCodes({ zips }: { zips: any[] }) {
  if (!zips.length) return <p className="text-sm text-gray-500">No data yet</p>;
  const max = zips[0]?.count ?? 1;

  return (
    <div className="space-y-2.5">
      {zips.slice(0, 6).map((z) => (
        <div key={z.zip}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-300">{z.zip} — {z.city}, {z.state}</span>
            <span className="text-xs text-gray-500">{z.count} deals</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${(z.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
