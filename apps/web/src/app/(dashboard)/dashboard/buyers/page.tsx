'use client';
import { useState, useEffect } from 'react';
import { CreateBuyerModal } from '@/components/buyer/CreateBuyerModal';
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
  const [tab, setTab] = useState<'all'|'hot'|'review'|'reviewed'|'submissions'>('all');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [fieldDecisions, setFieldDecisions] = useState<Record<string,string>>({});
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

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
        <div className="flex gap-2">
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
      {tab==='submissions'&&(
        <div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-4">
            <p className="text-purple-300 text-sm font-medium">📬 {submissions.length} pending buy box submissions</p>
            <p className="text-gray-400 text-xs mt-1">Review each field — green = new info, yellow = conflicts with existing data. Accept or keep your current value.</p>
          </div>
          {loadingSubs ? <div className="text-gray-500 text-sm p-8 text-center">Loading...</div>
          : submissions.length === 0 ? <div className="text-gray-500 text-sm p-8 text-center">No pending submissions</div>
          : <div className="space-y-6">{submissions.map((sub:any) => {
            const d = sub.submittedData;
            const b = sub.buyer;
            const bb = b?.buyBox || {};

            // Build field diff
            const fields = [
              { key:'marketPrimary', label:'Primary Market', submitted: d.marketPrimary, current: b?.marketPrimary },
              { key:'marketSecondary', label:'Other Markets', submitted: d.marketSecondary, current: (b?.marketSecondary||[]).join(', ') },
              { key:'states', label:'States', submitted: d.states, current: (bb.states||[]).join(', ') },
              { key:'zipCodes', label:'Zip Codes', submitted: d.zipCodes, current: (bb.zipCodes||[]).join(', ') },
              { key:'anyZipOk', label:'Any Zip OK', submitted: d.anyZipOk ? 'Yes' : '', current: bb.anyZipOk ? 'Yes' : '' },
              { key:'strategies', label:'Strategy', submitted: (d.strategies||[]).join(', '), current: (b?.preferredStrategies||[]).join(', ') },
              { key:'rehabTolerance', label:'Rehab Tolerance', submitted: d.rehabTolerance?.replace(/_/g,' '), current: bb.rehabTolerance?.replace(/_/g,' ') },
              { key:'propertyTypes', label:'Property Types', submitted: (d.propertyTypes||[]).join(', '), current: (bb.propertyTypes||[]).join(', ') },
              { key:'price', label:'Price Range', submitted: d.anyPrice ? 'Any price' : (d.minPrice||d.maxPrice) ? `$${d.minPrice||0}–$${d.maxPrice||'∞'}` : '', current: bb.anyPrice ? 'Any price' : (bb.minPrice||bb.maxPrice) ? `$${bb.minPrice||0}–$${bb.maxPrice||'∞'}` : '' },
              { key:'fundingTypes', label:'Funding', submitted: (d.fundingTypes||[]).join(', '), current: b?.notes },
              { key:'closeSpeed', label:'Close Speed', submitted: d.closeSpeed ? d.closeSpeed+' days' : '', current: b?.avgCloseSpeedDays ? b.avgCloseSpeedDays+' days' : '' },
              { key:'buyingStatus', label:'Buying Status', submitted: d.buyingStatus?.replace(/_/g,' '), current: '' },
              { key:'monthlyCapacity', label:'Monthly Capacity', submitted: d.monthlyCapacity, current: '' },
              { key:'hardNoCriteria', label:'Hard No Criteria', submitted: d.hardNoCriteria, current: bb.hardNoCriteria },
              { key:'occupancy', label:'Occupancy', submitted: d.occupancy, current: '' },
              { key:'hoaOk', label:'HOA OK', submitted: d.hoaOk, current: '' },
              { key:'preferredContact', label:'Contact Preference', submitted: d.preferredContact, current: '' },
              { key:'dealSendFreq', label:'Deal Frequency', submitted: d.dealSendFreq, current: '' },
              { key:'freeformNotes', label:'Free-form Notes', submitted: d.freeformNotes, current: '' },
            ].filter(f => f.submitted && f.submitted.toString().trim());

            const decisions = fieldDecisions[sub.id] ? JSON.parse(fieldDecisions[sub.id]) : {};
            const setDecision = (fieldKey: string, val: string) => {
              const cur = fieldDecisions[sub.id] ? JSON.parse(fieldDecisions[sub.id]) : {};
              cur[fieldKey] = val;
              setFieldDecisions(prev => ({...prev, [sub.id]: JSON.stringify(cur)}));
            };

            const handleApprove = () => {
              // Build approved data based on decisions
              const approved: any = { ...d };
              fields.forEach(field => {
                const dec = decisions[field.key];
                if (dec === 'keep') delete approved[field.key];
              });
              approveSubmission({...sub, submittedData: approved});
            };

            return (
              <div key={sub.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <div>
                    <p className="font-semibold text-white">{b?.firstName} {b?.lastName} <span className="text-gray-500 text-xs ml-2">{b?.phone}</span></p>
                    <p className="text-gray-500 text-xs mt-0.5">Submitted {new Date(sub.createdAt).toLocaleDateString()} · {fields.length} fields</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>window.location.href=`/dashboard/buyers/${b?.id}`} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition">Profile</button>
                    <button onClick={()=>rejectSubmission(sub.id)} className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/60 text-red-400 text-xs rounded-lg transition">Reject</button>
                    <button onClick={handleApprove} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg font-medium transition">✓ Save Approved</button>
                  </div>
                </div>
                {/* Field diff table */}
                <div className="divide-y divide-gray-800/50">
                  {fields.map((field:any) => {
                    const hasConflict = field.current && field.current.trim() && field.current !== field.submitted;
                    const isNew = !field.current || !field.current.trim();
                    const dec = decisions[field.key] || (isNew ? 'accept' : hasConflict ? '' : 'accept');
                    return (
                      <div key={field.key} className={`px-4 py-3 flex items-start gap-3 ${hasConflict && !dec ? 'bg-yellow-500/5' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-500 text-xs mb-1">{field.label}</p>
                          <div className="flex items-start gap-3 flex-wrap">
                            <div className={`flex-1 min-w-0 px-2 py-1 rounded text-xs ${isNew ? 'bg-green-500/10 border border-green-500/20 text-green-300' : dec==='accept' ? 'bg-green-500/10 border border-green-500/20 text-green-300' : dec==='keep' ? 'bg-gray-800 text-gray-500 line-through' : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-300'}`}>
                              <span className="text-gray-500 mr-1">New:</span>{field.submitted}
                            </div>
                            {hasConflict && (
                              <div className="flex-1 min-w-0 px-2 py-1 rounded text-xs bg-gray-800 border border-gray-700 text-gray-400">
                                <span className="text-gray-500 mr-1">Current:</span>{field.current}
                              </div>
                            )}
                          </div>
                        </div>
                        {hasConflict && (
                          <div className="flex gap-1 flex-shrink-0 mt-4">
                            <button onClick={()=>setDecision(field.key,'accept')} className={`px-2 py-1 rounded text-xs transition ${dec==='accept'?'bg-green-600 text-white':'bg-gray-800 text-gray-400 hover:text-green-400'}`}>Use New</button>
                            <button onClick={()=>setDecision(field.key,'keep')} className={`px-2 py-1 rounded text-xs transition ${dec==='keep'?'bg-gray-600 text-white':'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>Keep Mine</button>
                          </div>
                        )}
                        {isNew && <span className="text-green-500 text-xs flex-shrink-0 mt-4">✓ New</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}</div>}
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
      {showCreate && <CreateBuyerModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); loadAll(); }} />}
    </div>
  );
}
