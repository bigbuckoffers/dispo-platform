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
, Trash2 } from 'lucide-react';
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



function DateField({ value, placeholder, onSave }: {
  value: string; placeholder: string; onSave: (v:string)=>void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);
  if (editing) return (
    <input autoFocus type="date" value={val}
      onChange={e=>setVal(e.target.value)}
      onBlur={()=>{ setEditing(false); if(val!==value) onSave(val); }}
      onKeyDown={e=>{ if(e.key==='Escape') setEditing(false); }}
      className="bg-gray-800 border border-blue-500 rounded px-1 text-xs text-white outline-none w-32" />
  );
  const display = value ? new Date(value+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'}) : null;
  return (
    <button onClick={()=>setEditing(true)}
      className="text-xs text-white hover:bg-gray-800 rounded px-1 py-0.5 transition">
      {display || <span className="text-gray-600 italic">{placeholder}</span>}
    </button>
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
      className="text-xs text-white hover:bg-gray-800 rounded px-1 py-0.5 transition">
      {value ? `${value}${suffix ? ' '+suffix : ''}` : <span className="text-gray-600 italic">{placeholder}</span>}
    </button>
  );
}


function RealBuyerMatches({ dealId, matchCount, onRunMatch, isMatching }: { dealId: string; matchCount: number; onRunMatch: () => void; isMatching: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['deal-matches', dealId],
    queryFn: () => api.get('/deals/' + dealId + '/matches?limit=50').then(r => r.data),
    enabled: matchCount > 0,
  });
  const TIER_COLOR: Record<string, string> = {
    VIP: 'bg-yellow-900/60 text-yellow-300',
    TIER_1: 'bg-orange-900/60 text-orange-300',
    TIER_2: 'bg-blue-900/60 text-blue-300',
    TIER_3: 'bg-gray-800 text-gray-400',
    TIER_4: 'bg-gray-800 text-gray-500',
  };
  if (matchCount === 0) return (
    <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
      <Users size={32} className="text-gray-700 mx-auto mb-3"/>
      <p className="text-gray-400 font-medium mb-1">No buyers matched yet</p>
      <p className="text-gray-600 text-sm mb-4">AI will scan your entire buyer database and rank matches by likelihood to close.</p>
      <button onClick={onRunMatch} disabled={isMatching} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl font-medium transition mx-auto disabled:opacity-50">
        <Target size={14}/> {isMatching ? 'Running AI Matching...' : 'Run AI Buyer Match'}
      </button>
    </div>
  );
  if (isLoading) return <div className="p-8 text-center text-gray-500 text-sm">Loading buyer matches...</div>;
  if (matches.length === 0) return (
    <div className="text-center py-8 bg-gray-900 rounded-xl border border-gray-800">
      <p className="text-gray-500 text-sm mb-3">No match results yet</p>
      <button onClick={onRunMatch} disabled={isMatching} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition mx-auto disabled:opacity-50">
        <Target size={12}/> {isMatching ? 'Running...' : 'Run AI Match'}
      </button>
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-gray-500">{matches.length} buyers ranked by AI — most likely to close first</p>
        <button onClick={onRunMatch} disabled={isMatching} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition border border-gray-700 disabled:opacity-50">
          <RefreshCw size={10} className={isMatching ? 'animate-spin' : ''}/> {isMatching ? 'Running...' : 'Re-run AI Match'}
        </button>
      </div>
      {matches.map((match: any, i: number) => {
        const buyer = match.buyer;
        const score = Math.round(match.confidencePct || 0);
        const isExpanded = expandedId === match.id;
        const scoreColor = score >= 70 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-gray-500';
        const strength = score >= 70 ? 'Strong Match' : score >= 50 ? 'Moderate' : 'Weak';
        const strengthBg = score >= 70 ? 'bg-green-900/20 border-green-800/40 text-green-400' : score >= 50 ? 'bg-amber-900/20 border-amber-800/40 text-amber-400' : 'bg-gray-800 border-gray-700 text-gray-500';
        return (
          <div key={match.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/30 transition" onClick={() => setExpandedId(isExpanded ? null : match.id)}>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-5 font-mono">#{i+1}</span>
                <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                  {buyer?.firstName?.[0]}{buyer?.lastName?.[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm">{buyer?.firstName} {buyer?.lastName}</p>
                    {buyer?.company && <span className="text-gray-500 text-xs">· {buyer.company}</span>}
                    <span className={"text-[10px] px-1.5 py-0.5 rounded-full font-bold " + (TIER_COLOR[buyer?.tier] || TIER_COLOR.TIER_3)}>{buyer?.tier?.replace("_"," ")}</span>
                  </div>
                  <p className="text-gray-500 text-xs">{buyer?.investorType?.replace(/_/g," ")}{buyer?.marketPrimary ? " · " + buyer.marketPrimary : ""}{buyer?.hasCash ? " · Cash" : ""}{buyer?.hasHardMoney ? " · Hard Money" : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={"text-[10px] px-2 py-0.5 rounded border font-medium " + strengthBg}>{strength}</span>
                <div className="text-right">
                  <p className={"text-lg font-bold " + scoreColor}>{score}%</p>
                  <p className="text-gray-600 text-[10px]">match</p>
                </div>
                {isExpanded ? <ChevronUp size={14} className="text-gray-500"/> : <ChevronDown size={14} className="text-gray-500"/>}
              </div>
            </div>
            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-800">
                {(buyer?.buyerIntelNotes || buyer?.aiSummary) && (
                  <div className="bg-green-900/15 border border-green-800/30 rounded-lg p-3 mt-3">
                    <p className="text-green-400 text-[10px] font-bold mb-1">Why they match</p>
                    <p className="text-gray-300 text-xs">{buyer.buyerIntelNotes || buyer.aiSummary}</p>
                  </div>
                )}
                {buyer?.temperatureNotes && (
                  <div className="bg-amber-900/15 border border-amber-800/30 rounded-lg p-3">
                    <p className="text-amber-400 text-[10px] font-bold mb-1">Possible concern</p>
                    <p className="text-gray-300 text-xs">{buyer.temperatureNotes}</p>
                  </div>
                )}
                {buyer?.buyBox && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-gray-800 rounded p-2"><p className="text-gray-600 mb-0.5">Strategy</p><p className="text-gray-300 font-medium">{buyer.buyBox.investmentStrategy?.[0]?.replace(/_/g," ") || buyer.preferredStrategies?.[0] || "—"}</p></div>
                    <div className="bg-gray-800 rounded p-2"><p className="text-gray-600 mb-0.5">Price Range</p><p className="text-gray-300 font-medium">{buyer.buyBox.minPrice||buyer.buyBox.maxPrice ? "$"+Math.round((buyer.buyBox.minPrice||0)/1000)+"k–$"+Math.round((buyer.buyBox.maxPrice||0)/1000)+"k" : "Open"}</p></div>
                    <div className="bg-gray-800 rounded p-2"><p className="text-gray-600 mb-0.5">Rehab</p><p className="text-gray-300 font-medium">{buyer.buyBox.rehabTolerance?.replace(/_/g," ") || "—"}</p></div>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  {buyer?.phone && <a href={"tel:"+buyer.phone} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition border border-gray-700"><Phone size={11}/> {buyer.phone}</a>}
                  {buyer?.email && <a href={"mailto:"+buyer.email} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition border border-gray-700"><Mail size={11}/> Email</a>}
                  <a href={"/dashboard/buyers/"+buyer?.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 text-xs rounded-lg transition border border-blue-700/40">View Profile →</a>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DealDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const qc = useQueryClient();
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [arvResult, setArvResult] = useState<any>(null);
  const [aiResult, setAiResult] = useState<any>(null);
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

  // Load saved ARV analysis from DB on page load
  useEffect(() => {
    if (deal?.arvAnalysis && !arvAnalysis) {
      try {
        const saved = typeof deal.arvAnalysis === 'string' ? JSON.parse(deal.arvAnalysis) : deal.arvAnalysis;
        if (saved?.arvMedian) {
          setArvAnalysis({
            outputState: saved.outputState,
            arvLow: saved.arvLow,
            arvMedian: saved.arvMedian,
            arvHigh: saved.arvHigh,
            confidence: saved.avgConfidenceScore ? Math.round(saved.avgConfidenceScore / 20) : 2,
            subdivisionName: saved.validatedComps?.[0]?.address?.split(',')[1]?.trim() || '',
            comps: (saved.validatedComps || []).map((c: any) => ({
              address: c.address,
              salePrice: c.salePrice,
              sqft: c.sqft,
              beds: c.beds,
              baths: c.baths,
              saleDate: c.saleDate,
              pricePerSqft: c.pricePerSqft,
            })),
            dataWarnings: saved.outputState === 'WEAK_COMP_SET' ? 'High price variance detected — manual review recommended before using ARV.' : null,
            assumptionLog: `Scraped: ${saved.validatedComps?.length || 0}, Validated: ${saved.validatedComps?.length || 0}, Rejected: 0`,
          });
        }
      } catch(e) { /* ignore parse errors */ }
    }
  }, [deal?.arvAnalysis]);

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
      const d = r.data;
      // Map new validation-first response to UI format
      setArvAnalysis({
        ...d,
        arvLow: d.arvLow,
        arvMedian: d.arvMedian,
        arvHigh: d.arvHigh,
        comps: d.validatedComps || [],
        recommendation: d.aiNarrative?.recommendedNextAction || '',
        subdivisionName: d.subject?.city || '',
        confidence: d.avgConfidenceScore ? Math.round(d.avgConfidenceScore/20) : 2,
        confidenceReason: `${d.validatedCompCount} validated comps · State: ${d.outputState}`,
        dataWarnings: d.outputState === 'MANUAL_REVIEW_REQUIRED' ? 'High price variance detected — manual review recommended before using ARV.' : d.outputState === 'INSUFFICIENT_DATA' ? 'Insufficient verified comp data found.' : '',
        claudeNarrative: d.claudeNarrative || null,
        assumptionLog: d.validationLog ? `Scraped: ${d.validationLog.totalScraped}, Validated: ${d.validationLog.totalValidated}, Rejected: ${d.validationLog.rejectedCount}` : '',
      });
      if(d.arvMedian) qc.invalidateQueries({ queryKey: ['deal', id] });
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
  const pubEstimates = [deal.zillowEstimate, deal.realtorEstimate, deal.redfinEstimate, deal.rentcastEstimate].filter(Boolean) as number[];
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
  // Deal Quality Score = pure deal score from DB
  const dealScore = deal.dealPriorityScore || 0;

  // Dispo Score = Deal Score + buyer demand + blast readiness proxy
  let dispoBonus = 0;
  if ((deal.matchedBuyerCount || 0) >= 10) dispoBonus += 8;
  else if ((deal.matchedBuyerCount || 0) >= 5) dispoBonus += 5;
  else if ((deal.matchedBuyerCount || 0) >= 1) dispoBonus += 3;
  if ((deal.tier1MatchCount || 0) >= 3) dispoBonus += 5;
  else if ((deal.tier1MatchCount || 0) >= 1) dispoBonus += 3;
  if (hasPhotos) dispoBonus += 3;
  if (hasPermission) dispoBonus += 2;
  if (deal.assignmentDeadline || deal.closingDate) {
    const dl = deal.assignmentDeadline || deal.closingDate;
    const daysLeft = Math.ceil((new Date(dl).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 14) dispoBonus += 3;
    else if (daysLeft <= 30) dispoBonus += 1;
  }
  const sellScore = Math.min(100, dealScore + dispoBonus);

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
              <button onClick={async () => {
                if (!confirm('Delete this deal? This cannot be undone.')) return;
                await fetch(`${process.env.NEXT_PUBLIC_API_URL}/deals/${deal.id}`, { method: 'DELETE' });
                window.location.href = '/dashboard/deals';
              }} className="flex items-center gap-1 px-2 py-1 bg-red-900/30 hover:bg-red-900/60 text-red-400 text-[10px] rounded-lg border border-red-800/40 transition">
                <Trash2 size={10}/> Delete
              </button>
            </div>
          </div>
          {/* Row 2: property fields left, county+type right */}
          <div className="flex items-center justify-between mt-1 ml-5">
            <div className="flex items-center gap-4 text-xs text-white">
              <span><span className="text-gray-500">Beds:</span> <HeaderField value={deal.beds?`${deal.beds}`:''} placeholder="—" onSave={v=>updateDeal.mutate({beds:parseInt(v)||null})} width="w-6" /></span>
              <span><span className="text-gray-500">Bathrooms:</span> <HeaderField value={deal.baths?`${deal.baths}`:''} placeholder="—" onSave={v=>updateDeal.mutate({baths:parseFloat(v)||null})} width="w-6" /></span>
              <span><span className="text-gray-500">Sqft:</span> <HeaderField value={deal.sqft?`${deal.sqft.toLocaleString()}`:''} placeholder="—" onSave={v=>updateDeal.mutate({sqft:parseInt(v.replace(/,/g,''))||null})} width="w-16" /></span>
              <span><span className="text-gray-500">Year Built:</span> <HeaderField value={deal.yearBuilt?`${deal.yearBuilt}`:''} placeholder="—" onSave={v=>updateDeal.mutate({yearBuilt:parseInt(v)||null})} width="w-12" /></span>
              <span><span className="text-gray-500">Occupancy:</span> <HeaderField value={deal.occupancy?.replace(/_/g,' ')||''} placeholder="—" onSave={v=>updateDeal.mutate({occupancy:v.toUpperCase().replace(/ /g,'_')})} width="w-16" /></span>
              <span><span className="text-gray-500">Access:</span> <HeaderField value={deal.accessInfo||''} placeholder="—" onSave={v=>updateDeal.mutate({accessInfo:v})} width="w-24" /></span>
              <span className="text-gray-700 text-xs mx-0.5">·</span>
              <span><span className="text-gray-500">Insp. Deadline:</span> <DateField value={deal.inspectionDeadline?new Date(deal.inspectionDeadline).toISOString().split('T')[0]:''} placeholder="—" onSave={v=>updateDeal.mutate({inspectionDeadline:v?new Date(v).toISOString():null})} /></span>
              <span className="text-gray-700 text-xs mx-0.5">·</span>
              <span><span className="text-gray-500">Closing Date:</span> <DateField value={deal.closingDate?new Date(deal.closingDate).toISOString().split('T')[0]:''} placeholder="—" onSave={v=>updateDeal.mutate({closingDate:v?new Date(v).toISOString():null})} /></span>
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
        <div className="grid grid-cols-12 gap-3 mb-3" style={{maxHeight:480}}>

          {/* LEFT: Photos (5 cols) */}
          <div className="col-span-12 md:col-span-5" style={{height:460}}>
            <PhotoGallery deal={deal} onUpdate={(data) => updateDeal.mutate(data)} />
          </div>

                              {/* CENTER: Dispo Score + Blockers (4 cols) */}
          <div className="col-span-12 md:col-span-4 flex flex-col gap-2 overflow-y-auto" style={{height:460}}>
            <div className={`rounded-xl border p-3 h-full flex flex-col ${scoreBg}`}>

              {/* Score header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className={`text-3xl font-black leading-none ${scoreColor}`}>{sellScore}</span>
                    <span className="text-gray-500 text-xs">/100</span>
                  </div>
                  <p className={`text-sm font-bold ${scoreColor}`}>{scoreLabel}</p>
                  <p className="text-blue-500 text-[10px] mt-0.5 font-semibold uppercase tracking-wide">Dispo Score</p>
                </div>
                <div className="w-14 h-14">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f2937" strokeWidth="3"/>
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke={sellScore>=75?"#22c55e":sellScore>=60?"#3b82f6":sellScore>=40?"#eab308":"#ef4444"}
                      strokeWidth="3" strokeDasharray={`${sellScore} ${100-sellScore}`} strokeLinecap="round"/>
                  </svg>
                </div>
              </div>

              {/* Buyer Demand */}
              {(() => {
                const t1 = deal.tier1MatchCount || 0;
                const t2 = deal.matchedBuyerCount ? Math.max(0, deal.matchedBuyerCount - t1) : 0;
                const total = deal.matchedBuyerCount || 0;
                const demandLabel = total === 0 ? null : t1 >= 3 ? 'High Demand' : t1 >= 1 ? 'Moderate Demand' : 'Low Demand';
                const demandColor = t1 >= 3 ? 'text-green-400' : t1 >= 1 ? 'text-yellow-400' : 'text-gray-500';
                if (total === 0) return (
                  <div className="bg-gray-800/40 rounded-lg px-3 py-2 mb-2">
                    <p className="text-gray-600 text-xs">No buyers matched yet</p>
                  </div>
                );
                return (
                  <div className="bg-gray-800/40 rounded-lg px-3 py-2 mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-500 text-[10px] font-semibold uppercase tracking-wide">Buyer Demand</span>
                      <span className={`text-[10px] font-bold ${demandColor}`}>{demandLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">{total}</span>
                      <span className="text-gray-500 text-xs">buyers matched</span>
                      <div className="flex items-center gap-1 ml-auto">
                        {t1 > 0 && <span className="flex items-center gap-0.5 text-[10px] font-semibold text-orange-400"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"/>{t1} T1</span>}
                        {t2 > 0 && <span className="flex items-center gap-0.5 text-[10px] font-semibold text-purple-400 ml-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block"/>{t2} T2</span>}
                      </div>
                    </div>
                  </div>
                );
              })()}



              {/* Inspection + Close countdown */}
              {(() => {
                const inspDate = deal.inspectionDeadline ? new Date(deal.inspectionDeadline) : null;
                const closeDate = deal.closingDate ? new Date(deal.closingDate) : null;
                const today = Date.now();
                const inspDays = inspDate ? Math.ceil((inspDate.getTime() - today) / 86400000) : null;
                const closeDays = closeDate ? Math.ceil((closeDate.getTime() - today) / 86400000) : null;
                const t1 = deal.tier1MatchCount || 0;
                const total = deal.matchedBuyerCount || 0;
                const estClose = t1 >= 3 ? '3–5 days' : t1 >= 1 ? '5–10 days' : total >= 3 ? '10–21 days' : null;
                return (
                  <div className="grid grid-cols-2 gap-2 mb-2 auto-rows-auto">
                    <div className={`rounded-lg px-2.5 py-2 ${inspDays !== null && inspDays <= 5 ? 'bg-red-900/30 border border-red-800/40' : inspDays !== null && inspDays <= 10 ? 'bg-yellow-900/20 border border-yellow-800/30' : 'bg-gray-800/50'}`}>
                      <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Insp. Deadline</p>
                      {inspDays !== null ? <>
                        <p className={`font-bold text-sm ${inspDays <= 5 ? 'text-red-400' : inspDays <= 10 ? 'text-yellow-400' : 'text-white'}`}>{inspDays}d left</p>
                        <p className="text-gray-600 text-[10px]">{inspDate!.toLocaleDateString()}</p>
                      </> : <>
                        <p className="text-gray-600 text-sm font-bold">—</p>
                        <p className="text-gray-700 text-[10px]">not set</p>
                      </>}
                    </div>
                    <div className={`rounded-lg px-2.5 py-2 ${closeDays !== null && closeDays <= 7 ? 'bg-red-900/30 border border-red-800/40' : closeDays !== null && closeDays <= 14 ? 'bg-yellow-900/20 border border-yellow-800/30' : 'bg-gray-800/50'}`}>
                      <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-wide mb-0.5">COE Deadline</p>
                      {closeDays !== null ? <>
                        <p className={`font-bold text-sm ${closeDays <= 7 ? 'text-red-400' : closeDays <= 14 ? 'text-yellow-400' : 'text-white'}`}>{closeDays}d left</p>
                        <p className="text-gray-600 text-[10px]">{closeDate!.toLocaleDateString()}</p>
                      </> : <>
                        <p className="text-gray-600 text-sm font-bold">—</p>
                        <p className="text-gray-700 text-[10px]">not set</p>
                      </>}
                    </div>
                  </div>
                );
              })()}

              {/* Risk Flags */}
              {(() => {
                const flags: string[] = [];
                if (deal.yearBuilt && deal.yearBuilt < 1978) flags.push('Built pre-1978 — possible lead paint');
                
                if ((deal.overallCondition||'').includes('HEAVY')) flags.push('Heavy rehab — fewer cash buyer candidates');
                if (deal.dealType === 'SUBTO' || deal.dealType === 'CREATIVE') flags.push('Creative finance — requires buyer education');
                if (!flags.length) return null;
                return (
                  <div className="mb-2">
                    <p className="text-gray-600 text-[10px] font-bold uppercase tracking-wide mb-1 px-1">Risk Flags</p>
                    <div className="space-y-1">
                      {flags.map((flag, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-yellow-600 bg-yellow-900/10 rounded px-2 py-1">
                          <AlertCircle size={10} className="shrink-0 mt-0.5 text-yellow-500"/>
                          {flag}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Blockers */}
              {sellBlockers.length > 0 && (
                <div className="pt-2 border-t border-white/5 space-y-2 mt-auto">
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
                </div>
              )}
              {sellBlockers.length === 0 && (
                <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-center py-2">
                  <div className="text-center">
                    <CheckCircle size={20} className="text-green-400 mx-auto mb-1"/>
                    <p className="text-green-400 text-xs font-semibold">No Blockers — Ready to Blast</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Deal Quality Score (3 cols) */}
          <div className="col-span-12 md:col-span-3" style={{height:460}}>
            {(() => {
              const dqs = deal.dealPriorityScore || 0;
              const mao = deal.arv ? (deal.arv * 0.7) - (deal.repairEstimate || 0) : null;
              const arvThreshold = deal.arv ? deal.arv * 0.7 : null;
              const askVsArv = mao && deal.askingPrice ? deal.askingPrice - mao : null;
              const dqColor = dqs >= 70 ? '#22c55e' : dqs >= 45 ? '#f59e0b' : '#ef4444';
              const dqLabel = dqs >= 70 ? 'Strong Deal' : dqs >= 45 ? 'Possible Deal' : 'Weak Numbers';
              const dqTextColor = dqs >= 70 ? 'text-green-400' : dqs >= 45 ? 'text-yellow-400' : 'text-red-400';
              const dqBg = dqs >= 70 ? 'bg-green-950/40 border-green-900/40' : dqs >= 45 ? 'bg-yellow-950/40 border-yellow-900/40' : 'bg-red-950/40 border-red-900/40';
              const circ = 2 * Math.PI * 15.9;
              const offset = circ - (dqs / 100) * circ;
              return (
                <div className={`rounded-xl border p-3 h-full flex flex-col ${dqBg}`}>
                  {/* Score header — matches left card layout */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className={`text-3xl font-black leading-none ${dqTextColor}`}>{dqs}</span>
                        <span className="text-gray-500 text-xs">/100</span>
                      </div>
                      <p className={`text-sm font-bold ${dqTextColor}`}>{dqLabel}</p>
                      <p className="text-emerald-500 text-[10px] mt-0.5 font-semibold uppercase tracking-wide">Deal Quality</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="w-14 h-14">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f2937" strokeWidth="3"/>
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke={dqColor}
                            strokeWidth="3" strokeDasharray={`${dqs} ${100-dqs}`} strokeLinecap="round"/>
                        </svg>
                      </div>
                      <button onClick={fetchZestimate} disabled={zestimateFetching}
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 text-[10px] rounded border border-blue-700/40 transition">
                        <Sparkles size={8}/> {zestimateFetching?'...':'Zestimate'}
                      </button>
                    </div>
                  </div>
                  {/* Numbers */}
                  <div className="space-y-1.5 flex-1 overflow-y-auto">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-xs">Asking Price</span>
                      <div className="text-right">
                        <p className="text-white font-bold text-xs">{deal.askingPrice ? formatCurrency(deal.askingPrice) : '—'}</p>
                        {pricePos && <p className={`text-[10px] font-semibold ${pricePos==='UNDER_70'||pricePos==='NEAR_UNDER'?'text-green-400':pricePos==='NEAR_OVER'?'text-yellow-400':'text-red-400'}`}>
                          {pricePos==='UNDER_70'?'Under 70%':pricePos==='NEAR_UNDER'?'Near 70%':pricePos==='NEAR_OVER'?'Near 70%':'Over 70%'}
                        </p>}
                      </div>
                    </div>
                    {refValue > 0 && <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-xs">{avgPub?(pubEstimates.length>1?'Avg Public Val':'Zestimate'):'Public Val'}</span>
                        <p className="text-gray-300 text-xs">{formatCurrency(refValue)}</p>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-xs">70% of Public Val</span>
                        <p className="text-yellow-400 text-xs font-bold">{formatCurrency(threshold70)}</p>
                      </div>
                      {deal.askingPrice && (
                        <div className={`rounded-lg px-2 py-1.5 text-center ${gap>0?'bg-green-900/30':'bg-red-900/30'}`}>
                          <p className={`text-xs font-bold ${gap>0?'text-green-400':'text-red-400'}`}>
                            {gap>0?`${formatCurrency(Math.abs(gap))} under 70%`:`${formatCurrency(Math.abs(gap))} over 70%`}
                          </p>
                          <p className={`text-[10px] font-semibold mt-0.5 ${gap>20000?'text-green-500':gap>0?'text-green-400':gap>-20000?'text-yellow-400':'text-red-400'}`}>
                            {gap>20000?'Strong Price Signal':gap>0?'Near Investor Threshold':gap>-20000?'Slightly Over':'Overpriced'}
                          </p>
                        </div>
                      )}
                    </>}
                    <div className="border-t border-white/5 pt-1.5 space-y-1.5">
                      <div className="flex justify-between items-center cursor-pointer group/arv" onClick={()=>{if(!editingArv){setArvInput(deal.arv?String(deal.arv):'');setEditingArv(true);}}}>
                        <span className="text-gray-500 text-xs">ARV <span className="text-gray-700 text-[9px] group-hover/arv:text-gray-500">✎</span></span>
                        {editingArv ? (
                          <div className="flex gap-1" onClick={e=>e.stopPropagation()}>
                            <input autoFocus type="number" value={arvInput} onChange={e=>setArvInput(e.target.value)}
                              onKeyDown={e=>{if(e.key==='Enter'){updateDeal.mutate({arv:parseFloat(arvInput)||null});setEditingArv(false);}if(e.key==='Escape')setEditingArv(false);}}
                              className="w-20 bg-gray-800 text-white text-xs text-center rounded px-1 py-0.5 border border-blue-500 focus:outline-none"/>
                            <button onClick={()=>{updateDeal.mutate({arv:parseFloat(arvInput)||null});setEditingArv(false);}} className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded">✓</button>
                          </div>
                        ) : (
                          <p className="text-white text-xs font-semibold group-hover/arv:text-blue-300">{deal.arv?formatCurrency(deal.arv):<span className="text-gray-600">—</span>}</p>
                        )}
                      </div>
                      {arvThreshold && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-xs">70% of ARV</span>
                          <p className="text-yellow-400 text-xs font-bold">{formatCurrency(arvThreshold)}</p>
                        </div>
                      )}
                      <div className="flex justify-between items-center cursor-pointer group/rep" onClick={()=>{if(!editingRepairs){setRepairsInput(deal.repairEstimate?String(deal.repairEstimate):'');setEditingRepairs(true);}}}>
                        <span className="text-gray-500 text-xs">Repairs <span className="text-gray-700 text-[9px] group-hover/rep:text-gray-500">✎</span></span>
                        {editingRepairs ? (
                          <div className="flex gap-1" onClick={e=>e.stopPropagation()}>
                            <input autoFocus type="number" value={repairsInput} onChange={e=>setRepairsInput(e.target.value)}
                              onKeyDown={e=>{if(e.key==='Enter'){updateDeal.mutate({repairEstimate:parseFloat(repairsInput)||null});setEditingRepairs(false);}if(e.key==='Escape')setEditingRepairs(false);}}
                              className="w-20 bg-gray-800 text-white text-xs text-center rounded px-1 py-0.5 border border-blue-500 focus:outline-none"/>
                            <button onClick={()=>{updateDeal.mutate({repairEstimate:parseFloat(repairsInput)||null});setEditingRepairs(false);}} className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded">✓</button>
                          </div>
                        ) : (
                          <p className="text-white text-xs font-semibold group-hover/rep:text-blue-300">{deal.repairEstimate?formatCurrency(deal.repairEstimate):<span className="text-gray-600">—</span>}</p>
                        )}
                      </div>
                      {mao !== null && (
                        <div className={`rounded-lg px-2 py-1.5 text-center ${askVsArv!==null&&askVsArv<=0?'bg-green-900/30':'bg-yellow-900/20'}`}>
                          <p className="text-gray-500 text-[10px]">MAO (70% ARV − Repairs)</p>
                          <p className="text-white font-bold text-xs mt-0.5">{formatCurrency(mao)}</p>
                          {askVsArv !== null && (
                            <p className={`text-[10px] font-semibold mt-0.5 ${askVsArv<=0?'text-green-400':'text-red-400'}`}>
                              {askVsArv<=0?`${formatCurrency(Math.abs(askVsArv))} under MAO ✓`:`${formatCurrency(askVsArv)} over MAO`}
                            </p>
                          )}
                        </div>
                      )}
                      {!deal.arv && <p className="text-gray-700 text-[10px] text-center pt-1">Enter ARV to calculate MAO</p>}
                    </div>
                    {/* Run AI Analysis button */}
                    <div className="pt-2 mt-1 border-t border-white/5">
                      <button
                        onClick={async () => {
                          setAiAnalyzing(true);
                          try {
                            await runArvAnalysis();
                          } catch(e) { alert('ARV analysis failed'); }
                          finally { setAiAnalyzing(false); }
                        }}
                        disabled={aiAnalyzing}
                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 disabled:opacity-50 text-white text-xs rounded-lg font-semibold transition ${dqColor==="#22c55e"?"bg-green-700 hover:bg-green-600":dqColor==="#f59e0b"?"bg-yellow-700 hover:bg-yellow-600":"bg-red-700 hover:bg-red-600"}`}
                      >
                        <Sparkles size={12}/>
                        {aiAnalyzing ? 'Getting Comps...' : 'Get ARV Comps'}
                      </button>
                      {deal.aiAnalyzedAt && <p className="text-gray-700 text-[10px] text-center mt-1">Last analyzed {new Date(deal.aiAnalyzedAt).toLocaleDateString()}</p>}
                    </div>
                  </div>
                </div>
              );
            })()}
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

              {/* LEFT: Deal Notes (AI) + Map */}
              <div className="space-y-4">

                {/* Deal Notes + AI Analyzer */}
                <Card title="Deal Notes & AI Analysis" icon={Sparkles}>
                  <EditableTextarea
                    value={deal.conditionNotes||''}
                    onSave={v=>updateDeal.mutate({conditionNotes:v})}
                    placeholder="Dump everything you know about this deal — access issues, title situation, seller motivation, neighborhood notes, tenant details, anything good or bad. The AI will use this to analyze sellability."
                  />
                  <div className="mt-3">
                    <button
                      onClick={async () => {
                        setAiAnalyzing(true);
                        try {
                          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/deals/${deal.id}/analyze`, { method: 'POST' });
                          const data = await res.json();
                          setAiResult(data);

                        } catch(e) { toast('AI analysis failed'); }
                        finally { setAiAnalyzing(false); }
                      }}
                      disabled={aiAnalyzing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg font-semibold transition"
                    >
                      <Sparkles size={14}/>
                      {aiAnalyzing ? 'Analyzing with AI...' : 'Analyze This Deal with AI'}
                    </button>
                  </div>

                  {/* AI Results */}
                  {(aiResult || deal.aiVerdict) && (() => {
                    const r = aiResult || (deal.aiAnalysis as any);
                    if (!r) return null;
                    const verdictColor = r.verdict==='STRONG'?'text-green-400 bg-green-900/30 border-green-800/40':r.verdict==='POSSIBLE'?'text-yellow-400 bg-yellow-900/20 border-yellow-800/30':r.verdict==='RISKY'?'text-orange-400 bg-orange-900/20 border-orange-800/30':'text-red-400 bg-red-900/20 border-red-800/30';
                    return (
                      <div className="mt-3 space-y-3">
                        {/* Verdict */}
                        <div className={`rounded-lg p-3 border ${verdictColor}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sm">{r.verdict} DEAL</span>
                            {deal.aiAnalyzedAt && <span className="text-[10px] opacity-60">Analyzed {new Date(deal.aiAnalyzedAt).toLocaleDateString()}</span>}
                          </div>
                          <p className="text-xs opacity-80">{r.verdictReason}</p>
                        </div>
                        {/* Strengths */}
                        {r.strengths?.length > 0 && (
                          <div>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wide mb-1.5">Strengths</p>
                            <div className="space-y-1">
                              {r.strengths.map((s: string, i: number) => (
                                <div key={i} className="flex items-start gap-1.5 text-xs text-gray-300">
                                  <CheckCircle size={10} className="text-green-400 shrink-0 mt-0.5"/>
                                  {s}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Red Flags */}
                        {r.redFlags?.length > 0 && (
                          <div>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wide mb-1.5">Red Flags</p>
                            <div className="space-y-1">
                              {r.redFlags.map((f: string, i: number) => (
                                <div key={i} className="flex items-start gap-1.5 text-xs text-orange-300 bg-orange-900/10 rounded px-2 py-1">
                                  <AlertCircle size={10} className="text-orange-400 shrink-0 mt-0.5"/>
                                  {f}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Buyer Profile + Pitch */}
                        {r.buyerProfile && (
                          <div className="bg-gray-800/50 rounded-lg p-2.5">
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wide mb-1">Ideal Buyer</p>
                            <p className="text-gray-300 text-xs">{r.buyerProfile}</p>
                          </div>
                        )}
                        {r.pitch && (
                          <div className="bg-indigo-900/20 border border-indigo-800/30 rounded-lg p-2.5">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-wide">AI-Generated Pitch</p>
                              <button onClick={()=>navigator.clipboard.writeText(r.pitch)} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"><Copy size={8}/> Copy</button>
                            </div>
                            <p className="text-gray-300 text-xs leading-relaxed">{r.pitch}</p>
                          </div>
                        )}
                        {r.sellabilityNotes && (
                          <p className="text-gray-500 text-[10px] italic px-1">{r.sellabilityNotes}</p>
                        )}
                      </div>
                    );
                  })()}
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

              {/* RIGHT: Property Condition */}
              <div className="space-y-4">
                <Card title="Property Condition" icon={Shield}>
                  <div className="space-y-0">
                    <EditableRow label="Overall Condition" value={deal.overallCondition?.replace(/_/g,' ')||''} onSave={v=>updateDeal.mutate({overallCondition:v.toUpperCase().replace(/ /g,'_')})} />
                    <EditableRow label="Roof Condition" value={deal.roofCondition||''} onSave={v=>updateDeal.mutate({roofCondition:v})} />
                    <EditableRow label="Roof Age" value={deal.roofAge||''} onSave={v=>updateDeal.mutate({roofAge:v})} />
                    <EditableRow label="HVAC Condition" value={deal.hvacCondition||''} onSave={v=>updateDeal.mutate({hvacCondition:v})} />
                    <EditableRow label="HVAC Age" value={deal.hvacAge||''} onSave={v=>updateDeal.mutate({hvacAge:v})} />
                    <EditableRow label="Water Heater" value={deal.waterHeaterCondition||''} onSave={v=>updateDeal.mutate({waterHeaterCondition:v})} />
                    <EditableRow label="Water Heater Age" value={deal.waterHeaterAge||''} onSave={v=>updateDeal.mutate({waterHeaterAge:v})} />
                    <EditableRow label="Foundation" value={deal.foundationCondition||''} onSave={v=>updateDeal.mutate({foundationCondition:v})} />
                    <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
                      <span className="text-gray-500 text-xs">Mold / Water Damage</span>
                      <button onClick={()=>updateDeal.mutate({moldOrWaterDamage:!deal.moldOrWaterDamage})}
                        className={`text-xs px-2 py-0.5 rounded font-semibold ${deal.moldOrWaterDamage?'bg-red-900/40 text-red-400':'bg-gray-800 text-gray-500'}`}>
                        {deal.moldOrWaterDamage?'YES':'NO'}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-800 space-y-0">
                    <p className="text-gray-600 text-[10px] font-bold uppercase tracking-wide mb-2">Legal & HOA</p>
                    <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
                      <span className="text-gray-500 text-xs">Title Status</span>
                      <button onClick={()=>{
                        const cycle: Record<string,string> = {'CLEAR':'ISSUES','ISSUES':'PENDING','PENDING':'UNKNOWN','UNKNOWN':'CLEAR'};
                        updateDeal.mutate({titleStatus: cycle[deal.titleStatus||'UNKNOWN']||'UNKNOWN'});
                      }}
                        className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          deal.titleStatus==='CLEAR'?'bg-green-900/30 text-green-400':
                          deal.titleStatus==='ISSUES'?'bg-red-900/40 text-red-400':
                          deal.titleStatus==='PENDING'?'bg-yellow-900/30 text-yellow-400':
                          'bg-gray-800 text-gray-500'}`}>
                        {deal.titleStatus||'UNKNOWN'}
                      </button>
                    </div>
                    <EditableRow label="Title Notes" value={deal.titleIssuesNotes||''} onSave={v=>updateDeal.mutate({titleIssuesNotes:v})} />
                    <EditableRow label="Title Company" value={deal.titleCompany||''} onSave={v=>updateDeal.mutate({titleCompany:v})} />
                    <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
                      <span className="text-gray-500 text-xs">Code Violations</span>
                      <button onClick={()=>updateDeal.mutate({codeIssues:!deal.codeIssues})}
                        className={`text-xs px-2 py-0.5 rounded font-semibold ${deal.codeIssues?'bg-red-900/40 text-red-400':'bg-gray-800 text-gray-500'}`}>
                        {deal.codeIssues?'YES':'NO'}
                      </button>
                    </div>
                    {deal.codeIssues && <EditableRow label="Violation Details" value={deal.codeViolationDetails||''} onSave={v=>updateDeal.mutate({codeViolationDetails:v})} />}
                    <EditableRow label="Unpermitted Additions" value={deal.unpermittedAdditions||''} onSave={v=>updateDeal.mutate({unpermittedAdditions:v})} />
                    <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
                      <span className="text-gray-500 text-xs">HOA</span>
                      <button onClick={()=>updateDeal.mutate({hoaStatus:deal.hoaStatus==='YES'?'NO':'YES'})}
                        className={`text-xs px-2 py-0.5 rounded font-semibold ${deal.hoaStatus==='YES'?'bg-yellow-900/30 text-yellow-400':'bg-gray-800 text-gray-500'}`}>
                        {deal.hoaStatus==='YES'?'YES':'NO'}
                      </button>
                    </div>
                    {deal.hoaStatus==='YES' && <EditableRow label="HOA Monthly" value={deal.hoaMonthly?String(deal.hoaMonthly):''} onSave={v=>updateDeal.mutate({hoaMonthly:parseFloat(v)||null})} type="number" />}
                  </div>
                </Card>

                {/* Description */}
                <Card title="Buyer-Facing Description" icon={FileText}>
                  <EditableTextarea value={deal.description||''} onSave={v=>updateDeal.mutate({description:v})} />
                </Card>
              </div>
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
                      {arvAnalysis.subdivisionName && <p className="text-gray-500 text-xs px-1">Subdivision: <span className="text-gray-300">{arvAnalysis.subdivisionName}</span></p>}
                      {arvAnalysis.recommendation && <p className="text-gray-300 text-sm bg-blue-900/20 border border-blue-800/40 rounded-lg p-3">{arvAnalysis.recommendation}</p>}
                      {arvAnalysis.confidence && (
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-gray-500 text-xs">Confidence:</span>
                          <div className="flex gap-0.5">{[1,2,3,4,5].map(i=><div key={i} className={`w-3 h-3 rounded-full ${i<=arvAnalysis.confidence?'bg-green-400':'bg-gray-700'}`}/>)}</div>
                          <span className="text-gray-400 text-xs">{arvAnalysis.confidence}/5</span>
                        </div>
                      )}
                      {arvAnalysis.confidenceReason && <p className="text-gray-500 text-xs italic px-1">{arvAnalysis.confidenceReason}</p>}
                      {arvAnalysis.comps?.length > 0 && (
                        <div>
                          <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-2 px-1">Comparable Sales</p>
                          <div className="space-y-2">
                            {arvAnalysis.comps.map((comp: any, i: number) => (
                              <div key={i} className="bg-gray-800/50 rounded-lg p-3 text-xs">
                                <div className="flex items-start justify-between mb-1">
                                  <p className="text-white font-semibold">{comp.address}</p>
                                  <p className="text-green-400 font-bold shrink-0 ml-2">{comp.salePrice?formatCurrency(comp.salePrice):'—'}</p>
                                </div>
                                <div className="flex items-center gap-3 text-gray-500">
                                  <span>{comp.saleDate}</span>
                                  <span>{comp.sqft?.toLocaleString()} sqft</span>
                                  {comp.beds && <span>{comp.beds}bd/{comp.baths}ba</span>}
                                  {comp.pricePerSqft && <span>${comp.pricePerSqft}/sqft</span>}
                                </div>
                                {comp.renovationEvidence && <p className="text-gray-600 text-[10px] mt-1 italic">{comp.renovationEvidence}</p>}
                                {comp.adjustedValue && comp.adjustedValue !== comp.salePrice && (
                                  <p className="text-blue-400 text-[10px] mt-1">Adjusted: {formatCurrency(comp.adjustedValue)} — {comp.adjustmentNotes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {arvAnalysis.dataWarnings && <p className="text-amber-500 text-xs bg-amber-900/20 rounded-lg p-2">⚠ {arvAnalysis.dataWarnings}</p>}
                      {arvAnalysis.assumptionLog && <p className="text-gray-600 text-[10px] italic px-1">Assumptions: {arvAnalysis.assumptionLog}</p>}
                      {arvAnalysis.claudeNarrative && (
                        <div className="mt-3 border border-purple-800/30 rounded-lg overflow-hidden">
                          <div className="bg-purple-900/20 px-3 py-2 flex items-center gap-2">
                            <Sparkles size={11} className="text-purple-400"/>
                            <span className="text-purple-300 text-xs font-medium">Claude's Research Notes</span>
                          </div>
                          <div className="px-3 py-2 max-h-48 overflow-y-auto">
                            <p className="text-gray-400 text-xs whitespace-pre-wrap leading-relaxed">{arvAnalysis.claudeNarrative}</p>
                          </div>
                        </div>
                      )}
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

              {/* Buyer cards — real AI match results */}
              <RealBuyerMatches dealId={id} matchCount={b} onRunMatch={() => matchAction.mutate()} isMatching={matchAction.isPending} />
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