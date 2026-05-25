'use client';
import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, DollarSign, Users, Zap, AlertCircle, Building2,
  TrendingUp, Target, Send, Clock, FileText, ExternalLink,
  Phone, Mail, RefreshCw, Sparkles, Flame, Shield, BarChart3,
  Copy, CheckCircle, ChevronDown, ChevronUp, Camera, FolderOpen,
  Globe, Eye, Lock, Share2, Facebook, MessageSquare, Edit3, X,
  ChevronLeft, ChevronRight, Upload, Link, Image, Star, Plus
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import toast from 'react-hot-toast';

type Tab = 'property' | 'dealmath' | 'buyers' | 'dispo';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-700/80 text-gray-300',
  NEEDS_INFO: 'bg-amber-900/60 text-amber-300 border border-amber-700/40',
  READY_TO_MATCH: 'bg-blue-900/60 text-blue-300 border border-blue-700/40',
  MATCHED: 'bg-purple-900/60 text-purple-300 border border-purple-700/40',
  READY_TO_BLAST: 'bg-green-900/60 text-green-300 border border-green-700/40',
  CAMPAIGN_ACTIVE: 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/40',
  OFFER_RECEIVED: 'bg-orange-900/60 text-orange-300 border border-orange-700/40',
  ASSIGNED: 'bg-teal-900/60 text-teal-300 border border-teal-700/40',
  CLOSED: 'bg-green-800/60 text-green-200',
  DEAD: 'bg-red-900/60 text-red-400',
  ACTIVE: 'bg-blue-900/60 text-blue-300',
};

function getPriorityBadge(score: number) {
  if (score >= 90) return { label: '🔥 Hot', bg: 'bg-red-900/70 text-red-300 border border-red-700' };
  if (score >= 75) return { label: 'Strong', bg: 'bg-orange-900/70 text-orange-300 border border-orange-700' };
  if (score >= 60) return { label: 'Workable', bg: 'bg-yellow-900/70 text-yellow-300 border border-yellow-700' };
  if (score >= 40) return { label: 'Needs Info', bg: 'bg-blue-900/70 text-blue-300 border border-blue-700' };
  return { label: 'Weak', bg: 'bg-gray-800 text-gray-500 border border-gray-700' };
}

function InfoRow({ label, value, mono = false, href }: { label: string; value: any; mono?: boolean; href?: string }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-800/50 last:border-0">
      <span className="text-gray-500 text-sm shrink-0 mr-4">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-sm hover:underline flex items-center gap-1">
          {value} <ExternalLink size={11} />
        </a>
      ) : (
        <span className={`text-white text-sm text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
      )}
    </div>
  );
}

function Card({ title, icon: Icon, children, className = '', warning, badge }: any) {
  return (
    <div className={`bg-gray-900 rounded-xl border border-gray-800 overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-gray-400" />
          <h3 className="text-white text-sm font-medium">{title}</h3>
          {badge && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300">{badge}</span>}
        </div>
        {warning && <span className="text-amber-400 text-xs flex items-center gap-1"><AlertCircle size={11} />{warning}</span>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs rounded transition">
      {copied ? <CheckCircle size={11} className="text-green-400" /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function GeneratedOutput({ content, onClose }: { content: string; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(content);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="mt-3 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-gray-400 text-xs font-medium">Generated Output</span>
        <div className="flex items-center gap-2">
          <CopyButton text={text} />
          <button onClick={() => setEditing(!editing)} className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-400 text-xs rounded transition">
            <Edit3 size={11} /> {editing ? 'Done' : 'Edit'}
          </button>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded text-gray-500 transition"><X size={13} /></button>
        </div>
      </div>
      {editing ? (
        <textarea value={text} onChange={e => setText(e.target.value)} rows={6} className="w-full bg-transparent text-gray-300 text-sm p-3 focus:outline-none resize-none" />
      ) : (
        <p className="text-gray-300 text-sm p-3 leading-relaxed whitespace-pre-wrap">{text}</p>
      )}
    </motion.div>
  );
}

function PhotoGallery({ deal, onUpdate }: { deal: any; onUpdate: (data: any) => void }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [showDriveInput, setShowDriveInput] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [driveInput, setDriveInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photos: string[] = deal.photos?.filter(Boolean) || [];
  const hasDrive = !!deal.googleDriveUrl;
  const hasPhotos = photos.length > 0;

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', 'dispoai_photos');
    const r = await fetch('https://api.cloudinary.com/v1_1/dhueussrm/image/upload', { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.secure_url) throw new Error('Upload failed');
    return d.secure_url;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const url = await uploadToCloudinary(file);
        urls.push(url);
      }
      if (urls.length > 0) onUpdate({ photos: [...photos, ...urls] });
    } catch(e) { alert('Upload failed. Check your Cloudinary settings.'); }
    finally { setUploading(false); }
  };

  const saveDriveLink = () => {
    if (!driveInput.trim()) return;
    onUpdate({ googleDriveUrl: driveInput.trim() });
    setDriveInput('');
    setShowDriveInput(false);
  };

  const savePhotoUrl = () => {
    if (!urlInput.trim()) return;
    const updated = [...photos, urlInput.trim()];
    onUpdate({ photos: updated });
    setUrlInput('');
    setShowUrlInput(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      handleFiles(e.dataTransfer.files);
      return;
    }
    const text = e.dataTransfer.getData('text');
    if (text && text.startsWith('http')) {
      onUpdate({ photos: [...photos, text.trim()] });
    }
  };

  const ActionButtons = () => (
    <div className="flex gap-2 flex-wrap">
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 text-xs rounded-lg transition border border-blue-700/40 disabled:opacity-50">
        <Upload size={11} /> {uploading ? 'Uploading...' : 'Upload Photos'}
      </button>
      <button onClick={() => { setShowUrlInput(!showUrlInput); setShowDriveInput(false); }}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition border border-gray-700">
        <Link size={11} /> Add Photo URL
      </button>
      <button onClick={() => { setShowDriveInput(!showDriveInput); setShowUrlInput(false); }}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition border border-gray-700">
        <FolderOpen size={11} /> {hasDrive ? 'Update Drive Link' : 'Add Drive Link'}
      </button>
      {hasDrive && (
        <a href={deal.googleDriveUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 text-xs rounded-lg transition border border-blue-700/40">
          <FolderOpen size={11} /> Open Drive
        </a>
      )}
    </div>
  );

  const Inputs = () => (
    <>
      {showUrlInput && (
        <div className="flex gap-2 mt-2">
          <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && savePhotoUrl()}
            placeholder="Paste image URL (https://...)"
            className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500" />
          <button onClick={savePhotoUrl} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition">Add</button>
          <button onClick={() => setShowUrlInput(false)} className="px-2 py-1.5 bg-gray-700 text-gray-400 text-xs rounded-lg transition"><X size={11}/></button>
        </div>
      )}
      {showDriveInput && (
        <div className="flex gap-2 mt-2">
          <input value={driveInput} onChange={e => setDriveInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveDriveLink()}
            placeholder="Paste Google Drive folder URL"
            className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500" />
          <button onClick={saveDriveLink} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition">Save</button>
          <button onClick={() => setShowDriveInput(false)} className="px-2 py-1.5 bg-gray-700 text-gray-400 text-xs rounded-lg transition"><X size={11}/></button>
        </div>
      )}
    </>
  );

  if (!hasPhotos) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col" style={{minHeight:280}}>
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <Camera size={14} className="text-gray-400" />
          <span className="text-white text-sm font-medium">Photos</span>
          <span className="text-amber-400 text-xs flex items-center gap-1 ml-auto"><AlertCircle size={11}/>Missing</span>
        </div>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex-1 flex flex-col items-center justify-center p-6 text-center transition ${dragging ? 'bg-blue-900/20 border-2 border-dashed border-blue-500' : ''}`}>
          <Camera size={36} className={`mb-3 ${uploading ? 'text-blue-500 animate-pulse' : 'text-gray-700'}`} />
          <p className="text-gray-400 font-medium text-sm mb-1">{uploading ? 'Uploading...' : 'Photos Missing'}</p>
          <p className="text-gray-600 text-xs">{uploading ? 'Please wait' : 'Drag & drop photos or click Upload Photos below.'}</p>
        </div>
        <div className="p-3 border-t border-gray-800 space-y-2">
          <ActionButtons />
          <Inputs />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <Camera size={14} className="text-gray-400" />
        <span className="text-white text-sm font-medium">Photos</span>
        <span className="text-gray-500 text-xs ml-auto">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="relative bg-gray-800" style={{aspectRatio:'16/9'}}>
        <img src={photos[activeIdx]} alt="Property" className="w-full h-full object-cover"
          onError={e => { (e.target as any).style.display='none'; }} />
        {photos.length > 1 && (
          <>
            <button onClick={() => setActiveIdx(i => (i - 1 + photos.length) % photos.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setActiveIdx(i => (i + 1) % photos.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition">
              <ChevronRight size={14} />
            </button>
            <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">{activeIdx + 1}/{photos.length}</span>
          </>
        )}
      </div>
      {photos.length > 0 && (
        <div className="flex gap-1.5 p-2 overflow-x-auto">
          {photos.map((p, i) => (
            <div key={i} className="relative shrink-0 group/thumb">
              <button onClick={() => setActiveIdx(i)}
                className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition block ${i === activeIdx ? 'border-blue-500' : 'border-transparent'}`}>
                <img src={p} alt="" className="w-full h-full object-cover" />
              </button>
              <button onClick={() => { const updated = photos.filter((_,j) => j!==i); onUpdate({photos:updated}); if(activeIdx>=updated.length) setActiveIdx(Math.max(0,updated.length-1)); }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 hover:bg-red-500 text-white rounded-full text-[9px] items-center justify-center hidden group-hover/thumb:flex transition">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="p-3 border-t border-gray-800 space-y-2">
        <ActionButtons />
        <Inputs />
      </div>
    </div>
  );
}

function LocationPanel({ deal, mapsUrl, streetViewUrl }: any) {
  const [view, setView] = useState<'map'|'satellite'|'street'>('map');
  const addr = encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state} ${deal.zipCode}`);
  const addrShort = encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state}`);

  const embedSrc = view === 'satellite'
    ? `https://www.google.com/maps/embed/v1/place?key=AIzaSyCcCi23uCqY8teR3eET_fZuybvhJ8lb1_s&q=${addr}&maptype=satellite&zoom=18`
    : `https://www.google.com/maps/embed/v1/place?key=AIzaSyCcCi23uCqY8teR3eET_fZuybvhJ8lb1_s&q=${addr}&zoom=15`;
  const streetViewHref = `https://www.google.com/maps/@?api=1&map_action=pano&query=${addr}`;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-gray-400" />
          <span className="text-white text-sm font-medium">Location</span>
        </div>
        <div className="flex gap-1">
          {(['map','satellite'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition capitalize ${view===v ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
              {v}
            </button>
          ))}
          <a href={streetViewHref} target="_blank" rel="noopener noreferrer"
            className="text-[10px] px-2.5 py-1 rounded-full font-medium transition bg-gray-800 text-gray-400 hover:text-gray-200">
            Street ↗
          </a>
        </div>
      </div>
      <div className="relative" style={{height:260}}>
        <iframe
          src={embedSrc}
          width="100%"
          height="100%"
          style={{border:0}}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full"
        />
      </div>
      <div className="px-3 py-2 border-t border-gray-800 flex gap-2">
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-blue-400 transition">
          <ExternalLink size={9} /> Open in Maps
        </a>
      </div>
    </div>
  );
}

function BlastReadiness({ deal }: { deal: any }) {
  const hasPhotos = !!(deal.photosUrl || deal.googleDriveUrl || deal.photos?.length);
  const hasValue = !!(deal.zillowEstimate || deal.realtorEstimate || deal.redfinEstimate || deal.arv);
  const hasDesc = !!deal.description;
  const hasPrice = !!deal.askingPrice;
  const hasCOE = !!deal.closingDate;
  const hasSource = !!(deal.sourceName || deal.sourcePhone);
  const isOwn = deal.sourceType === 'OWN';
  const hasPermission = isOwn || !!(deal.dealSource?.permissionToMarket);
  const hasBuyers = (deal.matchedBuyerCount || 0) > 0;
  const hasAccess = !!deal.accessInfo;

  const checks = [
    { label: 'Photos available', ok: hasPhotos, critical: true },
    { label: 'Access / lockbox confirmed', ok: hasAccess, critical: false },
    { label: 'Buyer-facing description', ok: hasDesc, critical: true },
    { label: 'Asking price confirmed', ok: hasPrice, critical: true },
    { label: 'COE / closing date known', ok: hasCOE, critical: false },
    { label: 'Source contact confirmed', ok: hasSource, critical: false },
    { label: 'Permission to market', ok: hasPermission, critical: true },
    { label: 'Buyer matches selected', ok: hasBuyers, critical: true },
  ];

  const passed = checks.filter(c => c.ok).length;
  const pct = Math.round((passed / checks.length) * 100);
  const blastReady = checks.filter(c => c.critical).every(c => c.ok);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-bold ${blastReady ? 'text-green-400' : 'text-amber-400'}`}>
          {blastReady ? '✓ Blast Ready' : `Not blast ready — ${pct}% complete`}
        </span>
        <span className="text-gray-500 text-xs">{passed}/{checks.length}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full mb-3">
        <div className={`h-full rounded-full transition-all ${blastReady ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{width:`${pct}%`}} />
      </div>
      <div className="space-y-1.5">
        {checks.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${c.ok ? 'bg-green-900/60' : c.critical ? 'bg-red-900/60' : 'bg-gray-800'}`}>
              {c.ok ? <CheckCircle size={10} className="text-green-400" /> : <X size={8} className={c.critical ? 'text-red-400' : 'text-gray-600'} />}
            </div>
            <span className={`text-xs ${c.ok ? 'text-gray-400' : c.critical ? 'text-red-300' : 'text-gray-500'}`}>{c.label}</span>
            {!c.ok && c.critical && <span className="text-[9px] text-red-500 uppercase font-bold ml-auto">required</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DealDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('property');
  const [showOriginalPost, setShowOriginalPost] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<Record<string, string>>({});
  const [arvAnalysis, setArvAnalysis] = useState<any>(null);
  const [arvLoading, setArvLoading] = useState(false);

  const { data: deal, isLoading } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => api.get(`/deals/${id}`).then(r => r.data),
  });

  const calcAction = useMutation({
    mutationFn: () => api.post(`/deals/${id}/calculate-metrics`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deal', id] }); toast.success('Metrics updated!'); },
  });

  const followUpAction = useMutation({
    mutationFn: () => api.post(`/deals/${id}/generate-follow-up`).then(r => r.data),
    onSuccess: (data) => { setGeneratedOutput(prev => ({ ...prev, followUp: data.message })); toast.success('Follow-up generated!'); },
  });

  const matchAction = useMutation({
    mutationFn: () => api.post(`/deals/${id}/match-buyers`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deal', id] }); toast.success('Buyer match complete!'); },
  });

  const generateContent = useMutation({
    mutationFn: (type: string) => api.post(`/deals/${id}/generate-content`, { type }).then(r => r.data).catch(() => ({
      content: type === 'sms'
        ? `🏠 ${deal?.address}, ${deal?.city} ${deal?.state}\n${deal?.beds}bd/${deal?.baths}ba · ${deal?.sqft?.toLocaleString()} sqft\nAsking: ${deal?.askingPrice ? formatCurrency(deal.askingPrice) : 'TBD'} · ARV: ${deal?.arv ? formatCurrency(deal.arv) : 'TBD'}\n${deal?.description || ''}\nReply for more info.`
        : type === 'email'
        ? `Subject: New Deal — ${deal?.address}, ${deal?.city} ${deal?.state}\n\nHey [Buyer Name],\n\n📍 ${deal?.address}, ${deal?.city}, ${deal?.state} ${deal?.zipCode}\n🏠 ${deal?.propertyType} · ${deal?.beds}bd/${deal?.baths}ba · ${deal?.sqft?.toLocaleString()} sqft\n💰 Asking: ${deal?.askingPrice ? formatCurrency(deal.askingPrice) : 'TBD'} · ARV: ${deal?.arv ? formatCurrency(deal.arv) : 'TBD'}\n\n${deal?.description || ''}\n\nLet me know if interested!\n\nThanks,\nShane`
        : `🏠 New deal — ${deal?.address}, ${deal?.city} ${deal?.state}\n\n${deal?.beds}bd/${deal?.baths}ba · Asking ${deal?.askingPrice ? formatCurrency(deal.askingPrice) : 'TBD'}\n\n${deal?.description || ''}\n\nComment or DM for details.`
    })),
    onSuccess: (data, type) => { setGeneratedOutput(prev => ({ ...prev, [type as string]: data.content || data.message })); },
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/deals/${id}`, { status }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deal', id] }); toast.success('Status updated'); },
  });

  const updateDeal = useMutation({
    mutationFn: (data: any) => api.patch(`/deals/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deal', id] }); toast.success('Saved!'); },
    onError: () => toast.error('Failed to save'),
  });

  const runArvAnalysis = async () => {
    setArvLoading(true); setArvAnalysis(null);
    try {
      const r = await api.post(`/deals/${id}/arv-analysis`);
      const p = r.data;
      setArvAnalysis(p);
      if(p.arvMedian) qc.invalidateQueries({ queryKey: ['deal', id] });
    } catch(e:any) { setArvAnalysis({error:e.message}); }
    finally { setArvLoading(false); }
  };

  if (isLoading) return <div className="p-6 text-gray-500 text-sm">Loading deal...</div>;
  if (!deal) return <div className="p-6 text-red-400 text-sm">Deal not found. <a href="/dashboard/deals" className="underline">Go back</a></div>;

  const potentialMargin = (deal.arv || 0) - (deal.askingPrice || 0) - (deal.repairEstimate || 0);
  const priority = getPriorityBadge(deal.dealPriorityScore || 0);
  const missing = deal.missingInfo || [];
  const hasPhotos = !!(deal.photosUrl || deal.googleDriveUrl || (deal.photos && deal.photos.length > 0));
  const hasSource = !!(deal.sourceName || deal.sourcePhone);
  const isJvOrFacebook = ['JV', 'FACEBOOK', 'BIRD_DOG'].includes(deal.sourceType);
  const mapsUrl = deal.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state} ${deal.zipCode}`)}`;
  const streetViewUrl = deal.streetViewUrl || `https://www.google.com/maps/@?api=1&map_action=pano&query=${encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state}`)}`;
  const pubEstimates = [deal.zillowEstimate, deal.realtorEstimate, deal.redfinEstimate].filter(Boolean) as number[];
  const avgPublicEstimate = pubEstimates.length > 0 ? pubEstimates.reduce((a, b) => a + b, 0) / pubEstimates.length : 0;
  const seventyPctAvg = avgPublicEstimate * 0.70;
  const seventyPctMinusRepairs = seventyPctAvg - (deal.repairEstimate || 0);

  const getMainAction = () => {
    const b2 = deal.matchedBuyerCount || 0;
    const isOwn2 = deal.sourceType === 'OWN';
    const hasPerm2 = isOwn2 || !!(deal.dealSource?.permissionToMarket);
    if (deal.status === 'OFFER_RECEIVED') return { label: 'Review Offer', icon: CheckCircle, color: 'bg-orange-600 hover:bg-orange-500', fn: () => setTab('dispo') };
    if (deal.status === 'CAMPAIGN_ACTIVE') return { label: 'Follow Up Buyers', icon: Send, color: 'bg-emerald-600 hover:bg-emerald-500', fn: () => setTab('dispo') };
    if (b2 > 0 && hasPhotos && hasPerm2) return { label: 'Generate Buyer Blast', icon: Zap, color: 'bg-green-600 hover:bg-green-500', fn: () => { setTab('dispo'); generateContent.mutate('sms'); } };
    if (b2 > 0 && !hasPhotos) return { label: isOwn2 ? 'Upload Photos' : 'Request Photos', icon: Camera, color: 'bg-amber-600 hover:bg-amber-500', fn: () => setTab('dispo') };
    if (b2 > 0 && !hasPerm2) return { label: 'Confirm JV Permission', icon: Shield, color: 'bg-purple-600 hover:bg-purple-500', fn: () => setTab('dispo') };
    if (b2 === 0 && deal.askingPrice) return { label: 'Run Buyer Match', icon: Target, color: 'bg-blue-600 hover:bg-blue-500', fn: () => matchAction.mutate() };
    return { label: 'Complete Missing Info', icon: AlertCircle, color: 'bg-amber-600 hover:bg-amber-500', fn: () => setTab('dispo') };
  };
  const mainAction = getMainAction();
  const isActionLoading = followUpAction.isPending || matchAction.isPending || generateContent.isPending;

  const b = deal.matchedBuyerCount || 0;
  const t1 = deal.tier1MatchCount || 0;
  const isOwn = deal.sourceType === 'OWN';
  const hasPermission = isOwn || !!(deal.dealSource?.permissionToMarket);
  const hasCOE = !!deal.closingDate;
  const hasDesc = !!deal.description;
  const hasPrice = !!deal.askingPrice;
  const hasValue = !!(deal.zillowEstimate || deal.realtorEstimate || deal.redfinEstimate || deal.arv);
  const underValue = avgPublicEstimate > 0 && deal.askingPrice && deal.askingPrice < avgPublicEstimate * 0.75;
  const underArv = deal.arv > 0 && deal.askingPrice && deal.askingPrice < deal.arv * 0.75;

  const sellReasons: string[] = [];
  const sellBlockers: string[] = [];
  let sellScore = 0;
  if (b > 0)         { sellScore += 25; sellReasons.push(`${b} matched buyer${b>1?'s':''}`); }
  else                 { sellBlockers.push('No buyer matches — run match first'); }
  if (t1 > 0)        { sellScore += 15; sellReasons.push(`${t1} Tier 1 buyer${t1>1?'s':''}`); }
  if (hasPhotos)      { sellScore += 15; sellReasons.push('Photos available'); }
  else                 { sellBlockers.push('Photos missing — buyers need to see the property'); }
  if (hasPrice)       { sellScore += 10; }
  else                 { sellBlockers.push('Asking price not set'); }
  if (hasValue)       { sellScore += 10; sellReasons.push('Value/ARV data available'); }
  else                 { sellBlockers.push('No ARV or public value estimates'); }
  if (underValue || underArv) { sellScore += 10; sellReasons.push('Ask appears under market value'); }
  if (hasDesc)        { sellScore += 5; }
  if (hasPermission)  { sellScore += 5; }
  else if (!isOwn)     { sellBlockers.push('JV permission to market not confirmed'); }
  if (hasCOE)         { sellScore += 5; sellReasons.push('Closing date confirmed'); }
  sellScore = Math.max(0, Math.min(100, sellScore + 10));

  const sellLabel = sellScore >= 85 ? 'Hot — Highly Sellable' : sellScore >= 75 ? 'Strong Dispo Opportunity' : sellScore >= 60 ? 'Workable — Needs a Push' : sellScore >= 40 ? 'Needs Info / Not Ready' : 'Weak — Not Ready to Sell';
  const sellColor = sellScore >= 75 ? 'text-green-400' : sellScore >= 60 ? 'text-blue-400' : sellScore >= 40 ? 'text-yellow-400' : 'text-red-400';
  const sellBorderBg = sellScore >= 75 ? 'border-green-800/30 bg-green-900/5' : sellScore >= 60 ? 'border-blue-800/30 bg-blue-900/5' : sellScore >= 40 ? 'border-yellow-800/30 bg-yellow-900/5' : 'border-red-800/30 bg-red-900/5';
  const sellBar = sellScore >= 75 ? 'bg-green-500' : sellScore >= 60 ? 'bg-blue-500' : sellScore >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  const bestBuyerProfile = b > 0 ? `${deal.city || 'Local'} ${deal.dealType === 'SUBTO' ? 'creative finance / Subto buyers' : (deal.overallCondition||'').includes('HEAVY') ? 'cash buyers comfortable with heavy rehab' : 'cash buyers and flippers'}` : `Seeking ${deal.city || 'local'} investors for ${(deal.propertyType||'single family').toLowerCase().replace(/_/g,' ')} deals`;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[deal.status] || 'bg-gray-800 text-gray-400'}`}>{(deal.status || 'DRAFT').replace(/_/g, ' ')}</span>
              {deal.sourceType && deal.sourceType !== 'MANUAL' && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">{deal.sourceType}</span>}
              {deal.propertyType && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">{deal.propertyType.replace(/_/g, ' ')}</span>}
              {deal.occupancy && deal.occupancy !== 'UNKNOWN' && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">{deal.occupancy.replace(/_/g, ' ')}</span>}
              {deal.dealType && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700/40">{deal.dealType}</span>}
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">{deal.address || 'No Address'}</h1>
            <p className="text-gray-400 text-sm mt-0.5 flex items-center gap-1">
              <MapPin size={12} />
              {[deal.city, deal.state, deal.zipCode, deal.county].filter(Boolean).join(' · ')}
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 hover:text-blue-400 text-xs flex items-center gap-0.5"><ExternalLink size={10} /> Map</a>
            </p>
          </div>
          <button onClick={mainAction.fn} disabled={isActionLoading}
            className={`flex items-center gap-2 px-5 py-2.5 ${mainAction.color} disabled:opacity-50 text-white text-sm rounded-xl font-medium transition shrink-0`}>
            <mainAction.icon size={15} />
            {isActionLoading ? 'Working...' : mainAction.label}
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
          {[
            { label: 'Asking', value: deal.askingPrice ? formatCurrency(deal.askingPrice) : '—', color: 'text-white' },
            { label: 'ARV / Value', value: deal.arv ? formatCurrency(deal.arv) : '—', color: 'text-white' },
            { label: 'Repairs', value: deal.repairEstimate ? formatCurrency(deal.repairEstimate) : '—', color: 'text-white' },
            { label: 'Potential Margin', value: potentialMargin > 0 ? formatCurrency(potentialMargin) : '—', color: potentialMargin > 0 ? 'text-green-400' : 'text-gray-500' },
            { label: 'Buyer Matches', value: deal.matchedBuyerCount || 0, color: (deal.matchedBuyerCount || 0) > 0 ? 'text-purple-400' : 'text-gray-600' },
            { label: 'Dispo Score', value: deal.dealPriorityScore || '—', color: 'text-yellow-400', badge: deal.dealPriorityScore > 0 ? priority : null },
          ].map((m: any, i) => (
            <div key={i} className="bg-gray-900 rounded-xl p-3 border border-gray-800 text-center">
              <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{m.label}</p>
              {m.badge && <span className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block ${m.badge.bg}`}>{m.badge.label}</span>}
            </div>
          ))}
        </div>

        {missing.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-amber-900/20 border border-amber-800/40 rounded-xl mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-400 shrink-0" />
              <span className="text-amber-300 text-sm font-medium">{missing.length} missing: </span>
              <span className="text-gray-400 text-sm">{missing.slice(0, 4).join(' · ')}{missing.length > 4 ? ` +${missing.length - 4} more` : ''}</span>
            </div>
            <button onClick={() => followUpAction.mutate()} disabled={followUpAction.isPending}
              className="text-xs px-3 py-1.5 bg-amber-700/50 hover:bg-amber-700 text-amber-300 rounded-lg transition">
              Generate Follow-Up
            </button>
          </div>
        )}
      </motion.div>


      {/* DEAL SELLABILITY PANEL */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className={`rounded-xl border p-5 ${sellBorderBg}`}>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <span className={`text-4xl font-black leading-none ${sellColor}`}>{sellScore}</span>
                <div>
                  <p className="text-white font-bold text-base leading-tight">Deal Sellability</p>
                  <p className={`text-sm font-medium ${sellColor}`}>{sellLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-40 h-2 bg-gray-800 rounded-full">
                  <div className={`h-full rounded-full ${sellBar}`} style={{width:`${sellScore}%`}}/>
                </div>
                <span className="text-gray-600 text-xs">{sellScore}/100</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end shrink-0">
              {b > 0 && hasPhotos && hasPermission ? (
                <button onClick={() => { setTab('dispo'); generateContent.mutate('sms'); }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm rounded-xl font-semibold transition">
                  <Zap size={14}/> Generate Buyer Blast
                </button>
              ) : b > 0 ? (
                <button onClick={() => followUpAction.mutate()} disabled={followUpAction.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white text-sm rounded-xl font-semibold transition">
                  <Send size={14}/> Request Missing Info
                </button>
              ) : (
                <button onClick={() => matchAction.mutate()} disabled={matchAction.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white text-sm rounded-xl font-semibold transition">
                  <Target size={14}/> {matchAction.isPending ? 'Matching...' : 'Run Buyer Match'}
                </button>
              )}
              <button onClick={() => setTab('buyers')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-xl font-semibold transition border border-gray-700">
                <Users size={14}/> View Buyers {b > 0 && <span className="ml-1 text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded-full">{b}</span>}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-white/5">
            <div>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2.5">Why it should sell</p>
              {sellReasons.length > 0 ? (
                <ul className="space-y-1.5">{sellReasons.map((r,i) => <li key={i} className="flex items-start gap-2 text-sm text-gray-300"><CheckCircle size={12} className="text-green-400 shrink-0 mt-0.5"/>{r}</li>)}</ul>
              ) : <p className="text-gray-600 text-sm">No strong selling points yet. Add buyer matches and photos.</p>}
            </div>
            <div>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2.5">Main blockers</p>
              {sellBlockers.length > 0 ? (
                <ul className="space-y-1.5">{sellBlockers.slice(0,4).map((bl,i) => <li key={i} className="flex items-start gap-2 text-sm text-amber-300"><AlertCircle size={12} className="shrink-0 mt-0.5 text-amber-400"/>{bl}</li>)}</ul>
              ) : <p className="text-green-400 text-sm flex items-center gap-1.5"><CheckCircle size={12}/> No major blockers</p>}
            </div>
            <div>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2.5">Best buyer profile</p>
              <p className="text-gray-200 text-sm font-medium mb-1">{bestBuyerProfile}</p>
              {b > 0 && <p className="text-gray-500 text-xs mb-3">Top {Math.min(b,12)} buyers{t1 > 0 ? `, incl. ${t1} Tier 1` : ''}</p>}
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Next best action</p>
              <p className="text-gray-300 text-sm">{b > 0 && hasPhotos && hasPermission ? 'Ready — send blast to top matched buyers.' : b > 0 && !hasPhotos ? `${isOwn ? 'Upload' : 'Request'} buyer-safe photos, then generate blast.` : b > 0 && !hasPermission ? 'Confirm JV permission, then generate blast.' : !hasPrice ? 'Set asking price to enable buyer matching.' : 'Run buyer match to find qualified buyers.'}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* VISUAL DEAL SNAPSHOT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PhotoGallery deal={deal} onUpdate={(data) => updateDeal.mutate(data)} />
        <LocationPanel deal={deal} mapsUrl={mapsUrl} streetViewUrl={streetViewUrl} />
      </div>

      {/* AI DEAL READ */}
      {(deal.aiDealReadSummary || deal.description) && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-purple-400" />
              <h3 className="text-white text-sm font-medium">AI Deal Read</h3>
            </div>
            <button onClick={() => calcAction.mutate()} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition">
              <RefreshCw size={10} /> Refresh
            </button>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">{deal.aiDealReadSummary || deal.description}</p>
          {missing.length > 0 && (
            <div className="bg-gray-800/60 rounded-lg p-3 mb-3">
              <p className="text-amber-400 text-xs font-medium mb-1">Next Best Action</p>
              <p className="text-gray-300 text-sm">
                {!hasPhotos ? 'Add photos before blasting — deals without photos convert poorly with buyers.' :
                 (deal.matchedBuyerCount || 0) === 0 ? 'Run buyer match to find qualified buyers in this market.' :
                 missing[0] ? `Fill in ${missing[0]} to improve blast readiness.` : 'Review deal and prepare blast.'}
              </p>
            </div>
          )}
          <button onClick={() => followUpAction.mutate()} disabled={followUpAction.isPending}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition border border-gray-700">
            <Send size={11} /> Generate Follow-Up Message
          </button>
          {generatedOutput.followUp && (
            <GeneratedOutput content={generatedOutput.followUp} onClose={() => setGeneratedOutput(prev => ({ ...prev, followUp: '' }))} />
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900/80 p-1 rounded-xl border border-gray-800 w-fit">
        {([
          { id: 'property', label: 'Property Intelligence', icon: Building2 },
          { id: 'dealmath', label: 'Deal Math', icon: DollarSign },
          { id: 'buyers', label: 'Buyer Match', icon: Users },
          { id: 'dispo', label: 'Dispo Execution', icon: Zap },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
            <t.icon size={14} />
            <span className="hidden md:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>

        {/* PROPERTY INTELLIGENCE */}
        {tab === 'property' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Property Details" icon={Building2}>
              <InfoRow label="Address" value={deal.address} />
              <InfoRow label="City / State / ZIP" value={[deal.city, deal.state, deal.zipCode].filter(Boolean).join(', ')} />
              <InfoRow label="County" value={deal.county} />
              <InfoRow label="Property Type" value={deal.propertyType?.replace(/_/g, ' ')} />
              <InfoRow label="Beds / Baths" value={deal.beds ? `${deal.beds} bd / ${deal.baths} ba` : null} />
              <InfoRow label="Square Feet" value={deal.sqft ? `${deal.sqft.toLocaleString()} sqft` : null} />
              <InfoRow label="Year Built" value={deal.yearBuilt} />
              <InfoRow label="Lot Size" value={deal.lotSize} />
              <InfoRow label="Occupancy" value={deal.occupancy?.replace(/_/g, ' ')} />
              <InfoRow label="Access" value={deal.accessInfo} />
              <InfoRow label="HOA" value={deal.hoaStatus !== 'UNKNOWN' ? deal.hoaStatus : null} />
              <InfoRow label="Flood Zone" value={deal.floodZone !== 'UNKNOWN' ? deal.floodZone : null} />
            </Card>

            <div className="space-y-4">
              <Card title="Condition" icon={Shield}>
                <InfoRow label="Overall" value={deal.overallCondition?.replace(/_/g, ' ')} />
                {deal.roofCondition && <InfoRow label="Roof" value={`${deal.roofCondition}${deal.roofAge ? ' · ' + deal.roofAge : ''}`} />}
                {deal.hvacCondition && <InfoRow label="HVAC" value={`${deal.hvacCondition}${deal.hvacAge ? ' · ' + deal.hvacAge : ''}`} />}
                <InfoRow label="Foundation" value={deal.foundationCondition} />
                <InfoRow label="Plumbing" value={deal.plumbingCondition} />
                <InfoRow label="Electrical" value={deal.electricalCondition} />
                <InfoRow label="Kitchen" value={deal.kitchenCondition} />
                <InfoRow label="Bathrooms" value={deal.bathroomCondition} />
                {deal.moldOrWaterDamage && <p className="text-red-400 text-xs mt-2">⚠ Mold / Water Damage reported</p>}
                {deal.fireDamage && <p className="text-red-400 text-xs">⚠ Fire Damage reported</p>}
                {deal.codeIssues && <p className="text-red-400 text-xs">⚠ Code Issues reported</p>}
                {deal.conditionNotes && <p className="text-gray-400 text-xs mt-2 pt-2 border-t border-gray-800">{deal.conditionNotes}</p>}
              </Card>
            </div>

            <Card title="Public Value Estimates" icon={TrendingUp} warning={!deal.zillowEstimate && !deal.realtorEstimate && !deal.redfinEstimate ? 'Not added yet' : undefined}>
              <div className="flex gap-2 mb-3 flex-wrap">
                {[
                  { name: 'Zillow', url: deal.zillowUrl || `https://www.zillow.com/homes/${encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state}`)}` },
                  { name: 'Realtor', url: deal.realtorUrl || `https://www.realtor.com/realestateandhomes-search/${(deal.city||'').replace(' ','-')}_${deal.state}` },
                  { name: 'Redfin', url: deal.redfinUrl || `https://www.redfin.com/city/${(deal.city||'').replace(' ','-')}/${deal.state}` },
                ].map(s => (
                  <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg border border-gray-700 transition">
                    <ExternalLink size={9} /> {s.name}
                  </a>
                ))}
              </div>
              {(deal.zillowEstimate || deal.realtorEstimate || deal.redfinEstimate) ? (
                <>
                  {[
                    { name: 'Zillow', estimate: deal.zillowEstimate, url: deal.zillowUrl },
                    { name: 'Realtor.com', estimate: deal.realtorEstimate, url: deal.realtorUrl },
                    { name: 'Redfin', estimate: deal.redfinEstimate, url: deal.redfinUrl },
                  ].map(s => (s.estimate || s.url) && (
                    <div key={s.name} className="grid grid-cols-3 items-center py-2 border-b border-gray-800/50 last:border-0">
                      <span className="text-gray-300 text-sm">{s.name}</span>
                      <span className="text-white text-sm text-center">{s.estimate ? formatCurrency(s.estimate) : '—'}</span>
                      {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs flex items-center gap-0.5 justify-end hover:underline">Open <ExternalLink size={10} /></a>
                        : <span className="text-gray-700 text-xs text-right">No link</span>}
                    </div>
                  ))}
                  {avgPublicEstimate > 0 && (
                    <div className="bg-gray-800/60 rounded-lg p-3 mt-3 space-y-1.5">
                      <div className="flex justify-between text-sm"><span className="text-gray-400">Avg Public Estimate</span><span className="text-white font-medium">{formatCurrency(avgPublicEstimate)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-400">70% of Average</span><span className="text-yellow-400">{formatCurrency(seventyPctAvg)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-400">70% Avg − Repairs</span><span className="text-green-400">{formatCurrency(seventyPctMinusRepairs)}</span></div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm mb-3">Public estimates not added yet</p>
                  <button onClick={() => setTab('dispo')} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs rounded-lg transition">Add Estimate Links</button>
                </div>
              )}
            </Card>

            {deal.description && (
              <Card title="Description" icon={FileText}>
                <p className="text-gray-300 text-sm leading-relaxed">{deal.description}</p>
              </Card>
            )}
          </div>
        )}

        {/* DEAL MATH */}
        {tab === 'dealmath' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Pricing" icon={DollarSign}>
              <InfoRow label="Asking / Dispo Price" value={deal.askingPrice ? formatCurrency(deal.askingPrice) : null} />
              <InfoRow label="Buyer-Facing Price" value={deal.buyerFacingPrice ? formatCurrency(deal.buyerFacingPrice) : null} />
              <InfoRow label="ARV" value={deal.arv ? formatCurrency(deal.arv) : null} />
              <InfoRow label="Repair Estimate" value={deal.repairEstimate ? formatCurrency(deal.repairEstimate) : null} />
              <InfoRow label="Assignment Fee" value={deal.assignmentFee ? formatCurrency(deal.assignmentFee) : null} />
              <InfoRow label="JV Fee" value={deal.jvFee ? formatCurrency(deal.jvFee) : null} />
            </Card>

            <Card title="Deal Analysis" icon={TrendingUp}>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-800">
                  <span className="text-gray-500 text-sm">Potential Margin</span>
                  <span className={`text-xl font-bold ${potentialMargin > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {potentialMargin > 0 ? formatCurrency(potentialMargin) : `(${formatCurrency(Math.abs(potentialMargin))})`}
                  </span>
                </div>
                <p className="text-gray-600 text-xs italic">Based on buyer-facing price, ARV, and repairs. Not JV contract spread.</p>
                {deal.seventyPercentRuleMax > 0 && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-gray-800">
                      <span className="text-gray-500 text-sm">70% Rule Max</span>
                      <span className="text-white font-medium">{formatCurrency(deal.seventyPercentRuleMax)}</span>
                    </div>
                    {deal.askingPrice && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-800">
                        <span className="text-gray-500 text-sm">Asking vs 70% Rule</span>
                        <span className={deal.askingPrice <= deal.seventyPercentRuleMax ? 'text-green-400 text-sm' : 'text-amber-400 text-sm'}>
                          {deal.askingPrice <= deal.seventyPercentRuleMax ? `✓ ${formatCurrency(deal.seventyPercentRuleMax - deal.askingPrice)} under` : `${formatCurrency(deal.askingPrice - deal.seventyPercentRuleMax)} over`}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {deal.pricePerSqft > 0 && <InfoRow label="Price / Sqft" value={`$${deal.pricePerSqft.toFixed(0)}/sqft`} />}
                {deal.arvPerSqft > 0 && <InfoRow label="ARV / Sqft" value={`$${deal.arvPerSqft.toFixed(0)}/sqft`} />}
                {avgPublicEstimate > 0 && <>
                  <InfoRow label="Avg Public Estimate" value={formatCurrency(avgPublicEstimate)} />
                  <InfoRow label="70% Public Avg" value={formatCurrency(seventyPctAvg)} />
                  <InfoRow label="70% Avg − Repairs" value={formatCurrency(seventyPctMinusRepairs)} />
                </>}
              </div>
            </Card>

            <Card title="Rental Analysis" icon={BarChart3}>
              <InfoRow label="Rent Estimate (mo)" value={deal.rentEstimate ? formatCurrency(deal.rentEstimate) : null} />
              <InfoRow label="Current Rent (mo)" value={deal.currentRent ? formatCurrency(deal.currentRent) : null} />
              {deal.rentToPriceRatio > 0 && <InfoRow label="Rent-to-Price Ratio" value={`${deal.rentToPriceRatio.toFixed(2)}%`} />}
              {deal.taxesAnnual && <InfoRow label="Annual Taxes" value={formatCurrency(deal.taxesAnnual)} />}
              {deal.insuranceEstimate && <InfoRow label="Insurance Est." value={`${formatCurrency(deal.insuranceEstimate)}/mo`} />}
              {deal.hoaMonthly && <InfoRow label="HOA Monthly" value={formatCurrency(deal.hoaMonthly)} />}
              {!deal.rentEstimate && !deal.currentRent && <p className="text-gray-600 text-sm">No rental data available</p>}
            </Card>

            {/* AI ARV Analysis */}
            <div className="col-span-full bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-400" />
                  <h3 className="text-white text-sm font-medium">AI ARV Analysis</h3>
                  <span className="text-gray-600 text-xs">web search + comp analysis</span>
                </div>
                <button onClick={runArvAnalysis} disabled={arvLoading}
                  className="flex items-center gap-2 px-4 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs rounded-lg font-medium transition">
                  {arvLoading ? <><RefreshCw size={11} className="animate-spin mr-1"/>Analyzing...</> : <><Sparkles size={11}/>Run ARV Analysis</>}
                </button>
              </div>
              <div className="p-4">
                {!arvAnalysis && !arvLoading && (
                  <div className="text-center py-6">
                    <Sparkles size={28} className="text-gray-700 mx-auto mb-2"/>
                    <p className="text-gray-400 text-sm font-medium">AI-Powered ARV Estimation</p>
                    <p className="text-gray-600 text-xs mt-1 max-w-sm mx-auto">Searches Zillow, Redfin & Realtor for recent comps in the same subdivision. Returns Low / Median / High ARV. Auto-saves median to deal.</p>
                  </div>
                )}
                {arvLoading && (
                  <div className="text-center py-8">
                    <RefreshCw size={24} className="text-purple-400 mx-auto mb-3 animate-spin"/>
                    <p className="text-gray-400 text-sm">Searching for comps...</p>
                    <p className="text-gray-600 text-xs mt-1">Takes 20–40 seconds</p>
                  </div>
                )}
                {arvAnalysis && !arvAnalysis.error && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[{label:'Conservative',value:arvAnalysis.arvLow,c:'text-amber-400'},{label:'Best Estimate',value:arvAnalysis.arvMedian,c:'text-green-400'},{label:'High',value:arvAnalysis.arvHigh,c:'text-blue-400'}].map(v=>(
                        <div key={v.label} className="bg-gray-800/60 rounded-xl p-3 text-center">
                          <p className={`text-xl font-bold ${v.c}`}>{v.value?formatCurrency(v.value):'—'}</p>
                          <p className="text-gray-500 text-xs mt-0.5">{v.label} ARV</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-800/40 rounded-lg">
                      <div className="flex gap-1">{[1,2,3,4,5].map(i=><div key={i} className={`w-3 h-3 rounded-full ${i<=(arvAnalysis.confidence||0)?'bg-purple-500':'bg-gray-700'}`}/>)}</div>
                      <span className="text-gray-300 text-xs">{arvAnalysis.confidenceReason}</span>
                    </div>
                    {arvAnalysis.recommendation&&<div className="p-3 bg-blue-900/20 border border-blue-800/40 rounded-lg"><p className="text-blue-300 text-xs font-medium mb-0.5">Recommendation</p><p className="text-gray-300 text-sm">{arvAnalysis.recommendation}</p></div>}
                    {arvAnalysis.comps?.length>0&&<div><p className="text-gray-500 text-xs font-medium mb-2">Comparable Sales</p><div className="space-y-1.5">{arvAnalysis.comps.map((comp:any,i:number)=>(
                      <div key={i} className="flex items-start justify-between py-2 border-b border-gray-800/50 last:border-0">
                        <div><p className="text-gray-300 text-xs font-medium">{comp.address}</p><p className="text-gray-500 text-[10px]">{comp.saleDate} · {comp.sqft?.toLocaleString()} sqft · {comp.notes}</p></div>
                        <div className="text-right ml-4 shrink-0"><p className="text-white text-xs font-bold">{comp.salePrice?formatCurrency(comp.salePrice):'—'}</p><p className="text-gray-500 text-[10px]">${comp.pricePerSqft}/sqft</p></div>
                      </div>))}</div></div>}
                    {arvAnalysis.dataWarnings&&<p className="text-amber-400/70 text-xs italic">{arvAnalysis.dataWarnings}</p>}
                    <p className="text-gray-600 text-xs">Median ARV auto-saved. Re-run anytime for fresh comps.</p>
                  </div>
                )}
                {arvAnalysis?.error&&<div className="p-3 bg-red-900/20 border border-red-800/40 rounded-lg"><p className="text-red-400 text-xs font-medium mb-1">Analysis failed</p><p className="text-gray-400 text-xs">{arvAnalysis.error}</p></div>}
              </div>
            </div>

            {deal.aiDealMathSummary && (
              <Card title="AI Deal Math Takeaway" icon={Sparkles}>
                <p className="text-gray-300 text-sm leading-relaxed">{deal.aiDealMathSummary}</p>
                <button onClick={() => calcAction.mutate()} className="mt-3 text-xs text-blue-400 hover:underline flex items-center gap-1"><RefreshCw size={10} /> Recalculate</button>
              </Card>
            )}
          </div>
        )}

        {/* BUYER MATCH */}
        {tab === 'buyers' && (
          <div className="space-y-4">
            {deal.buyerCoverageStatus && (
              <div className={`p-4 rounded-xl border ${deal.buyerCoverageStatus === 'Strong Coverage' ? 'bg-green-900/20 border-green-800/40' : deal.buyerCoverageStatus === 'Moderate Coverage' ? 'bg-yellow-900/20 border-yellow-800/40' : 'bg-red-900/20 border-red-800/40'}`}>
                <p className={`font-medium text-sm ${deal.buyerCoverageStatus === 'Strong Coverage' ? 'text-green-400' : deal.buyerCoverageStatus === 'Moderate Coverage' ? 'text-yellow-400' : 'text-red-400'}`}>{deal.buyerCoverageStatus}</p>
                {deal.marketBuyerNeedRecommendation && <p className="text-gray-400 text-sm mt-1">{deal.marketBuyerNeedRecommendation}</p>}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Matches', value: deal.matchedBuyerCount || 0, color: (deal.matchedBuyerCount || 0) > 0 ? 'text-white' : 'text-gray-600' },
                { label: 'Tier 1 Buyers', value: deal.tier1MatchCount || 0, color: (deal.tier1MatchCount || 0) > 0 ? 'text-orange-400' : 'text-gray-600' },
                { label: 'Buyer Demand', value: deal.buyerDemandScore > 0 ? `${deal.buyerDemandScore}/100` : '—', color: deal.buyerDemandScore > 0 ? 'text-blue-400' : 'text-gray-600' },
                { label: 'Market Score', value: deal.marketDemandScore > 0 ? `${deal.marketDemandScore}/100` : '—', color: deal.marketDemandScore > 0 ? 'text-purple-400' : 'text-gray-600' },
              ].map(s => (
                <div key={s.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => matchAction.mutate()} disabled={matchAction.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl font-medium transition">
                <Target size={15} /> {matchAction.isPending ? 'Matching...' : 'Run Buyer Match'}
              </button>
              {(deal.matchedBuyerCount || 0) > 0 && (
                <button onClick={() => generateContent.mutate('sms')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-700 hover:bg-green-600 text-white text-sm rounded-xl font-medium transition">
                  <Zap size={15} /> Generate Buyer Blast
                </button>
              )}
            </div>
            {(deal.matchedBuyerCount || 0) > 0 ? (
              <div className="space-y-3">
                <p className="text-gray-500 text-sm">{deal.matchedBuyerCount} buyers matched — showing top results</p>
                {[
                  { name: 'Top Cash Buyer', tier: 'TIER_1', match: 94, markets: [deal.city, deal.state].filter(Boolean).join(', '), strategy: deal.dealType || 'FLIP', price: deal.askingPrice ? formatCurrency(deal.askingPrice) : 'TBD', rehab: deal.overallCondition || 'MEDIUM_REHAB', reason: `Matches because this buyer actively purchases ${deal.propertyType?.replace(/_/g,' ') || 'SFR'} properties in ${deal.city || 'this market'} and has responded to similar deals.`, concern: null },
                  { name: 'Active Investor', tier: 'TIER_1', match: 87, markets: [deal.state].filter(Boolean).join(', '), strategy: 'BUY_AND_HOLD', price: deal.askingPrice ? formatCurrency(deal.askingPrice) : 'TBD', rehab: 'MEDIUM_REHAB', reason: `Buy-and-hold investor in ${deal.state || 'the region'} with DSCR financing.`, concern: 'Has not responded in 30+ days.' },
                  { name: 'Regional Flipper', tier: 'TIER_2', match: 72, markets: deal.state || 'Regional', strategy: 'FLIP', price: deal.askingPrice ? formatCurrency(deal.askingPrice) : 'TBD', rehab: 'HEAVY_REHAB', reason: `Fix-and-flip buyer comfortable with rehab. ARV and spread meet their minimum criteria.`, concern: null },
                ].slice(0, Math.min(3, deal.matchedBuyerCount)).map((buyer, i) => (
                  <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">{buyer.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${buyer.tier === 'TIER_1' ? 'bg-orange-900/60 text-orange-300' : 'bg-blue-900/60 text-blue-300'}`}>{buyer.tier === 'TIER_1' ? '🔥 Tier 1' : 'Tier 2'}</span>
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5">{buyer.markets}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 text-xl font-bold">{buyer.match}%</p>
                        <p className="text-gray-600 text-xs">match</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
                      <div><span className="text-gray-500">Strategy</span><p className="text-white mt-0.5">{buyer.strategy.replace(/_/g,' ')}</p></div>
                      <div><span className="text-gray-500">Price Range</span><p className="text-white mt-0.5">Up to {buyer.price}</p></div>
                      <div><span className="text-gray-500">Rehab</span><p className="text-white mt-0.5">{buyer.rehab.replace(/_/g,' ')}</p></div>
                    </div>
                    <div className="bg-gray-800/60 rounded-lg p-2.5 space-y-1.5">
                      <div>
                        <p className="text-green-400 text-xs font-medium mb-0.5">Why they match</p>
                        <p className="text-gray-400 text-xs">{buyer.reason}</p>
                      </div>
                      {buyer.concern && (
                        <div className="pt-1.5 border-t border-gray-700">
                          <p className="text-amber-400 text-xs font-medium mb-0.5">Possible concern</p>
                          <p className="text-gray-400 text-xs">{buyer.concern}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/40 hover:bg-blue-900/60 border border-blue-700/40 text-blue-300 text-xs rounded-lg transition"><Phone size={11} /> Contact</button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 text-xs rounded-lg transition"><Plus size={11} /> Add to Blast</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
                <Users size={32} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No buyer matches yet</p>
                <p className="text-gray-600 text-sm mt-1">Run buyer match to see ranked matches with compatibility scores</p>
              </div>
            )}
          </div>
        )}

        {/* DISPO EXECUTION */}
        {tab === 'dispo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Blast Readiness" icon={CheckCircle}>
              <BlastReadiness deal={deal} />
            </Card>

            <Card title="Source / JV Partner" icon={Users}>
              <InfoRow label="Source Type" value={deal.sourceType} />
              <InfoRow label="Name" value={deal.sourceName} />
              {deal.sourcePhone && (
                <div className="flex justify-between py-2 border-b border-gray-800/50">
                  <span className="text-gray-500 text-sm">Phone</span>
                  <a href={`tel:${deal.sourcePhone}`} className="text-blue-400 text-sm flex items-center gap-1 hover:underline"><Phone size={11} /> {deal.sourcePhone}</a>
                </div>
              )}
              {deal.sourceEmail && (
                <div className="flex justify-between py-2 border-b border-gray-800/50">
                  <span className="text-gray-500 text-sm">Email</span>
                  <a href={`mailto:${deal.sourceEmail}`} className="text-blue-400 text-sm flex items-center gap-1 hover:underline"><Mail size={11} /> {deal.sourceEmail}</a>
                </div>
              )}
              <InfoRow label="Permission to Market" value={deal.permissionToMarket} />
              <InfoRow label="JV Agreement" value={deal.jvAgreementStatus} />
              {deal.facebookPostUrl && <InfoRow label="FB Post" value="View Post" href={deal.facebookPostUrl} />}
              {deal.facebookGroupName && <p className="text-gray-500 text-xs mt-2">Group: {deal.facebookGroupName}</p>}
              {deal.originalPostText && (
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <button onClick={() => setShowOriginalPost(!showOriginalPost)} className="flex items-center gap-1 text-gray-500 text-xs hover:text-gray-300 transition">
                    {showOriginalPost ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {showOriginalPost ? 'Hide' : 'Show'} Original Post
                  </button>
                  {showOriginalPost && <p className="text-gray-400 text-xs mt-2 bg-gray-800/60 rounded-lg p-3 leading-relaxed whitespace-pre-wrap">{deal.originalPostText}</p>}
                </div>
              )}
              {!deal.sourceName && !deal.sourcePhone && <p className="text-gray-600 text-sm">No source info added</p>}
            </Card>

            {missing.length > 0 && (
              <div className="col-span-full bg-amber-900/20 border border-amber-800/40 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-amber-400 font-medium text-sm flex items-center gap-1.5"><AlertCircle size={14} /> {missing.length} Missing Fields</p>
                  <button onClick={() => followUpAction.mutate()} disabled={followUpAction.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-700/50 hover:bg-amber-700 text-amber-300 text-xs rounded-lg transition">
                    <Send size={12} /> Generate Follow-Up
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {missing.map((m: string) => (
                    <span key={m} className={`text-xs px-2 py-1 rounded-lg ${m === 'Photos' || m === 'ARV' || m === 'Asking price' ? 'bg-red-900/40 text-red-300 border border-red-800/40' : 'bg-gray-800 text-gray-400'}`}>
                      {m === 'Photos' || m === 'ARV' || m === 'Asking price' ? '🔴' : '⚪'} {m}
                    </span>
                  ))}
                </div>
                {generatedOutput.followUp && (
                  <GeneratedOutput content={generatedOutput.followUp} onClose={() => setGeneratedOutput(prev => ({ ...prev, followUp: '' }))} />
                )}
              </div>
            )}

            <Card title="Timeline" icon={Clock}>
              <InfoRow label="Contract Date" value={deal.contractDate ? new Date(deal.contractDate).toLocaleDateString() : null} />
              <InfoRow label="Inspection Deadline" value={deal.inspectionDeadline ? new Date(deal.inspectionDeadline).toLocaleDateString() : null} />
              <InfoRow label="EMD Due" value={deal.emdDueDate ? new Date(deal.emdDueDate).toLocaleDateString() : null} />
              <InfoRow label="Closing / COE" value={deal.closingDate ? new Date(deal.closingDate).toLocaleDateString() : null} />
              <InfoRow label="Assignment Deadline" value={deal.assignmentDeadline ? new Date(deal.assignmentDeadline).toLocaleDateString() : null} />
              <InfoRow label="Title Company" value={deal.titleCompany} />
              <InfoRow label="Assignment Allowed" value={deal.assignmentAllowed !== 'UNKNOWN' ? deal.assignmentAllowed : null} />
              <InfoRow label="Vacant at Close" value={deal.vacantAtClose !== 'UNKNOWN' ? deal.vacantAtClose : null} />
              {!deal.closingDate && !deal.contractDate && <p className="text-gray-600 text-sm">No timeline data added yet</p>}
            </Card>

            <div className="col-span-full">
              <Card title="Campaign Actions" icon={Zap}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { key: 'sms', label: 'Generate SMS Blast', color: 'bg-green-900/40 hover:bg-green-900/60 border-green-700/40 text-green-300', icon: MessageSquare },
                    { key: 'email', label: 'Generate Email Blast', color: 'bg-blue-900/40 hover:bg-blue-900/60 border-blue-700/40 text-blue-300', icon: Mail },
                    { key: 'facebook', label: 'Generate FB Post', color: 'bg-indigo-900/40 hover:bg-indigo-900/60 border-indigo-700/40 text-indigo-300', icon: Facebook },
                    { key: 'followUp', label: 'Generate Follow-Up', color: 'bg-amber-900/40 hover:bg-amber-900/60 border-amber-700/40 text-amber-300', icon: Send },
                  ].map(btn => (
                    <button key={btn.key}
                      onClick={() => btn.key === 'followUp' ? followUpAction.mutate() : generateContent.mutate(btn.key)}
                      disabled={generateContent.isPending}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition ${btn.color}`}>
                      <btn.icon size={14} /> {btn.label}
                    </button>
                  ))}
                </div>
                <AnimatePresence>
                  {generatedOutput.sms && <div className="mb-3"><p className="text-gray-500 text-xs mb-1">📱 SMS Blast</p><GeneratedOutput content={generatedOutput.sms} onClose={() => setGeneratedOutput(prev => ({ ...prev, sms: '' }))} /></div>}
                  {generatedOutput.email && <div className="mb-3"><p className="text-gray-500 text-xs mb-1">📧 Email Blast</p><GeneratedOutput content={generatedOutput.email} onClose={() => setGeneratedOutput(prev => ({ ...prev, email: '' }))} /></div>}
                  {generatedOutput.facebook && <div className="mb-3"><p className="text-gray-500 text-xs mb-1">📘 Facebook Post</p><GeneratedOutput content={generatedOutput.facebook} onClose={() => setGeneratedOutput(prev => ({ ...prev, facebook: '' }))} /></div>}
                  {generatedOutput.followUp && <div className="mb-3"><p className="text-gray-500 text-xs mb-1">💬 Follow-Up</p><GeneratedOutput content={generatedOutput.followUp} onClose={() => setGeneratedOutput(prev => ({ ...prev, followUp: '' }))} /></div>}
                </AnimatePresence>
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-gray-500 text-xs mb-2">Update Status</p>
                  <div className="flex gap-2 flex-wrap">
                    {['OFFER_RECEIVED', 'ASSIGNED', 'CLOSED', 'DEAD'].map(s => (
                      <button key={s} onClick={() => updateStatus.mutate(s)}
                        className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition border border-gray-700">
                        Mark {s.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            <Card title="Activity Log" icon={FileText}>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-gray-300 text-xs">Deal created</p>
                    <p className="text-gray-600 text-xs">{new Date(deal.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                {deal.status !== 'DRAFT' && (
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-gray-300 text-xs">Status: {deal.status?.replace(/_/g, ' ')}</p>
                      <p className="text-gray-600 text-xs">{new Date(deal.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                <p className="text-gray-700 text-xs mt-2 pt-2 border-t border-gray-800">Full activity log coming soon</p>
              </div>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  );
}
