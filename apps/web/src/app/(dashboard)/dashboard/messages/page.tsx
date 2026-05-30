'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function bname(b: any) {
  if (!b) return 'Unknown';
  if (!b.firstName || b.firstName === 'Unknown') return b.phone || 'Unknown';
  if (b.lastName === 'Buyer') return b.firstName;
  return `${b.firstName} ${b.lastName}`.trim();
}

function timeAgo(d: string) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function smsDeliveryLabel(m: any) {
  const status = String(m?.deliveryStatus || m?.status || '').toUpperCase();

  if (status === 'DELIVERED') return 'Delivered';
  if (status === 'UNDELIVERED') return 'Undelivered';
  if (status === 'FAILED') return 'Failed';
  if (status === 'SENT') return 'Sent';
  if (status === 'PENDING') return 'Pending';

  return status || 'Sent';
}

function smsDeliveryClasses(m: any) {
  const status = String(m?.deliveryStatus || m?.status || '').toUpperCase();

  if (status === 'DELIVERED') return 'text-green-400';
  if (status === 'UNDELIVERED') return 'text-red-400';
  if (status === 'FAILED') return 'text-red-400';
  if (status === 'SENT') return 'text-blue-400';
  if (status === 'PENDING') return 'text-yellow-400';

  return 'text-gray-600';
}

function smsDeliveryIcon(m: any) {
  const status = String(m?.deliveryStatus || m?.status || '').toUpperCase();

  if (status === 'DELIVERED') return '✓✓';
  if (status === 'UNDELIVERED') return '!';
  if (status === 'FAILED') return '!';
  if (status === 'SENT') return '✓';
  if (status === 'PENDING') return '…';

  return '✓';
}

function smsErrorLabel(m: any) {
  const code = String(m?.deliveryErrorCode || '').trim();
  const message = String(m?.deliveryErrorMessage || '').trim();

  const known: Record<string, string> = {
    '30034': 'Undelivered by Twilio/carrier',
    '30003': 'Unreachable handset',
    '30004': 'Message blocked',
    '30005': 'Unknown destination handset',
    '30006': 'Landline or unreachable carrier',
    '30007': 'Carrier filtering',
    '30008': 'Unknown delivery failure',
  };

  if (code && known[code]) return `${code} — ${known[code]}`;
  if (code) return code;
  if (message) return message;

  return '';
}

function conversationDeliveryBadge(c: any) {
  const last = c?.smsMessages?.[0];

  if (!last) {
    return { label: 'No SMS', classes: 'bg-gray-800 text-gray-500 border-gray-700', title: 'No SMS messages yet' };
  }

  if (last.direction === 'INBOUND') {
    return { label: 'Inbound Reply', classes: 'bg-blue-500/10 text-blue-300 border-blue-700/40', title: 'Last message was an inbound buyer reply' };
  }

  const status = String(last.deliveryStatus || last.status || '').toUpperCase();

  if (status === 'DELIVERED') {
    return { label: 'Delivered', classes: 'bg-green-500/10 text-green-300 border-green-700/40', title: 'Last outbound SMS was delivered' };
  }

  if (status === 'UNDELIVERED') {
    return { label: 'Undelivered', classes: 'bg-red-500/10 text-red-300 border-red-700/40', title: smsErrorLabel(last) || 'Last outbound SMS was undelivered' };
  }

  if (status === 'FAILED') {
    return { label: 'Failed', classes: 'bg-red-500/10 text-red-300 border-red-700/40', title: smsErrorLabel(last) || 'Last outbound SMS failed' };
  }

  if (status === 'SENT') {
    return { label: 'Sent', classes: 'bg-blue-500/10 text-blue-300 border-blue-700/40', title: 'Last outbound SMS was sent to Twilio' };
  }

  if (status === 'PENDING') {
    return { label: 'Pending', classes: 'bg-yellow-500/10 text-yellow-300 border-yellow-700/40', title: 'Waiting for Twilio delivery update' };
  }

  return { label: status || 'Outbound', classes: 'bg-gray-800 text-gray-400 border-gray-700', title: 'Last outbound SMS status' };
}

function getTemp(b: any) {
  try {
    const t = JSON.parse(b?.temperatureNotes || '{}');
    if (t.buyerTemperature === 'HOT') return { label: '🔥 Hot', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' };
    if (t.buyerTemperature === 'ACTIVE') return { label: '⚡ Active', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
    if (t.buyerTemperature === 'WARM') return { label: '🌤 Warm', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' };
    if (t.buyerTemperature === 'HIBERNATING') return { label: '💤 Paused', color: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/30' };
    if (t.buyerTemperature === 'COLD') return { label: '❄️ Cold', color: 'text-gray-600', bg: 'bg-gray-600/10 border-gray-600/30' };
  } catch {}
  return { label: '— Unknown', color: 'text-gray-600', bg: 'bg-gray-700/10 border-gray-700/30' };
}

function getTierBadge(tier: string) {
  if (tier === 'VIP') return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
  if (tier === 'TIER_1') return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
  if (tier === 'TIER_2') return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
  if (tier === 'TIER_3') return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
  return 'bg-gray-700/20 text-gray-500 border-gray-700/40';
}

function getTierLabel(tier: string) {
  if (tier === 'VIP') return '⭐ VIP';
  if (tier === 'TIER_1') return '🔥 T1';
  if (tier === 'TIER_2') return 'T2';
  if (tier === 'TIER_3') return 'T3';
  return 'T4';
}

const TEMPLATES = [
  { label: 'Actively buying?', text: 'Hey {firstName}! Are you actively looking for deals right now, or more on pause?' },
  { label: 'Markets?', text: 'What markets are you buying in right now? Any specific cities or zip codes?' },
  { label: 'Price range?', text: 'What price range are you working with? Any max purchase price?' },
  { label: 'Property types?', text: 'What property types are you focused on? SFH, multifamily, etc?' },
  { label: 'Heavy rehab OK?', text: 'Are you okay with heavy rehab — foundation, roof, full gut situations?' },
  { label: 'Tenants OK?', text: 'Are you okay with tenant-occupied properties, or do you prefer vacant?' },
  { label: 'POF request', text: 'Can you send over updated proof of funds? Helps us prioritize sending you deals first.' },
  { label: 'Close speed?', text: 'How fast can you typically close? Do you use cash, hard money, or creative financing?' },
  { label: 'Intake link', text: 'Hey {firstName}! Fill out your buy box here so we can match deals directly to you: {intakeLink}' },
];

const FILTERS = ['All', 'Unread', 'Needs Reply', 'Hot Buyers', 'Needs Review', 'POF Needed', 'Opted Out'];

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [buyer, setBuyer] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [aiDetected, setAiDetected] = useState<any>(null);
  const [rightTab, setRightTab] = useState<'intel'|'deals'|'notes'>('intel');
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const bottomRef = useRef<any>(null);

  useEffect(() => { loadConversations(); }, []);

  // Auto-open buyer from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const buyerParam = params.get('buyer');
    if (!buyerParam) return;
    const conv = conversations.find((c:any) => c.buyer.id === buyerParam);
    if (conv) {
      setSelected(conv);
    } else {
      fetch(`${API}/buyers/${buyerParam}`).then(r=>r.json()).then(b => {
        const placeholder = { id: null, buyer: { id: b.id, firstName: b.firstName, lastName: b.lastName, phone: b.phone, tier: b.tier }, lastMessageBody: null, lastMessageAt: null, unreadCount: 0 };
        setSelected(placeholder);
        setBuyer(b);
      }).catch(()=>{});
    }
  }, [conversations]);
  useEffect(() => { if (selected) { if (selected.id) loadMessages(selected.buyer.id); loadBuyer(selected.buyer.id); } }, [selected]);
  useEffect(() => {
    if (!selected?.id) return;
    const interval = setInterval(() => loadMessages(selected.buyer.id), 10000);
    return () => clearInterval(interval);
  }, [selected]);
  useEffect(() => {
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (buyer) { setNotes(buyer.buyerIntelNotes || ''); loadDeals(); } }, [buyer]);

  async function loadConversations() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/messages/conversations`);
      const d = await r.json();
      setConversations(Array.isArray(d) ? d : []);
    } catch {}
    finally { setLoading(false); }
  }

  async function loadBuyer(buyerId: string) {
    try {
      const r = await fetch(`${API}/buyers/${buyerId}`);
      setBuyer(await r.json());
    } catch {}
  }

  async function loadMessages(buyerId: string) {
    setLoadingMsgs(true);
    setAiDetected(null);
    try {
      const r = await fetch(`${API}/messages/conversations/${buyerId}`);
      const d = await r.json();
      setMessages(d?.smsMessages || []);
      setConversations(prev => prev.map(c => c.buyer.id === buyerId ? { ...c, unreadCount: 0 } : c));
    } catch {}
    finally { setLoadingMsgs(false); }
  }

  async function loadDeals() {
    try {
      const r = await fetch(`${API}/deals?page=1&limit=20`);
      const d = await r.json();
      setDeals(d.data || []);
    } catch {}
  }

  async function sendMessage(text?: string) {
    const body = (text || input).trim();
    if (!body || !selected || sending) return;
    setSending(true);
    setInput('');
    setShowTemplates(false);
    try {
      const r = await fetch(`${API}/messages/conversations/${selected.buyer.id}/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: body }),
      });
      const msg = await r.json();
      setMessages(prev => [...prev, msg]);
      setConversations(prev => prev.map(c =>
        c.buyer.id === selected.buyer.id ? { ...c, lastMessageBody: body, lastMessageAt: new Date().toISOString() } : c
      ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()));
    } catch (e: any) { alert('Send failed: ' + e.message); setInput(body); }
    finally { setSending(false); }
  }

  async function generateAiDraft() {
    if (!buyer || generatingDraft) return;
    setGeneratingDraft(true);
    try {
      const lastMsgs = messages.slice(-5).map(m => `${m.direction === 'INBOUND' ? 'Buyer' : 'You'}: ${m.body}`).join('\n');
      const prompt = `You are a real estate wholesaler texting a buyer. Draft a short, natural SMS reply (under 160 chars).

Buyer: ${bname(buyer)}
Market: ${buyer.marketPrimary || 'unknown'}
Strategy: ${(buyer.preferredStrategies || []).join(', ') || 'unknown'}
Missing info: ${getMissingFields(buyer).join(', ') || 'none'}

Recent conversation:
${lastMsgs}

Write ONLY the SMS text, nothing else. Be conversational and brief.`;

      const res = await fetch('/api/anthropic', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens: 200 }),
      });
      const d = await res.json();
      setAiDraft(d.content?.[0]?.text || '');
    } catch {}
    finally { setGeneratingDraft(false); }
  }

  async function detectBuyBoxFromMessage(msg: string) {
    if (!msg || msg.length < 20) return;
    try {
      const prompt = `Extract real estate buy box info from this SMS message. Respond ONLY with JSON or null if no buy box info found.

Message: "${msg}"

JSON format: {"market":"city name or null","maxPrice":number or null,"minPrice":number or null,"rehabTolerance":"COSMETIC_ONLY|LIGHT|MEDIUM|HEAVY|FULL_GUT or null","tenantsOk":boolean or null,"strategies":["array"] or null,"fundingType":"string or null"}`;

      const res = await fetch('/api/anthropic', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens: 300 }),
      });
      const d = await res.json();
      const text = d.content?.[0]?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      if (clean === 'null' || !clean.startsWith('{')) return;
      const parsed = JSON.parse(clean);
      const hasData = Object.values(parsed).some(v => v !== null);
      if (hasData) setAiDetected(parsed);
    } catch {}
  }

  async function approveDetected() {
    if (!aiDetected || !buyer) return;
    try {
      const bb: any = {};
      if (aiDetected.market) { await fetch(`${API}/buyers/${buyer.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ marketPrimary: aiDetected.market }) }); }
      if (aiDetected.maxPrice) bb.maxPrice = aiDetected.maxPrice;
      if (aiDetected.minPrice) bb.minPrice = aiDetected.minPrice;
      if (aiDetected.rehabTolerance) bb.rehabTolerance = aiDetected.rehabTolerance;
      if (Object.keys(bb).length) { await fetch(`${API}/buyers/${buyer.id}/buy-box`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bb) }); }
      setAiDetected(null);
      loadBuyer(buyer.id);
      alert('Buy box updated!');
    } catch { alert('Failed to update'); }
  }

  async function saveNotes() {
    if (!buyer) return;
    setSavingNotes(true);
    try {
      await fetch(`${API}/buyers/${buyer.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buyerIntelNotes: notes }) });
    } catch {}
    finally { setSavingNotes(false); }
  }

  function getMissingFields(b: any): string[] {
    const m: string[] = [];
    if (!b?.marketPrimary && !b?.buyBox?.states?.length) m.push('Market');
    if (!b?.buyBox?.minPrice && !b?.buyBox?.maxPrice && !b?.buyBox?.anyPrice) m.push('Price range');
    if (!b?.buyBox?.rehabTolerance) m.push('Rehab tolerance');
    if (!b?.preferredStrategies?.length) m.push('Strategy');
    if (!b?.notes) m.push('Funding type');
    if (!b?.proofOfFundsUrl && !b?.proofOfFundsWaived) m.push('Proof of funds');
    if (!b?.buyBox?.zipCodes?.length && !b?.buyBox?.anyZipOk) m.push('Zip codes');
    return m;
  }

  function getNextQuestion(b: any): string | null {
    const missing = getMissingFields(b);
    if (missing.includes('Market')) return 'What markets are you buying in right now?';
    if (missing.includes('Proof of funds')) return 'Can you send over updated proof of funds? Helps us prioritize you for new deals.';
    if (missing.includes('Price range')) return 'What price range are you working with?';
    if (missing.includes('Rehab tolerance')) return 'Are you okay with heavy rehab situations?';
    if (missing.includes('Funding type')) return 'How are you typically funding deals — cash, hard money, creative?';
    if (missing.includes('Strategy')) return 'What\'s your main strategy right now — fix & flip, buy & hold, Subto?';
    if (missing.includes('Zip codes')) return 'Any specific zip codes or neighborhoods you prefer?';
    return null;
  }

  function applyTemplate(t: any) {
    let text = t.text.replace('{firstName}', buyer ? (buyer.firstName || '') : '');
    text = text.replace('{intakeLink}', `https://dispo-platform-web.vercel.app/intake/${buyer?.id || ''}`);
    setInput(text);
    setShowTemplates(false);
  }

  const filtered = conversations.filter(c => {
    if (search && !bname(c.buyer).toLowerCase().includes(search.toLowerCase()) && !(c.buyer.phone || '').includes(search)) return false;
    if (filter === 'Unread') return c.unreadCount > 0;
    if (filter === 'Needs Reply') return c.unreadCount > 0;
    if (filter === 'Hot Buyers') return c.buyer.tier === 'VIP' || c.buyer.tier === 'TIER_1';
    if (filter === 'Needs Review') return !(c.buyer.tags || []).includes('profile_reviewed');
    return true;
  });

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);
  const temp = buyer ? getTemp(buyer) : null;
  const missing = buyer ? getMissingFields(buyer) : [];
  const nextQ = buyer ? getNextQuestion(buyer) : null;

  return (
    <div className="flex text-white overflow-hidden" style={{height:"calc(100vh - 64px)"}}>

      {/* LEFT: Conversation List */}
      <div className="w-72 border-r border-gray-800 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-3 border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-bold">Messages</h1>
            {totalUnread > 0 && <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{totalUnread}</span>}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
        </div>

        {/* Filters */}
        <div className="flex gap-1 p-2 flex-wrap border-b border-gray-800">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-2 py-0.5 rounded text-xs font-medium transition ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{f}</button>
          ))}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? [...Array(5)].map((_, i) => (
            <div key={i} className="p-3 border-b border-gray-800/50">
              <div className="h-3 bg-gray-800 rounded animate-pulse mb-1.5 w-3/4" />
              <div className="h-2.5 bg-gray-800 rounded animate-pulse w-1/2" />
            </div>
          )) : filtered.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-xs">No conversations</div>
          ) : filtered.map(c => {
            const t = getTemp(c.buyer);
            return (
              <div key={c.id} onClick={() => setSelected(c)} className={`p-3 border-b border-gray-800/50 cursor-pointer hover:bg-gray-800/40 transition ${selected?.id === c.id ? 'bg-gray-800/60 border-l-2 border-l-blue-500' : ''}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-medium text-xs text-white truncate flex-1">{bname(c.buyer)}</span>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                    {c.unreadCount > 0 && <span className="bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{c.unreadCount}</span>}
                    <span className="text-gray-600 text-[10px]">{timeAgo(c.lastMessageAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getTierBadge(c.buyer.tier)}`}>{getTierLabel(c.buyer.tier)}</span>
                  <span className={`text-[10px] ${t.color}`}>{t.label}</span>
                </div>
                <div className="flex items-center gap-1 mb-0.5">
                  {(() => {
                    const badge = conversationDeliveryBadge(c);
                    return (
                      <span title={badge.title} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${badge.classes}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-gray-500 text-[10px] truncate">{c.lastMessageBody || 'No messages'}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* MIDDLE: Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-3">💬</div>
              <p className="text-gray-400 font-medium">Select a conversation</p>
              <p className="text-gray-600 text-sm mt-1">Open a buyer conversation to text, review replies, and follow up</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {bname(selected.buyer).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-white">{bname(selected.buyer)}</p>
                  <p className="text-gray-500 text-xs">{selected.buyer.phone}</p>
                </div>
                {buyer && <span className={`ml-2 text-xs px-2 py-0.5 rounded-full border ${getTierBadge(buyer.tier)}`}>{getTierLabel(buyer.tier)}</span>}
                {temp && <span className={`text-xs ${temp.color}`}>{temp.label}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRightPanel(v => !v)}
                  className={`text-xs px-2 py-1 rounded transition ${showRightPanel ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
                >
                  🧠 Buyer Intel
                </button>
                <a href={`/dashboard/buyers/${selected.buyer.id}`} className="text-blue-400 hover:text-blue-300 text-xs transition">View Profile →</a>
                <button onClick={() => { if (buyer?.phone) window.location.href = `tel:${buyer.phone}`; }} className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 rounded bg-gray-800 transition">📞 Call</button>
              </div>
            </div>

            {/* AI Detected buy box card */}
            {aiDetected && (
              <div className="mx-4 mt-3 bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-400 text-xs font-semibold">🤖 AI Detected Buy Box Info</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {aiDetected.market && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">📍 {aiDetected.market}</span>}
                  {aiDetected.maxPrice && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">💰 Max ${aiDetected.maxPrice.toLocaleString()}</span>}
                  {aiDetected.rehabTolerance && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">🔨 {aiDetected.rehabTolerance}</span>}
                  {aiDetected.tenantsOk !== null && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">{aiDetected.tenantsOk ? '✓ Tenants OK' : '✗ No tenants'}</span>}
                  {aiDetected.fundingType && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">💳 {aiDetected.fundingType}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={approveDetected} className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg transition">✓ Approve & Update</button>
                  <button onClick={() => setAiDetected(null)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition">Ignore</button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingMsgs && selected?.id ? (
                <div className="flex items-center justify-center h-full"><p className="text-gray-500 text-sm">Loading...</p></div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-gray-500 text-sm">No messages yet</p>
                    <p className="text-gray-600 text-xs mt-1">Send a message below to start</p>
                  </div>
                </div>
              ) : messages.map((m: any, idx: number) => {
                const isInbound = m.direction === 'INBOUND';
                const isLast = idx === messages.length - 1;
                return (
                  <div key={m.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[75%] group`}>
                      <div className={`rounded-2xl px-3 py-2 text-sm ${isInbound ? 'bg-gray-800 text-white rounded-bl-sm' : 'bg-blue-600 text-white rounded-br-sm'}`}>
                        {m.body}
                      </div>
                      <div className={`flex items-center gap-1 mt-0.5 ${isInbound ? 'justify-start' : 'justify-end'}`}>
                        <span className="text-[10px] text-gray-600">{timeAgo(m.createdAt)}</span>
                        {!isInbound && (
                          <span
                            title={smsErrorLabel(m) || smsDeliveryLabel(m)}
                            className={`text-[10px] ${smsDeliveryClasses(m)}`}
                          >
                            {smsDeliveryIcon(m)} {smsDeliveryLabel(m)}
                          </span>
                        )}
                        {isInbound && isLast && (
                          <button onClick={() => detectBuyBoxFromMessage(m.body)} className="text-[10px] text-purple-500 hover:text-purple-400 ml-1">🤖 detect</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Next best question */}
            {nextQ && (
              <div className="mx-4 mb-2 flex-shrink-0">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-xs">💡 Ask:</span>
                    <span className="text-gray-300 text-xs">"{nextQ}"</span>
                  </div>
                  <button onClick={() => sendMessage(nextQ)} className="text-xs text-amber-400 hover:text-amber-300 font-medium ml-2 flex-shrink-0">Send →</button>
                </div>
              </div>
            )}

            {/* AI Draft */}
            {aiDraft && (
              <div className="mx-4 mb-2 flex-shrink-0">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-blue-400 text-xs font-medium">🤖 AI Draft</span>
                    <button onClick={() => setAiDraft('')} className="text-gray-500 text-xs">✕</button>
                  </div>
                  <p className="text-gray-300 text-xs mb-2">"{aiDraft}"</p>
                  <div className="flex gap-2">
                    <button onClick={() => { setInput(aiDraft); setAiDraft(''); }} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg transition">Use Draft</button>
                    <button onClick={generateAiDraft} className="text-xs text-blue-400 hover:text-blue-300">Regenerate</button>
                  </div>
                </div>
              </div>
            )}

            {/* Templates */}
            {showTemplates && (
              <div className="mx-4 mb-2 bg-gray-900 border border-gray-700 rounded-xl p-2 flex-shrink-0 max-h-40 overflow-y-auto">
                <p className="text-gray-500 text-xs mb-2 px-1">Quick templates</p>
                {TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => applyTemplate(t)} className="w-full text-left px-2 py-1.5 hover:bg-gray-800 rounded-lg text-xs text-gray-300 transition">
                    <span className="text-gray-500 mr-2">{t.label}</span>{t.text.slice(0, 60)}...
                  </button>
                ))}
              </div>
            )}

            {/* Input area */}
            <div className="p-3 border-t border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setShowTemplates(!showTemplates)} className={`text-xs px-2 py-1 rounded-lg border transition ${showTemplates ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}>📝 Templates</button>
                <button onClick={generateAiDraft} disabled={generatingDraft} className="text-xs px-2 py-1 rounded-lg border border-gray-700 text-gray-500 hover:text-gray-300 transition disabled:opacity-40">
                  {generatingDraft ? '...' : '🤖 AI Draft'}
                </button>
                <span className={`text-[10px] ml-auto ${input.length > 140 ? 'text-red-400' : 'text-gray-600'}`}>{input.length}/160</span>
              </div>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
                <button onClick={() => sendMessage()} disabled={!input.trim() || sending} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition">
                  {sending ? '...' : '→'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* RIGHT: Buyer Intel Panel */}
      {selected && showRightPanel && (
        <div className="w-72 border-l border-gray-800 flex flex-col flex-shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            {(['intel', 'deals', 'notes'] as const).map(t => (
              <button key={t} onClick={() => setRightTab(t)} className={`flex-1 py-2.5 text-xs font-medium capitalize transition ${rightTab === t ? 'text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}>{t === 'intel' ? '🧠 Intel' : t === 'deals' ? '🏠 Deals' : '📝 Notes'}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* INTEL TAB */}
            {rightTab === 'intel' && buyer && (
              <div className="p-3 space-y-3">
                {/* Score + temp */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-gray-500 text-[10px]">Score</p>
                    <p className={`text-lg font-bold ${(buyer.compositeScore || 50) >= 70 ? 'text-green-400' : (buyer.compositeScore || 50) >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{buyer.compositeScore || 50}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-gray-500 text-[10px]">Temp</p>
                    <p className={`text-xs font-semibold ${temp?.color}`}>{temp?.label}</p>
                  </div>
                </div>

                {/* Tier */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">Tier</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getTierBadge(buyer.tier)}`}>{getTierLabel(buyer.tier)}</span>
                </div>

                {/* Market + Strategy */}
                {buyer.marketPrimary && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">Market</span>
                    <span className="text-gray-300 text-xs">{buyer.marketPrimary}</span>
                  </div>
                )}
                {buyer.preferredStrategies?.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">Strategy</span>
                    <span className="text-gray-300 text-xs truncate ml-2">{buyer.preferredStrategies[0]}</span>
                  </div>
                )}
                {buyer.notes && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">Funding</span>
                    <span className="text-gray-300 text-xs">{buyer.notes}</span>
                  </div>
                )}
                {buyer.buyBox?.minPrice || buyer.buyBox?.maxPrice ? (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">Price</span>
                    <span className="text-gray-300 text-xs">{buyer.buyBox?.anyPrice ? 'Any' : `$${buyer.buyBox.minPrice ? Math.round(buyer.buyBox.minPrice/1000)+'k' : '?'}–$${buyer.buyBox.maxPrice ? Math.round(buyer.buyBox.maxPrice/1000)+'k' : '?'}`}</span>
                  </div>
                ) : null}

                {/* Missing fields */}
                {missing.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-1.5">Missing Info</p>
                    <div className="flex flex-wrap gap-1">
                      {missing.map((m, i) => (
                        <span key={i} className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded">{m}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick tier change */}
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-1.5">Quick Tier</p>
                  <div className="flex gap-1 flex-wrap">
                    {['VIP', 'TIER_1', 'TIER_2', 'TIER_3'].map(t => (
                      <button key={t} onClick={async () => {
                        await fetch(`${API}/buyers/${buyer.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier: t }) });
                        loadBuyer(buyer.id);
                      }} className={`text-[10px] px-2 py-0.5 rounded-full border transition ${buyer.tier === t ? getTierBadge(t) + ' ring-1 ring-white/20' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}>
                        {getTierLabel(t)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* DEALS TAB */}
            {rightTab === 'deals' && (
              <div className="p-3 space-y-2">
                <p className="text-gray-500 text-xs">Deals to send this buyer</p>
                {deals.length === 0 ? (
                  <p className="text-gray-600 text-xs">No deals found</p>
                ) : deals.slice(0, 8).map((deal: any) => (
                  <div key={deal.id} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-2">
                    <p className="text-white text-xs font-medium truncate">{deal.address}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-gray-500 text-[10px]">{deal.city}, {deal.state} · ${deal.askingPrice ? Math.round(deal.askingPrice/1000)+'k' : '?'}</span>
                      <button onClick={() => {
                        const msg = `Hey! New deal: ${deal.address}, ${deal.city} ${deal.state}. Asking $${deal.askingPrice?.toLocaleString()}${deal.arv ? `, ARV ~$${deal.arv.toLocaleString()}` : ''}. Interested?`;
                        setInput(msg);
                      }} className="text-[10px] text-blue-400 hover:text-blue-300">Send →</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* NOTES TAB */}
            {rightTab === 'notes' && (
              <div className="p-3 space-y-2">
                <p className="text-gray-500 text-xs">Intel notes (saves to buyer profile)</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add notes, call transcripts, objections..."
                  className="w-full h-48 bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-lg p-2 text-xs resize-none focus:outline-none focus:border-blue-500"
                />
                <button onClick={saveNotes} disabled={savingNotes} className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs rounded-lg transition">
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
