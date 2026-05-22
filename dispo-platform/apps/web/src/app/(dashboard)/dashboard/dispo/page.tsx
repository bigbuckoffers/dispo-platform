'use client';

import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Mail, Phone, TrendingUp, Eye, MousePointer, Reply } from 'lucide-react';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@/lib/format';

export default function DispoPage() {
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get('/dispo/campaigns').then(r => r.data),
  });

  const stats = {
    total: campaigns.length,
    sent: campaigns.filter((c: any) => c.status === 'SENT' || c.status === 'SENDING').length,
    totalDelivered: campaigns.reduce((s: number, c: any) => s + (c.delivered ?? 0), 0),
    totalOpened: campaigns.reduce((s: number, c: any) => s + (c.opened ?? 0), 0),
    totalReplied: campaigns.reduce((s: number, c: any) => s + (c.replied ?? 0), 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Dispo Campaigns</h1>
        <p className="text-sm text-gray-500 mt-0.5">AI-generated outreach auto-sends when you release a deal to a tier</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Campaigns sent', value: stats.sent, icon: MessageSquare, color: 'blue' },
          { label: 'Total delivered', value: stats.totalDelivered, icon: Mail, color: 'emerald' },
          { label: 'Total opened', value: stats.totalOpened, icon: Eye, color: 'violet' },
          { label: 'Replies', value: stats.totalReplied, icon: Reply, color: 'amber' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">{s.label}</p>
              <s.icon size={14} className={`text-${s.color}-400`} />
            </div>
            <p className="text-2xl font-semibold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
        <h3 className="text-sm font-medium text-blue-300 mb-2">How Auto-Dispo Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-400">
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold flex-shrink-0 text-xs">1</span>
            <p>Add a deal → AI analyzes it and runs buyer matching automatically</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold flex-shrink-0 text-xs">2</span>
            <p>Click "Release to Tier" on any deal → AI generates personalized SMS + email</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold flex-shrink-0 text-xs">3</span>
            <p>Messages send automatically to matched buyers in that tier, staggered to avoid spam filters</p>
          </div>
        </div>
      </div>

      {/* Campaign list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-medium text-white">Campaign History</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-600 text-sm">Loading...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No campaigns yet</p>
            <p className="text-gray-600 text-xs mt-1">Go to a deal and release it to a tier to trigger your first campaign</p>
            <a href="/dashboard/deals" className="inline-block mt-4 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 px-4 py-2 rounded-lg transition-colors">
              Go to Deals →
            </a>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {campaigns.map((campaign: any) => (
              <div key={campaign.id} className="px-5 py-4 hover:bg-gray-800/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{campaign.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className={`px-1.5 py-0.5 rounded border text-xs ${
                        campaign.channel === 'BOTH' ? 'text-blue-400 border-blue-500/30' :
                        campaign.channel === 'SMS' ? 'text-emerald-400 border-emerald-500/30' :
                        'text-violet-400 border-violet-500/30'
                      }`}>{campaign.channel}</span>
                      <span>{campaign.targetTier?.replace('_', ' ')}</span>
                      <span>{formatRelativeTime(campaign.createdAt)}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded border ${
                    campaign.status === 'SENT' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                    campaign.status === 'SENDING' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                    'text-gray-400 bg-gray-800 border-gray-700'
                  }`}>{campaign.status}</span>
                </div>
                <div className="flex items-center gap-6 mt-3 text-xs">
                  <span className="text-gray-500"><span className="text-white">{campaign.totalRecipients}</span> recipients</span>
                  <span className="text-gray-500"><span className="text-white">{campaign.delivered}</span> delivered</span>
                  <span className="text-gray-500"><span className="text-white">{campaign.opened}</span> opened</span>
                  <span className="text-gray-500"><span className="text-white">{campaign.replied}</span> replied</span>
                  {campaign.delivered > 0 && (
                    <span className="text-emerald-400">{((campaign.opened / campaign.delivered) * 100).toFixed(0)}% open rate</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
