'use client';
import { useState, useEffect } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
export default function DealsPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/deals?page=1&limit=50`);
      if (!r.ok) throw new Error(`API error ${r.status}`);
      const j = await r.json();
      setDeals(j.data ?? j);
    } catch(e:any) { setError(e.message); }
    finally { setLoading(false); }
  }
  const sc: any = {
    ACTIVE:'bg-green-500/20 text-green-300 border border-green-500/30',
    DRAFT:'bg-gray-500/20 text-gray-300 border border-gray-500/30',
    UNDER_CONTRACT:'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    SOLD:'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  };
  const fmt = (n?:number) => n ? '$'+n.toLocaleString() : '—';
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Deals</h1>
          <p className="text-gray-400 text-sm mt-1">{deals.length} properties</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Deal</button>
      </div>
      {error && <div className="bg-red-900/30 border border-red-500/30 text-red-300 rounded-lg p-4 mb-6 text-sm">Error: {error}</div>}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-800">
            {['Property','Status','Asking','ARV','Repairs','Spread','Beds/Baths',''].map(h => (
              <th key={h} className="text-left text-gray-400 font-medium px-4 py-3">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? [...Array(5)].map((_,i) => (
              <tr key={i} className="border-b border-gray-800/50">
                {[...Array(8)].map((_,j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                ))}
              </tr>
            )) : deals.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No deals found.</td></tr>
            ) : deals.map((d:any) => (
              <tr key={d.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{d.address}</div>
                  <div className="text-gray-400 text-xs">{d.city}, {d.state} {d.zipCode}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${sc[d.status] || sc.DRAFT}`}>{d.status}</span>
                </td>
                <td className="px-4 py-3 text-white">{fmt(d.askingPrice)}</td>
                <td className="px-4 py-3 text-white">{fmt(d.arv)}</td>
                <td className="px-4 py-3 text-white">{fmt(d.repairEstimate)}</td>
                <td className="px-4 py-3 font-semibold text-green-400">
                  {d.arv && d.askingPrice ? fmt(d.arv - d.askingPrice - (d.repairEstimate||0)) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-300">{d.beds}bd / {d.baths}ba</td>
                <td className="px-4 py-3">
                  <button onClick={() => window.location.href = `/dashboard/deals/${d.id}`}
                    className="text-blue-400 hover:text-blue-300 text-xs">View →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
