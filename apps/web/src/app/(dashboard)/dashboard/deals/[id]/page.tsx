'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Deal {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  arv: number;
  repairCost: number;
  status: string;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  description?: string;
  zillowUrl?: string;
  realtorUrl?: string;
  zillowZestimate?: number;
  realtorEstimate?: number;
  googleDriveUrl?: string;
  photos?: string[];
  createdAt: string;
}

export default function DealDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'valuation' | 'media'>('overview');

  // Editable fields
  const [zillowUrl, setZillowUrl] = useState('');
  const [realtorUrl, setRealtorUrl] = useState('');
  const [zillowZestimate, setZillowZestimate] = useState('');
  const [realtorEstimate, setRealtorEstimate] = useState('');
  const [googleDriveUrl, setGoogleDriveUrl] = useState('');
  const [photoUrls, setPhotoUrls] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (id) fetchDeal();
  }, [id]);

  async function fetchDeal() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/deals/${id}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      setDeal(data);
      setZillowUrl(data.zillowUrl || '');
      setRealtorUrl(data.realtorUrl || '');
      setZillowZestimate(data.zillowZestimate?.toString() || '');
      setRealtorEstimate(data.realtorEstimate?.toString() || '');
      setGoogleDriveUrl(data.googleDriveUrl || '');
      setPhotoUrls(data.photos?.join('\n') || '');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveValuationMedia() {
    if (!deal) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const body: any = {
        zillowUrl: zillowUrl || undefined,
        realtorUrl: realtorUrl || undefined,
        zillowZestimate: zillowZestimate ? Number(zillowZestimate) : undefined,
        realtorEstimate: realtorEstimate ? Number(realtorEstimate) : undefined,
        googleDriveUrl: googleDriveUrl || undefined,
        photos: photoUrls ? photoUrls.split('\n').map(s => s.trim()).filter(Boolean) : undefined,
      };
      const res = await fetch(`${API_URL}/deals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      setSaveMsg('✅ Saved!');
      fetchDeal();
    } catch (e: any) {
      setSaveMsg(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  function buildZillowSearch() {
    if (!deal) return '#';
    const addr = `${deal.address} ${deal.city} ${deal.state} ${deal.zipCode}`.replace(/\s+/g, '-');
    return `https://www.zillow.com/homes/${encodeURIComponent(addr)}_rb/`;
  }

  function buildRealtorSearch() {
    if (!deal) return '#';
    const addr = encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state} ${deal.zipCode}`);
    return `https://www.realtor.com/realestateandhomes-search/${addr}`;
  }

  function fmt(n?: number) {
    if (!n) return '—';
    return '$' + n.toLocaleString();
  }

  function statusColor(s: string) {
    const m: Record<string, string> = {
      AVAILABLE: 'bg-green-500/20 text-green-300 border-green-500/30',
      UNDER_CONTRACT: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      SOLD: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      DEAD: 'bg-red-500/20 text-red-300 border-red-500/30',
    };
    return m[s] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400">Loading deal...</div>
    </div>
  );

  if (error || !deal) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-400 mb-4">⚠️ {error || 'Deal not found'}</div>
        <button onClick={() => router.push('/dashboard/deals')} className="text-blue-400 hover:text-blue-300 text-sm">
          ← Back to Deals
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-6xl mx-auto">
      {/* Back */}
      <button onClick={() => router.push('/dashboard/deals')} className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-2">
        ← Back to Deals
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{deal.address}</h1>
          <p className="text-gray-400 mt-1">{deal.city}, {deal.state} {deal.zipCode}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColor(deal.status)}`}>
          {deal.status?.replace('_', ' ')}
        </span>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Asking Price', value: fmt(deal.price) },
          { label: 'ARV', value: fmt(deal.arv) },
          { label: 'Repair Cost', value: fmt(deal.repairCost) },
          { label: 'Spread', value: deal.arv && deal.price ? fmt(deal.arv - deal.price - (deal.repairCost || 0)) : '—' },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1">{stat.label}</div>
            <div className="text-xl font-bold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {(['overview', 'valuation', 'media'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'valuation' ? '🏠 Valuation & Links' : tab === 'media' ? '📸 Photos & Docs' : '📋 Overview'}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">Property Details</h3>
            <dl className="space-y-3">
              {[
                ['Type', deal.propertyType],
                ['Beds', deal.bedrooms ?? '—'],
                ['Baths', deal.bathrooms ?? '—'],
                ['Sqft', deal.sqft ? deal.sqft.toLocaleString() : '—'],
                ['Listed', new Date(deal.createdAt).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between">
                  <dt className="text-gray-400 text-sm">{k}</dt>
                  <dd className="text-white text-sm font-medium">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">Description</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{deal.description || 'No description added.'}</p>
          </div>
        </div>
      )}

      {/* Valuation Tab */}
      {activeTab === 'valuation' && (
        <div className="space-y-6">
          {/* Auto-search links */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-2">Quick Property Search</h3>
            <p className="text-gray-400 text-sm mb-4">Auto-generated search links for this address. Click to open, then paste the direct listing URL below.</p>
            <div className="flex flex-wrap gap-3">
              <a href={buildZillowSearch()} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 px-4 py-2 rounded-lg text-sm transition-colors">
                🏠 Search Zillow ↗
              </a>
              <a href={buildRealtorSearch()} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm transition-colors">
                🔍 Search Realtor.com ↗
              </a>
              <a href={`https://www.redfin.com/city/search?location=${encodeURIComponent(deal.address + ' ' + deal.city + ' ' + deal.state)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-300 px-4 py-2 rounded-lg text-sm transition-colors">
                📊 Search Redfin ↗
              </a>
            </div>
          </div>

          {/* Manual links + estimates */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">Listing Links & Estimates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 text-xs mb-2">Zillow Listing URL</label>
                <input value={zillowUrl} onChange={e => setZillowUrl(e.target.value)}
                  placeholder="https://zillow.com/homedetails/..."
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                {zillowUrl && (
                  <a href={zillowUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs mt-1 inline-block hover:underline">Open Zillow listing ↗</a>
                )}
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-2">Zestimate</label>
                <input value={zillowZestimate} onChange={e => setZillowZestimate(e.target.value)}
                  placeholder="350000"
                  type="number"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-2">Realtor.com Listing URL</label>
                <input value={realtorUrl} onChange={e => setRealtorUrl(e.target.value)}
                  placeholder="https://realtor.com/realestateandhomes-detail/..."
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                {realtorUrl && (
                  <a href={realtorUrl} target="_blank" rel="noopener noreferrer" className="text-red-400 text-xs mt-1 inline-block hover:underline">Open Realtor.com listing ↗</a>
                )}
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-2">Realtor.com Estimate</label>
                <input value={realtorEstimate} onChange={e => setRealtorEstimate(e.target.value)}
                  placeholder="355000"
                  type="number"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>

            {/* Estimate comparison */}
            {(zillowZestimate || realtorEstimate) && (
              <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                <div className="text-gray-400 text-xs mb-2">Valuation Comparison</div>
                <div className="flex gap-6">
                  {zillowZestimate && <div><span className="text-blue-400 text-xs">Zillow</span><div className="text-white font-semibold">${Number(zillowZestimate).toLocaleString()}</div></div>}
                  {realtorEstimate && <div><span className="text-red-400 text-xs">Realtor.com</span><div className="text-white font-semibold">${Number(realtorEstimate).toLocaleString()}</div></div>}
                  {deal.arv && <div><span className="text-green-400 text-xs">Your ARV</span><div className="text-white font-semibold">{fmt(deal.arv)}</div></div>}
                </div>
              </div>
            )}

            <button onClick={saveValuationMedia} disabled={saving}
              className="mt-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium">
              {saving ? 'Saving...' : 'Save Links & Estimates'}
            </button>
            {saveMsg && <span className="ml-4 text-sm">{saveMsg}</span>}
          </div>
        </div>
      )}

      {/* Media Tab */}
      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-2">Google Drive Folder</h3>
            <p className="text-gray-400 text-sm mb-4">Paste your Google Drive folder link for this property (photos, contracts, inspection reports, etc.)</p>
            <div className="flex gap-3">
              <input value={googleDriveUrl} onChange={e => setGoogleDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              {googleDriveUrl && (
                <a href={googleDriveUrl} target="_blank" rel="noopener noreferrer"
                  className="bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 px-4 py-2 rounded-lg text-sm whitespace-nowrap">
                  📁 Open Drive ↗
                </a>
              )}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-2">Property Photos</h3>
            <p className="text-gray-400 text-sm mb-4">Paste photo URLs (one per line) — from Google Drive, Dropbox, Imgur, or any direct image URL.</p>
            <textarea value={photoUrls} onChange={e => setPhotoUrls(e.target.value)}
              rows={4}
              placeholder={"https://drive.google.com/uc?id=...\nhttps://i.imgur.com/...\nhttps://..."}
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono"
            />

            {/* Photo preview grid */}
            {deal.photos && deal.photos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {deal.photos.map((url, i) => (
                  <div key={i} className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700 group">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500 text-xs p-2 text-center">Image not accessible</div>'; }} />
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
                      Open ↗
                    </a>
                  </div>
                ))}
              </div>
            )}

            <button onClick={saveValuationMedia} disabled={saving}
              className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium">
              {saving ? 'Saving...' : 'Save Photos & Drive Link'}
            </button>
            {saveMsg && <span className="ml-4 text-sm">{saveMsg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
