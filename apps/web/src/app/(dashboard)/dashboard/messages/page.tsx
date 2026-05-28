'use client';
import { useState, useEffect, useRef } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function bname(b: any) {
  if (!b) return 'Unknown';
  if (!b.firstName || b.firstName === 'Unknown') return b.phone || 'Unknown';
  if (b.lastName === 'Buyer') return b.firstName;
  return `${b.firstName} ${b.lastName}`.trim();
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search, setSearch] = useState('');
  const bottomRef = useRef<any>(null);

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { if (selected) loadMessages(selected.buyer.id); }, [selected]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadConversations() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/messages/conversations`);
      const d = await r.json();
      setConversations(Array.isArray(d) ? d : []);
    } catch {}
    finally { setLoading(false); }
  }

  async function loadMessages(buyerId: string) {
    setLoadingMsgs(true);
    try {
      const r = await fetch(`${API}/messages/conversations/${buyerId}`);
      const d = await r.json();
      setMessages(d?.smsMessages || []);
      setConversations(prev => prev.map(c => c.buyer.id === buyerId ? { ...c, unreadCount: 0 } : c));
    } catch {}
    finally { setLoadingMsgs(false); }
  }

  async function sendMessage() {
    if (!input.trim() || !selected || sending) return;
    setSending(true);
    const body = input.trim();
    setInput('');
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
    } catch (e: any) {
      alert('Failed to send: ' + e.message);
      setInput(body);
    }
    finally { setSending(false); }
  }

  const filtered = conversations.filter(c =>
    bname(c.buyer).toLowerCase().includes(search.toLowerCase()) ||
    (c.buyer.phone || '').includes(search)
  );
  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold">Messages</h1>
            {totalUnread > 0 && <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">{totalUnread}</span>}
          </div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="p-4 border-b border-gray-800/50">
                <div className="h-4 bg-gray-800 rounded animate-pulse mb-2 w-3/4" />
                <div className="h-3 bg-gray-800 rounded animate-pulse w-1/2" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No conversations yet</div>
          ) : filtered.map(c => (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              className={`p-4 border-b border-gray-800/50 cursor-pointer hover:bg-gray-800/40 transition ${selected?.id === c.id ? 'bg-gray-800/60 border-l-2 border-l-blue-500' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-white truncate">{bname(c.buyer)}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {c.unreadCount > 0 && <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{c.unreadCount}</span>}
                  <span className="text-gray-500 text-xs">{timeAgo(c.lastMessageAt)}</span>
                </div>
              </div>
              <p className="text-gray-400 text-xs truncate">{c.lastMessageBody || 'No messages yet'}</p>
              <p className="text-gray-600 text-xs mt-0.5">{c.buyer.phone}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-gray-400 text-lg font-medium">Select a conversation</p>
              <p className="text-gray-600 text-sm mt-1">Or start a new one from a buyer's profile</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
                  {bname(selected.buyer).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-white">{bname(selected.buyer)}</p>
                  <p className="text-gray-400 text-xs">{selected.buyer.phone}</p>
                </div>
              </div>
              <a href={`/dashboard/buyers/${selected.buyer.id}`} className="text-blue-400 hover:text-blue-300 text-xs transition">View Profile →</a>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500 text-sm">Loading messages...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-gray-500 text-sm">No messages yet</p>
                    <p className="text-gray-600 text-xs mt-1">Send a message to start the conversation</p>
                  </div>
                </div>
              ) : messages.map((m: any) => (
                <div key={m.id} className={`flex ${m.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${m.direction === 'OUTBOUND' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-800 text-white rounded-bl-sm'}`}>
                    <p className="text-sm leading-relaxed">{m.body}</p>
                    <div className={`flex items-center gap-1 mt-1 ${m.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-xs opacity-60">{timeAgo(m.createdAt)}</span>
                      {m.direction === 'OUTBOUND' && (
                        <span className="text-xs opacity-60">{m.status === 'DELIVERED' ? '✓✓' : '✓'}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-800">
              <div className="flex gap-3">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition"
                >
                  {sending ? '...' : 'Send'}
                </button>
              </div>
              <p className="text-gray-600 text-xs mt-2 text-center">Messages sent via Twilio · +1 (321) 878-8402</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
