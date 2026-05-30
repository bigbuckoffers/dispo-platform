'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Pause, Play, XCircle, BarChart3 } from 'lucide-react';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type Campaign = {
  id: string;
  batchId: string;
  campaignName?: string;
  type: string;
  status: string;
  templateKey?: string;
  selected: number;
  queued: number;
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
  cancelled: number;
  estimatedMinutes: number;
  delayMs: number;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
  recipients?: any[];
};

function statusClass(status: string) {
  if (status === 'DELIVERED') return 'bg-green-500/10 text-green-300 border-green-700/40';
  if (status === 'UNDELIVERED') return 'bg-red-500/10 text-red-300 border-red-700/40';
  if (status === 'FAILED') return 'bg-red-500/10 text-red-300 border-red-700/40';
  if (status === 'SENT') return 'bg-blue-500/10 text-blue-300 border-blue-700/40';
  if (status === 'PENDING') return 'bg-gray-500/10 text-gray-300 border-gray-700/40';
  if (status === 'COMPLETED') return 'bg-green-500/10 text-green-300 border-green-700/40';
  if (status === 'COMPLETED_WITH_ERRORS') return 'bg-yellow-500/10 text-yellow-300 border-yellow-700/40';
  if (status === 'SENDING') return 'bg-blue-500/10 text-blue-300 border-blue-700/40';
  if (status === 'PAUSED') return 'bg-orange-500/10 text-orange-300 border-orange-700/40';
  if (status === 'CANCELLED') return 'bg-red-500/10 text-red-300 border-red-700/40';
  if (status === 'QUEUED') return 'bg-purple-500/10 text-purple-300 border-purple-700/40';
  return 'bg-gray-500/10 text-gray-300 border-gray-700/40';
}

function typeLabel(type: string) {
  if (type === 'BULK_BUY_BOX_SEND') return 'Buy Box Send';
  return type?.replace(/_/g, ' ') || 'Campaign';
}

function pct(c: Campaign) {
  if (!c.queued) return 0;
  return Math.min(100, Math.round(((c.sent + c.failed + c.cancelled) / c.queued) * 100));
}

function deliveryCounts(c: Campaign | null) {
  const recipients = c?.recipients || [];
  return {
    delivered: recipients.filter((r:any) => r.deliveryStatus === 'DELIVERED').length,
    undelivered: recipients.filter((r:any) => ['UNDELIVERED','FAILED'].includes(r.deliveryStatus)).length,
  };
}


function campaignHealth(c: Campaign | null) {
  const recipients = c?.recipients || [];
  const total = recipients.length || c?.queued || 0;

  const delivered = recipients.filter((r:any) => r.deliveryStatus === 'DELIVERED').length;
  const undelivered = recipients.filter((r:any) => r.deliveryStatus === 'UNDELIVERED').length;
  const failed = recipients.filter((r:any) => r.deliveryStatus === 'FAILED' || r.status === 'FAILED').length;
  const waiting = recipients.filter((r:any) => ['PENDING','SENT'].includes(r.deliveryStatus || 'PENDING') && r.status !== 'FAILED').length;

  const deliveryRate = total ? Math.round((delivered / total) * 100) : 0;
  const failureRate = total ? Math.round(((undelivered + failed) / total) * 100) : 0;

  const errorCounts: Record<string, number> = {};
  recipients.forEach((r:any) => {
    const key = r.deliveryErrorCode || r.deliveryErrorMessage || r.error;
    if (key) errorCounts[String(key)] = (errorCounts[String(key)] || 0) + 1;
  });

  const topError = Object.entries(errorCounts).sort((a,b) => b[1] - a[1])[0];

  let label = 'Healthy';
  let tone = 'green';
  let recommendation = 'Campaign delivery looks good. Continue monitoring replies and buyer engagement.';

  if (waiting > 0 && delivered + undelivered + failed < total) {
    label = 'Still Updating';
    tone = 'blue';
    recommendation = 'Some delivery statuses are still pending. Refresh shortly to confirm final delivery results.';
  }

  if (failureRate >= 25) {
    label = 'Needs Attention';
    tone = 'yellow';
    recommendation = 'Review undelivered buyers and verify phone numbers before sending future campaigns.';
  }

  if (failureRate >= 50) {
    label = 'Poor Delivery';
    tone = 'red';
    recommendation = 'High failure rate. Check phone quality, Twilio/carrier filtering, and buyer number validity before sending more.';
  }

  if (topError?.[0] === '30034') {
    recommendation = 'Twilio/carrier marked one or more messages as undelivered. Verify those phone numbers before future campaigns.';
  }

  return {
    total,
    delivered,
    undelivered,
    failed,
    waiting,
    deliveryRate,
    failureRate,
    topErrorCode: topError?.[0] || null,
    topErrorCount: topError?.[1] || 0,
    label,
    tone,
    recommendation,
  };
}

function healthToneClasses(tone: string) {
  if (tone === 'green') return 'border-green-800/40 bg-green-950/20 text-green-200';
  if (tone === 'red') return 'border-red-800/40 bg-red-950/20 text-red-200';
  if (tone === 'blue') return 'border-blue-800/40 bg-blue-950/20 text-blue-200';
  return 'border-yellow-800/40 bg-yellow-950/20 text-yellow-200';
}

function formatDeliveryError(code?: string, message?: string, fallback?: string) {
  const raw = message || fallback || code || '';

  if (!raw) return '—';

  const c = String(code || raw).trim();

  const known: Record<string, string> = {
    '30034': '30034 — Undelivered by Twilio/carrier',
    '30003': '30003 — Unreachable handset',
    '30004': '30004 — Message blocked',
    '30005': '30005 — Unknown destination handset',
    '30006': '30006 — Landline or unreachable carrier',
    '30007': '30007 — Carrier filtering',
    '30008': '30008 — Unknown delivery failure',
  };

  if (known[c]) return known[c];

  return raw.length > 90 ? `${raw.slice(0, 90)}…` : raw;
}

function deliveryHelp(status?: string) {
  const s = String(status || '').toUpperCase();

  if (s === 'DELIVERED') return 'Confirmed delivered to the buyer phone.';
  if (s === 'UNDELIVERED') return 'Twilio/carrier could not deliver this SMS.';
  if (s === 'FAILED') return 'The message failed before or during delivery.';
  if (s === 'SENT') return 'Sent to Twilio. Waiting for final delivery confirmation.';
  if (s === 'PENDING') return 'Waiting for Twilio delivery update.';

  return 'Delivery status from Twilio.';
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<null | { batchId: string; action: 'pause' | 'resume' | 'cancel'; campaign?: Campaign }>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/messages/bulk-campaigns`);
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      alert('Could not load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return campaigns;
    return campaigns.filter(c => c.status === statusFilter);
  }, [campaigns, statusFilter]);

  const totals = useMemo(() => {
    return campaigns.reduce((acc, c) => {
      acc.total += 1;
      acc.sending += ['QUEUED', 'SENDING'].includes(c.status) ? 1 : 0;
      acc.paused += c.status === 'PAUSED' ? 1 : 0;
      acc.completed += c.status?.startsWith('COMPLETED') ? 1 : 0;
      acc.sent += c.sent || 0;
      acc.failed += c.failed || 0;
      return acc;
    }, { total: 0, sending: 0, paused: 0, completed: 0, sent: 0, failed: 0 });
  }, [campaigns]);

  const campaignAction = (batchId: string, action: 'pause' | 'resume' | 'cancel') => {
    const campaign = campaigns.find(c => c.batchId === batchId) || selectedCampaign || undefined;
    setActionError(null);
    setPendingAction({ batchId, action, campaign });
  };

  const runConfirmedCampaignAction = async () => {
    if (!pendingAction) return;

    const { batchId, action } = pendingAction;
    setActionLoading(`${batchId}-${action}`);
    setActionError(null);

    try {
      const res = await fetch(`${API}/messages/bulk-campaigns/${batchId}/${action}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.message || `API error ${res.status}`);

      setPendingAction(null);
      await load();

      if (selectedCampaign?.batchId === batchId) {
        await refreshSelected(batchId);
      }
    } catch (e: any) {
      setActionError(e.message || `Could not ${action} campaign`);
    } finally {
      setActionLoading(null);
    }
  };

  const refreshSelected = async (batchId: string) => {
    try {
      const res = await fetch(`${API}/messages/bulk-campaigns/${batchId}`);
      const data = await res.json();
      setSelectedCampaign(data);
      await load();
    } catch {
      setActionError('Could not refresh campaign details');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <BarChart3 className="text-purple-400" size={28} />
            Campaigns
          </h1>
          <p className="text-gray-500 mt-1">Monitor bulk SMS campaigns, delivery progress, and drip controls.</p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm text-gray-200 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-2xl font-bold text-white">{totals.total}</div>
        </div>
        <div className="rounded-2xl border border-blue-800/40 bg-blue-900/10 p-4">
          <div className="text-xs text-blue-400">Active</div>
          <div className="text-2xl font-bold text-blue-300">{totals.sending}</div>
        </div>
        <div className="rounded-2xl border border-orange-800/40 bg-orange-900/10 p-4">
          <div className="text-xs text-orange-400">Paused</div>
          <div className="text-2xl font-bold text-orange-300">{totals.paused}</div>
        </div>
        <div className="rounded-2xl border border-green-800/40 bg-green-900/10 p-4">
          <div className="text-xs text-green-400">Completed</div>
          <div className="text-2xl font-bold text-green-300">{totals.completed}</div>
        </div>
        <div className="rounded-2xl border border-emerald-800/40 bg-emerald-900/10 p-4">
          <div className="text-xs text-emerald-400">Sent</div>
          <div className="text-2xl font-bold text-emerald-300">{totals.sent}</div>
        </div>
        <div className="rounded-2xl border border-red-800/40 bg-red-900/10 p-4">
          <div className="text-xs text-red-400">Failed</div>
          <div className="text-2xl font-bold text-red-300">{totals.failed}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {['all','QUEUED','SENDING','PAUSED','COMPLETED','COMPLETED_WITH_ERRORS','CANCELLED'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs border ${
                statusFilter === s
                  ? 'bg-purple-700 border-purple-500 text-white'
                  : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
        <div className="border-b border-gray-800 px-5 py-4">
          <h2 className="text-white font-semibold">Campaign History</h2>
          <p className="text-sm text-gray-500">Pause, resume, cancel, and inspect buyer-level results.</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading campaigns...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No campaigns found.</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filtered.map(c => {
              const progress = pct(c);
              const active = ['QUEUED', 'SENDING'].includes(c.status);
              const paused = c.status === 'PAUSED';

              return (
                <div key={c.id} className="p-5 hover:bg-gray-800/30 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-white font-semibold">{c.campaignName || typeLabel(c.type)}</div>
                        <span className={`text-xs px-2 py-1 rounded-full border ${statusClass(c.status)}`}>{c.status}</span>
                        <span className="text-xs text-gray-500">Template: {c.templateKey || 'general'}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {c.batchId} · {new Date(c.createdAt || c.startedAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSelectedCampaign(c)}
                        className="rounded-lg bg-gray-800 hover:bg-gray-700 px-3 py-1.5 text-xs text-gray-200"
                      >
                        View Details
                      </button>

                      {active && (
                        <button
                          onClick={() => campaignAction(c.batchId, 'pause')}
                          disabled={actionLoading === `${c.batchId}-pause`}
                          className="flex items-center gap-1 rounded-lg bg-orange-900/40 hover:bg-orange-800/60 px-3 py-1.5 text-xs text-orange-300 disabled:opacity-50"
                        >
                          <Pause size={12} /> Pause
                        </button>
                      )}

                      {paused && (
                        <button
                          onClick={() => campaignAction(c.batchId, 'resume')}
                          disabled={actionLoading === `${c.batchId}-resume`}
                          className="flex items-center gap-1 rounded-lg bg-green-900/40 hover:bg-green-800/60 px-3 py-1.5 text-xs text-green-300 disabled:opacity-50"
                        >
                          <Play size={12} /> Resume
                        </button>
                      )}

                      {(active || paused) && (
                        <button
                          onClick={() => campaignAction(c.batchId, 'cancel')}
                          disabled={actionLoading === `${c.batchId}-cancel`}
                          className="flex items-center gap-1 rounded-lg bg-red-900/40 hover:bg-red-800/60 px-3 py-1.5 text-xs text-red-300 disabled:opacity-50"
                        >
                          <XCircle size={12} /> Cancel Remaining
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                      <div className="h-full bg-purple-500" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-3 grid grid-cols-4 md:grid-cols-7 gap-3 text-xs">
                      <div className="text-gray-500">Selected <span className="text-gray-200">{c.selected}</span></div>
                      <div className="text-gray-500">Recipients <span className="text-gray-200">{c.queued}</span></div>
                      <div className="text-gray-500">Waiting <span className="text-blue-300">{c.pending}</span></div>
                      <div className="text-gray-500">Sent <span className="text-green-300">{c.sent}</span></div>
                      <div className="text-gray-500">Failed <span className="text-red-300">{c.failed}</span></div>
                      <div className="text-gray-500">Skipped <span className="text-yellow-300">{c.skipped}</span></div>
                      <div className="text-gray-500">Cancelled <span className="text-red-300">{c.cancelled}</span></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
          <div className="w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-2xl border border-purple-700/40 bg-gray-950 shadow-2xl flex flex-col">
            <div className="shrink-0 border-b border-gray-800 bg-gradient-to-r from-purple-950/80 to-blue-950/50 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedCampaign.campaignName || typeLabel(selectedCampaign.type)}</h3>
                  <p className="text-sm text-gray-400 mt-1">{selectedCampaign.batchId}</p>
                </div>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                {[
                  ['Selected', selectedCampaign.selected],
                  ['Recipients', selectedCampaign.queued],
                  ['Waiting', selectedCampaign.pending],
                  ['Sent', selectedCampaign.sent],
                  ['Failed', selectedCampaign.failed],
                  ['Skipped', selectedCampaign.skipped],
                  ['Cancelled', selectedCampaign.cancelled],
                  ['Delivered', deliveryCounts(selectedCampaign).delivered],
                  ['Undelivered', deliveryCounts(selectedCampaign).undelivered],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-gray-800 bg-gray-900/70 p-3">
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className="text-xl font-bold text-white">{value as any}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900/70 overflow-hidden">
                <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
                  {selectedCampaign && (() => {
                  const health = campaignHealth(selectedCampaign);
                  return (
                    <div className={`mb-4 rounded-xl border p-4 ${healthToneClasses(health.tone)}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold">Campaign Health: {health.label}</div>
                          <div className="mt-1 text-xs opacity-80">
                            {health.delivered} delivered · {health.undelivered} undelivered · {health.failed} failed · {health.waiting} waiting
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{health.deliveryRate}%</div>
                          <div className="text-xs opacity-70">Delivery Rate</div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-lg bg-black/20 p-3">
                          <div className="text-xs uppercase tracking-wide opacity-60">Top Issue</div>
                          <div className="mt-1 text-sm font-medium">
                            {health.topErrorCode ? formatDeliveryError(health.topErrorCode) + ` (${health.topErrorCount})` : 'No major delivery issue detected'}
                          </div>
                        </div>
                        <div className="rounded-lg bg-black/20 p-3">
                          <div className="text-xs uppercase tracking-wide opacity-60">Recommended Action</div>
                          <div className="mt-1 text-sm">{health.recommendation}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div>
                    <div className="text-sm font-medium text-white">Buyer-Level Results</div>
                    <div className="text-xs text-gray-500">Recipient status, phone, sent time, and error details.</div>
                  </div>
                  <button onClick={() => refreshSelected(selectedCampaign.batchId)} className="text-xs text-gray-400 hover:text-white">Refresh</button>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {(selectedCampaign.recipients || []).length === 0 ? (
                    <div className="p-5 text-sm text-gray-500">No recipient rows found.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-950">
                        <tr className="text-left text-gray-500 border-b border-gray-800">
                          <th className="px-4 py-3 font-medium">Buyer</th>
                          <th className="px-4 py-3 font-medium">Phone</th>
                          <th className="px-4 py-3 font-medium">Send Status</th>
                          <th className="px-4 py-3 font-medium">Delivery</th>
                          <th className="px-4 py-3 font-medium">Sent At</th>
                          <th className="px-4 py-3 font-medium">Delivered At</th>
                          <th className="px-4 py-3 font-medium">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedCampaign.recipients || []).map((r: any) => (
                          <tr key={r.id} className="border-b border-gray-900">
                            <td className="px-4 py-3 text-gray-200">{r.buyerName || r.buyerId}</td>
                            <td className="px-4 py-3 text-gray-400">{r.phone || '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full border ${statusClass(r.status)}`}>{r.status}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                title={deliveryHelp(r.deliveryStatus || 'PENDING')}
                                className={`text-xs px-2 py-1 rounded-full border ${statusClass(r.deliveryStatus || 'PENDING')}`}
                              >
                                {r.deliveryStatus || 'PENDING'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-400">{r.sentAt ? new Date(r.sentAt).toLocaleString() : '—'}</td>
                            <td className="px-4 py-3 text-gray-400">{r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : '—'}</td>
                            <td className="px-4 py-3 text-red-300 max-w-xs">
                              {(r.error || r.deliveryErrorMessage || r.deliveryErrorCode) ? (
                                <span
                                  title={deliveryHelp(r.deliveryStatus || r.status)}
                                  className="block truncate"
                                >
                                  {formatDeliveryError(r.deliveryErrorCode, r.deliveryErrorMessage, r.error)}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-gray-800 bg-gray-950 px-6 py-4 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Status: {selectedCampaign.status} · Progress: {pct(selectedCampaign)}%
              </div>
              <div className="flex items-center gap-2">
                {['QUEUED','SENDING'].includes(selectedCampaign.status) && (
                  <button onClick={() => campaignAction(selectedCampaign.batchId, 'pause')} className="rounded-lg bg-orange-900/40 px-4 py-2 text-sm text-orange-300 hover:bg-orange-800/60">Pause</button>
                )}
                {selectedCampaign.status === 'PAUSED' && (
                  <button onClick={() => campaignAction(selectedCampaign.batchId, 'resume')} className="rounded-lg bg-green-900/40 px-4 py-2 text-sm text-green-300 hover:bg-green-800/60">Resume</button>
                )}
                {['QUEUED','SENDING','PAUSED'].includes(selectedCampaign.status) && (
                  <button onClick={() => campaignAction(selectedCampaign.batchId, 'cancel')} className="rounded-lg bg-red-900/40 px-4 py-2 text-sm text-red-300 hover:bg-red-800/60">Cancel Remaining</button>
                )}
                <button onClick={() => setSelectedCampaign(null)} className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        open={!!pendingAction}
        title={
          pendingAction?.action === 'pause'
            ? 'Pause Campaign?'
            : pendingAction?.action === 'resume'
              ? 'Resume Campaign?'
              : 'Cancel Remaining Messages?'
        }
        description={
          pendingAction?.action === 'pause'
            ? 'This will stop the drip after any message currently being processed. You can resume it later.'
            : pendingAction?.action === 'resume'
              ? 'This will continue sending pending recipients at the campaign drip rate.'
              : 'This will cancel all unsent recipients. Messages already sent cannot be recalled.'
        }
        confirmLabel={
          pendingAction?.action === 'pause'
            ? 'Pause Campaign'
            : pendingAction?.action === 'resume'
              ? 'Resume Campaign'
              : 'Cancel Remaining'
        }
        variant={pendingAction?.action === 'cancel' ? 'danger' : pendingAction?.action === 'pause' ? 'warning' : 'normal'}
        loading={!!pendingAction && actionLoading === `${pendingAction.batchId}-${pendingAction.action}`}
        onCancel={() => {
          if (!actionLoading) {
            setPendingAction(null);
            setActionError(null);
          }
        }}
        onConfirm={runConfirmedCampaignAction}
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">Campaign</div>
            <div className="mt-1 text-sm font-medium text-white">
              {pendingAction?.campaign?.campaignName || pendingAction?.campaign?.batchId || 'Selected campaign'}
            </div>
            {pendingAction?.campaign && (
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div className="text-gray-500">Waiting <span className="text-blue-300">{pendingAction.campaign.pending}</span></div>
                <div className="text-gray-500">Sent <span className="text-green-300">{pendingAction.campaign.sent}</span></div>
                <div className="text-gray-500">Failed <span className="text-red-300">{pendingAction.campaign.failed}</span></div>
              </div>
            )}
          </div>

          {actionError && (
            <div className="rounded-lg border border-red-800/40 bg-red-900/20 px-3 py-2 text-sm text-red-200">
              {actionError}
            </div>
          )}
        </div>
      </ConfirmActionModal>

    </div>
  );
}
