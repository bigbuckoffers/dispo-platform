'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const PROPERTY_TYPES = [
  'SINGLE_FAMILY','MULTI_FAMILY','DUPLEX','TRIPLEX','FOURPLEX',
  'CONDO','TOWNHOUSE','MOBILE_HOME','LAND','COMMERCIAL','MIXED_USE',
];

export function CreateDealModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    address: '', city: '', state: '', zipCode: '',
    askingPrice: '', arv: '', repairEstimate: '',
    beds: '', baths: '', sqft: '', yearBuilt: '',
    propertyType: 'SINGLE_FAMILY', occupancy: 'VACANT',
    sellerNotes: '',
  });

  const create = useMutation({
    mutationFn: (data: any) => api.post('/deals', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Deal created — AI analysis queued');
      onCreated();
    },
    onError: () => toast.error('Failed to create deal'),
  });

  const set = (key: string) => (e: any) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = () => {
    if (!form.address || !form.city || !form.state || !form.zipCode || !form.askingPrice) {
      toast.error('Fill in required fields');
      return;
    }
    create.mutate({
      ...form,
      askingPrice: parseFloat(form.askingPrice),
      arv: form.arv ? parseFloat(form.arv) : undefined,
      repairEstimate: form.repairEstimate ? parseFloat(form.repairEstimate) : undefined,
      beds: form.beds ? parseInt(form.beds) : undefined,
      baths: form.baths ? parseFloat(form.baths) : undefined,
      sqft: form.sqft ? parseInt(form.sqft) : undefined,
      yearBuilt: form.yearBuilt ? parseInt(form.yearBuilt) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">Add new deal</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Address section */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Property address</p>
            <div className="space-y-3">
              <Field label="Street address *" value={form.address} onChange={set('address')} placeholder="123 Main St" />
              <div className="grid grid-cols-3 gap-3">
                <Field label="City *" value={form.city} onChange={set('city')} />
                <Field label="State *" value={form.state} onChange={set('state')} placeholder="TX" maxLength={2} />
                <Field label="ZIP *" value={form.zipCode} onChange={set('zipCode')} placeholder="75001" />
              </div>
            </div>
          </div>

          {/* Financials */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Financials</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Asking price *" value={form.askingPrice} onChange={set('askingPrice')} type="number" placeholder="150000" />
              <Field label="ARV" value={form.arv} onChange={set('arv')} type="number" placeholder="220000" />
              <Field label="Repair estimate" value={form.repairEstimate} onChange={set('repairEstimate')} type="number" placeholder="35000" />
            </div>
          </div>

          {/* Property specs */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Property specs</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Property type</label>
                <select value={form.propertyType} onChange={set('propertyType')}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Occupancy</label>
                <select value={form.occupancy} onChange={set('occupancy')}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
                  <option value="VACANT">Vacant</option>
                  <option value="OCCUPIED_TENANT">Occupied — tenant</option>
                  <option value="OCCUPIED_OWNER">Occupied — owner</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <Field label="Beds" value={form.beds} onChange={set('beds')} type="number" placeholder="3" />
              <Field label="Baths" value={form.baths} onChange={set('baths')} type="number" placeholder="2" />
              <Field label="Sqft" value={form.sqft} onChange={set('sqft')} type="number" placeholder="1400" />
              <Field label="Year built" value={form.yearBuilt} onChange={set('yearBuilt')} type="number" placeholder="1985" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Seller notes</label>
            <textarea
              value={form.sellerNotes}
              onChange={set('sellerNotes')}
              rows={3}
              placeholder="Foundation issues, needs roof, tenant on month-to-month..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={create.isLoading}
              className="flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              {create.isLoading && <Loader2 size={14} className="animate-spin" />}
              Create deal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '', maxLength }: any) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
