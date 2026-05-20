'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const INVESTOR_TYPES = ['CASH_BUYER','FIX_AND_FLIP','LANDLORD','HEDGE_FUND','WHOLESALER','DEVELOPER'];
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export function CreateBuyerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', company: '',
    investorType: 'CASH_BUYER', hasCash: false, hasHardMoney: false,
    source: '', tags: '', notes: '',
  });
  const [buyBox, setBuyBox] = useState({
    states: [] as string[], minPrice: '', maxPrice: '',
    rehabTolerance: 'MEDIUM', investmentStrategy: [] as string[],
  });

  const create = useMutation({
    mutationFn: (data: any) => api.post('/buyers', data).then(r => r.data),
    onSuccess: () => { toast.success('Buyer added'); onCreated(); },
    onError: () => toast.error('Failed to create buyer'),
  });

  const set = (key: string) => (e: any) =>
    setForm(f => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const toggleState = (s: string) =>
    setBuyBox(b => ({
      ...b,
      states: b.states.includes(s) ? b.states.filter(x => x !== s) : [...b.states, s],
    }));

  const handleSubmit = () => {
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error('Name and email are required');
      return;
    }
    create.mutate({
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
      buyBox: {
        ...buyBox,
        minPrice: buyBox.minPrice ? parseFloat(buyBox.minPrice) : undefined,
        maxPrice: buyBox.maxPrice ? parseFloat(buyBox.maxPrice) : undefined,
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">Add buyer</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Identity */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Buyer info</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="First name *" value={form.firstName} onChange={set('firstName')} />
              <Field label="Last name *" value={form.lastName} onChange={set('lastName')} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Email *" value={form.email} onChange={set('email')} type="email" />
              <Field label="Phone" value={form.phone} onChange={set('phone')} type="tel" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company / LLC" value={form.company} onChange={set('company')} />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Investor type</label>
                <select value={form.investorType} onChange={set('investorType')}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
                  {INVESTOR_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.hasCash} onChange={set('hasCash')} className="rounded" />
                <span className="text-sm text-gray-300">Cash buyer</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.hasHardMoney} onChange={set('hasHardMoney')} className="rounded" />
                <span className="text-sm text-gray-300">Hard money</span>
              </label>
            </div>
          </div>

          {/* Buy box */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Buy box</p>
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2">Target states</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {US_STATES.map(s => (
                  <button key={s} onClick={() => toggleState(s)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      buyBox.states.includes(s)
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Min price" value={buyBox.minPrice} onChange={(e: any) => setBuyBox(b => ({ ...b, minPrice: e.target.value }))} type="number" placeholder="50000" />
              <Field label="Max price" value={buyBox.maxPrice} onChange={(e: any) => setBuyBox(b => ({ ...b, maxPrice: e.target.value }))} type="number" placeholder="300000" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rehab tolerance</label>
              <select value={buyBox.rehabTolerance} onChange={(e) => setBuyBox(b => ({ ...b, rehabTolerance: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
                {['COSMETIC_ONLY','LIGHT','MEDIUM','HEAVY','FULL_GUT'].map(r => (
                  <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Source" value={form.source} onChange={set('source')} placeholder="Referral, event, JV..." />
            <Field label="Tags (comma-separated)" value={form.tags} onChange={set('tags')} placeholder="flip, cash, dfw" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Any additional notes..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
            <button onClick={handleSubmit} disabled={create.isLoading}
              className="flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
              {create.isLoading && <Loader2 size={14} className="animate-spin" />}
              Add buyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: any) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500" />
    </div>
  );
}
