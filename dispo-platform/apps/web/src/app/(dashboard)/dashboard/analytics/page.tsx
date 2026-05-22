'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Users, Home, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format';

export default function AnalyticsPage() {
  const { data: overview } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get('/analytics/overview').then(r => r.data),
  });

  const { data: velocity = [] } = useQuery({
    queryKey: ['deal-velocity'],
    queryFn: () => api.get('/analytics/deal-velocity').then(r => r.data),
  });

  const { data: fees } = useQuery({
    queryKey: ['assignment-fees'],
    queryFn: () => api.get('/analytics/assignment-fees').then(r => r.data),
  });

  const { data: repPerf = [] } = useQuery({
    queryKey: ['rep-performance'],
    queryFn: () => api.get('/analytics/rep-performance').then(r => r.data),
  });

  const feesByMonth = fees?.byMonth ? Object.entries(fees.byMonth).map(([month, amount]) => ({
    month: month.slice(5), amount
  })) : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">30-day performance overview</p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total buyers', value: formatNumber(overview?.buyers?.total ?? 0), sub: `${overview?.buyers?.active ?? 0} active`, icon: Users, color: 'blue' },
          { label: 'Total deals', value: formatNumber(overview?.deals?.total ?? 0), sub: `${overview?.deals?.active ?? 0} active`, icon: Home, color: 'emerald' },
          { label: 'Offer conversion', value: `${overview?.offers?.conversionRate ?? 0}%`, sub: `${overview?.offers?.accepted ?? 0} accepted`, icon: TrendingUp, color: 'violet' },
          { label: 'Total fees earned', value: formatCurrency(fees?.totalFees ?? 0), sub: `Avg: ${formatCurrency(fees?.avgFee ?? 0)}`, icon: DollarSign, color: 'amber' },
        ].map(m => (
          <div key={m.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-gray-500">{m.label}</p>
              <m.icon size={14} className={`text-${m.color}-400`} />
            </div>
            <p className="text-2xl font-semibold text-white">{m.value}</p>
            <p className="text-xs text-gray-600 mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Deal velocity chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-medium text-white mb-4">Deal velocity — 30 days</h2>
        {velocity.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={velocity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} dot={false} name="Created" />
                <Line type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={2} dot={false} name="Closed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-sm text-gray-600">Add deals to see velocity</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assignment fees by month */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-white mb-4">Assignment fees by month</h2>
          {feesByMonth.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feesByMonth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => formatCurrency(v)} />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Fees" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-600">No closed deals yet</div>
          )}
        </div>

        {/* Outreach stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-white mb-4">Outreach performance</h2>
          <div className="space-y-4">
            {[
              { label: 'Delivered', value: overview?.outreach?.delivered ?? 0, max: overview?.outreach?.delivered ?? 1, color: 'blue' },
              { label: 'Opened', value: `${overview?.outreach?.openRate ?? 0}%`, progress: parseFloat(overview?.outreach?.openRate ?? '0'), color: 'emerald' },
              { label: 'Replied', value: `${overview?.outreach?.replyRate ?? 0}%`, progress: parseFloat(overview?.outreach?.replyRate ?? '0'), color: 'violet' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-500">{stat.label}</span>
                  <span className="text-xs text-white">{stat.value}</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full bg-${stat.color}-500 rounded-full`}
                    style={{ width: `${Math.min(100, stat.progress ?? (typeof stat.value === 'number' ? Math.min(100, stat.value) : 0))}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Top zip codes */}
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 mb-3">Top markets</p>
            {(overview?.topZipCodes ?? []).slice(0, 4).map((z: any) => (
              <div key={z.zip} className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-300">{z.zip} — {z.city}, {z.state}</span>
                <span className="text-xs text-gray-500">{z.count} deals</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rep performance */}
      {repPerf.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-white mb-4">Team performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs text-gray-500 pb-3 font-medium">Rep</th>
                  <th className="text-left text-xs text-gray-500 pb-3 font-medium">Deals intaken</th>
                  <th className="text-left text-xs text-gray-500 pb-3 font-medium">Offers accepted</th>
                  <th className="text-left text-xs text-gray-500 pb-3 font-medium">Campaigns sent</th>
                </tr>
              </thead>
              <tbody>
                {repPerf.map((rep: any) => (
                  <tr key={rep.repId} className="border-b border-gray-800 last:border-0">
                    <td className="py-3 text-white">{rep.name}</td>
                    <td className="py-3 text-gray-300">{rep.dealsIntaken}</td>
                    <td className="py-3 text-gray-300">{rep.offersAccepted}</td>
                    <td className="py-3 text-gray-300">{rep.campaigns}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
