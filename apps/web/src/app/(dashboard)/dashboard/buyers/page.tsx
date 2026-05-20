'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search, Filter, Plus, ChevronUp, ChevronDown, Star,
  TrendingUp, Zap, Shield, MoreHorizontal,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ScoreBadge } from '@/components/buyer/ScoreBadge';
import { TierBadge } from '@/components/buyer/TierBadge';
import { CreateBuyerModal } from '@/components/buyer/CreateBuyerModal';
import { formatNumber } from '@/lib/format';

const TIERS = [
  { value: '', label: 'All tiers' },
  { value: 'TIER_1', label: 'VIP (Tier 1)' },
  { value: 'TIER_2', label: 'Active (Tier 2)' },
  { value: 'TIER_3', label: 'General (Tier 3)' },
];

const SORT_OPTIONS = [
  { value: 'compositeScore', label: 'Composite score' },
  { value: 'reliability', label: 'Reliability' },
  { value: 'liquidity', label: 'Liquidity' },
  { value: 'activity', label: 'Activity' },
  { value: 'name', label: 'Name' },
  { value: 'createdAt', label: 'Newest' },
];

export default function BuyersPage() {
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [sortBy, setSortBy] = useState('compositeScore');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['buyers', { search, tier, sortBy, page }],
    queryFn: () => api.get('/buyers', { params: { search, tier, sortBy, page, limit: 25 } }).then(r => r.data),
    keepPreviousData: true,
  });

  const buyers = data?.data ?? [];
  const meta = data?.meta ?? {};

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Buyer CRM</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatNumber(meta.total ?? 0)} buyers in your database
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Add buyer
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search buyers..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500 w-64"
          />
        </div>
        <select
          value={tier}
          onChange={e => { setTier(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
        >
          {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
        >
          {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Buyer</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Tier</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  <div className="flex items-center gap-1"><Shield size={11} /> Reliability</div>
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  <div className="flex items-center gap-1"><TrendingUp size={11} /> Liquidity</div>
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  <div className="flex items-center gap-1"><Zap size={11} /> Activity</div>
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                  <div className="flex items-center gap-1"><Star size={11} /> Score</div>
                </th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Buy box</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Activity</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-800 animate-pulse">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-800 rounded w-16" />
                        </td>
                      ))}
                    </tr>
                  ))
                : buyers.map((buyer: any, i: number) => (
                    <motion.tr
                      key={buyer.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors group"
                      onClick={() => window.location.href = `/dashboard/buyers/${buyer.id}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-semibold flex-shrink-0">
                            {buyer.firstName?.[0]}{buyer.lastName?.[0]}
                          </div>
                          <div>
                            <p className="text-white font-medium">{buyer.firstName} {buyer.lastName}</p>
                            <p className="text-gray-500 text-xs">{buyer.company ?? buyer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><TierBadge tier={buyer.tier} /></td>
                      <td className="px-4 py-3"><ScoreBadge score={buyer.reliabilityScore} /></td>
                      <td className="px-4 py-3"><ScoreBadge score={buyer.liquidityScore} color="emerald" /></td>
                      <td className="px-4 py-3"><ScoreBadge score={buyer.activityScore} color="amber" /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${buyer.compositeScore}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{Math.round(buyer.compositeScore)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-400">
                          {buyer.buyBox?.states?.join(', ') || '—'}
                          {buyer.buyBox?.minPrice && (
                            <span className="text-gray-600"> · ${(buyer.buyBox.minPrice/1000).toFixed(0)}k–${(buyer.buyBox.maxPrice/1000).toFixed(0)}k</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">
                          {buyer._count?.offers ?? 0} offers · {buyer._count?.purchases ?? 0} closed
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-700 text-gray-400 transition-opacity">
                          <MoreHorizontal size={15} />
                        </button>
                      </td>
                    </motion.tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-xs text-gray-500">
              Page {meta.page} of {meta.totalPages} · {formatNumber(meta.total)} total
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 rounded disabled:opacity-40 hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 rounded disabled:opacity-40 hover:bg-gray-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateBuyerModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refetch(); }}
        />
      )}
    </div>
  );
}
