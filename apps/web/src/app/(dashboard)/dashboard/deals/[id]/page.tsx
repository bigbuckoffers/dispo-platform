'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, DollarSign, Users, Zap, AlertCircle, Building2,
  TrendingUp, Target, Send, Clock, FileText, ExternalLink,
  Phone, Mail, RefreshCw, Sparkles, Shield, BarChart3,
  Copy, CheckCircle, ChevronDown, ChevronUp, Camera, FolderOpen,
  Globe, Eye, Facebook, MessageSquare, Edit3, X,
  ChevronLeft, ChevronRight, Upload, Link, Plus, ArrowLeft
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'dealmath' | 'buyers' | 'dispo' | 'source';

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

function Card({ title, icon: Icon, children, className = '', action }: any) {
  return (
    <div className={`bg-gray-900 rounded-xl border border-gray-800 overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-gray-400" />}
          <h3 className="text-white text-sm font-medium">{title}</h3>
        </div>
        {action}
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

function PhotoGallery({ deal, onUpdate, compact = false }: { deal: any; onUpdate: (data: any) => void; compact?: boolean }) {
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
    } catch(e) { alert('Upload failed.'); }
    finally { setUploading(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files?.length > 0) { handleFiles(e.dataTransfer.files); return; }
    const text = e.dataTransfer.getData('text');
    if (text?.startsWith('http')) onUpdate({ photos: [...photos, text.trim()] });
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
        <Link size={11} /> Add URL
      </button>
      <button onClick={() => { setShowDriveInput(!showDriveInput); setShowUrlInput(false); }}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition border border-gray-700">
        <FolderOpen size={11} /> {hasDrive ? 'Update Drive' : 'Add Drive Link'}
      </button>
      {hasDrive && (
        <a href={deal.googleDriveUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/40 text-blue-300 text-xs rounded-lg border border-blue-700/40">
          <FolderOpen size={11} /> Open Drive
        </a>
      )}
    </div>
  );

  if (photos.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col h-full"
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}>
        <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center transition ${dragging ? 'bg-blue-900/20' : ''}`}>
          <Camera size={40} className={`mb-3 ${uploading ? 'text-blue-500 animate-pulse' : 'text-gray-700'}`} />
          <p className="text-gray-400 font-semibold text-sm mb-1">{uploading ? 'Uploading...' : 'No Photos Yet'}</p>
          <p className="text-gray-600 text-xs mb-4">Buyers need photos to make an offer</p>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition font-medium">
            <Upload size={13} /> Upload Photos
          </button>
        </div>
        <div className="p-3 border-t border-gray-800 space-y-2">
          <div className="flex gap-2">
            <button onClick={() => { setShowUrlInput(!showUrlInput); setShowDriveInput(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition border border-gray-700">
              <Link size={11} /> Add URL
            </button>
            <button onClick={() => { setShowDriveInput(!showDriveInput); setShowUrlInput(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition border border-gray-700">
              <FolderOpen size={11} /> Add Drive Link
            </button>
          </div>
          {showUrlInput && (
            <div className="flex gap-2">
              <input value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => { if(e.key==='Enter'){onUpdate({photos:[...photos,urlInput.trim()]});setUrlInput('');setShowUrlInput(false);}}}
                placeholder="Paste image URL" className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none" />
              <button onClick={() => {onUpdate({photos:[...photos,urlInput.trim()]});setUrlInput('');setShowUrlInput(false);}} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg">Add</button>
            </div>
          )}
          {showDriveInput && (
            <div className="flex gap-2">
              <input value={driveInput} onChange={e => setDriveInput(e.target.value)} onKeyDown={e => { if(e.key==='Enter'){onUpdate({googleDriveUrl:driveInput.trim()});setDriveInput('');setShowDriveInput(false);}}}
                placeholder="Google Drive folder URL" className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none" />
              <button onClick={() => {onUpdate({googleDriveUrl:driveInput.trim()});setDriveInput('');setShowDriveInput(false);}} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg">Save</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden h-full flex flex-col">
      <div className="relative bg-gray-800 flex-1 group" style={{minHeight:compact?200:280}}>
        <img src={photos[activeIdx]} alt="Property" className="w-full h-full object-cover absolute inset-0"
          onError={e => { (e.target as any).style.display='none'; }} />
        <button onClick={() => { const u=photos.filter((_,j)=>j!==activeIdx); onUpdate({photos:u}); setActiveIdx(Math.max(0,u.length-1)); }}
          className="absolute top-2 right-2 w-7 h-7 bg-red-600/80 hover:bg-red-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex z-10 transition">✕</button>
        {photos.length > 1 && (
          <>
            <button onClick={() => setActiveIdx(i => (i-1+photos.length)%photos.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition z-10">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setActiveIdx(i => (i+1)%photos.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition z-10">
              <ChevronRight size={14} />
            </button>
            <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded-full z-10">{activeIdx+1}/{photos.length}</span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-1.5 p-2 overflow-x-auto border-t border-gray-800">
          {photos.map((p,i) => (
            <div key={i} className="relative shrink-0 group/thumb">
              <button onClick={() => setActiveIdx(i)} className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition block ${i===activeIdx?'border-blue-500':'border-transparent'}`}>
                <img src={p} alt="" className="w-full h-full object-cover" />
              </button>
              <button onClick={() => { const u=photos.filter((_,j)=>j!==i); onUpdate({photos:u}); setActiveIdx(Math.max(0,u.length-1)); }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 hover:bg-red-500 text-white rounded-full text-[9px] items-center justify-center hidden group-hover/thumb:flex z-10">✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="p-3 border-t border-gray-800">
        <ActionButtons />
        {showUrlInput && (
          <div className="flex gap-2 mt-2">
            <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="Paste image URL"
              className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none" />
            <button onClick={() => {onUpdate({photos:[...photos,urlInput.trim()]});setUrlInput('');setShowUrlInput(false);}} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg">Add</button>
          </div>
        )}
        {showDriveInput && (
          <div className="flex gap-2 mt-2">
            <input value={driveInput} onChange={e => setDriveInput(e.target.value)} placeholder="Google Drive folder URL"
              className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none" />
            <button onClick={() => {onUpdate({googleDriveUrl:driveInput.trim()});setDriveInput('');setShowDriveInput(false);}} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg">Save</button>
          </div>
        )}
      </div>
    </div>
  );
}

function LocationPanel({ deal, mapsUrl }: any) {
  const [view, setView] = useState<'map'|'satellite'>('map');
  const addr = encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state} ${deal.zipCode}`);
  const streetViewHref = `https://www.google.com/maps/@?api=1&map_action=pano&query=${addr}`;
  const embedSrc = view==='satellite'
    ? `https://www.google.com/maps/embed/v1/place?key=AIzaSyCcCi23uCqY8teR3eET_fZuybvhJ8lb1_s&q=${addr}&maptype=satellite&zoom=18`
    : `https://www.google.com/maps/embed/v1/place?key=AIzaSyCcCi23uCqY8teR3eET_fZuybvhJ8lb1_s&q=${addr}&zoom=15`;
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5"><MapPin size={12} className="text-gray-500" /><span className="text-gray-300 text-xs font-medium">Location</span></div>
        <div className="flex gap-1">
          {(['map','satellite'] as const).map(v=>(
            <button key={v} onClick={()=>setView(v)} className={`text-[10px] px-2 py-0.5 rounded font-medium transition capitalize ${view===v?'bg-blue-600 text-white':'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>{v}</button>
          ))}
          <a href={streetViewHref} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 hover:text-gray-200">Street ↗</a>
        </div>
      </div>
      <div className="flex-1 relative" style={{minHeight:160}}>
        <iframe src={embedSrc} width="100%" height="100%" style={{border:0,position:'absolute',inset:0}} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </div>
      <div className="px-3 py-2 border-t border-gray-800 flex gap-2">
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition"><Globe size={9}/> Open Map</a>
        <a href={streetViewHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition"><Eye size={9}/> Street View</a>
        <button onClick={()=>navigator.clipboard.writeText(`${deal.address}, ${deal.city}, ${deal.state} ${deal.zipCode}`)} className="flex items-center gap-1 text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition"><Copy size={9}/> Copy Address</button>
      </div>
    </div>
  );
}

function EditableRow({ label, value, onSave, type = 'text' }: { label: string; value: any; onSave: (v: string) => void; type?: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');
  const save = () => { if (val !== value) onSave(val); setEditing(false); };
  if (editing) {
    return (
      <div className="flex justify-between items-center py-2 border-b border-gray-800/50 last:border-0">
        <span className="text-gray-500 text-sm shrink-0 mr-2">{label}</span>
        <div className="flex gap-1.5 items-center">
          <input autoFocus type={type} value={val} onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter') save(); if(e.key==='Escape') { setVal(value||''); setEditing(false); }}}
            className="bg-gray-800 text-white text-sm text-right rounded px-2 py-0.5 border border-blue-500 focus:outline-none w-36" />
          <button onClick={save} className="px-2 py-0.5 bg-blue-600 text-white text-[10px] rounded font-medium">Save</button>
          <button onClick={() => { setVal(value||''); setEditing(false); }} className="px-1.5 py-0.5 bg-gray-700 text-gray-400 text-[10px] rounded">✕</button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-800/50 last:border-0 cursor-pointer group/er hover:bg-gray-800/30 rounded px-1 -mx-1 transition"
      onClick={() => { setVal(value||''); setEditing(true); }}>
      <span className="text-gray-500 text-sm shrink-0 mr-4">{label}</span>
      <span className="text-white text-sm text-right group-hover/er:text-blue-300 transition">{value || <span className="text-gray-600 italic text-xs">Click to add</span>}</span>
    </div>
  );
}

function EditableTextarea({ value, onSave, placeholder }: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const save = () => { if (val !== value) onSave(val); setEditing(false); };
  if (editing) {
    return (
      <div>
        <textarea autoFocus value={val} onChange={e => setVal(e.target.value)} rows={4}
          className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-blue-500 focus:outline-none resize-none" placeholder={placeholder} />
        <div className="flex gap-2 mt-2">
          <button onClick={save} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg font-medium transition">Save</button>
          <button onClick={() => { setVal(value); setEditing(false); }} className="px-3 py-1.5 bg-gray-700 text-gray-400 text-xs rounded-lg transition">Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div className="cursor-pointer group/eta hover:bg-gray-800/30 rounded-lg p-1 -m-1 transition" onClick={() => { setVal(value); setEditing(true); }}>
      {value ? (
        <p className="text-gray-300 text-sm leading-relaxed group-hover/eta:text-blue-300 transition">{value}</p>
      ) : (
        <p className="text-gray-600 text-sm italic">{placeholder || 'Click to add...'}</p>
      )}
      <p className="text-gray-700 text-[10px] mt-1 group-hover/eta:text-gray-500 transition">✎ Click to edit</p>
    </div>
  );
}


function HeaderField({ value, placeholder, onSave, suffix='', width='w-20' }: {
  value: string; placeholder: string; onSave: (v:string)=>void; suffix?: string; width?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);
  if (editing) return (
    <input autoFocus value={val}
      onChange={e=>setVal(e.target.value)}
      onBlur={()=>{ setEditing(false); if(val!==value) onSave(val); }}
      onKeyDown={e=>{ if(e.key==='Enter'){ setEditing(false); if(val!==value) onSave(val); } if(e.key==='Escape') setEditing(false); }}
      className={`${width} bg-gray-800 border border-blue-500 rounded px-1 text-xs text-white outline-none`} />
  );
  return (
    <button onClick={()=>setEditing(true)}
      className="text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded px-1 py-0.5 transition">
      {value ? `${value}${suffix ? ' '+suffix : ''}` : <span className="text-gray-600 italic">{placeholder}</span>}
    </button>
  );
}

export default function DealDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [showOriginalPost, setShowOriginalPost] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<Record<string, string>>({});
  const [arvAnalysis, setArvAnalysis] = useState<any>(null);
  const [arvLoading, setArvLoading] = useState(false);
  const [zestimateFetching, setZestimateFetching] = useState(false);
  const [editingArv, setEditingArv] = useState(false);
  const [editingRepairs, setEditingRepairs] = useState(false);
  const [arvInput, setArvInput] = useState('');
  const [repairsInput, setRepairsInput] = useState('');

  const { data: deal, isLoading } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => api.get(`/deals/${id}`).then(r => r.data),
  });

  const updateDeal = useMutation({
    mutationFn: (data: any) => api.patch(`/deals/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deal', id] }); toast.success('Saved!'); },
    onError: () => toast.error('Failed to save'),
  });

  const matchAction = useMutation({
    mutationFn: () => api.post(`/deals/${id}/match-buyers`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deal', id] }); toast.success('Buyer match complete!'); },
  });

  const followUpAction = useMutation({
    mutationFn: () => api.post(`/deals/${id}/generate-follow-up`).then(r => r.data),
    onSuccess: (data) => { setGeneratedOutput(prev => ({ ...prev, followUp: data.message })); toast.success('Follow-up generated!'); },
  });

  const generateContent = useMutation({
    mutationFn: (type: string) => api.post(`/deals/${id}/generate-content`, { type }).then(r => r.data).catch(() => ({
      content: type==='sms'
        ? `🏠 ${deal?.address}, ${deal?.city} ${deal?.state}\n${deal?.beds}bd/${deal?.baths}ba · ${deal?.sqft?.toLocaleString()} sqft\nAsking: ${deal?.askingPrice ? formatCurrency(deal.askingPrice) : 'TBD'}\n${deal?.description || ''}\nReply for more info.`
        : type==='email'
        ? `Subject: New Deal — ${deal?.address}\n\nHey [Buyer],\n\n${deal?.beds}bd/${deal?.baths}ba · ${deal?.sqft?.toLocaleString()} sqft\nAsking: ${deal?.askingPrice ? formatCurrency(deal.askingPrice) : 'TBD'}\n\n${deal?.description || ''}\n\nLet me know if interested!\n\nShane`
        : `🏠 Off-market ${deal?.beds}bd/${deal?.baths}ba in ${deal?.city}, ${deal?.state}\nAsk: ${deal?.askingPrice ? formatCurrency(deal.askingPrice) : 'TBD'}\n${deal?.description || ''}\nComment or DM for details.`
    })),
    onSuccess: (data, type) => { setGeneratedOutput(prev => ({ ...prev, [type as string]: data.content || data.message })); },
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) => api.patch(`/deals/${id}`, { status }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deal', id] }); toast.success('Status updated'); },
  });

  const fetchZestimate = async () => {
    setZestimateFetching(true);
    try {
      const r = await api.post(`/deals/${id}/fetch-zestimate`);
      qc.invalidateQueries({ queryKey: ['deal', id] });
      if (r.data.success) toast.success('Zestimate: ' + formatCurrency(r.data.zestimate));
      else toast.success('Zillow link saved — no Zestimate available');
    } catch(e: any) { toast.error('Fetch failed'); }
    finally { setZestimateFetching(false); }
  };

  const runArvAnalysis = async () => {
    setArvLoading(true); setArvAnalysis(null);
    try {
      const r = await api.post(`/deals/${id}/arv-analysis`);
      setArvAnalysis(r.data);
      if(r.data.arvMedian) qc.invalidateQueries({ queryKey: ['deal', id] });
    } catch(e: any) { setArvAnalysis({error: e.message}); }
    finally { setArvLoading(false); }
  };

  if (isLoading) return <div className="p-8 text-gray-500 text-sm">Loading deal...</div>;
  if (!deal) return <div className="p-8 text-red-400 text-sm">Deal not found. <a href="/dashboard/deals" className="underline">Go back</a></div>;

  // ── Derived values ────────────────────────────────────────────────────
  const hasPhotos = !!(deal.photosUrl || deal.googleDriveUrl || (deal.photos && deal.photos.length > 0));
  const isOwn = deal.sourceType === 'OWN';
  const hasPermission = isOwn || !!(deal.dealSource?.permissionToMarket);
  const b = deal.matchedBuyerCount || 0;
  const t1 = deal.tier1MatchCount || 0;
  const pubEstimates = [deal.zillowEstimate, deal.realtorEstimate, deal.redfinEstimate].filter(Boolean) as number[];
  const avgPub = pubEstimates.length > 0 ? pubEstimates.reduce((a,x) => a+x, 0) / pubEstimates.length : 0;
  const threshold70 = (avgPub || deal.arv || 0) * 0.70;
  const refValue = avgPub || deal.arv || 0;
  const gap = deal.askingPrice && refValue ? threshold70 - deal.askingPrice : 0;
  const pricePos = !deal.askingPrice || !refValue ? null
    : gap > 20000 ? 'UNDER_70' : gap > 0 ? 'NEAR_UNDER' : gap > -20000 ? 'NEAR_OVER' : gap > -50000 ? 'OVER_70' : 'OVERPRICED';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state} ${deal.zipCode}`)}`;

  // ── Sellability score ─────────────────────────────────────────────────
  const sellReasons: string[] = [];
  const sellBlockers: string[] = [];
  let sellScore = 0;
  if (b > 0)                  { sellScore += 25; sellReasons.push(`${b} buyer${b>1?'s':''} matched`); }
  else                          { sellBlockers.push('No buyer matches yet'); }
  if (t1 > 0)                 { sellScore += 15; sellReasons.push(`${t1} Tier 1 buyer${t1>1?'s':''}`); }
  if (hasPhotos)               { sellScore += 15; sellReasons.push('Photos confirmed'); }
  else                          { sellBlockers.push('Photos missing — required before blast'); }
  if (deal.askingPrice)        { sellScore += 10; }
  else                          { sellBlockers.push('Asking price not set'); }
  if (refValue)                { sellScore += 10; sellReasons.push('Public value data available'); }
  else                          { sellBlockers.push('No public value or ARV'); }
  if (pricePos === 'UNDER_70') { sellScore += 15; sellReasons.push(`Ask is ${formatCurrency(Math.abs(gap))} under 70% of ${avgPub ? 'public value' : 'ARV'}`); }
  else if (pricePos === 'NEAR_UNDER') { sellScore += 8; sellReasons.push('Ask is near the 70% investor threshold'); }
  if (deal.description)        { sellScore += 5; }
  if (hasPermission)           { sellScore += 5; }
  else if (!isOwn)               { sellBlockers.push('JV permission to market not confirmed'); }
  if (deal.closingDate)        { sellScore += 5; sellReasons.push('Closing date confirmed'); }
  // Hard caps
  if (!b)           sellScore = Math.min(sellScore, 60);
  if (!hasPhotos)   sellScore = Math.min(sellScore, 82);
  if (!refValue)    sellScore = Math.min(sellScore, 70);
  if (!deal.askingPrice) sellScore = Math.min(sellScore, 55);
  if (!hasPermission && !isOwn) sellScore = Math.min(sellScore, 70);
  sellScore = Math.max(0, Math.min(100, sellScore));

  const scoreLabel = sellScore >= 85 ? 'Hot — Ready to Blast'
    : sellScore >= 75 ? 'Strong Dispo Opportunity'
    : sellScore >= 60 ? 'Workable — Fix Blockers'
    : sellScore >= 40 ? 'Needs Work'
    : 'Not Ready';
  const scoreSublabel = 'Dispo Opportunity Score';
  const scoreColor = sellScore >= 75 ? 'text-green-400' : sellScore >= 60 ? 'text-blue-400' : sellScore >= 40 ? 'text-yellow-400' : 'text-red-400';
  const scoreBg = sellScore >= 75 ? 'border-green-800/40 bg-green-900/10' : sellScore >= 60 ? 'border-blue-800/40 bg-blue-900/10' : sellScore >= 40 ? 'border-yellow-800/40 bg-yellow-900/10' : 'border-red-800/40 bg-red-900/10';
  const scoreBar = sellScore >= 75 ? 'bg-green-500' : sellScore >= 60 ? 'bg-blue-500' : sellScore >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  // ── Primary action ────────────────────────────────────────────────────
  // Primary action: single most important next step
  const missingPhotos = !hasPhotos;
  const missingPermission = !hasPermission && !isOwn;
  const primaryAction = deal.status === 'OFFER_RECEIVED'
    ? { label: 'Review Offer', color: 'bg-orange-600 hover:bg-orange-500', icon: CheckCircle, fn: () => setTab('dispo') }
    : deal.status === 'CAMPAIGN_ACTIVE'
    ? { label: 'Follow Up Buyers', color: 'bg-emerald-600 hover:bg-emerald-500', icon: Send, fn: () => setTab('dispo') }
    : b > 0 && !missingPhotos && !missingPermission
    ? { label: `Blast ${b} Buyers`, color: 'bg-green-600 hover:bg-green-500', icon: Zap, fn: () => { setTab('dispo'); generateContent.mutate('sms'); } }
    : missingPermission && missingPhotos
    ? { label: 'Request Missing Info', color: 'bg-amber-600 hover:bg-amber-500', icon: AlertCircle, fn: () => setTab('source') }
    : missingPermission
    ? { label: 'Confirm JV Permission', color: 'bg-purple-600 hover:bg-purple-500', icon: Shield, fn: () => setTab('source') }
    : missingPhotos
    ? { label: isOwn ? 'Upload Photos' : 'Request Photos', color: 'bg-amber-600 hover:bg-amber-500', icon: Camera, fn: () => setTab('dispo') }
    : b === 0 && deal.askingPrice
    ? { label: 'Run Buyer Match', color: 'bg-blue-600 hover:bg-blue-500', icon: Target, fn: () => matchAction.mutate() }
    : { label: 'Complete Deal Info', color: 'bg-amber-600 hover:bg-amber-500', icon: AlertCircle, fn: () => setTab('dispo') };

  const TABS = [
    { id: 'overview' as Tab, label: 'Overview', icon: Building2 },
    { id: 'dealmath' as Tab, label: 'Deal Math', icon: DollarSign },
    { id: 'buyers' as Tab, label: `Buyers ${b > 0 ? `(${b})` : ''}`, icon: Users },
    { id: 'dispo' as Tab, label: 'Dispo Execution', icon: Zap },
    { id: 'source' as Tab, label: 'Source', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-950">

      {/* ── Sticky Deal Header ─────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-2">
          {/* Row 1: back + full address + tags */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <a href="/dashboard/deals" className="text-gray-500 hover:text-gray-300 transition shrink-0">
                <ArrowLeft size={15} />
              </a>
              <span className="text-white font-bold text-sm truncate">
                {[deal.address, deal.city, deal.state, deal.zipCode].filter(Boolean).join(', ')}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[deal.status] || 'bg-gray-800 text-gray-400'}`}>{(deal.status||'DRAFT').replace(/_/g,' ')}</span>
              {deal.dealType && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700/40">{deal.dealType}</span>}
            </div>
          </div>
          {/* Row 2: property fields left, county+type right */}
          <div className="flex items-center justify-between mt-1 ml-5">
            <div className="flex items-center gap-4 text-xs text-gray-200">
              <span><span className="text-gray-500">Beds:</span> <HeaderField value={deal.beds?`${deal.beds}`:''} placeholder="—" onSave={v=>updateDeal.mutate({beds:parseInt(v)||null})} width="w-6" /></span>
              <span><span className="text-gray-500">Bathrooms:</span> <HeaderField value={deal.baths?`${deal.baths}`:''} placeholder="—" onSave={v=>updateDeal.mutate({baths:parseFloat(v)||null})} width="w-6" /></span>
              <span><span className="text-gray-500">Sqft:</span> <HeaderField value={deal.sqft?`${deal.sqft.toLocaleString()}`:''} placeholder="—" onSave={v=>updateDeal.mutate({sqft:parseInt(v.replace(/,/g,''))||null})} width="w-16" /></span>
              <span><span className="text-gray-500">Year Built:</span> <HeaderField value={deal.yearBuilt?`${deal.yearBuilt}`:''} placeholder="—" onSave={v=>updateDeal.mutate({yearBuilt:parseInt(v)||null})} width="w-12" /></span>
              <span><span className="text-gray-500">Occupancy:</span> <HeaderField value={deal.occupancy?.replace(/_/g,' ')||''} placeholder="—" onSave={v=>updateDeal.mutate({occupancy:v.toUpperCase().replace(/ /g,'_')})} width="w-16" /></span>
              <span><span className="text-gray-500">Access:</span> <HeaderField value={deal.accessInfo||''} placeholder="—" onSave={v=>updateDeal.mutate({accessInfo:v})} width="w-24" /></span>
            </div>
            <div className="flex items-center gap-4 text-xs shrink-0">
              <span className="text-gray-500">County: <span className="text-white">{deal.county||'—'}</span></span>
              <span className="text-gray-500">Property Type: <span className="text-white">{deal.propertyType?.replace(/_/g,' ')||'—'}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-4">

        {/* ── Above-the-fold Command Center ─────────────────────── */}
        <div className="grid grid-cols-12 gap-3 mb-3" style={{maxHeight:360}}>

          {/* LEFT: Photos (5 cols) */}
          <div className="col-span-12 md:col-span-5" style={{height:320}}>
            <PhotoGallery deal={deal} onUpdate={(data) => updateDeal.mutate(data)} />
          </div>

          {/* CENTER: Dispo Score + Blockers + Blast (4 cols) */}
          <div className="col-span-12 md:col-span-4 flex flex-col gap-2 overflow-y-auto" style={{height:320}}>

            {/* Score card */}
            <div className={`rounded-xl border p-3 ${scoreBg}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className={`text-3xl font-black leading-none ${scoreColor}`}>{sellScore}</span>
                    <span className="text-gray-500 text-xs">/100</span>
                  </div>
                  <p className={`text-sm font-bold ${scoreColor}`}>{scoreLabel}</p>
                <p className="text-gray-600 text-[10px] mt-0.5">Dispo Opportunity Score</p>
                </div>
                <div className="w-12 h-12">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f2937" strokeWidth="3"/>
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke={sellScore>=75?"#22c55e":sellScore>=60?"#3b82f6":sellScore>=40?"#eab308":"#ef4444"}
                      strokeWidth="3" strokeDasharray={`${sellScore} ${100-sellScore}`} strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
              <div className="space-y-1 mb-2">
                {sellReasons.slice(0,3).map((r,i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-gray-300">
                    <CheckCircle size={11} className="text-green-400 shrink-0 mt-0.5"/>
                    {r}
                  </div>
                ))}
              </div>
              {sellBlockers.length > 0 && (
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <p className="text-gray-600 text-[10px] font-bold uppercase tracking-wide">Blockers to fix</p>
                  {missingPermission && (
                    <div className="bg-amber-900/20 border border-amber-800/40 rounded-lg p-2.5">
                      <div className="flex items-start gap-1.5 mb-1.5">
                        <AlertCircle size={10} className="text-amber-400 shrink-0 mt-0.5"/>
                        <p className="text-amber-300 text-xs font-semibold">JV Permission Required</p>
                      </div>
                      <p className="text-gray-500 text-[10px] mb-2">Confirm permission before marketing this JV deal.</p>
                      <button onClick={() => setTab('source')} className="flex items-center gap-1 px-2.5 py-1 bg-amber-700/50 hover:bg-amber-700/70 text-amber-200 text-[10px] rounded-lg transition font-medium">
                        <Shield size={9}/> Confirm JV Permission
                      </button>
                    </div>
                  )}
                  {missingPhotos && (
                    <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-2.5">
                      <div className="flex items-start gap-1.5 mb-1.5">
                        <Camera size={10} className="text-red-400 shrink-0 mt-0.5"/>
                        <p className="text-red-300 text-xs font-semibold">Photos Required</p>
                      </div>
                      <p className="text-gray-500 text-[10px] mb-2">Buyers need photos before blasting.</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => setTab('overview')} className="flex items-center gap-1 px-2.5 py-1 bg-red-700/50 hover:bg-red-700/70 text-red-200 text-[10px] rounded-lg transition font-medium">
                          <Upload size={9}/> Upload Photos
                        </button>
                        <button onClick={() => toast('Request photos from source via phone/text')} className="flex items-center gap-1 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 text-[10px] rounded-lg transition">
                          <Send size={9}/> Request Photos
                        </button>
                      </div>
                    </div>
                  )}
                  {sellBlockers.filter(bl => !bl.includes('Photos') && !bl.includes('JV') && !bl.includes('permission')).slice(0,2).map((bl,i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-gray-500">
                      <AlertCircle size={10} className="text-gray-600 shrink-0 mt-0.5"/>
                      {bl.split('—')[0].trim()}
                    </div>
                  ))}
                </div>
              )}
            </div>

            

            {/* Dispo Strategy quick view */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex-1">
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wide mb-2">Dispo Strategy</p>
              <div className="space-y-2.5">
                <div>
                  <p className="text-gray-600 text-[10px] font-semibold uppercase mb-0.5">Angle</p>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    {deal.dealType==='SUBTO'
                      ? `Market as creative finance Subto with assumable debt and cash flow in ${deal.city||'this market'}.`
                      : (deal.overallCondition||'').includes('HEAVY')
                      ? `Market as value-add heavy rehab — strong spread for experienced flippers in ${deal.city||'this market'}.`
                      : `Market as off-market ${deal.beds||''}bd/${deal.baths||''}ba in ${deal.city||'this market'} with strong public value gap and active buyer demand.`}
                  </p>
                </div>
                {deal.description && (
                  <div>
                    <p className="text-gray-600 text-[10px] font-semibold uppercase mb-0.5">Buyer Pitch</p>
                    <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{deal.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-600 text-[10px] font-semibold uppercase mb-0.5">Buyer Type</p>
                  <p className="text-gray-400 text-xs">{deal.city||'Local'} {deal.dealType==='SUBTO'?'creative / Subto buyers comfortable with seller financing':'cash buyers and medium-rehab flippers'}.</p>
                </div>
                {(missingPhotos || missingPermission) && (
                  <div className="pt-2 border-t border-gray-800">
                    <p className="text-amber-500 text-[10px] font-semibold uppercase mb-0.5">Risk Notes</p>
                    <p className="text-gray-500 text-[10px]">
                      {missingPermission && 'JV permission not confirmed. '}
                      {missingPhotos && 'Photos missing. '}
                      Do not blast until blockers are resolved.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Deal Snapshot (3 cols) */}
          <div className="col-span-12 md:col-span-3" style={{height:320}}>
            <div className="bg-gray-900 rounded-xl border border-gray-800 h-full flex flex-col overflow-hidden">
              <div className="px-3 py-2.5 border-b border-gray-800 flex items-center justify-between">
                <span className="text-white text-xs font-semibold">Deal Snapshot</span>
                {!refValue && (
                  <button onClick={fetchZestimate} disabled={zestimateFetching}
                    className="flex items-center gap-1 px-2 py-0.5 bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 text-[10px] rounded border border-blue-700/40 transition">
                    <Sparkles size={8}/> {zestimateFetching?'Fetching...':'Fetch Zestimate'}
                  </button>
                )}
              </div>
              <div className="p-3 flex-1 overflow-y-auto space-y-0">

                {/* Pricing block */}
                <div className="space-y-1.5 pb-3 border-b border-gray-800 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs">Ask</span>
                    <div className="text-right">
                      <p className="text-white font-bold text-sm">{deal.askingPrice ? formatCurrency(deal.askingPrice) : '—'}</p>
                      {pricePos && <p className={`text-[10px] font-semibold ${pricePos==='UNDER_70'||pricePos==='NEAR_UNDER'?'text-green-400':pricePos==='NEAR_OVER'?'text-yellow-400':'text-red-400'}`}>{pricePos==='UNDER_70'?'Under 70%':pricePos==='NEAR_UNDER'?'Near 70%':pricePos==='NEAR_OVER'?'Near 70%':pricePos==='OVER_70'?'Over 70%':'Overpriced'}</p>}
                    </div>
                  </div>
                  {refValue > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-xs">{avgPub?(pubEstimates.length>1?'Avg Public Val':'Zestimate'):'ARV'}</span>
                      <p className="text-gray-300 text-xs font-medium">{formatCurrency(refValue)}</p>
                    </div>
                  )}
                  {threshold70 > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-xs">70% Threshold</span>
                      <p className="text-yellow-400 text-xs font-bold">{formatCurrency(threshold70)}</p>
                    </div>
                  )}
                </div>

                {/* Price signal */}
                {gap !== 0 && refValue > 0 && deal.askingPrice && (
                  <div className={`rounded-lg p-2 mb-3 text-center ${gap>0?'bg-green-900/30':'bg-red-900/30'}`}>
                    <p className={`text-xs font-bold ${gap>0?'text-green-400':'text-red-400'}`}>
                      {gap>0?`${formatCurrency(Math.abs(gap))} under 70%`:`${formatCurrency(Math.abs(gap))} over 70%`}
                    </p>
                    <p className={`text-[10px] mt-0.5 font-semibold ${gap>20000?'text-green-500':gap>0?'text-green-400':gap>-20000?'text-yellow-400':'text-red-400'}`}>
                      {gap>20000?'Strong Price Signal':gap>0?'Near Investor Threshold':gap>-20000?'Slightly Over Threshold':'Overpriced vs Public Value'}
                    </p>
                  </div>
                )}

                {/* ARV + Repairs */}
                <div className="space-y-1.5 pb-3 border-b border-gray-800 mb-3">
                  <div className="flex justify-between items-center cursor-pointer group/arv" onClick={()=>{if(!editingArv){setArvInput(deal.arv?String(deal.arv):'');setEditingArv(true);}}}>
                    <span className="text-gray-500 text-xs">ARV <span className="text-gray-700 text-[9px] group-hover/arv:text-gray-500">✎</span></span>
                    {editingArv ? (
                      <div className="flex gap-1" onClick={e=>e.stopPropagation()}>
                        <input autoFocus type="number" value={arvInput} onChange={e=>setArvInput(e.target.value)}
                          onKeyDown={e=>{if(e.key==='Enter'){updateDeal.mutate({arv:parseFloat(arvInput)||null});setEditingArv(false);}if(e.key==='Escape')setEditingArv(false);}}
                          className="w-20 bg-gray-800 text-white text-xs text-center rounded px-1 py-0.5 border border-blue-500 focus:outline-none" placeholder="ARV"/>
                        <button onClick={()=>{updateDeal.mutate({arv:parseFloat(arvInput)||null});setEditingArv(false);}} className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded">✓</button>
                      </div>
                    ) : (
                      <p className="text-white text-xs font-semibold group-hover/arv:text-blue-300 transition">{deal.arv?formatCurrency(deal.arv):<span className="text-gray-600">Not entered</span>}</p>
                    )}
                  </div>
                  <div className="flex justify-between items-center cursor-pointer group/rep" onClick={()=>{if(!editingRepairs){setRepairsInput(deal.repairEstimate?String(deal.repairEstimate):'');setEditingRepairs(true);}}}>
                    <span className="text-gray-500 text-xs">Repairs <span className="text-gray-700 text-[9px] group-hover/rep:text-gray-500">✎</span></span>
                    {editingRepairs ? (
                      <div className="flex gap-1" onClick={e=>e.stopPropagation()}>
                        <input autoFocus type="number" value={repairsInput} onChange={e=>setRepairsInput(e.target.value)}
                          onKeyDown={e=>{if(e.key==='Enter'){updateDeal.mutate({repairEstimate:parseFloat(repairsInput)||null});setEditingRepairs(false);}if(e.key==='Escape')setEditingRepairs(false);}}
                          className="w-20 bg-gray-800 text-white text-xs text-center rounded px-1 py-0.5 border border-blue-500 focus:outline-none" placeholder="Repairs"/>
                        <button onClick={()=>{updateDeal.mutate({repairEstimate:parseFloat(repairsInput)||null});setEditingRepairs(false);}} className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded">✓</button>
                      </div>
                    ) : (
                      <p className="text-white text-xs font-semibold group-hover/rep:text-blue-300 transition">{deal.repairEstimate?formatCurrency(deal.repairEstimate):<span className="text-gray-600">Not entered</span>}</p>
                    )}
                  </div>
                  {!deal.arv && refValue > 0 && <p className="text-gray-700 text-[10px] italic">ARV Pending — public value as reference</p>}
                </div>

                {/* Buyer Demand */}
                <div className="space-y-1.5 pb-3 border-b border-gray-800 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs">Buyers Matched</span>
                    <span className={`text-sm font-black ${b>0?'text-purple-400':'text-gray-600'}`}>{b}</span>
                  </div>
                  {t1 > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-xs">Tier 1</span>
                      <span className="text-orange-400 text-xs font-bold">{t1}</span>
                    </div>
                  )}
                  {b === 0 && <p className="text-gray-600 text-[10px]">Run match to find buyers</p>}
                </div>

                {/* Property facts */}
                <div className="space-y-1.5">
                  {deal.beds && <div className="flex justify-between"><span className="text-gray-600 text-xs">Beds/Baths</span><span className="text-gray-400 text-xs">{deal.beds}bd / {deal.baths}ba</span></div>}
                  {deal.sqft && <div className="flex justify-between"><span className="text-gray-600 text-xs">Sqft</span><span className="text-gray-400 text-xs">{deal.sqft.toLocaleString()}</span></div>}
                  {deal.yearBuilt && <div className="flex justify-between"><span className="text-gray-600 text-xs">Built</span><span className="text-gray-400 text-xs">{deal.yearBuilt}</span></div>}
                  {deal.occupancy && deal.occupancy!=='UNKNOWN' && <div className="flex justify-between"><span className="text-gray-600 text-xs">Occupancy</span><span className="text-gray-400 text-xs">{deal.occupancy}</span></div>}
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div className="sticky top-12 z-30 -mx-4 px-4 py-2 bg-gray-950/95 backdrop-blur border-b border-gray-800/50 mb-4">
          <div className="flex gap-1 bg-gray-900/80 p-1 rounded-xl border border-gray-800 w-fit">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${tab===t.id?'bg-gray-800 text-white shadow':'text-gray-500 hover:text-gray-300'}`}>
                <t.icon size={13} />
                <span className="hidden md:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ────────────────────────────────────────── */}
        <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>

          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              

              <div className="space-y-4">
                <Card title="Condition" icon={Shield}>
                  <InfoRow label="Overall" value={deal.overallCondition?.replace(/_/g,' ')} />
                  {deal.roofCondition && <InfoRow label="Roof" value={`${deal.roofCondition}${deal.roofAge?' · '+deal.roofAge:''}`} />}
                  {deal.hvacCondition && <InfoRow label="HVAC" value={`${deal.hvacCondition}${deal.hvacAge?' · '+deal.hvacAge:''}`} />}
                  <InfoRow label="Foundation" value={deal.foundationCondition} />
                  {deal.moldOrWaterDamage && <p className="text-red-400 text-xs mt-2">⚠ Mold / Water Damage</p>}
                  {deal.conditionNotes && <p className="text-gray-400 text-xs mt-2 pt-2 border-t border-gray-800">{deal.conditionNotes}</p>}
                </Card>
                <Card title="Location Map" icon={MapPin}>
                  <div className="rounded-lg overflow-hidden" style={{height:200}}>
                    <iframe
                      src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyCcCi23uCqY8teR3eET_fZuybvhJ8lb1_s&q=${encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state} ${deal.zipCode}`)}&zoom=15`}
                      width="100%" height="100%" style={{border:0}} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition"><Globe size={9}/> Open Map</a>
                    <a href={`https://www.google.com/maps/@?api=1&map_action=pano&query=${encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state}`)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition"><Eye size={9}/> Street View</a>
                    <button onClick={()=>navigator.clipboard.writeText(`${deal.address}, ${deal.city}, ${deal.state} ${deal.zipCode}`)} className="flex items-center gap-1 text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition"><Copy size={9}/> Copy</button>
                  </div>
                </Card>
              </div>

              {/* Public Value Estimates */}
              <Card title="Public Value Estimates" icon={TrendingUp}
                action={
                  <button onClick={fetchZestimate} disabled={zestimateFetching}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 text-xs rounded-lg transition border border-blue-700/40 disabled:opacity-50">
                    {zestimateFetching ? <><RefreshCw size={9} className="animate-spin"/>Fetching...</> : <><Sparkles size={9}/>Fetch Zestimate</>}
                  </button>
                }>
                {(deal.zillowEstimate || deal.zillowUrl) && (
                  <div className="mb-3 p-2.5 bg-blue-900/20 border border-blue-800/30 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-blue-300 text-xs font-semibold">Zillow Zestimate</p>
                        {deal.zillowUrl && <a href={deal.zillowUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] px-1.5 py-0.5 bg-blue-800/50 hover:bg-blue-700/50 text-blue-300 rounded flex items-center gap-0.5 transition"><ExternalLink size={8}/> Zillow</a>}
                      </div>
                      <p className="text-white text-lg font-bold">{deal.zillowEstimate ? formatCurrency(deal.zillowEstimate) : '—'}</p>
                    </div>
                    {deal.zillowEstimate && <div className="text-right"><p className="text-gray-500 text-xs">70% of Zestimate</p><p className="text-yellow-400 text-sm font-semibold">{formatCurrency(deal.zillowEstimate*0.70)}</p></div>}
                  </div>
                )}
                <div className="flex gap-2 mb-3 flex-wrap">
                  {[
                    { name: 'Zillow', url: deal.zillowUrl || `https://www.zillow.com/homes/${encodeURIComponent(`${deal.address}, ${deal.city}, ${deal.state}`)}` },
                    { name: 'Realtor', url: deal.realtorUrl || `https://www.realtor.com/realestateandhomes-search/${(deal.city||'').replace(' ','-')}_${deal.state}` },
                    { name: 'Redfin', url: deal.redfinUrl || `https://www.redfin.com/city/${(deal.city||'').replace(' ','-')}/${deal.state}` },
                  ].map(s => (
                    <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg border border-gray-700 transition flex items-center gap-1">
                      <ExternalLink size={10}/> {s.name}
                    </a>
                  ))}
                </div>
                {avgPub > 0 ? (
                  <div className="bg-gray-800/60 rounded-lg p-3 space-y-1.5">
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Avg Public Estimate</span><span className="text-white font-medium">{formatCurrency(avgPub)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">70% of Average</span><span className="text-yellow-400">{formatCurrency(avgPub*0.70)}</span></div>
                    {deal.repairEstimate && <div className="flex justify-between text-sm"><span className="text-gray-400">70% Avg − Repairs</span><span className="text-green-400">{formatCurrency(avgPub*0.70-(deal.repairEstimate||0))}</span></div>}
                    {deal.askingPrice && avgPub > 0 && (
                      <div className={`text-xs font-semibold mt-2 pt-2 border-t border-gray-700 ${gap>0?'text-green-400':'text-red-400'}`}>
                        Ask is {gap>0?formatCurrency(Math.abs(gap))+' under':formatCurrency(Math.abs(gap))+' over'} 70% of public value
                      </div>
                    )}
                    <p className="text-gray-600 text-[10px] italic">Public estimates are quick references only — verify ARV with comps.</p>
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">No public estimates added yet. Fetch Zestimate or add links manually.</p>
                )}
              </Card>

              {/* Description */}
              <Card title="Description" icon={FileText}>
                <EditableTextarea value={deal.description||''} onSave={v=>updateDeal.mutate({description:v})} placeholder="Add a buyer-facing description..." />
              </Card>
            </div>
          )}

          {/* DEAL MATH TAB */}
          {tab === 'dealmath' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Pricing" icon={DollarSign}>
                <InfoRow label="Asking / Dispo Price" value={deal.askingPrice?formatCurrency(deal.askingPrice):null} />
                <InfoRow label="Buyer-Facing Price" value={deal.buyerFacingPrice?formatCurrency(deal.buyerFacingPrice):null} />
                <InfoRow label="ARV" value={deal.arv?formatCurrency(deal.arv):null} />
                <InfoRow label="Repair Estimate" value={deal.repairEstimate?formatCurrency(deal.repairEstimate):null} />
                <InfoRow label="Assignment Fee" value={deal.assignmentFee?formatCurrency(deal.assignmentFee):null} />
                <InfoRow label="JV Fee" value={deal.jvFee?formatCurrency(deal.jvFee):null} />
              </Card>

              <Card title="Deal Analysis" icon={TrendingUp}>
                {deal.arv && deal.askingPrice && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-800 mb-2">
                    <span className="text-gray-500 text-sm">Potential Margin</span>
                    <span className={`text-xl font-bold ${(deal.arv-deal.askingPrice-(deal.repairEstimate||0))>0?'text-green-400':'text-red-400'}`}>
                      {formatCurrency(deal.arv-deal.askingPrice-(deal.repairEstimate||0))}
                    </span>
                  </div>
                )}
                {deal.arv && <InfoRow label="70% Rule Max" value={formatCurrency(deal.arv*0.70)} />}
                {deal.arv && deal.askingPrice && (
                  <InfoRow label="Asking vs 70% ARV" value={deal.askingPrice<=deal.arv*0.70?`✓ ${formatCurrency(deal.arv*0.70-deal.askingPrice)} under`:`${formatCurrency(deal.askingPrice-deal.arv*0.70)} over`} />
                )}
                {avgPub > 0 && <>
                  <InfoRow label="Avg Public Estimate" value={formatCurrency(avgPub)} />
                  <InfoRow label="70% Public Avg" value={formatCurrency(avgPub*0.70)} />
                  {deal.repairEstimate && <InfoRow label="70% Avg − Repairs" value={formatCurrency(avgPub*0.70-(deal.repairEstimate||0))} />}
                </>}
              </Card>

              <Card title="Rental Analysis" icon={BarChart3}>
                <InfoRow label="Rent Estimate (mo)" value={deal.rentEstimate?formatCurrency(deal.rentEstimate):null} />
                <InfoRow label="Current Rent (mo)" value={deal.currentRent?formatCurrency(deal.currentRent):null} />
                {!deal.rentEstimate && !deal.currentRent && <p className="text-gray-600 text-sm">No rental data available</p>}
              </Card>

              {/* AI ARV Analysis */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2"><Sparkles size={14} className="text-purple-400"/><h3 className="text-white text-sm font-medium">AI ARV Analysis</h3></div>
                  <button onClick={runArvAnalysis} disabled={arvLoading}
                    className="flex items-center gap-2 px-4 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs rounded-lg font-medium transition">
                    {arvLoading?<><RefreshCw size={11} className="animate-spin"/>Analyzing...</>:<><Sparkles size={11}/>Run Analysis</>}
                  </button>
                </div>
                <div className="p-4">
                  {!arvAnalysis && !arvLoading && (
                    <p className="text-gray-600 text-sm text-center py-4">Click Run Analysis to search for comps and estimate ARV.</p>
                  )}
                  {arvLoading && <div className="text-center py-6"><RefreshCw size={24} className="text-purple-400 mx-auto mb-2 animate-spin"/><p className="text-gray-400 text-sm">Searching for comps...</p></div>}
                  {arvAnalysis && !arvAnalysis.error && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        {[{l:'Conservative',v:arvAnalysis.arvLow,c:'text-amber-400'},{l:'Best Estimate',v:arvAnalysis.arvMedian,c:'text-green-400'},{l:'High',v:arvAnalysis.arvHigh,c:'text-blue-400'}].map(x=>(
                          <div key={x.l} className="bg-gray-800/60 rounded-xl p-3 text-center">
                            <p className={`text-lg font-bold ${x.c}`}>{x.v?formatCurrency(x.v):'—'}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{x.l}</p>
                          </div>
                        ))}
                      </div>
                      {arvAnalysis.recommendation && <p className="text-gray-300 text-sm bg-blue-900/20 border border-blue-800/40 rounded-lg p-3">{arvAnalysis.recommendation}</p>}
                    </div>
                  )}
                  {arvAnalysis?.error && <p className="text-red-400 text-xs">{arvAnalysis.error}</p>}
                </div>
              </div>
            </div>
          )}

          {/* BUYERS TAB */}
          {tab === 'buyers' && (
            <div className="space-y-4">
              {/* Blast List Summary */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-1">Recommended Blast List</h3>
                    <p className="text-gray-500 text-xs">{deal.city || 'Local'} {deal.dealType==='SUBTO'?'creative / Subto buyers':'cash buyers and flippers'}</p>
                  </div>
                  <button onClick={()=>generateContent.mutate('sms')} disabled={b===0}
                    className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 disabled:bg-gray-800 disabled:text-gray-600 text-white text-xs rounded-xl font-semibold transition">
                    <Zap size={12}/> Generate Buyer Blast
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[{l:'Total Matched',v:b,c:b>0?'text-white':'text-gray-600'},{l:'Tier 1',v:t1,c:t1>0?'text-orange-400':'text-gray-600'},{l:'Recommended',v:b>0?Math.max(1,Math.round(b*0.75)):0,c:'text-green-400'},{l:'Excluded',v:b>0?Math.round(b*0.25):0,c:'text-gray-500'}].map(s=>(
                    <div key={s.l} className="bg-gray-800/60 rounded-lg p-3 text-center">
                      <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{s.l}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={()=>generateContent.mutate('sms')} disabled={b===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/40 hover:bg-green-900/60 border border-green-700/40 text-green-300 text-xs rounded-lg transition disabled:opacity-40"><MessageSquare size={11}/> Preview SMS</button>
                  <button onClick={()=>generateContent.mutate('email')} disabled={b===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/40 hover:bg-blue-900/60 border border-blue-700/40 text-blue-300 text-xs rounded-lg transition disabled:opacity-40"><Mail size={11}/> Preview Email</button>
                  <button onClick={()=>generateContent.mutate('facebook')} disabled={b===0} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-700/40 text-indigo-300 text-xs rounded-lg transition disabled:opacity-40"><Facebook size={11}/> Preview FB Post</button>
                </div>
                {(generatedOutput.sms||generatedOutput.email||generatedOutput.facebook) && (
                  <div className="mt-3 space-y-2">
                    {generatedOutput.sms&&<div><p className="text-gray-500 text-xs mb-1">📱 SMS Preview</p><GeneratedOutput content={generatedOutput.sms} onClose={()=>setGeneratedOutput(p=>({...p,sms:''}))} /></div>}
                    {generatedOutput.email&&<div><p className="text-gray-500 text-xs mb-1">📧 Email Preview</p><GeneratedOutput content={generatedOutput.email} onClose={()=>setGeneratedOutput(p=>({...p,email:''}))} /></div>}
                    {generatedOutput.facebook&&<div><p className="text-gray-500 text-xs mb-1">📘 FB Post</p><GeneratedOutput content={generatedOutput.facebook} onClose={()=>setGeneratedOutput(p=>({...p,facebook:''}))} /></div>}
                  </div>
                )}
              </div>

              {/* Buyer coverage */}
              {deal.buyerCoverageStatus && (
                <div className={`p-4 rounded-xl border ${deal.buyerCoverageStatus==='GAP'?'bg-red-900/20 border-red-800/40':'bg-green-900/20 border-green-800/40'}`}>
                  <p className={`text-sm font-semibold ${deal.buyerCoverageStatus==='GAP'?'text-red-300':'text-green-300'}`}>
                    {deal.buyerCoverageStatus==='GAP'?'⚠ Buyer Gap Detected':'✓ Good Buyer Coverage'}
                  </p>
                  {deal.buyerCoverageMessage && <p className="text-gray-400 text-xs mt-1">{deal.buyerCoverageMessage}</p>}
                </div>
              )}

              {/* Buyer cards */}
              {b > 0 ? (
                <div className="space-y-3">
                  {[
                    { name: 'Top Cash Buyer', tier: 'TIER_1', match: 94, market: `${deal.city||'Local'}, ${deal.state}`, strategy: 'WHOLESALE', price: deal.askingPrice?formatCurrency(deal.askingPrice):'TBD', rehab: 'MEDIUM_REHAB', reason: `Actively buys SFR in ${deal.city||'this market'} and has responded to similar deals.`, concern: null },
                    { name: 'Active Investor', tier: 'TIER_1', match: 87, market: deal.state||'Regional', strategy: 'BUY AND HOLD', price: deal.askingPrice?formatCurrency(deal.askingPrice):'TBD', rehab: 'MEDIUM_REHAB', reason: 'Buy-and-hold investor with DSCR financing.', concern: 'Has not been contacted in 30+ days.' },
                    { name: 'Regional Flipper', tier: 'TIER_2', match: 72, market: deal.state||'Regional', strategy: 'FLIP', price: deal.askingPrice?`Up to ${formatCurrency(deal.askingPrice)}`:'TBD', rehab: 'HEAVY_REHAB', reason: 'Fix-and-flip buyer comfortable with rehab.', concern: null },
                  ].slice(0, Math.max(1, b)).map((buyer, i) => (
                    <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold text-sm">{buyer.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${buyer.tier==='TIER_1'?'bg-orange-900/60 text-orange-300':'bg-gray-800 text-gray-400'}`}>{buyer.tier==='TIER_1'?'Tier 1':'Tier 2'}</span>
                        </div>
                        <span className={`text-sm font-bold ${buyer.match>=80?'text-green-400':buyer.match>=60?'text-yellow-400':'text-gray-400'}`}>{buyer.match}% match</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
                        <div><p className="text-gray-600 mb-0.5">Strategy</p><p className="text-gray-300 font-medium">{buyer.strategy}</p></div>
                        <div><p className="text-gray-600 mb-0.5">Price Range</p><p className="text-gray-300 font-medium">{buyer.price}</p></div>
                        <div><p className="text-gray-600 mb-0.5">Rehab</p><p className="text-gray-300 font-medium">{buyer.rehab.replace(/_/g,' ')}</p></div>
                      </div>
                      <div className="bg-green-900/20 border border-green-800/40 rounded-lg p-2.5 mb-2">
                        <p className="text-green-400 text-[10px] font-bold mb-0.5">Why they match</p>
                        <p className="text-gray-300 text-xs">{buyer.reason}</p>
                      </div>
                      {buyer.concern && (
                        <div className="bg-amber-900/20 border border-amber-800/40 rounded-lg p-2.5 mb-2">
                          <p className="text-amber-400 text-[10px] font-bold mb-0.5">Possible concern</p>
                          <p className="text-gray-300 text-xs">{buyer.concern}</p>
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition border border-gray-700"><Phone size={11}/> Contact</button>
                        <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 text-xs rounded-lg transition border border-blue-700/40"><Plus size={11}/> Add to Blast</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
                  <Users size={32} className="text-gray-700 mx-auto mb-3"/>
                  <p className="text-gray-400 font-medium mb-1">No buyers matched yet</p>
                  <p className="text-gray-600 text-sm mb-4">Run buyer match to find qualified buyers for this deal.</p>
                  <button onClick={()=>matchAction.mutate()} disabled={matchAction.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl font-medium transition mx-auto disabled:opacity-50">
                    <Target size={14}/> {matchAction.isPending?'Matching...':'Run Buyer Match'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* DISPO EXECUTION TAB */}
          {tab === 'dispo' && (
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                  <h3 className="text-white text-sm font-medium">Confirm Blast Requirements</h3>
                </div>
                <div className="p-4">
                  {(() => {
                    const checks = [
                      { label: 'Photos available', ok: hasPhotos, critical: true, action: <button onClick={()=>setTab('overview')} className="text-[10px] px-2 py-0.5 bg-amber-900/40 text-amber-300 rounded border border-amber-700/40">Add Photos</button> },
                      { label: 'Asking price confirmed', ok: !!deal.askingPrice, critical: true, action: null },
                      { label: 'Buyer-facing description', ok: !!deal.description, critical: true, action: null },
                      { label: 'Permission to market', ok: hasPermission, critical: true, action: null },
                      { label: 'Buyer matches selected', ok: b > 0, critical: true, action: b===0?<button onClick={()=>matchAction.mutate()} disabled={matchAction.isPending} className="text-[10px] px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded border border-blue-700/40">{matchAction.isPending?'Matching...':'Run Match'}</button>:null },
                      { label: 'Access / lockbox confirmed', ok: !!deal.accessInfo, critical: false, action: null },
                      { label: 'COE / closing date known', ok: !!deal.closingDate, critical: false, action: null },
                    ];
                    const passed = checks.filter(c=>c.ok).length;
                    const blastReady = checks.filter(c=>c.critical).every(c=>c.ok);
                    const pct = Math.round((passed/checks.length)*100);
                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-bold ${blastReady?'text-green-400':'text-amber-400'}`}>{blastReady?'✓ Blast Ready':`${pct}% complete`}</span>
                          <span className="text-gray-500 text-xs">{passed}/{checks.length}</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full mb-3">
                          <div className={`h-full rounded-full ${blastReady?'bg-green-500':pct>=60?'bg-amber-500':'bg-red-500'}`} style={{width:`${pct}%`}}/>
                        </div>
                        <div className="space-y-2">
                          {checks.map((c,i)=>(
                            <div key={i} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${c.ok?'bg-green-900/60':c.critical?'bg-red-900/60':'bg-gray-800'}`}>
                                  {c.ok?<CheckCircle size={10} className="text-green-400"/>:<X size={8} className={c.critical?'text-red-400':'text-gray-600'}/>}
                                </div>
                                <span className={`text-xs ${c.ok?'text-gray-400':c.critical?'text-red-300':'text-gray-500'}`}>{c.label}</span>
                                {!c.ok && c.critical && <span className="text-[9px] text-red-500 uppercase font-bold">required</span>}
                              </div>
                              {!c.ok && c.action}
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                    <h3 className="text-white text-sm font-medium">Select Buyers</h3>
                  </div>
                  <button onClick={()=>matchAction.mutate()} disabled={matchAction.isPending} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded-lg transition">
                    <Target size={11}/> {matchAction.isPending?'Matching...':'Re-run Match'}
                  </button>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    {[{l:'Total',v:b,c:b>0?'text-white':'text-gray-600'},{l:'Tier 1',v:t1,c:t1>0?'text-orange-400':'text-gray-600'},{l:'Recommended',v:b>0?Math.max(1,Math.round(b*0.75)):0,c:'text-green-400'},{l:'Excluded',v:b>0?Math.round(b*0.25):0,c:'text-gray-500'}].map(s=>(
                      <div key={s.l} className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{s.l}</p>
                      </div>
                    ))}
                  </div>
                  {b>0?<p className="text-gray-400 text-xs">Prioritize Tier 1 and active {deal.city||'local'} cash buyers.</p>:<p className="text-gray-600 text-sm">No buyers matched. Run match to build blast list.</p>}
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">3</span>
                  <h3 className="text-white text-sm font-medium">Generate Campaign</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[{key:'sms',l:'SMS Blast',cl:'bg-green-900/40 hover:bg-green-900/60 border-green-700/40 text-green-300',icon:MessageSquare},{key:'email',l:'Email Blast',cl:'bg-blue-900/40 hover:bg-blue-900/60 border-blue-700/40 text-blue-300',icon:Mail},{key:'facebook',l:'FB Post',cl:'bg-indigo-900/40 hover:bg-indigo-900/60 border-indigo-700/40 text-indigo-300',icon:Facebook},{key:'followUp',l:'Follow-Up',cl:'bg-amber-900/40 hover:bg-amber-900/60 border-amber-700/40 text-amber-300',icon:Send}].map(btn=>(
                      <button key={btn.key} onClick={()=>btn.key==='followUp'?followUpAction.mutate():generateContent.mutate(btn.key)} disabled={generateContent.isPending}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition ${btn.cl}`}>
                        <btn.icon size={13}/> {btn.l}
                      </button>
                    ))}
                  </div>
                  <AnimatePresence>
                    {generatedOutput.sms&&<div className="mb-3"><div className="flex items-center justify-between mb-1"><p className="text-gray-500 text-xs">📱 SMS Preview</p><span className="text-gray-600 text-xs">{b} buyers selected</span></div><GeneratedOutput content={generatedOutput.sms} onClose={()=>setGeneratedOutput(p=>({...p,sms:''}))} /><button onClick={()=>toast.success('Twilio not yet configured — export and send manually')} className="mt-2 flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-xs rounded-lg transition font-semibold"><Zap size={11}/> Send to {b} Buyers</button></div>}
                    {generatedOutput.email&&<div className="mb-3"><p className="text-gray-500 text-xs mb-1">📧 Email Preview</p><GeneratedOutput content={generatedOutput.email} onClose={()=>setGeneratedOutput(p=>({...p,email:''}))} /></div>}
                    {generatedOutput.facebook&&<div className="mb-3"><p className="text-gray-500 text-xs mb-1">📘 FB Post</p><GeneratedOutput content={generatedOutput.facebook} onClose={()=>setGeneratedOutput(p=>({...p,facebook:''}))} /></div>}
                    {generatedOutput.followUp&&<div className="mb-3"><p className="text-gray-500 text-xs mb-1">💬 Follow-Up</p><GeneratedOutput content={generatedOutput.followUp} onClose={()=>setGeneratedOutput(p=>({...p,followUp:''}))} /></div>}
                  </AnimatePresence>
                </div>
              </div>

              {/* Step 4 + 5 */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-700 text-gray-400 text-[10px] font-bold flex items-center justify-center">4</span>
                  <h3 className="text-white text-sm font-medium">Track & Close</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                    {['Contacted','Replied','Interested','Offers','Best Offer','Follow-Ups'].map(l=>(
                      <div key={l} className="bg-gray-800/50 rounded-lg p-2.5 text-center">
                        <p className="text-white text-sm font-bold">—</p>
                        <p className="text-gray-600 text-[10px] mt-0.5">{l}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-gray-600 text-xs mb-3">Response tracking coming soon.</p>
                  <div className="flex gap-2 flex-wrap">
                    {['OFFER_RECEIVED','ASSIGNED','CLOSED','DEAD'].map(s=>(
                      <button key={s} onClick={()=>updateStatus.mutate(s)} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition border border-gray-700">
                        Mark {s.replace(/_/g,' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SOURCE TAB */}
          {tab === 'source' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Source / JV Partner" icon={Users}>
                <InfoRow label="Source Type" value={deal.sourceType} />
                <InfoRow label="Name" value={deal.sourceName} />
                {deal.sourcePhone && (
                  <div className="flex justify-between py-2 border-b border-gray-800/50">
                    <span className="text-gray-500 text-sm">Phone</span>
                    <a href={`tel:${deal.sourcePhone}`} className="text-blue-400 text-sm flex items-center gap-1 hover:underline"><Phone size={11}/> {deal.sourcePhone}</a>
                  </div>
                )}
                {deal.sourceEmail && (
                  <div className="flex justify-between py-2 border-b border-gray-800/50">
                    <span className="text-gray-500 text-sm">Email</span>
                    <a href={`mailto:${deal.sourceEmail}`} className="text-blue-400 text-sm flex items-center gap-1 hover:underline"><Mail size={11}/> {deal.sourceEmail}</a>
                  </div>
                )}
                <InfoRow label="Permission to Market" value={deal.permissionToMarket} />
                <InfoRow label="JV Agreement" value={deal.jvAgreementStatus} />
                {deal.facebookPostUrl && <InfoRow label="FB Post" value="View Post" href={deal.facebookPostUrl} />}
                {deal.originalPostText && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <button onClick={()=>setShowOriginalPost(!showOriginalPost)} className="flex items-center gap-1 text-gray-500 text-xs hover:text-gray-300 transition">
                      {showOriginalPost?<ChevronUp size={12}/>:<ChevronDown size={12}/>} {showOriginalPost?'Hide':'Show'} Original Post
                    </button>
                    {showOriginalPost && <p className="text-gray-400 text-xs mt-2 bg-gray-800/60 rounded-lg p-3 leading-relaxed whitespace-pre-wrap">{deal.originalPostText}</p>}
                  </div>
                )}
                {!deal.sourceName && !deal.sourcePhone && <p className="text-gray-600 text-sm">No source info added</p>}
              </Card>

              <Card title="Timeline" icon={Clock}>
                <InfoRow label="Contract Date" value={deal.contractDate?new Date(deal.contractDate).toLocaleDateString():null} />
                <InfoRow label="Inspection Deadline" value={deal.inspectionDeadline?new Date(deal.inspectionDeadline).toLocaleDateString():null} />
                <InfoRow label="EMD Due" value={deal.emdDueDate?new Date(deal.emdDueDate).toLocaleDateString():null} />
                <InfoRow label="Closing / COE" value={deal.closingDate?new Date(deal.closingDate).toLocaleDateString():null} />
                <InfoRow label="Vacant at Close" value={deal.vacantAtClose!=='UNKNOWN'?deal.vacantAtClose:null} />
                <InfoRow label="Title Company" value={deal.titleCompany} />
                {!deal.closingDate && !deal.contractDate && <p className="text-gray-600 text-sm">No timeline data added</p>}
              </Card>

              <Card title="Activity Log" icon={FileText}>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"/>
                    <div><p className="text-gray-300 text-xs">Deal created</p><p className="text-gray-600 text-xs">{new Date(deal.createdAt).toLocaleString()}</p></div>
                  </div>
                  {deal.status !== 'DRAFT' && (
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0"/>
                      <div><p className="text-gray-300 text-xs">Status: {deal.status?.replace(/_/g,' ')}</p><p className="text-gray-600 text-xs">{new Date(deal.updatedAt).toLocaleString()}</p></div>
                    </div>
                  )}
                  <p className="text-gray-700 text-xs mt-2 pt-2 border-t border-gray-800">Full activity log coming soon</p>
                </div>
              </Card>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
