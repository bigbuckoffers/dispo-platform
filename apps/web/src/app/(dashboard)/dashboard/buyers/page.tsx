'use client';
import { useState, useEffect } from 'react';
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
  const [tab, setTab] = useState<'all'|'hot'|'review'|'reviewed'>('all');
  const [error, setError] = useState('');

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
          <div className="font-medium text-white text-sm">{bname(b)}</div>
          <div className="text-gray-500 text-xs">{b.email?.includes('@import.dispoai.com')?(b.phone||''):(b.phone||b.email||'')}</div>
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
        <td className="px-4 py-3 text-gray-500 text-xs">{lastContact}</td>
        <td className="px-4 py-3 text-right" onClick={e=>e.stopPropagation()}>
          <button onClick={()=>deleteBuyer(b.id,bname(b))} className="opacity-0 group-hover/row:opacity-100 text-red-500 hover:text-red-400 transition px-2 py-1 rounded hover:bg-red-500/10 text-xs">🗑</button>
        </td>
      </tr>
    );
  };

  const TH = () => (
    <thead><tr className="border-b border-gray-800">
      {['Buyer','Tier','Temp','Strategy','Markets','Price Range','Profile','Last Contact',''].map(h=>(
        <th key={h} className="text-left text-gray-500 font-medium px-4 py-3 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
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
        <button onClick={exportCsv} className="bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-700/40 text-emerald-300 px-4 py-2 rounded-lg text-sm font-medium transition">⬇ Export CSV</button>
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
      {error&&<div className="bg-red-900/30 border border-red-500/30 text-red-300 rounded-lg p-4 mb-4 text-sm">Error: {error}</div>}
      {tab==='all'&&(
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm"><TH />
            <tbody>
              {loading?[...Array(8)].map((_,i)=><tr key={i} className="border-b border-gray-800/50">{[...Array(9)].map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse"/></td>)}</tr>)
              :buyers.length===0?<tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500">No buyers found.</td></tr>
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
                {loadingAll?[...Array(5)].map((_,i)=><tr key={i}>{[...Array(9)].map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse"/></td>)}</tr>)
                :hotBuyers.length===0?<tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500">No hot buyers yet. Set temperatures and tiers on buyer profiles.</td></tr>
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
      {tab==='reviewed'&&(
        <div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-4">
            <p className="text-green-300 text-sm font-medium">✅ {reviewed.length} buyers reviewed</p>
            <p className="text-gray-400 text-xs mt-1">Click any buyer to update or move back to Needs Profile.</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm"><TH />
              <tbody>
                {loadingAll?[...Array(5)].map((_,i)=><tr key={i}>{[...Array(9)].map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse"/></td>)}</tr>)
                :reviewed.length===0?<tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500">No reviewed buyers yet.</td></tr>
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
    </div>
  );
}
