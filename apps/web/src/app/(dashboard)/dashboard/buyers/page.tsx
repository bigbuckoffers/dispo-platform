'use client';
import { useState, useEffect } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
export default function BuyersPage() {
  const [buyers, setBuyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  useEffect(() => { load(); }, [search, tier]);
  async function load() {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams({ page:'1', limit:'50' });
      if (search) p.set('search', search);
      if (tier) p.set('tier', tier);
      const r = await fetch(`${API}/buyers?${p}`);
      if (!r.ok) throw new Error(`API error ${r.status}`);
      const j = await r.json();
      setBuyers(j.data ?? j);
    } catch(e:any) { setError(e.message); }
    finally { setLoading(false); }
  }
  const tb: any = {
    TIER_1:'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
    TIER_2:'bg-blue-500/20 text-blue-600 border border-blue-500/40',
    TIER_3:'bg-gray-500/20 text-gray-400 border border-gray-500/40',
  };
  const tl: any = { TIER_1:'🔥 Tier 1', TIER_2:'Tier 2', TIER_3:'Tier 3' };
  const sc = (n:number) => n>=80?'text-green-600':n>=60?'text-yellow-400':'text-red-500';
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Buyer CRM</h1>
          <p className="text-gray-400 text-sm mt-1">{buyers.length} buyers</p>
        </div>
      </div>
      <div className="flex gap-3 mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search buyers..."
          className="bg-gray-100 border border-gray-200 text-gray-900 placeholder-gray-500 rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:border-blue-500" />
        <select value={tier} onChange={e => setTier(e.target.value)}
          className="bg-gray-100 border border-gray-200 text-gray-900 rounded-lg px-4 py-2 text-sm focus:outline-none">
          <option value="">All Tiers</option>
          <option value="TIER_1">Tier 1</option>
          <option value="TIER_2">Tier 2</option>
          <option value="TIER_3">Tier 3</option>
        </select>
        <button onClick={load} className="bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-400 px-4 py-2 rounded-lg text-sm">Refresh</button>
      </div>
      {error && <div className="bg-red-900/30 border border-red-500/30 text-red-600 rounded-lg p-4 mb-6 text-sm">Error: {error}</div>}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200">
            {['Buyer','Tier','Reliability','Liquidity','Activity','Score','Markets'].map(h => (
              <th key={h} className="text-left text-gray-400 font-medium px-4 py-3">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? [...Array(5)].map((_,i) => (
              <tr key={i} className="border-b border-gray-100">
                {[...Array(7)].map((_,j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                ))}
              </tr>
            )) : buyers.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No buyers found.</td></tr>
            ) : buyers.map((b:any) => (
              <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-100/30 cursor-pointer transition-colors"
                onClick={() => window.location.href = `/dashboard/buyers/${b.id}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{b.firstName} {b.lastName}</div>
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
    </div>
  );
}
