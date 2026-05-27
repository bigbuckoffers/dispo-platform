'use client';
import { useState, useEffect } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
export default function BuyersPage() {
  const [buyers, setBuyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  useEffect(() => { load(); }, [search, tier, page]);
  async function load() {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams({ page:String(page), limit:'100' });
      if (search) p.set('search', search);
      if (tier) p.set('tier', tier);
      const r = await fetch(`${API}/buyers?${p}`);
      if (!r.ok) throw new Error(`API error ${r.status}`);
      const j = await r.json();
      setBuyers(j.data ?? j);
      setTotal(j.meta?.total ?? (j.data ?? j).length);
    } catch(e:any) { setError(e.message); }
    finally { setLoading(false); }
  }
  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleTier(v: string) { setTier(v); setPage(1); }
  const tb: any = {
    TIER_1:'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
    TIER_2:'bg-blue-500/20 text-blue-300 border border-blue-500/40',
    TIER_3:'bg-gray-500/20 text-gray-300 border border-gray-500/40',
  };
  const tl: any = { TIER_1:'🔥 Tier 1', TIER_2:'Tier 2', TIER_3:'Tier 3' };
  const sc = (n:number) => n>=80?'text-green-400':n>=60?'text-yellow-400':'text-red-400';
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Buyer CRM</h1>
          <p className="text-gray-400 text-sm mt-1">{total} buyers</p>
        </div>
      </div>
      <div className="flex gap-3 mb-6">
        <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search buyers..."
          className="bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:border-blue-500" />
        <select value={tier} onChange={e => handleTier(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none">
          <option value="">All Tiers</option>
          <option value="TIER_1">Tier 1</option>
          <option value="TIER_2">Tier 2</option>
          <option value="TIER_3">Tier 3</option>
        </select>
        <button onClick={load} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm">Refresh</button>
      </div>
      {error && <div className="bg-red-900/30 border border-red-500/30 text-red-300 rounded-lg p-4 mb-6 text-sm">Error: {error}</div>}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">
            {['Buyer','Tier','Reliability','Liquidity','Activity','Score','Markets'].map(h => (
              <th key={h} className="text-left text-gray-400 font-medium px-4 py-3">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? [...Array(5)].map((_,i) => (
              <tr key={i} className="border-b border-gray-800/50">
                {[...Array(7)].map((_,j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                ))}
              </tr>
            )) : buyers.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No buyers found.</td></tr>
            ) : buyers.map((b:any) => (
              <tr key={b.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors"
                onClick={() => window.location.href = `/dashboard/buyers/${b.id}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{(b.firstName === 'Unknown' || !b.firstName) ? (b.phone || b.email?.split('@')[0]) : `${b.firstName} ${b.lastName}`}</div>
                  <div className="text-gray-400 text-xs">{b.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${tb[b.tier] || tb.TIER_3}`}>{tl[b.tier] || b.tier}</span>
                </td>
                <td className="px-4 py-3"><span className={sc(b.reliabilityScore)}>{b.reliabilityScore}</span></td>
                <td className="px-4 py-3"><span className={sc(b.liquidityScore)}>{b.liquidityScore}</span></td>
                <td className="px-4 py-3"><span className={sc(b.activityScore)}>{b.activityScore}</span></td>
                <td className="px-4 py-3"><span className={`font-bold ${sc(b.compositeScore)}`}>{b.compositeScore}</span></td>
                <td className="px-4 py-3 text-gray-400 text-xs">{b.buyBox?.states?.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > 100 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-gray-400 text-sm">Showing {(page-1)*100+1}–{Math.min(page*100, total)} of {total} buyers</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700">
              ← Previous
            </button>
            <span className="px-4 py-2 text-gray-400 text-sm">Page {page} of {Math.ceil(total/100)}</span>
            <button onClick={() => setPage(p => p+1)} disabled={page >= Math.ceil(total/100)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
