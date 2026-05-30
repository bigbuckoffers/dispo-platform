'use client';
import { useState, useEffect } from 'react';
import { CreateBuyerModal } from '@/components/buyer/CreateBuyerModal';
import { SubmissionReviewModal } from '@/components/buyer/SubmissionReviewModal';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function profileScore(b: any): number {
  let s = 0;
  if (b.buyBox?.states?.length > 0 || b.marketPrimary) s += 25;
  if (b.buyBox?.minPrice || b.buyBox?.maxPrice || b.buyBox?.anyPrice) s += 15;
  if (b.buyBox?.rehabTolerance) s += 10;
  if (b.preferredStrategies?.length > 0) s += 10;
  if (b.aiSummary) s += 20;
  if (b.buyerIntelNotes && b.buyerIntelNotes.length > 50) s += 10;
  if (b.notes || b.hasCash || b.hasHardMoney) s += 10;
  return s;
}

function missingFields(b: any): string[] {
  const m: string[] = [];
  if (!b.buyBox?.states?.length && !b.marketPrimary) m.push('States / markets');
  if (!b.buyBox?.minPrice && !b.buyBox?.maxPrice && !b.buyBox?.anyPrice) m.push('Price range');
  if (!b.buyBox?.rehabTolerance) m.push('Rehab tolerance');
  if (!b.preferredStrategies?.length) m.push('Strategy');
  if (!b.aiSummary) m.push('AI intel report');
  if (!b.notes && !b.hasCash && !b.hasHardMoney) m.push('Funding type');
  return m;
}

function getTemp(b: any): { label: string; color: string } {
  try {
    const t = JSON.parse(b.temperatureNotes||'{}');
    if (t.buyerTemperature) {
      if (t.buyerTemperature==='HOT') return { label:'🔥 Hot', color:'text-orange-400' };
      if (t.buyerTemperature==='ACTIVE') return { label:'⚡ Active', color:'text-yellow-400' };
      if (t.buyerTemperature==='WARM') return { label:'🌤 Warm', color:'text-blue-400' };
      if (t.buyerTemperature==='HIBERNATING') return { label:'💤 Paused', color:'text-gray-500' };
      if (t.buyerTemperature==='COLD') return { label:'❄️ Cold', color:'text-gray-600' };
    }
  } catch {}
  return { label:'—', color:'text-gray-600' };
}

function getTierStyle(tier: string) {
  if (tier==='VIP') return { bg:'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40', label:'⭐ VIP' };
  if (tier==='TIER_1') return { bg:'bg-orange-500/20 text-orange-300 border border-orange-500/40', label:'🔥 T1' };
  if (tier==='TIER_2') return { bg:'bg-blue-500/20 text-blue-300 border border-blue-500/40', label:'T2' };
  if (tier==='TIER_3') return { bg:'bg-gray-500/20 text-gray-400 border border-gray-500/40', label:'T3' };
  return { bg:'bg-gray-700/20 text-gray-500 border border-gray-700/40', label:'T4' };
}

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<any[]>([]);
  const [allBuyers, setAllBuyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<'all'|'hot'|'review'|'reviewed'|'submissions'|'buybox_followup'>('all');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [fieldDecisions, setFieldDecisions] = useState<Record<string,string>>({});
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Record<string, boolean>>({});
  const [showBulkBuyBoxModal, setShowBulkBuyBoxModal] = useState(false);
  const [buyBoxSendingRules, setBuyBoxSendingRules] = useState<any>({
    startHour: 9,
    endHour: 18,
    maxPerMinute: 5,
    daysOfWeek: [1, 2, 3, 4, 5],
    timezoneMode: 'local',
  });
  const [loadingBuyBoxSendingRules, setLoadingBuyBoxSendingRules] = useState(false);
  const [bulkUseCustomSendingRules, setBulkUseCustomSendingRules] = useState(false);
  const [bulkSendingRulesDraft, setBulkSendingRulesDraft] = useState<any>({
    startHour: 9,
    endHour: 18,
    maxPerMinute: 5,
    daysOfWeek: [1, 2, 3, 4, 5],
    timezoneMode: 'local',
  });
  const [bulkTemplate, setBulkTemplate] = useState('general');
  const [bulkCampaignName, setBulkCampaignName] = useState('');
  const [bulkCustomMessage, setBulkCustomMessage] = useState('');
  const [currentBulkMessage, setCurrentBulkMessage] = useState('');
  const [bulkIncludeAlreadySent, setBulkIncludeAlreadySent] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [showBulkSendConfirm, setShowBulkSendConfirm] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [bulkCampaigns, setBulkCampaigns] = useState<any[]>([]);
  const [loadingBulkCampaigns, setLoadingBulkCampaigns] = useState(false);
  const [showAllSkippedReasons, setShowAllSkippedReasons] = useState(false);
  const [showMixedBulkModal, setShowMixedBulkModal] = useState(false);
  const [queueConfirmAction, setQueueConfirmAction] = useState<any>(null);
  const [queueActionNotice, setQueueActionNotice] = useState<any>(null);
  const [buyBoxQueueFilter, setBuyBoxQueueFilter] = useState<'all'|'not_sent'|'sent'|'opened'|'started'|'submitted'|'needs_review'>('all');
  const [queueActionLoading, setQueueActionLoading] = useState<Record<string, string>>({});


  const getVisibleBulkBuyers = () => {
    if (tab === 'hot') return hotBuyers;
    if (tab === 'review') return needsReview;
    if (tab === 'reviewed') return reviewed;
    if (tab === 'buybox_followup') return buyBoxFollowUpBuyers;
    return buyers;
  };

  const getAllKnownBulkBuyers = () => {
    const byId = new Map<string, any>();
    [...allBuyers, ...buyers].forEach((b: any) => {
      if (b?.id) byId.set(b.id, b);
    });
    return Array.from(byId.values());
  };

  const getBulkSelectedBuyers = () => {
    const known = getAllKnownBulkBuyers();
    const selectedIds = Object.keys(bulkSelected).filter((id) => bulkSelected[id]);
    return selectedIds.map((id) => known.find((b: any) => b.id === id)).filter(Boolean);
  };

  const isAlreadySent = (b: any) => !!b.intakeSentAt || ['LINK_SENT','OPENED','STARTED'].includes(b.intakeStatus);

  const getBulkEligibleBuyers = () => getBulkSelectedBuyers().filter((b: any) => {
    const submitted = !!b.intakeSubmittedAt || b.intakeStatus === 'SUBMITTED';
    if (!b.phone || submitted) return false;
    if (isAlreadySent(b) && !bulkIncludeAlreadySent) return false;
    return true;
  });

  const getBulkSkippedBuyers = () => getBulkSelectedBuyers().filter((b: any) => !getBulkEligibleBuyers().some((e: any) => e.id === b.id));

  const getBulkSkipReason = (b: any) => {
    if (!b) return 'buyer not found';
    if (!b.phone) return 'missing phone number';
    if (!!b.intakeSubmittedAt || b.intakeStatus === 'SUBMITTED') return 'already submitted Buy Box form';
    if (isAlreadySent(b) && !bulkIncludeAlreadySent) return 'already sent Buy Box form';
    return 'not eligible';
  };

  const toggleBulkBuyer = (buyerId: string) => {
    setBulkSelected(prev => ({ ...prev, [buyerId]: !prev[buyerId] }));
  };

  const selectVisibleNotSent = () => {
    const next: Record<string, boolean> = {};
    getVisibleBulkBuyers().forEach((b: any) => {
      const submitted = !!b.intakeSubmittedAt || b.intakeStatus === 'SUBMITTED';
      if (b.phone && !submitted && !isAlreadySent(b)) next[b.id] = true;
    });
    setBulkSelected(next);
  };

  const clearBulkSelection = () => setBulkSelected({});

  const dayLabels: Record<number, string> = {
    0: 'Sun',
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
  };

  const formatHourLabel = (hour: number) => {
    const h = Number(hour);
    if (!Number.isFinite(h)) return '—';
    const normalized = Math.max(0, Math.min(23, h));
    const suffix = normalized >= 12 ? 'PM' : 'AM';
    const display = normalized % 12 === 0 ? 12 : normalized % 12;
    return `${display}:00 ${suffix}`;
  };

  const formatSendingDays = (days: any) => {
    const normalized = Array.isArray(days) ? days.map((d: any) => Number(d)).filter((d: number) => d >= 0 && d <= 6) : [1,2,3,4,5];

    if (normalized.length === 7) return 'Every day';
    if (normalized.join(',') === '1,2,3,4,5') return 'Mon–Fri';
    if (normalized.join(',') === '0,6') return 'Weekends';

    return normalized.map((d: number) => dayLabels[d]).filter(Boolean).join(', ');
  };

  const loadBuyBoxSendingRules = async () => {
    try {
      setLoadingBuyBoxSendingRules(true);
      const r = await fetch(`${API}/settings/buy-box-sending`);
      if (!r.ok) throw new Error('Could not load sending rules');
      const d = await r.json();
      setBuyBoxSendingRules(d);
      setBulkSendingRulesDraft(d);
    } catch (e) {
      const fallbackRules = {
        startHour: 9,
        endHour: 18,
        maxPerMinute: 5,
        daysOfWeek: [1, 2, 3, 4, 5],
        timezoneMode: 'local',
      };
      setBuyBoxSendingRules(fallbackRules);
      setBulkSendingRulesDraft(fallbackRules);
    } finally {
      setLoadingBuyBoxSendingRules(false);
    }
  };

  const getBulkDefaultTemplateText = (template: string) => {
    const templates: Record<string, string> = {
      general: `Hey, can you complete your Buy Box form so we can send you deals that actually match what you buy? {{link}}`,
      new_number: `Hey, this is DispoAI / Big Buck Offers. You may not have this number saved yet — can you complete your Buy Box form so we know what deals to send you? {{link}}`,
      long_time: `Hey, it’s been a while. We’re cleaning up our buyer list and only want to send deals that fit. Can you update your Buy Box here? {{link}}`,
      cold_data: `Hey, we’re updating our buyer network and wanted to confirm what types of deals you’re looking for. Fill out your Buy Box here and we’ll only send relevant opportunities: {{link}}`,
      vip: `Hey, we’re updating our VIP buyer profiles so we can keep sending you the right deals first. Can you confirm your current Buy Box here? {{link}}`,
      reminder_1: `Quick reminder to complete your buy box so we can send you better-matched deals: {{link}}`,
      reminder_2: `Following up on your Buy Box form — once this is done, we can send you deals that better match your market, price range, and strategy: {{link}}`,
      reminder_3: `Last reminder on this for now — complete your Buy Box here if you still want us to send deals that match your criteria: {{link}}`,
    };
    return templates[template] || templates.general;
  };

  const getBulkTemplatePreview = () => {
    const link = 'https://dispo-platform-web.vercel.app/intake/BUYER_UNIQUE_LINK';
    const templates: Record<string, string> = {
      general: `Hey, can you complete your Buy Box form so we can send you deals that actually match what you buy? ${link}`,
      new_number: `Hey, this is DispoAI / Big Buck Offers. You may not have this number saved yet — can you complete your Buy Box form so we know what deals to send you? ${link}`,
      long_time: `Hey, it’s been a while. We’re cleaning up our buyer list and only want to send deals that fit. Can you update your Buy Box here? ${link}`,
      cold_data: `Hey, we’re updating our buyer network and wanted to confirm what types of deals you’re looking for. Fill out your Buy Box here and we’ll only send relevant opportunities: ${link}`,
      vip: `Hey, we’re updating our VIP buyer profiles so we can keep sending you the right deals first. Can you confirm your current Buy Box here? ${link}`,
      reminder_1: `Quick reminder to complete your buy box so we can send you better-matched deals: ${link}`,
      reminder_2: `Following up on your Buy Box form — once this is done, we can send you deals that better match your market, price range, and strategy: ${link}`,
      reminder_3: `Last reminder on this for now — complete your Buy Box here if you still want us to send deals that match your criteria: ${link}`,
    };
    const base = currentBulkMessage.trim() || bulkCustomMessage.trim() || templates[bulkTemplate] || templates.general;
    return base.includes('{{link}}') ? base.replaceAll('{{link}}', link) : base.includes(link) ? base : `${base} ${link}`;
  };

  const loadBulkCampaigns = async () => {
    setLoadingBulkCampaigns(true);
    try {
      const res = await fetch(`${API}/messages/bulk-campaigns`);
      const data = await res.json();
      setBulkCampaigns(Array.isArray(data) ? data : []);
    } catch {}
    finally { setLoadingBulkCampaigns(false); }
  };

  const bulkCampaignAction = async (batchId: string, action: 'pause' | 'resume' | 'cancel') => {
    const label = action === 'cancel' ? 'cancel remaining messages for' : action;
    if (!confirm(`Are you sure you want to ${label} this campaign?`)) return;

    try {
      const res = await fetch(`${API}/messages/bulk-campaigns/${batchId}/${action}`, {
        method: 'POST',
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `API error ${res.status}`);

      await loadBulkCampaigns();
      alert(`Campaign ${action} successful`);
    } catch (e: any) {
      alert(`Could not ${action} campaign: ${e.message}`);
    }
  };

  const getSelectedBuyBoxQueueBulkBreakdown = () => {
    const selected = getBulkSelectedBuyers();

    const groups: Record<string, { label: string; count: number; filter?: any; tone: string }> = {};

    selected.forEach((b: any) => {
      const key = buyBoxStatusKey(b);
      let groupKey = key;
      let label = 'Unknown Action';
      let filter: any = key;
      let tone = 'bg-gray-800 text-gray-300 border-gray-700';

      if (key === 'not_sent') {
        groupKey = 'not_sent';
        label = 'Send Buy Box Forms';
        filter = 'not_sent';
        tone = 'bg-green-500/10 text-green-300 border-green-700/40';
      } else if (['sent','opened','started'].includes(key)) {
        const nextReminder = getQueueNextReminderNumber(b);
        if (nextReminder > 3) {
          groupKey = 'call';
          label = 'Call Buyer / Stop SMS';
          filter = key;
          tone = 'bg-yellow-500/10 text-yellow-300 border-yellow-700/40';
        } else {
          groupKey = `reminder_${nextReminder}`;
          label = `Send Reminder #${nextReminder}`;
          filter = key;
          tone = 'bg-blue-500/10 text-blue-300 border-blue-700/40';
        }
      } else if (key === 'submitted') {
        groupKey = 'submitted';
        label = 'Review Submissions';
        filter = 'submitted';
        tone = 'bg-purple-500/10 text-purple-300 border-purple-700/40';
      } else if (key === 'needs_review') {
        groupKey = 'needs_review';
        label = 'Fix Profiles';
        filter = 'needs_review';
        tone = 'bg-orange-500/10 text-orange-300 border-orange-700/40';
      }

      if (!groups[groupKey]) groups[groupKey] = { label, count: 0, filter, tone };
      groups[groupKey].count += 1;
    });

    return Object.values(groups);
  };

  const jumpToBuyBoxQueueFilter = (filter: any) => {
    setBuyBoxQueueFilter(filter);
    setShowMixedBulkModal(false);

    const next: Record<string, boolean> = {};
    getBulkSelectedBuyers().forEach((b: any) => {
      if (buyBoxStatusKey(b) === filter) next[b.id] = true;
    });
    setBulkSelected(next);
  };

  const getSelectedBuyBoxQueueBulkAction = () => {
    const selected = getBulkSelectedBuyers();

    if (tab !== 'buybox_followup' || selected.length === 0) {
      return { type: 'buybox', label: 'Bulk Buy Box Send', templateKey: 'general', includeAlreadySent: false };
    }

    const actions = selected.map((b: any) => {
      const key = buyBoxStatusKey(b);

      if (key === 'not_sent') {
        return { type: 'buybox', templateKey: 'general', includeAlreadySent: false, label: 'Bulk Send Buy Box Forms' };
      }

      if (['sent','opened','started'].includes(key)) {
        const nextReminder = getQueueNextReminderNumber(b);
        if (nextReminder > 3) return { type: 'call', label: 'Call Buyer' };
        return {
          type: `reminder_${nextReminder}`,
          templateKey: `reminder_${nextReminder}`,
          includeAlreadySent: true,
          label: `Bulk Send Reminder #${nextReminder}`,
        };
      }

      if (key === 'submitted') return { type: 'review', label: 'Review Submissions' };
      if (key === 'needs_review') return { type: 'profile', label: 'Fix Profiles' };

      return { type: 'unknown', label: 'Mixed Actions' };
    });

    const uniqueTypes = Array.from(new Set(actions.map((a: any) => a.type)));

    if (uniqueTypes.length > 1) {
      return { type: 'mixed', label: 'Mixed Bulk Actions' };
    }

    return actions[0] || { type: 'buybox', label: 'Bulk Buy Box Send', templateKey: 'general', includeAlreadySent: false };
  };

  const toggleBulkOverrideDay = (day: number) => {
    setBulkSendingRulesDraft((prev: any) => {
      const current = Array.isArray(prev.daysOfWeek) ? prev.daysOfWeek.map(Number) : [1,2,3,4,5];
      const exists = current.includes(day);
      const daysOfWeek = exists ? current.filter((d: number) => d !== day) : [...current, day].sort();
      return { ...prev, daysOfWeek: daysOfWeek.length ? daysOfWeek : current };
    });
  };

  const getFinalBulkSendingRules = () => {
    return bulkUseCustomSendingRules ? bulkSendingRulesDraft : buyBoxSendingRules;
  };

  const openBulkBuyBoxModal = () => {
    setBulkUseCustomSendingRules(false);
    void loadBuyBoxSendingRules();
    setBulkResult(null);
    setShowAllSkippedReasons(false);

    const action: any = getSelectedBuyBoxQueueBulkAction();

    if (tab === 'buybox_followup' && getBulkSelectedBuyers().length > 0) {
      if (action.type === 'mixed') {
        setShowMixedBulkModal(true);
        return;
      }

      if (['call','review','profile','unknown'].includes(action.type)) {
        alert(`${action.label} is not a bulk SMS action. Use the row actions instead.`);
        return;
      }

      setBulkTemplate(action.templateKey || 'general');
      setBulkIncludeAlreadySent(!!action.includeAlreadySent);
      setBulkCampaignName(`${action.label} - ${new Date().toLocaleDateString()}`);
      setCurrentBulkMessage(getBulkDefaultTemplateText(action.templateKey || 'general'));
      loadBulkCampaigns();
      setShowBulkBuyBoxModal(true);
      return;
    }

    setBulkCampaignName(`Buy Box Send - ${new Date().toLocaleDateString()}`);
    setCurrentBulkMessage(getBulkDefaultTemplateText(bulkTemplate));
    loadBulkCampaigns();
    setShowBulkBuyBoxModal(true);
  };

  const runBackendBulkBuyBoxSend = () => {
    const eligible = getBulkEligibleBuyers();

    if (eligible.length === 0 || bulkSending || bulkResult) return;

    setShowBulkSendConfirm(true);
  };

  const executeBackendBulkBuyBoxSend = async () => {
    const eligible = getBulkEligibleBuyers();
    if (!eligible.length) return alert('No eligible buyers selected.');


    setBulkSending(true);
    setBulkResult(null);

    try {
      const res = await fetch(`${API}/messages/bulk-buybox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerIds: getBulkSelectedBuyers().map((b: any) => b.id),
          templateKey: bulkTemplate,
          campaignName: bulkCampaignName,
          customMessage: currentBulkMessage || bulkCustomMessage,
          includeAlreadySent: bulkIncludeAlreadySent,
          delayMs: 12000,
          sendingRules: bulkUseCustomSendingRules ? bulkSendingRulesDraft : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `API error ${res.status}`);

      setBulkResult(data);
      setShowBulkSendConfirm(false);
      loadBulkCampaigns();
      load();
      loadAll();
    } catch (e: any) {
      alert('Bulk send failed: ' + e.message);
    } finally {
      setBulkSending(false);
    }
  };

  const getQueueReminderCount = (b: any) => {
    const events = Array.isArray(b?.events) ? b.events : [];
    const eventCount = events.filter((e: any) => e.eventType === 'INTAKE_REMINDER_SENT').length;
    return Number(b?.intakeReminderCount || b?.reminderCount || eventCount || 0);
  };

  const getQueueNextReminderNumber = (b: any) => getQueueReminderCount(b) + 1;

  const getQueueReminderMessage = (b: any, link: string) => {
    const reminderNumber = getQueueNextReminderNumber(b);

    if (reminderNumber === 1) {
      return `Quick reminder to complete your buy box so we can send you better-matched deals: ${link}`;
    }

    if (reminderNumber === 2) {
      return `Following up on your Buy Box form — once this is done, we can send you deals that better match your market, price range, and strategy: ${link}`;
    }

    return `Last reminder on this for now — complete your Buy Box here if you still want us to send deals that match your criteria: ${link}`;
  };

  const getQueueBuyBoxLink = async (buyerId: string) => {
    const r = await fetch(`${API}/intake/generate/${buyerId}`, { method: 'POST' });
    const d = await r.json().catch(() => ({}));

    if (!r.ok) throw new Error(d?.message || `Could not create Buy Box link`);

    return d.link || d.url || d.intakeLink || `${window.location.origin}/intake/${d.token || d.intakeToken}`;
  };

  const sendQueueSms = async (buyerId: string, message: string, intakeTrackingType: 'link_sent' | 'reminder', reminderNumber?: number) => {
    const r = await fetch(`${API}/messages/conversations/${buyerId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, intakeTrackingType, reminderNumber }),
    });

    const d = await r.json().catch(() => ({}));

    if (!r.ok) throw new Error(d?.message || `SMS send failed`);

    return d;
  };

  const sendBuyBoxFromQueue = async (b: any) => {
    if (!b?.id) return;
    if (!b?.phone) { setQueueActionNotice({ type: 'error', title: 'Missing phone number', message: 'This buyer has no phone number.' }); return; }

    setQueueActionLoading(prev => ({ ...prev, [b.id]: 'send' }));

    try {
      const link = await getQueueBuyBoxLink(b.id);
      const firstName = b.firstName && b.firstName !== 'Unknown' ? b.firstName : '';
      const message = `Hey${firstName ? ' ' + firstName : ''}, can you complete your Buy Box form so we can send you deals that actually match what you buy? ${link}`;

      await sendQueueSms(b.id, message, 'link_sent');
      await loadAll();
      await load();

      setQueueActionNotice({ type: 'success', title: 'Buy Box form sent', message: `${bname(b)} was sent their Buy Box form.` });
    } catch (e: any) {
      setQueueActionNotice({ type: 'error', title: 'Could not send Buy Box form', message: e.message });
    } finally {
      setQueueActionLoading(prev => {
        const next = { ...prev };
        delete next[b.id];
        return next;
      });
    }
  };

  const sendReminderFromQueue = async (b: any) => {
    if (!b?.id) return;
    if (!b?.phone) { setQueueActionNotice({ type: 'error', title: 'Missing phone number', message: 'This buyer has no phone number.' }); return; }

    const reminderNumber = getQueueNextReminderNumber(b);

    if (reminderNumber > 3) {
      setQueueActionNotice({ type: 'warning', title: 'Reminder limit reached', message: 'This buyer already received 3 reminders. Next best action is to call or manually message them.' }); return;
    }

    setQueueActionLoading(prev => ({ ...prev, [b.id]: 'reminder' }));

    try {
      const link = await getQueueBuyBoxLink(b.id);
      const message = getQueueReminderMessage(b, link);

      await sendQueueSms(b.id, message, 'reminder', reminderNumber);
      await loadAll();
      await load();

      setQueueActionNotice({ type: 'success', title: `Reminder #${reminderNumber} sent`, message: `${bname(b)} was sent Buy Box reminder #${reminderNumber}.` });
    } catch (e: any) {
      setQueueActionNotice({ type: 'error', title: 'Could not send reminder', message: e.message });
    } finally {
      setQueueActionLoading(prev => {
        const next = { ...prev };
        delete next[b.id];
        return next;
      });
    }
  };

  const deleteBuyer = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    await fetch(`${API}/buyers/${id}`, { method: 'DELETE' });
    load(); loadAll();
  };

  const exportCsv = async () => {
    let all: any[] = [];
    if (tab === 'all') {
      let p = 1;
      while (true) {
        const res = await fetch(`${API}/buyers?page=${p}&limit=200`);
        const data = await res.json();
        const rows = data.data || data.buyers || [];
        all = [...all, ...rows];
        if (rows.length < 200) break;
        p++;
      }
    } else if (tab === 'hot') {
      all = allBuyers.filter((b: any) => b.tier==='VIP'||b.tier==='TIER_1'||getTemp(b).label.includes('Hot')||getTemp(b).label.includes('Active'));
    } else if (tab === 'review') {
      all = allBuyers.filter((b: any) => profileScore(b) < 70 && !(b.tags||[]).includes('profile_reviewed'));
    } else if (tab === 'reviewed') {
      all = allBuyers.filter((b: any) => (b.tags||[]).includes('profile_reviewed'));
    }
    const headers = ['First Name','Last Name','Email','Phone','Tier','Temperature','Markets','Strategies','Funding','Min Price','Max Price'];
    const rows = all.map((b: any) => {
      const bb = b.buyBox || {};
      return [
        b.firstName||'', b.lastName||'',
        b.email?.includes('@import.dispoai.com')?'':b.email||'',
        b.phone||'', b.tier||'', getTemp(b).label,
        (bb.states||[]).join(';')||(b.marketPrimary||''),
        (b.preferredStrategies||[]).join(';'),
        b.notes||'', bb.minPrice||'', bb.maxPrice||''
      ].map((v: any) => `"${String(v).replace(/"/g,'""')}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `buyers_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  useEffect(() => { load(); }, [search, tier, page]);
  useEffect(() => { loadAll(); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams({ page: String(page), limit: '100' });
      if (search) p.set('search', search);
      if (tier) p.set('tier', tier);
      const r = await fetch(`${API}/buyers?${p}`);
      if (!r.ok) throw new Error(`API error ${r.status}`);
      const j = await r.json();
      setBuyers(j.data ?? j);
      setTotal(j.meta?.total ?? (j.data ?? j).length);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function loadSubmissions() {
    setLoadingSubs(true);
    try {
      const r = await fetch(`${API}/intake/submissions`);
      const d = await r.json();
      setSubmissions(Array.isArray(d) ? d : []);
    } catch {}
    finally { setLoadingSubs(false); }
  }

  async function approveSubmission(sub: any) {
    const d = sub.submittedData;
    const buyerFields: any = {};
    const buyBoxFields: any = {};
    if (d.firstName) buyerFields.firstName = d.firstName;
    if (d.lastName) buyerFields.lastName = d.lastName;
    if (d.phone) buyerFields.phone = d.phone;
    if (d.email) buyerFields.email = d.email;
    if (d.marketPrimary) buyerFields.marketPrimary = d.marketPrimary;
    if (d.marketSecondary) buyerFields.marketSecondary = typeof d.marketSecondary === 'string' ? d.marketSecondary.split(',').map((s:string)=>s.trim()).filter(Boolean) : d.marketSecondary;
    if (d.strategies?.length) buyerFields.preferredStrategies = d.strategies;
    if (d.fundingTypes?.length) buyerFields.notes = d.fundingTypes.join(', ');
    if (d.buyingStatus) buyerFields.buyingStatus = d.buyingStatus;
    if (d.monthlyCapacity) buyerFields.monthlyCapacity = d.monthlyCapacity;
    if (d.closeSpeed) buyerFields.avgCloseSpeedDays = parseInt(d.closeSpeed);
    if (d.preferredContact) buyerFields.preferredContact = d.preferredContact;
    if (d.dealSendFreq) buyerFields.dealSendFreq = d.dealSendFreq;
    if (d.states) buyBoxFields.states = typeof d.states === 'string' ? d.states.split(',').map((s:string)=>s.trim()).filter(Boolean) : d.states;
    if (d.zipCodes) buyBoxFields.zipCodes = typeof d.zipCodes === 'string' ? d.zipCodes.split(',').map((z:string)=>z.trim()).filter(Boolean) : d.zipCodes;
    if (d.anyZipOk !== undefined) buyBoxFields.anyZipOk = d.anyZipOk;
    if (d.minPrice) buyBoxFields.minPrice = parseFloat(d.minPrice);
    if (d.maxPrice) buyBoxFields.maxPrice = parseFloat(d.maxPrice);
    if (d.anyPrice !== undefined) buyBoxFields.anyPrice = d.anyPrice;
    if (d.rehabTolerance) buyBoxFields.rehabTolerance = d.rehabTolerance;
    if (d.propertyTypes?.length) buyBoxFields.propertyTypes = d.propertyTypes;
    if (d.minBeds) buyBoxFields.minBeds = parseInt(d.minBeds);
    if (d.hoaOk) buyBoxFields.hoaOk = d.hoaOk;
    if (d.minArv) buyBoxFields.minArv = parseFloat(d.minArv);
    if (d.minProfit) buyBoxFields.minProfit = parseFloat(d.minProfit);
    if (d.maxEmd) buyBoxFields.maxEmd = parseFloat(d.maxEmd);
    if (d.inspectionDays) buyBoxFields.inspectionDays = parseInt(d.inspectionDays);
    if (d.minYearBuilt) buyBoxFields.minYearBuilt = parseInt(d.minYearBuilt);
    if (d.hardNoCriteria) buyBoxFields.hardNoCriteria = d.hardNoCriteria;
    if (d.excludedAreas) buyBoxFields.excludedAreas = d.excludedAreas;
    if (d.occupancy) buyBoxFields.occupancy = d.occupancy;
    await fetch(`${API}/intake/submissions/${sub.id}/approve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyerFields, buyBoxFields }),
    });
    alert('Buy box updated!');
    loadSubmissions();
  }

  async function rejectSubmission(id: string) {
    await fetch(`${API}/intake/submissions/${id}/reject`, { method: 'POST' });
    loadSubmissions();
  }

  async function loadAll() {
    setLoadingAll(true);
    try {
      const first = await fetch(`${API}/buyers?page=1&limit=100`).then(r=>r.json());
      const totalPages = first.meta?.totalPages ?? 1;
      let all = [...(first.data ?? [])];
      for (let p = 2; p <= totalPages; p++) {
        const r = await fetch(`${API}/buyers?page=${p}&limit=100`).then(r=>r.json());
        all = [...all, ...(r.data ?? [])];
      }
      setAllBuyers(all);
    } catch {}
    finally { setLoadingAll(false); }
  }

  const bname = (b: any) => (!b.firstName||b.firstName==='Unknown') ? (b.phone||b.email?.split('@')[0]||'Unknown') : b.lastName==='Buyer' ? b.firstName : `${b.firstName} ${b.lastName}`.trim();
  const sc = (n: number) => n>=80?'text-green-400':n>=60?'text-yellow-400':'text-red-400';
  const reviewed = [...allBuyers].filter(b => (b.tags||[]).includes('profile_reviewed')).sort((a,b) => (b.compositeScore||0)-(a.compositeScore||0));
  const needsReview = [...allBuyers].filter(b => profileScore(b) < 70 && !(b.tags||[]).includes('profile_reviewed')).sort((a,b) => (b.compositeScore||0)-(a.compositeScore||0));
  const hotBuyers = [...allBuyers].filter(b => b.tier==='VIP'||b.tier==='TIER_1'||getTemp(b).label.includes('Hot')||getTemp(b).label.includes('Active')).sort((a,b) => (b.compositeScore||0)-(a.compositeScore||0));

  const buyBoxStatusKey = (b: any) => {
    const status = String(b.intakeStatus || 'NOT_SENT');

    if (status === 'SUBMITTED' || b.intakeSubmittedAt) return 'submitted';
    if (status === 'MANUAL_REVIEW_NEEDED') return 'needs_review';
    if (status === 'STARTED' || b.intakeStartedAt) return 'started';
    if (status === 'OPENED' || b.intakeOpenedAt) return 'opened';
    if (status === 'LINK_SENT' || b.intakeSentAt) return 'sent';
    if (status === 'LINK_CREATED') return 'not_sent';

    return 'not_sent';
  };

  const buyBoxNextAction = (b: any) => {
    const key = buyBoxStatusKey(b);

    if (key === 'submitted') return { label: 'Review Submission', tone: 'text-purple-300 bg-purple-500/10 border-purple-700/40', description: 'Buyer submitted their Buy Box. Review and approve profile data.' };
    if (key === 'needs_review') return { label: 'Needs Human Review', tone: 'text-yellow-300 bg-yellow-500/10 border-yellow-700/40', description: 'Manual review needed before this buyer is considered complete.' };
    if (key === 'started') return { label: 'Send Reminder / Call', tone: 'text-amber-300 bg-amber-500/10 border-amber-700/40', description: 'Buyer started but did not submit. This is a strong follow-up opportunity.' };
    if (key === 'opened') return { label: 'Nudge Buyer', tone: 'text-blue-300 bg-blue-500/10 border-blue-700/40', description: 'Buyer opened the form but did not start. Send a light reminder.' };
    if (key === 'sent') return { label: 'Wait or Remind', tone: 'text-gray-300 bg-gray-800 border-gray-700', description: 'Form was sent. If enough time has passed, send a reminder.' };

    return { label: 'Send Buy Box', tone: 'text-green-300 bg-green-500/10 border-green-700/40', description: 'Buyer has not received the Buy Box form yet.' };
  };

  const buyBoxFollowUpBuyers = [...allBuyers]
    .filter((b: any) => {
      const key = buyBoxStatusKey(b);
      if (buyBoxQueueFilter === 'all') return true;
      return key === buyBoxQueueFilter;
    })
    .sort((a: any, b: any) => {
      const priority: Record<string, number> = {
        submitted: 1,
        needs_review: 2,
        started: 3,
        opened: 4,
        sent: 5,
        not_sent: 6,
      };
      return (priority[buyBoxStatusKey(a)] || 99) - (priority[buyBoxStatusKey(b)] || 99);
    });

  const buyBoxQueueCounts = {
    all: allBuyers.length,
    not_sent: allBuyers.filter((b: any) => buyBoxStatusKey(b) === 'not_sent').length,
    sent: allBuyers.filter((b: any) => buyBoxStatusKey(b) === 'sent').length,
    opened: allBuyers.filter((b: any) => buyBoxStatusKey(b) === 'opened').length,
    started: allBuyers.filter((b: any) => buyBoxStatusKey(b) === 'started').length,
    submitted: allBuyers.filter((b: any) => buyBoxStatusKey(b) === 'submitted').length,
    needs_review: allBuyers.filter((b: any) => buyBoxStatusKey(b) === 'needs_review').length,
  };



  const getIntakeStatus = (b: any) => {
    const latestEvent = b.events?.[0]?.eventType;
    if (latestEvent === 'INTAKE_COMPLETED') return { label: '✅ Completed', color: 'text-green-400 bg-green-500/10', priority: 3 };
    if (latestEvent === 'INTAKE_OPENED') return { label: '👀 Opened', color: 'text-blue-400 bg-blue-500/10', priority: 2 };
    if (latestEvent === 'INTAKE_ABANDONED') return { label: '⚠️ Abandoned', color: 'text-amber-400 bg-amber-500/10', priority: 1 };
    if (b.intakeSentAt) return { label: '📤 Sent', color: 'text-gray-400 bg-gray-500/10', priority: 0 };
    return { label: null, priority: -1 };
  };

  const BuyerRow = ({ b }: { b: any }) => {
    const temp = getTemp(b);
    const ts = getTierStyle(b.tier);
    const ps = profileScore(b);
    const markets = (b.buyBox?.states||[]).join(', ') || b.marketPrimary || '—';
    const strategies = (b.preferredStrategies||[]).slice(0,2).join(', ') || '—';
    const priceRange = b.buyBox?.anyPrice ? 'Any' : (b.buyBox?.minPrice||b.buyBox?.maxPrice) ? `$${b.buyBox.minPrice?Math.round(b.buyBox.minPrice/1000)+'k':'?'}–$${b.buyBox.maxPrice?Math.round(b.buyBox.maxPrice/1000)+'k':'?'}` : '—';
    const lastContact = b.lastContactDate||b.lastActiveDate ? new Date(b.lastContactDate||b.lastActiveDate).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—';
    const pcColor = ps>=70?'bg-green-500':ps>=40?'bg-yellow-500':'bg-red-500';
    return (
      <tr className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer group/row" onClick={()=>window.location.href=`/dashboard/buyers/${b.id}`}>
        <td className="px-4 py-3 min-w-[180px]">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={!!bulkSelected[b.id]}
              onClick={e=>e.stopPropagation()}
              onChange={()=>toggleBulkBuyer(b.id)}
              className="mt-1 accent-purple-600"
            />
            <div>
              <div className="font-medium text-white text-sm">{bname(b)}</div>
              <div className="text-gray-500 text-xs">{b.email?.includes('@import.dispoai.com')?(b.phone||''):(b.phone||b.email||'')}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ts.bg}`}>{ts.label}</span></td>
        <td className="px-4 py-3"><span className={`text-xs font-medium ${temp.color}`}>{temp.label}</span></td>
        <td className="px-4 py-3 text-gray-300 text-xs max-w-[160px] truncate">{strategies}</td>
        <td className="px-4 py-3 text-gray-300 text-xs">{markets}</td>
        <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{priceRange}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-14 bg-gray-700 rounded-full h-1.5"><div className={`${pcColor} h-1.5 rounded-full`} style={{width:`${ps}%`}}/></div>
            <span className="text-xs text-gray-500">{ps}%</span>
          </div>
        </td>
        <td className="px-4 py-3">
          {(() => { const is = getIntakeStatus(b); return is.label ? <span className={`text-xs px-2 py-0.5 rounded-full ${is.color}`}>{is.label}</span> : <span className="text-gray-700 text-xs">—</span>; })()}
        </td>
        <td className="px-4 py-3 text-gray-500 text-xs">{lastContact}</td>
        <td className="px-4 py-3 text-right" onClick={e=>e.stopPropagation()}>
          <button onClick={()=>deleteBuyer(b.id,bname(b))} className="opacity-0 group-hover/row:opacity-100 text-red-500 hover:text-red-400 transition px-2 py-1 rounded hover:bg-red-500/10 text-xs">🗑</button>
        </td>
      </tr>
    );
  };

  const BuyBoxFollowUpRow = ({ b }: { b: any }) => {
    const action = buyBoxNextAction(b);
    const key = buyBoxStatusKey(b);
    const lastActivity = b.intakeSubmittedAt || b.intakeStartedAt || b.intakeOpenedAt || b.intakeSentAt || b.updatedAt;
    return (
      <tr className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer group/row" onClick={()=>window.location.href=`/dashboard/buyers/${b.id}`}>
        <td className="px-4 py-3">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={!!bulkSelected[b.id]}
              onClick={e=>e.stopPropagation()}
              onChange={()=>toggleBulkBuyer(b.id)}
              className="mt-1 accent-purple-600"
            />
            <div>
              <div className="font-medium text-white text-sm">{bname(b)}</div>
              <div className="text-gray-500 text-xs">{b.phone || b.email || 'No contact'}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${action.tone}`}>{action.label}</span>
          <div className="text-gray-500 text-[10px] mt-1 max-w-[280px]">{action.description}</div>
        </td>
        <td className="px-4 py-3 text-gray-300 text-xs">
          {key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </td>
        <td className="px-4 py-3 text-gray-400 text-xs">
          {lastActivity ? new Date(lastActivity).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '—'}
        </td>
        <td className="px-4 py-3 text-gray-400 text-xs">
          {(b.buyBox?.states||[]).join(', ') || b.marketPrimary || '—'}
        </td>
        <td className="px-4 py-3 text-right" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-end gap-2">
            {key === 'not_sent' && (
              <button
                onClick={()=>setQueueConfirmAction({ type: 'send', buyer: b })}
                disabled={!!queueActionLoading[b.id] || !b.phone}
                className="px-2 py-1 bg-green-900/40 hover:bg-green-800/70 disabled:opacity-40 text-green-300 rounded text-xs"
                title={!b.phone ? 'Buyer has no phone number' : 'Send Buy Box form by SMS'}
              >
                {queueActionLoading[b.id] === 'send' ? 'Sending...' : 'Send Buy Box'}
              </button>
            )}

            {['sent','opened','started'].includes(key) && getQueueNextReminderNumber(b) <= 3 && (
              <button
                onClick={()=>setQueueConfirmAction({ type: 'reminder', buyer: b, reminderNumber: getQueueNextReminderNumber(b) })}
                disabled={!!queueActionLoading[b.id] || !b.phone}
                className="px-2 py-1 bg-blue-900/40 hover:bg-blue-800/70 disabled:opacity-40 text-blue-300 rounded text-xs"
                title={!b.phone ? 'Buyer has no phone number' : `Send reminder #${getQueueNextReminderNumber(b)}`}
              >
                {queueActionLoading[b.id] === 'reminder' ? 'Sending...' : `Reminder #${getQueueNextReminderNumber(b)}`}
              </button>
            )}

            {['sent','opened','started'].includes(key) && getQueueNextReminderNumber(b) > 3 && (
              <button
                onClick={()=>{ if (b.phone) window.location.href = `tel:${b.phone}`; }}
                disabled={!b.phone}
                className="px-2 py-1 bg-yellow-900/40 hover:bg-yellow-800/70 disabled:opacity-40 text-yellow-300 rounded text-xs"
                title="3 reminders already sent. Call buyer next."
              >
                Call Buyer
              </button>
            )}

            {key === 'submitted' && (
              <button
                onClick={()=>{ setTab('submissions'); loadSubmissions(); }}
                className="px-2 py-1 bg-purple-900/40 hover:bg-purple-800/70 text-purple-300 rounded text-xs"
              >
                Review
              </button>
            )}

            {key === 'needs_review' && (
              <button
                onClick={()=>window.location.href=`/dashboard/buyers/${b.id}`}
                className="px-2 py-1 bg-yellow-900/40 hover:bg-yellow-800/70 text-yellow-300 rounded text-xs"
              >
                Fix Profile
              </button>
            )}

            <button
              onClick={()=>window.location.href=`/dashboard/messages?buyer=${b.id}`}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs"
            >
              Message
            </button>
            <button
              onClick={()=>window.location.href=`/dashboard/buyers/${b.id}`}
              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs"
            >
              Profile
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const TH = () => (
    <thead><tr className="border-b border-gray-800">
      {['Select','Buyer','Tier','Temp','Strategy','Markets','Price Range','Profile','Intake','Last Contact',''].map(h=>(
        <th key={h} className="text-left text-gray-500 font-medium px-4 py-3 text-xs uppercase tracking-wide whitespace-nowrap">
          {h==='Select'?(
            <input
              type="checkbox"
              checked={getVisibleBulkBuyers().length>0 && getVisibleBulkBuyers().every((b:any)=>!!bulkSelected[b.id])}
              onChange={e=>{
                const next = {...bulkSelected};
                getVisibleBulkBuyers().forEach((b:any)=>{ next[b.id] = e.target.checked; });
                setBulkSelected(next);
              }}
              className="accent-purple-600"
            />
          ):h}
        </th>
      ))}
    </tr></thead>
  );

  const ProfileRow = ({ b }: { b: any }) => {
    const ps = profileScore(b); const miss = missingFields(b);
    const bc = ps>=70?'bg-green-500':ps>=40?'bg-yellow-500':'bg-red-500';
    return (
      <tr className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer group/row" onClick={()=>window.location.href=`/dashboard/buyers/${b.id}`}>
        <td className="px-4 py-3"><div className="font-medium text-white">{bname(b)}</div><div className="text-gray-500 text-xs">{b.phone||''}</div></td>
        <td className="px-4 py-3"><span className={`font-bold ${sc(b.compositeScore)}`}>{b.compositeScore}</span></td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-20 bg-gray-700 rounded-full h-1.5"><div className={`${bc} h-1.5 rounded-full`} style={{width:`${ps}%`}}/></div>
            <span className="text-xs text-gray-400">{ps}%</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {miss.slice(0,3).map((m,i)=><span key={i} className="text-xs bg-orange-500/10 text-orange-300 border border-orange-500/20 px-2 py-0.5 rounded-full">{m}</span>)}
            {miss.length>3&&<span className="text-xs text-gray-500">+{miss.length-3} more</span>}
          </div>
        </td>
        <td className="px-4 py-3 text-gray-400 text-xs">{(b.buyBox?.states||[]).join(', ')||b.marketPrimary||'—'}</td>
        <td className="px-4 py-3 text-right" onClick={e=>e.stopPropagation()}><button onClick={()=>deleteBuyer(b.id,bname(b))} className="opacity-0 group-hover/row:opacity-100 text-red-500 hover:text-red-400 transition px-2 py-1 rounded hover:bg-red-500/10 text-xs">🗑</button></td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Buyer CRM</h1>
          <p className="text-gray-400 text-sm mt-1">{total} buyers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openBulkBuyBoxModal} className="bg-purple-900/50 hover:bg-purple-800/70 border border-purple-700/50 text-purple-200 px-4 py-2 rounded-lg text-sm font-medium transition">
            {getBulkSelectedBuyers().length>0 ? `📩 ${getSelectedBuyBoxQueueBulkAction().label} (${getBulkSelectedBuyers().length})` : '📩 Bulk Buy Box Send'}
          </button>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition">+ Add Buyer</button>
          <button onClick={exportCsv} className="bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/40 text-emerald-300 px-4 py-2 rounded-lg text-sm font-medium transition">⬇ Export CSV</button>
        </div>
      </div>
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        <button onClick={()=>setTab('all')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab==='all'?'bg-gray-700 text-white':'text-gray-400 hover:text-white'}`}>
          All Buyers <span className="ml-1 text-xs bg-gray-600 px-1.5 py-0.5 rounded-full">{total}</span>
        </button>
        <button onClick={()=>{setTab('hot');loadAll();}} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab==='hot'?'bg-orange-700 text-white':'text-gray-400 hover:text-white'}`}>
          🔥 Hot Buyers <span className="ml-1 text-xs bg-orange-500/30 text-orange-300 px-1.5 py-0.5 rounded-full">{loadingAll?'...':hotBuyers.length}</span>
        </button>
        <button onClick={()=>{setTab('reviewed');loadAll();}} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab==='reviewed'?'bg-green-700 text-white':'text-gray-400 hover:text-white'}`}>
          Reviewed <span className="ml-1 text-xs bg-green-500/30 text-green-300 px-1.5 py-0.5 rounded-full">{loadingAll?'...':reviewed.length}</span>
        </button>
        <button onClick={()=>{setTab('review');loadAll();}} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab==='review'?'bg-orange-600 text-white':'text-gray-400 hover:text-white'}`}>
          Needs Profile <span className="ml-1 text-xs bg-orange-500/30 text-orange-300 px-1.5 py-0.5 rounded-full">{loadingAll?'...':needsReview.length}</span>
        </button>
        <button onClick={()=>{setTab('buybox_followup');loadAll();}} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab==='buybox_followup'?'bg-purple-700 text-white':'text-gray-400 hover:text-white'}`}>
          Buy Box Follow-Up <span className="ml-1 text-xs bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded-full">{loadingAll?'...':buyBoxQueueCounts.all}</span>
        </button>
        <button onClick={()=>{setTab('submissions');loadSubmissions();}} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab==='submissions'?'bg-purple-700 text-white':'text-gray-400 hover:text-white'}`}>
          📬 Submissions <span className="ml-1 text-xs bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded-full">{submissions.length}</span>
          Needs Profile <span className="ml-1 text-xs bg-orange-500/30 text-orange-300 px-1.5 py-0.5 rounded-full">{loadingAll?'...':needsReview.length}</span>
        </button>
      </div>
      {tab==='all' && (
        <div className="flex gap-3 mb-4">
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search buyers..." className="bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:border-blue-500" />
          <select value={tier} onChange={e=>{setTier(e.target.value);setPage(1);}} className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm">
            <option value="">All Tiers</option>
            <option value="VIP">VIP</option>
            <option value="TIER_1">Tier 1</option>
            <option value="TIER_2">Tier 2</option>
            <option value="TIER_3">Tier 3</option>
            <option value="TIER_4">Tier 4</option>
          </select>
          <button onClick={load} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm">Refresh</button>
        </div>
      )}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-300">
          Selected buyers: <span className="text-white font-semibold">{getBulkSelectedBuyers().length}</span>
          <span className="text-gray-500 ml-2">Eligible: {getBulkEligibleBuyers().length}</span>
          <span className="text-gray-500 ml-2">Skipped: {getBulkSkippedBuyers().length}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={selectVisibleNotSent} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs">Select Visible Not Sent</button>
          <button onClick={clearBulkSelection} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs">Clear</button>
        </div>
      </div>
      {error&&<div className="bg-red-900/30 border border-red-500/30 text-red-300 rounded-lg p-4 mb-4 text-sm">Error: {error}</div>}
      {tab==='all'&&(
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm"><TH />
            <tbody>
              {loading?[...Array(8)].map((_,i)=><tr key={i} className="border-b border-gray-800/50">{[...Array(10)].map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse"/></td>)}</tr>)
              :buyers.length===0?<tr><td colSpan={10} className="px-4 py-12 text-center text-gray-500">No buyers found.</td></tr>
              :buyers.map((b:any)=><BuyerRow key={b.id} b={b}/>)}
            </tbody>
          </table>
        </div>
      )}
      {tab==='hot'&&(
        <div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-4">
            <p className="text-orange-300 text-sm font-medium">🔥 {hotBuyers.length} hot buyers — VIP, Tier 1, and active temperature</p>
            <p className="text-gray-400 text-xs mt-1">Your best buyers. Send deals here first.</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm"><TH />
              <tbody>
                {loadingAll?[...Array(5)].map((_,i)=><tr key={i}>{[...Array(10)].map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse"/></td>)}</tr>)
                :hotBuyers.length===0?<tr><td colSpan={10} className="px-4 py-12 text-center text-gray-500">No hot buyers yet. Set temperatures and tiers on buyer profiles.</td></tr>
                :hotBuyers.map((b:any)=><BuyerRow key={b.id} b={b}/>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab==='review'&&(
        <div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-4">
            <p className="text-orange-300 text-sm font-medium">⚠️ {needsReview.length} buyers need profiles filled in</p>
            <p className="text-gray-400 text-xs mt-1">Ranked by score — fix most valuable buyers first.</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">{['Buyer','Score','Profile','Missing Info','Market',''].map(h=><th key={h} className="text-left text-gray-500 font-medium px-4 py-3 text-xs uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody>
                {loadingAll?[...Array(5)].map((_,i)=><tr key={i}>{[...Array(6)].map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse"/></td>)}</tr>)
                :needsReview.length===0?<tr><td colSpan={6} className="px-4 py-12 text-center text-green-400">✅ All profiles complete!</td></tr>
                :needsReview.map((b:any)=><ProfileRow key={b.id} b={b}/>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab==='buybox_followup'&&(
        <div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-4">
            <p className="text-purple-300 text-sm font-medium">📋 Buy Box Completion Queue</p>
            <p className="text-gray-400 text-xs mt-1">Track who needs a form, reminder, call, or submission review.</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {[
              ['all','All'],
              ['not_sent','Not Sent'],
              ['sent','Sent'],
              ['opened','Opened'],
              ['started','Started'],
              ['submitted','Submitted'],
              ['needs_review','Needs Review'],
            ].map(([key,label]) => (
              <button
                key={key}
                onClick={()=>setBuyBoxQueueFilter(key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${buyBoxQueueFilter===key ? 'bg-purple-700 border-purple-600 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'}`}
              >
                {label} <span className="ml-1 text-[10px] opacity-70">{(buyBoxQueueCounts as any)[key]}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="rounded-xl border border-green-800/40 bg-green-900/10 p-3">
              <div className="text-xs text-green-400">Send Buy Box Forms</div>
              <div className="text-2xl font-bold text-green-300">{buyBoxQueueCounts.not_sent}</div>
            </div>
            <div className="rounded-xl border border-blue-800/40 bg-blue-900/10 p-3">
              <div className="text-xs text-blue-400">Opened / Started</div>
              <div className="text-2xl font-bold text-blue-300">{buyBoxQueueCounts.opened + buyBoxQueueCounts.started}</div>
            </div>
            <div className="rounded-xl border border-purple-800/40 bg-purple-900/10 p-3">
              <div className="text-xs text-purple-400">Submitted</div>
              <div className="text-2xl font-bold text-purple-300">{buyBoxQueueCounts.submitted}</div>
            </div>
            <div className="rounded-xl border border-yellow-800/40 bg-yellow-900/10 p-3">
              <div className="text-xs text-yellow-400">Needs Review</div>
              <div className="text-2xl font-bold text-yellow-300">{buyBoxQueueCounts.needs_review}</div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Buyer','Next Action','Status','Last Activity','Market',''].map(h=>(
                    <th key={h} className="text-left text-gray-500 font-medium px-4 py-3 text-xs uppercase tracking-wide">
                      {h === 'Buyer' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={buyBoxFollowUpBuyers.length > 0 && buyBoxFollowUpBuyers.every((b:any)=>!!bulkSelected[b.id])}
                            onChange={e=>{
                              const next = {...bulkSelected};
                              buyBoxFollowUpBuyers.forEach((b:any)=>{ next[b.id] = e.target.checked; });
                              setBulkSelected(next);
                            }}
                            className="accent-purple-600"
                          />
                          <span>Buyer</span>
                        </div>
                      ) : h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingAll ? [...Array(6)].map((_,i)=><tr key={i}>{[...Array(6)].map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse"/></td>)}</tr>)
                : buyBoxFollowUpBuyers.length===0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No buyers in this queue.</td></tr>
                : buyBoxFollowUpBuyers.map((b:any)=><BuyBoxFollowUpRow key={b.id} b={b}/>)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='submissions'&&!selectedSub&&(
        <div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="text-purple-300 text-sm font-medium">📬 {submissions.length} pending buy box submissions</p>
              <p className="text-gray-400 text-xs mt-1">Click Review to see full details and approve field by field.</p>
            </div>
            <button onClick={loadSubmissions} className="text-gray-500 text-xs hover:text-gray-300 transition">↺ Refresh</button>
          </div>
          {loadingSubs ? <div className="text-gray-500 text-sm p-8 text-center">Loading...</div>
          : submissions.length === 0 ? <div className="text-gray-500 text-sm p-8 text-center">No pending submissions</div>
          : <div className="divide-y divide-gray-800 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {submissions.map((sub:any) => {
              const b = sub.buyer;
              const isSelected = selectedSub?.id === sub.id;
              const statusColor = sub.status === 'SUBMITTED' ? 'text-green-400' : sub.status === 'IN_PROGRESS' ? 'text-yellow-400' : 'text-gray-400';
              const statusLabel = sub.status === 'SUBMITTED' ? '✅ Submitted' : sub.status === 'IN_PROGRESS' ? '🟡 In Progress' : sub.status;
              const fieldCount = Object.keys(sub.submittedData || {}).filter((k:string) => !k.startsWith('_') && (sub.submittedData as any)[k]).length;
              return (
                <div key={sub.id}>
                  <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-800/40 transition">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center text-purple-300 text-sm font-bold">{b?.firstName?.[0]||'?'}</div>
                      <div>
                        <p className="text-white text-sm font-medium">{b?.firstName} {b?.lastName} <span className="text-gray-500 text-xs ml-1">{b?.phone}</span></p>
                        <p className="text-gray-500 text-xs">{new Date(sub.createdAt).toLocaleDateString()} at {new Date(sub.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} · {fieldCount} fields · <span className={statusColor}>{statusLabel}</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>window.location.href=`/dashboard/buyers/${b?.id}`} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition">Profile</button>
                      <button onClick={()=>rejectSubmission(sub.id)} className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/60 text-red-400 text-xs rounded-lg transition">Reject</button>
                      <button onClick={()=>{ setSelectedSub(sub); setFieldDecisions({}); }} className={`px-3 py-1.5 text-xs rounded-lg transition font-medium ${isSelected ? 'bg-gray-700 text-white' : 'bg-purple-700 hover:bg-purple-600 text-white'}`}>
                        {isSelected ? '▲ Close' : '▼ Review'}
                      </button>
                    </div>
                  </div>
                  {isSelected && (() => {
                    const d = sub.submittedData;
                    const bb = b?.buyBox || {};
                    const fields = [
                      { key:'firstName', label:'First Name', submitted: d.firstName, current: b?.firstName },
                      { key:'lastName', label:'Last Name', submitted: d.lastName, current: b?.lastName },
                      { key:'phone', label:'Phone', submitted: d.phone, current: b?.phone },
                      { key:'email', label:'Email', submitted: d.email, current: b?.email },
                      { key:'marketPrimary', label:'Primary Market', submitted: d.marketPrimary, current: b?.marketPrimary },
                      { key:'marketSecondary', label:'Other Markets', submitted: d.marketSecondary, current: (b?.marketSecondary||[]).join(', ') },
                      { key:'states', label:'States', submitted: d.states, current: (bb.states||[]).join(', ') },
                      { key:'zipCodes', label:'Zip Codes', submitted: d.zipCodes, current: (bb.zipCodes||[]).join(', ') },
                      { key:'anyZipOk', label:'Any Zip OK', submitted: d.anyZipOk ? 'Yes' : null, current: bb.anyZipOk ? 'Yes' : null },
                      { key:'strategies', label:'Strategy', submitted: (d.strategies||[]).join(', '), current: (b?.preferredStrategies||[]).join(', ') },
                      { key:'rehabTolerance', label:'Rehab Tolerance', submitted: d.rehabTolerance?.replace(/_/g,' '), current: bb.rehabTolerance?.replace(/_/g,' ') },
                      { key:'propertyTypes', label:'Property Types', submitted: (d.propertyTypes||[]).join(', '), current: (bb.propertyTypes||[]).join(', ') },
                      { key:'price', label:'Price Range', submitted: d.anyPrice ? 'Any' : (d.minPrice||d.maxPrice) ? `$${d.minPrice||0}–$${d.maxPrice||'∞'}` : null, current: bb.anyPrice ? 'Any' : (bb.minPrice||bb.maxPrice) ? `$${bb.minPrice||0}–$${bb.maxPrice||'∞'}` : null },
                      { key:'minArv', label:'Min ARV', submitted: d.minArv ? `$${d.minArv}` : null, current: bb.minArv ? `$${bb.minArv}` : null },
                      { key:'minProfit', label:'Min Profit', submitted: d.minProfit ? `$${d.minProfit}` : null, current: bb.minProfit ? `$${bb.minProfit}` : null },
                      { key:'fundingTypes', label:'Funding', submitted: (d.fundingTypes||[]).join(', '), current: b?.notes },
                      { key:'closeSpeed', label:'Close Speed', submitted: d.closeSpeed ? `${d.closeSpeed} days` : null, current: b?.avgCloseSpeedDays ? `${b.avgCloseSpeedDays} days` : null },
                      { key:'maxEmd', label:'Max EMD', submitted: d.maxEmd ? `$${d.maxEmd}` : null, current: bb.maxEmd ? `$${bb.maxEmd}` : null },
                      { key:'inspectionDays', label:'Inspection Days', submitted: d.inspectionDays, current: bb.inspectionDays },
                      { key:'buyingStatus', label:'Buying Status', submitted: d.buyingStatus?.replace(/_/g,' '), current: null },
                      { key:'monthlyCapacity', label:'Monthly Capacity', submitted: d.monthlyCapacity, current: null },
                      { key:'occupancy', label:'Occupancy', submitted: d.occupancy, current: null },
                      { key:'hoaOk', label:'HOA OK', submitted: d.hoaOk, current: null },
                      { key:'hardNoCriteria', label:'Hard No Criteria', submitted: d.hardNoCriteria, current: bb.hardNoCriteria },
                      { key:'excludedAreas', label:'Excluded Areas', submitted: d.excludedAreas, current: bb.excludedAreas },
                      { key:'preferredContact', label:'Contact Preference', submitted: d.preferredContact, current: null },
                      { key:'dealSendFreq', label:'Deal Frequency', submitted: d.dealSendFreq, current: null },
                      { key:'freeformNotes', label:'Buyer Notes', submitted: d.freeformNotes, current: null },
                    ].filter((fi:any) => fi.submitted && fi.submitted.toString().trim());

                    const decisions = fieldDecisions;
                    const setDecision = (key: string, val: string) => setFieldDecisions((prev:any) => ({...prev, [key]: val}));

                    const handleSave = () => {
                      const approved = {...d};
                      fields.forEach((fi:any) => { if (decisions[fi.key] === 'keep') { delete approved[fi.key]; } });
                      approveSubmission({...sub, submittedData: approved});
                      setSelectedSub(null);
                      setFieldDecisions({});
                    };

                    return (
                      <div className="border-t border-gray-800 bg-gray-950 px-4 py-4">
                        <div className="grid grid-cols-3 gap-1 text-xs font-medium text-gray-500 mb-2 px-2">
                          <span>Field</span><span>Current</span><span>New Submission</span>
                        </div>
                        <div className="space-y-1 mb-4">
                          {fields.map((fi:any) => {
                            const hasConflict = fi.current && fi.current.toString().trim() && fi.current !== fi.submitted;
                            const isNew = !fi.current || !fi.current.toString().trim();
                            const dec = decisions[fi.key] || (isNew ? 'use_new' : hasConflict ? 'use_new' : 'use_new');
                            return (
                              <div key={fi.key} className={`grid grid-cols-3 gap-2 items-center px-2 py-2 rounded-lg text-xs ${hasConflict ? 'bg-yellow-500/5 border border-yellow-500/10' : 'bg-gray-900/50'}`}>
                                <span className="text-gray-400 font-medium">{fi.label}</span>
                                <div className="flex items-center gap-1">
                                  {fi.current ? <span className={`px-2 py-1 rounded text-xs ${dec==='keep' ? 'bg-blue-600/30 text-blue-300 ring-1 ring-blue-500' : 'bg-gray-800 text-gray-400'}`}>{fi.current}</span> : <span className="text-gray-600 text-xs italic">empty</span>}
                                  {hasConflict && <button onClick={()=>setDecision(fi.key,'keep')} className={`px-1.5 py-0.5 rounded text-xs transition ${dec==='keep'?'bg-blue-600 text-white':'bg-gray-800 text-gray-500 hover:text-blue-400'}`}>Keep</button>}
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={`px-2 py-1 rounded text-xs ${dec==='use_new'||isNew ? 'bg-green-600/30 text-green-300 ring-1 ring-green-500' : 'bg-gray-800 text-gray-400 line-through'}`}>{fi.submitted}</span>
                                  {hasConflict && <button onClick={()=>setDecision(fi.key,'use_new')} className={`px-1.5 py-0.5 rounded text-xs transition ${dec==='use_new'?'bg-green-600 text-white':'bg-gray-800 text-gray-500 hover:text-green-400'}`}>Use</button>}
                                  {isNew && <span className="text-green-500 text-xs">✓ New</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={()=>{setSelectedSub(null);setFieldDecisions({});}} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition">Cancel</button>
                          <button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg font-medium transition">✓ Save to Buy Box</button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>}
        </div>
      )}
            {tab==='reviewed'&&(
        <div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-4">
            <p className="text-green-300 text-sm font-medium">✅ {reviewed.length} buyers reviewed</p>
            <p className="text-gray-400 text-xs mt-1">Click any buyer to update or move back to Needs Profile.</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm"><TH />
              <tbody>
                {loadingAll?[...Array(5)].map((_,i)=><tr key={i}>{[...Array(10)].map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse"/></td>)}</tr>)
                :reviewed.length===0?<tr><td colSpan={10} className="px-4 py-12 text-center text-gray-500">No reviewed buyers yet.</td></tr>
                :reviewed.map((b:any)=><BuyerRow key={b.id} b={b}/>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab==='all'&&total>100&&(
        <div className="flex items-center justify-between mt-4">
          <p className="text-gray-400 text-sm">Showing {(page-1)*100+1}–{Math.min(page*100,total)} of {total}</p>
          <div className="flex gap-2">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm disabled:opacity-40">← Prev</button>
            <span className="px-4 py-2 text-gray-400 text-sm">Page {page} of {Math.ceil(total/100)}</span>
            <button onClick={()=>setPage(p=>p+1)} disabled={page>=Math.ceil(total/100)} className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
      {/* Confirm Queue SMS Action */}
      {queueConfirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl border border-purple-700/40 bg-gray-950 shadow-2xl overflow-hidden">
            <div className="border-b border-gray-800 bg-gradient-to-r from-purple-950/80 to-blue-950/40 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {queueConfirmAction.type === 'send'
                      ? 'Send Buy Box Form?'
                      : `Send Reminder #${queueConfirmAction.reminderNumber}?`}
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    This will send an SMS to the buyer through DispoAI.
                  </p>
                </div>
                <button
                  onClick={()=>setQueueConfirmAction(null)}
                  className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">Buyer</div>
                <div className="text-sm font-semibold text-white">{bname(queueConfirmAction.buyer)}</div>
                <div className="text-xs text-gray-500 mt-1">{queueConfirmAction.buyer?.phone || 'No phone number'}</div>
              </div>

              <div className="rounded-xl border border-blue-800/40 bg-blue-950/20 p-4">
                <div className="text-sm font-medium text-blue-200">Action</div>
                <p className="mt-1 text-xs text-blue-200/70">
                  {queueConfirmAction.type === 'send'
                    ? 'Send this buyer their unique Buy Box form link.'
                    : `Send Buy Box reminder #${queueConfirmAction.reminderNumber}. After reminder #3, the queue switches to Call Buyer.`}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-800 bg-gray-950 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={()=>setQueueConfirmAction(null)}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={async ()=>{
                  const action = queueConfirmAction;
                  setQueueConfirmAction(null);
                  if (action.type === 'send') await sendBuyBoxFromQueue(action.buyer);
                  if (action.type === 'reminder') await sendReminderFromQueue(action.buyer);
                }}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queue Action Notice */}
      {queueActionNotice && (
        <div className="fixed bottom-5 right-5 z-50 w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl overflow-hidden">
          <div className={`px-4 py-3 border-b border-gray-800 ${
            queueActionNotice.type === 'success' ? 'bg-green-950/40' :
            queueActionNotice.type === 'error' ? 'bg-red-950/40' :
            'bg-yellow-950/40'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={`text-sm font-semibold ${
                  queueActionNotice.type === 'success' ? 'text-green-300' :
                  queueActionNotice.type === 'error' ? 'text-red-300' :
                  'text-yellow-300'
                }`}>
                  {queueActionNotice.title}
                </div>
                <div className="mt-1 text-xs text-gray-400">{queueActionNotice.message}</div>
              </div>
              <button
                onClick={()=>setQueueActionNotice(null)}
                className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-800 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {showMixedBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
          <div className="w-full max-w-xl rounded-2xl border border-purple-700/40 bg-gray-950 shadow-2xl overflow-hidden">
            <div className="border-b border-gray-800 bg-gradient-to-r from-purple-950/80 to-blue-950/40 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Mixed Bulk Actions Detected</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    You selected buyers that need different actions. To protect outreach quality, DispoAI only runs one bulk action at a time.
                  </p>
                </div>
                <button
                  onClick={()=>setShowMixedBulkModal(false)}
                  className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-3">Selected action groups</div>
                <div className="space-y-2">
                  {getSelectedBuyBoxQueueBulkBreakdown().map((group: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                      <div>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${group.tone}`}>
                          {group.label}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-white">{group.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-blue-800/40 bg-blue-950/20 p-4">
                <div className="text-sm font-medium text-blue-200">Recommended workflow</div>
                <p className="mt-1 text-xs text-blue-200/70">
                  Pick one group below, then run the bulk campaign. Example: send all Buy Box forms first, then send Reminder #1 as a separate campaign.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {getSelectedBuyBoxQueueBulkBreakdown().map((group: any, i: number) => (
                  <button
                    key={i}
                    onClick={()=>jumpToBuyBoxQueueFilter(group.filter)}
                    className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-left text-xs text-gray-300 hover:border-purple-600 hover:bg-purple-950/30 hover:text-white transition"
                  >
                    Filter to: <span className="font-semibold">{group.label}</span>
                    <div className="mt-0.5 text-[10px] text-gray-500">{group.count} selected buyer{group.count === 1 ? '' : 's'}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-800 bg-gray-950 px-6 py-4 flex items-center justify-between gap-3">
              <button
                onClick={()=>{ setBulkSelected({}); setShowMixedBulkModal(false); }}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
              >
                Clear Selection
              </button>
              <button
                onClick={()=>setShowMixedBulkModal(false)}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkBuyBoxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
          <div className="w-full max-w-3xl max-h-[88vh] overflow-hidden rounded-2xl border border-purple-700/40 bg-gray-950 shadow-2xl flex flex-col">
            <div className="shrink-0 border-b border-gray-800 bg-gradient-to-r from-purple-950/80 to-blue-950/50 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{getSelectedBuyBoxQueueBulkAction().label || "Send Buy Box Forms in Bulk"}</h3>
                  <p className="text-sm text-gray-400 mt-1">Backend drip delivery: 5 texts per minute. Each buyer gets their own unique Buy Box link.</p>
                </div>
                <button
                  onClick={()=>setShowBulkBuyBoxModal(false)}
                  disabled={bulkSending}
                  className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 px-6 py-5">
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-3"><div className="text-xs text-gray-500">Selected</div><div className="text-2xl font-bold text-white">{getBulkSelectedBuyers().length}</div></div>
                <div className="rounded-xl border border-green-800/40 bg-green-900/10 p-3"><div className="text-xs text-green-400">Eligible</div><div className="text-2xl font-bold text-green-300">{getBulkEligibleBuyers().length}</div></div>
                <div className="rounded-xl border border-yellow-800/40 bg-yellow-900/10 p-3"><div className="text-xs text-yellow-400">Skipped</div><div className="text-2xl font-bold text-yellow-300">{getBulkSkippedBuyers().length}</div></div>
                <div className="rounded-xl border border-blue-800/40 bg-blue-900/10 p-3"><div className="text-xs text-blue-400">Est. Time</div><div className="text-2xl font-bold text-blue-300">~{Math.max(1, Math.ceil(getBulkEligibleBuyers().length / 5))}m</div></div>
              </div>

              {getBulkSkippedBuyers().length > 0 && (
                <div className="rounded-xl border border-yellow-800/40 bg-yellow-900/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-yellow-200">Skipped Buyer Reasons</div>
                      <div className="text-xs text-yellow-300/70">
                        {getBulkSkippedBuyers().length} selected buyer{getBulkSkippedBuyers().length===1?'':'s'} will not receive this send.
                      </div>
                    </div>
                    <button
                      onClick={()=>setShowAllSkippedReasons(v=>!v)}
                      className="rounded-lg bg-yellow-900/30 px-3 py-1.5 text-xs text-yellow-200 hover:bg-yellow-800/50"
                    >
                      {showAllSkippedReasons ? 'Hide details' : `View ${getBulkSkippedBuyers().length} skipped`}
                    </button>
                  </div>

                  {showAllSkippedReasons && (
                    <div className="mt-3 max-h-40 overflow-y-auto space-y-1">
                      {getBulkSkippedBuyers().map((b:any)=>(
                        <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-950/50 px-3 py-2 text-xs">
                          <span className="truncate text-gray-200">{bname(b)}</span>
                          <span className="shrink-0 text-yellow-300">{getBulkSkipReason(b)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">Campaign Name</label>
                <input
                  value={bulkCampaignName}
                  onChange={e=>setBulkCampaignName(e.target.value)}
                  placeholder="Ex: May Buyer Reactivation, VIP Buy Box Cleanup"
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                />
                <p className="mt-2 text-xs text-gray-500">This name appears in campaign history and reporting.</p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">Template Context</label>
                <select value={bulkTemplate} onChange={e=>{ setBulkTemplate(e.target.value); setCurrentBulkMessage(getBulkDefaultTemplateText(e.target.value)); }} className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-white">
                  <option value="general">General Buyer Intake</option>
                  <option value="new_number">Sending From New Number</option>
                  <option value="long_time">Haven’t Spoken in a While</option>
                  <option value="cold_data">Cold Buyer Data</option>
                  <option value="vip">VIP / Done Deals Before</option>
                
                  <option value="reminder_1">Reminder #1</option>
                  <option value="reminder_2">Reminder #2</option>
                  <option value="reminder_3">Reminder #3</option></select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">Message</label>
                <textarea
                  value={currentBulkMessage}
                  onChange={e=>setCurrentBulkMessage(e.target.value)}
                  placeholder="Write the SMS message here. Use {{link}} where the buyer's unique Buy Box link should go."
                  className="min-h-[130px] w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                />
                <p className="mt-2 text-xs text-gray-500">Use {'{{link}}'} where the buyer's unique Buy Box link should go. If you forget it, DispoAI will append the link automatically.</p>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={bulkIncludeAlreadySent} onChange={e=>setBulkIncludeAlreadySent(e.target.checked)} className="accent-purple-600" />
                Include buyers who were already sent the Buy Box form
              </label>

              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Preview</div>
                <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4 text-sm leading-relaxed text-gray-200">{getBulkTemplatePreview()}</div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-white">Campaigns</div>
                  <div className="text-xs text-gray-500">View campaign stats, delivery results, pause/resume controls, and recipient details.</div>
                </div>
                <button
                  onClick={()=>window.location.href='/dashboard/campaigns'}
                  className="shrink-0 rounded-lg bg-purple-900/40 px-3 py-1.5 text-xs text-purple-200 hover:bg-purple-800/60"
                >
                  View Campaigns →
                </button>
              </div>

              <div className="rounded-xl border border-yellow-700/30 bg-yellow-900/10 p-4 text-xs text-yellow-200">
                This will send real SMS messages from the backend. Delivery is dripped at 5 texts per minute.
              </div>

              {bulkResult && (
                <div className="rounded-xl border border-green-800/40 bg-green-900/10 p-4 text-sm text-green-200">
                  Your campaign has been queued. Batch: {bulkResult.batchId} · Recipients: {bulkResult.queued} texts · Skipped: {bulkResult.skipped} · Estimated time: ~{bulkResult.estimatedMinutes}m
                </div>
              )}

              {bulkResult?.skippedDetails?.length > 0 && (
                <div className="rounded-xl border border-yellow-800/40 bg-yellow-900/10 p-4">
                  <div className="mb-2 text-sm font-medium text-yellow-200">Backend Skipped Details</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {bulkResult.skippedDetails.map((s:any, i:number)=>(
                      <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-gray-950/50 px-3 py-2 text-xs">
                        <span className="text-gray-300">{s.buyerId}</span>
                        <span className="text-yellow-300">{String(s.reason || '').replace(/_/g,' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 flex items-center justify-between gap-3 border-t border-gray-800 bg-gray-950 px-6 py-4">
              <div className="text-xs text-gray-500">Rate: 5 texts/minute · backend drip · 1 SMS every 12 seconds</div>
              <div className="flex gap-3">
                <button onClick={()=>setShowBulkBuyBoxModal(false)} disabled={bulkSending} className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50">Close</button>
                <div className="rounded-xl border border-purple-800/40 bg-purple-950/20 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="text-sm font-medium text-purple-200">Campaign Sending Rules</div>
                      <div className="text-xs text-purple-200/60">Pulled from Settings → Buy Box Sending Rules</div>
                    </div>
                    <button
                      onClick={loadBuyBoxSendingRules}
                      className="text-xs text-purple-300 hover:text-white"
                    >
                      ↺ Refresh
                    </button>
                  </div>

                  {loadingBuyBoxSendingRules ? (
                    <div className="text-xs text-gray-500">Loading sending rules...</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
                        <div className="text-gray-500 mb-1">Days</div>
                        <div className="font-semibold text-white">{formatSendingDays(getFinalBulkSendingRules().daysOfWeek)}</div>
                      </div>
                      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
                        <div className="text-gray-500 mb-1">Send Window</div>
                        <div className="font-semibold text-white">
                          {formatHourLabel(getFinalBulkSendingRules().startHour)} – {formatHourLabel(getFinalBulkSendingRules().endHour)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-3">
                        <div className="text-gray-500 mb-1">Drip Rate</div>
                        <div className="font-semibold text-white">{getFinalBulkSendingRules().maxPerMinute || 5}/min</div>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 rounded-lg border border-blue-800/40 bg-blue-950/20 p-3 text-xs text-blue-200/75">
                    Remaining texts pause at the end of the window and resume in the next valid sending window.
                  </div>
                </div>

                <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4">
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div>
                      <div className="text-sm font-medium text-white">Customize for this campaign</div>
                      <div className="text-xs text-gray-500">Leave off to use the default rules from Settings.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={bulkUseCustomSendingRules}
                      onChange={e => {
                        setBulkUseCustomSendingRules(e.target.checked);
                        if (e.target.checked) setBulkSendingRulesDraft(buyBoxSendingRules);
                      }}
                      className="h-4 w-4"
                    />
                  </label>

                  {bulkUseCustomSendingRules && (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <label className="space-y-1">
                          <span className="text-xs text-gray-500">Start</span>
                          <select
                            value={bulkSendingRulesDraft.startHour}
                            onChange={e => setBulkSendingRulesDraft((s: any) => ({ ...s, startHour: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white"
                          >
                            {Array.from({ length: 24 }).map((_, hour) => (
                              <option key={hour} value={hour}>{formatHourLabel(hour)}</option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-1">
                          <span className="text-xs text-gray-500">End</span>
                          <select
                            value={bulkSendingRulesDraft.endHour}
                            onChange={e => setBulkSendingRulesDraft((s: any) => ({ ...s, endHour: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white"
                          >
                            {Array.from({ length: 24 }).map((_, hour) => (
                              <option key={hour} value={hour}>{formatHourLabel(hour)}</option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-1">
                          <span className="text-xs text-gray-500">Texts/min</span>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={bulkSendingRulesDraft.maxPerMinute}
                            onChange={e => setBulkSendingRulesDraft((s: any) => ({ ...s, maxPerMinute: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white"
                          />
                        </label>
                      </div>

                      <div>
                        <div className="mb-2 text-xs text-gray-500">Days</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(dayLabels).map(([day, label]) => {
                            const dayNumber = Number(day);
                            const active = (bulkSendingRulesDraft.daysOfWeek || []).map(Number).includes(dayNumber);
                            return (
                              <button
                                type="button"
                                key={day}
                                onClick={() => toggleBulkOverrideDay(dayNumber)}
                                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                                  active
                                    ? 'border-purple-600 bg-purple-700 text-white'
                                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:text-white'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-lg border border-purple-800/40 bg-purple-950/20 p-3 text-xs text-purple-200/80">
                        This campaign will use: {formatSendingDays(bulkSendingRulesDraft.daysOfWeek)} · {formatHourLabel(bulkSendingRulesDraft.startHour)}–{formatHourLabel(bulkSendingRulesDraft.endHour)} · {bulkSendingRulesDraft.maxPerMinute}/min
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={runBackendBulkBuyBoxSend} disabled={bulkSending || !!bulkResult || getBulkEligibleBuyers().length===0} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50">
                  {bulkSending ? 'Queuing drip...' : bulkResult ? 'Campaign Queued' : getBulkEligibleBuyers().length===0 ? 'No Eligible Buyers' : `Confirm Send to ${getBulkEligibleBuyers().length}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreate && <CreateBuyerModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); loadAll(); }} />}
      {selectedSub && (
        <SubmissionReviewModal
          sub={selectedSub}
          onClose={()=>setSelectedSub(null)}
          onSave={async (fields:any)=>{
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
            const buyerId = selectedSub.buyerId || selectedSub.buyer?.id;
            if (!buyerId) { alert('No buyer ID'); return; }
            try {
              const bf = fields.buyerFields || {};
              const bb = fields.buyBoxFields || {};
              let existing: any = {};
              try { if (selectedSub.buyer?.temperatureNotes) existing = JSON.parse(selectedSub.buyer.temperatureNotes); } catch {}
              const statusData = { ...existing,
                buyingStatus: bf.buyingStatus||existing.buyingStatus||null,
                monthlyCapacity: bf.monthlyCapacity||existing.monthlyCapacity||null,
                occupancy: bb.occupancy||existing.occupancy||null,
                hoaOk: bb.hoaOk||existing.hoaOk||null,
                minArv: bb.minArv||existing.minArv||null,
                minProfit: bb.minProfit||existing.minProfit||null,
                hardNoCriteria: bb.hardNoCriteria||existing.hardNoCriteria||null,
                preferredContact: bf.preferredContact||existing.preferredContact||null,
                dealSendFreq: bf.dealSendFreq||existing.dealSendFreq||null,
                excludedAreas: bb.excludedAreas||existing.excludedAreas||null,
                privateNotes: bf.privateNotes!==undefined?bf.privateNotes:(existing.privateNotes||null),
                propertyTypes: bb.propertyTypes?.length ? bb.propertyTypes.join(', ') : (existing.propertyTypes||null),
                minYearBuilt: bb.minYearBuilt||existing.minYearBuilt||null,
              };
              await fetch(`${API}/buyers/${buyerId}`, { method:'PUT', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ marketPrimary:bf.marketPrimary||null, marketSecondary:bf.marketSecondary||[], preferredStrategies:bf.preferredStrategies||[], notes:bf.notes||null, avgCloseSpeedDays:bf.avgCloseSpeedDays||null, proofOfFunds:bf.proofOfFunds||null, temperatureNotes:JSON.stringify(statusData) }) });
              await fetch(`${API}/buyers/${buyerId}/buy-box`, { method:'PUT', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ states:bb.states||[], zipCodes:bb.zipCodes||[], anyZipOk:!!bb.anyZipOk, anyPrice:!!bb.anyPrice, minPrice:bb.minPrice||null, maxPrice:bb.maxPrice||null, rehabTolerance:bb.rehabTolerance||null, minBeds:bb.minBeds||null, propertyTypes:bb.propertyTypes||[], minArv:bb.minArv||null, minProfit:bb.minProfit||null, hardNoCriteria:bb.hardNoCriteria||null, excludedAreas:bb.excludedAreas||null, occupancy:bb.occupancy||null, hoaOk:bb.hoaOk||null, minYearBuilt:bb.minYearBuilt||null }) });
              await fetch(`${API}/intake/submissions/${selectedSub.id}/approve`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({buyerFields:{},buyBoxFields:{}}) }).catch(()=>{});
              setSelectedSub(null); loadSubmissions();
              window.location.href = `/dashboard/buyers/${buyerId}`;
            } catch(e:any) { alert('Save failed: '+e.message); }
          }}
        />
      )}

      <ConfirmActionModal
        open={showBulkSendConfirm}
        title="Send Buy Box Campaign?"
        description="This will send real SMS messages from the backend using the selected message and each buyer's unique Buy Box link."
        confirmLabel="Send Campaign"
        cancelLabel="Cancel"
        variant="normal"
        loading={bulkSending}
        onCancel={() => {
          if (!bulkSending) setShowBulkSendConfirm(false);
        }}
        onConfirm={executeBackendBulkBuyBoxSend}
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">Campaign</div>
            <div className="mt-1 text-sm font-medium text-white">
              {bulkCampaignName || 'Buy Box Send'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-green-800/40 bg-green-900/10 p-3">
              <div className="text-xs text-green-400">Eligible Recipients</div>
              <div className="text-2xl font-bold text-green-300">{getBulkEligibleBuyers().length}</div>
            </div>
            <div className="rounded-xl border border-blue-800/40 bg-blue-900/10 p-3">
              <div className="text-xs text-blue-400">Estimated Time</div>
              <div className="text-2xl font-bold text-blue-300">~{Math.max(1, Math.ceil(getBulkEligibleBuyers().length / 5))}m</div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">Delivery</div>
            <div className="mt-1 text-sm text-gray-300">5 texts per minute · 1 SMS every 12 seconds</div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">Message Preview</div>
            <div className="mt-2 text-sm leading-relaxed text-gray-200">{getBulkTemplatePreview()}</div>
          </div>
        </div>
      </ConfirmActionModal>

    </div>
  );
}
