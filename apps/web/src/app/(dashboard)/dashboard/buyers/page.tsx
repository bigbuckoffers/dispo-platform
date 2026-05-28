'use client';
import { useState, useEffect } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function profileScore(b: any): number {
  let s = 0;
  if (b.buyBox?.states?.length > 0) s += 25;
  if (b.buyBox?.minPrice || b.buyBox?.maxPrice) s += 15;
  if (b.buyBox?.rehabTolerance) s += 10;
  if (b.preferredStrategies?.length > 0) s += 10;
  if (b.aiSummary) s += 20;
  if (b.buyerIntelNotes && b.buyerIntelNotes.length > 50) s += 10;
  if (b.hasCash || b.hasHardMoney) s += 10;
  return s;
}

function missingFields(b: any): string[] {
  const m: string[] = [];
  if (!b.buyBox?.states?.length) m.push('States / markets');
  if (!b.buyBox?.minPrice && !b.buyBox?.maxPrice) m.push('Price range');
  if (!b.buyBox?.rehabTolerance) m.push('Rehab tolerance');
  if (!b.preferredStrategies?.length) m.push('Strategy');
  if (!b.aiSummary) m.push('AI intel report');
  if (!b.hasCash && !b.hasHardMoney) m.push('Funding type');
  return m;
}

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<any[]>([]);
  const [allBuyers, setAllBuyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAll, setLoadingAll] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<'all'|'review'|'reviewed'>('all');

  const exportCsv = async () => {
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
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
    } else if (tab === 'review') {
      all = allBuyers.filter((b: any) => profileScore(b) < 70 && !(b.tags||[]).includes('profile_reviewed'));
    } else if (tab === 'reviewed') {
      all = allBuyers.filter((b: any) => (b.tags||[]).includes('profile_reviewed'));
    }
    const headers = ['First Name','Last Name','Email','Phone','Tier','Score','Markets','Strategies','Funding','Min Price','Max Price','Min Beds','Notes'];
    const rows = all.map((b: any) => {
      const bb = b.buyBox || {};
      return [
        b.firstName||'', b.lastName||'', b.email||'', b.phone||'',
        b.tier||'', b.compositeScore||'',
        (bb.states||[]).join(';'), (bb.strategies||b.preferredStrategies||[]).join(';'),
        (bb.fundingTypes||[]).join(';'), bb.minPrice||'', bb.maxPrice||'',
        bb.minBeds||'', b.buyerIntelNotes||''
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
  useEffect(() => {
    const onFocus = () => loadAll();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

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
    } catch (e) {}
    finally { setLoadingAll(false); }
  }

  const tb: any = { TIER_1:'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40', TIER_2:'bg-blue-500/20 text-blue-300 border border-blue-500/40', TIER_3:'bg-gray-500/20 text-gray-300 border border-gray-500/40' };
  const tl: any = { TIER_1:'🔥 T1', TIER_2:'T2', TIER_3:'T3' };
  const tierTooltips: any = {
    VIP: 'VIP — Has closed a deal with us before',
    TIER_1: 'T1 — Verified funds, confirmed buy box, fast closer, highly responsive',
    TIER_2: 'T2 — Buy box confirmed, engaged, has not yet closed with us',
    TIER_3: 'T3 — Has shown interest, buy box partially known, unverified',
    TIER_4: 'T4 — Cold, dormant, or low engagement',
  };
  const sc = (n: number) => n>=80?'text-green-400':n>=60?'text-yellow-400':'text-red-400';
  const bname = (b: any) => (!b.firstName||b.firstName==='Unknown') ? (b.phone||b.email?.split('@')[0]||'Unknown') : b.lastName==='Buyer' ? b.firstName : `${b.firstName} ${b.lastName}`.trim();
  const reviewed = [...allBuyers].filter(b => (b.tags||[]).includes('profile_reviewed')).sort((a,b) => (b.compositeScore||0)-(a.compositeScore||0));
  const needsReview = [...allBuyers].filter(b => profileScore(b) < 70 && !(b.tags||[]).includes('profile_reviewed')).sort((a,b) => (b.compositeScore||0)-(a.compositeScore||0));

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Buyer CRM</h1>
        <p className="text-gray-400 text-sm mt-1">{total} buyers</p>
      </div>
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('all')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab==='all'?'bg-gray-700 text-white':'text-gray-400 hover:text-white'}`}>
          All Buyers <span className="ml-1 text-xs bg-gray-600 px-1.5 py-0.5 rounded-full">{total}</span>
        </button>
        <button onClick={() => { setTab('reviewed'); loadAll(); }} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab==='reviewed'?'bg-green-700 text-white':'text-gray-400 hover:text-white'}`}>
          Reviewed <span className="ml-1 text-xs bg-green-500/30 text-green-300 px-1.5 py-0.5 rounded-full">{loadingAll ? '...' : reviewed.length}</span>
        </button>
        <button onClick={() => { setTab('review'); loadAll(); }} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab==='review'?'bg-orange-600 text-white':'text-gray-400 hover:text-white'}`}>
          Needs Review <span className="ml-1 text-xs bg-orange-500/30 text-orange-300 px-1.5 py-0.5 rounded-full">{loadingAll ? '...' : needsReview.length}</span>
        </button>
      </div>
      <div className="flex justify-end px-1 mb-2">
        <button onClick={exportCsv} className="bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/40 text-emerald-300 px-4 py-2 rounded-lg text-sm font-medium transition">⬇ Export CSV</button>
      </div>

      {tab==='all' && (
        <div className="flex gap-3 mb-6">
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search buyers..." className="bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:border-blue-500" />
          <select value={tier} onChange={e=>{setTier(e.target.value);setPage(1);}} className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm">
            <option value="">All Tiers</option><option value="TIER_1">Tier 1</option><option value="TIER_2">Tier 2</option><option value="TIER_3">Tier 3</option>
          </select>
          <button onClick={load} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm">Refresh</button>
        </div>
      )}
      {error && <div className="bg-red-900/30 border border-red-500/30 text-red-300 rounded-lg p-4 mb-6 text-sm">Error: {error}</div>}
      {tab==='all' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800">{['Buyer','Tier','Reliability','Liquidity','Activity','Score','Markets'].map(h=><th key={h} className="text-left text-gray-400 font-medium px-4 py-3">{h}</th>)}</tr></thead>
            <tbody>
              {loading ? [...Array(5)].map((_,i)=><tr key={i} className="border-b border-gray-800/50">{[...Array(7)].map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse"/></td>)}</tr>)
              : buyers.length===0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No buyers found.</td></tr>
              : buyers.map((b:any)=>(
                <tr key={b.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer" onClick={()=>window.location.href=`/dashboard/buyers/${b.id}`}>
                  <td className="px-4 py-3"><div className="font-medium">{bname(b)}</div><div className="text-gray-400 text-xs">{b.email?.includes('@import.dispoai.com')?(b.phone||''):b.email}</div></td>
                  <td className="px-4 py-3"><span title={tierTooltips[b.tier]||b.tier} className={`px-2 py-1 rounded text-xs font-medium cursor-help ${tb[b.tier]||tb.TIER_3}`}>{tl[b.tier]||b.tier}</span></td>
                  <td className="px-4 py-3"><span className={sc(b.reliabilityScore)}>{b.reliabilityScore}</span></td>
                  <td className="px-4 py-3"><span className={sc(b.liquidityScore)}>{b.liquidityScore}</span></td>
                  <td className="px-4 py-3"><span className={sc(b.activityScore)}>{b.activityScore}</span></td>
                  <td className="px-4 py-3"><span className={`font-bold ${sc(b.compositeScore)}`}>{b.compositeScore}</span></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{b.buyBox?.states?.join(', ')||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab==='review' && (
        <div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-6">
            <p className="text-orange-300 text-sm font-medium">⚠️ {needsReview.length} buyers have incomplete profiles</p>
            <p className="text-gray-400 text-xs mt-1">Ranked by composite score — fix your most valuable buyers first. Click any buyer to fill in their buy box and generate their AI intel report.</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">{['Buyer','Score','Profile','Missing Info','Market'].map(h=><th key={h} className="text-left text-gray-400 font-medium px-4 py-3">{h}</th>)}</tr></thead>
              <tbody>
                {loadingAll ? [...Array(5)].map((_,i)=><tr key={i} className="border-b border-gray-800/50">{[...Array(5)].map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse"/></td>)}</tr>)
                : needsReview.length===0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-green-400">✅ All profiles complete!</td></tr>
                : needsReview.map((b:any)=>{
                  const ps=profileScore(b); const miss=missingFields(b);
                  const bc=ps>=70?'bg-green-500':ps>=40?'bg-yellow-500':'bg-red-500';
                  return (
                    <tr key={b.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer" onClick={()=>window.location.href=`/dashboard/buyers/${b.id}`}>
                      <td className="px-4 py-3"><div className="font-medium">{bname(b)}</div><div className="text-gray-400 text-xs">{b.phone||''}</div></td>
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
                          {miss.length>3 && <span className="text-xs text-gray-500">+{miss.length-3} more</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{b.buyBox?.states?.join(', ')||b.marketPrimary||'—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab==='all' && total>100 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-gray-400 text-sm">Showing {(page-1)*100+1}–{Math.min(page*100,total)} of {total}</p>
          <div className="flex gap-2">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm disabled:opacity-40">← Prev</button>
            <span className="px-4 py-2 text-gray-400 text-sm">Page {page} of {Math.ceil(total/100)}</span>
            <button onClick={()=>setPage(p=>p+1)} disabled={page>=Math.ceil(total/100)} className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}

      {tab==='reviewed' && (
        <div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
            <p className="text-green-300 text-sm font-medium">✅ {reviewed.length} buyers have been reviewed</p>
            <p className="text-gray-400 text-xs mt-1">These buyers have been manually reviewed. Click any buyer to update their profile or move them back to Needs Review.</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">{['Buyer','Score','Profile','Missing Info','Market'].map(h=><th key={h} className="text-left text-gray-400 font-medium px-4 py-3">{h}</th>)}</tr></thead>
              <tbody>
                {loadingAll ? [...Array(5)].map((_,i)=><tr key={i} className="border-b border-gray-800/50">{[...Array(5)].map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse"/></td>)}</tr>)
                : reviewed.length===0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">No reviewed buyers yet.</td></tr>
                : reviewed.map((b:any)=>{
                  const ps=profileScore(b); const miss=missingFields(b);
                  const bc=ps>=70?'bg-green-500':ps>=40?'bg-yellow-500':'bg-red-500';
                  return (
                    <tr key={b.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer" onClick={()=>window.location.href=`/dashboard/buyers/${b.id}`}>
                      <td className="px-4 py-3"><div className="font-medium">{bname(b)}</div><div className="text-gray-400 text-xs">{b.phone||''}</div></td>
                      <td className="px-4 py-3"><span className={`font-bold ${sc(b.compositeScore)}`}>{b.compositeScore}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-700 rounded-full h-1.5"><div className={`${bc} h-1.5 rounded-full`} style={{width:`${ps}%`}}/></div>
                          <span className="text-xs text-gray-400">{ps}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {miss.slice(0,3).map((m,i)=><span key={i} className="text-xs bg-gray-700 text-gray-400 border border-gray-600 px-2 py-0.5 rounded-full">{m}</span>)}
                          {miss.length>3 && <span className="text-xs text-gray-500">+{miss.length-3} more</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{b.buyBox?.states?.join(', ')||b.marketPrimary||'—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
