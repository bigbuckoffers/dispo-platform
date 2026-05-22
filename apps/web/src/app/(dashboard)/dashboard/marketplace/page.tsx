'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, MapPin, DollarSign, Home, Brain, Heart, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import toast from 'react-hot-toast';

const PROPERTY_TYPES = ['', 'SINGLE_FAMILY', 'MULTI_FAMILY', 'CONDO', 'LAND', 'COMMERCIAL'];
const US_STATES = ['', 'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export default function MarketplacePage() {
  const [state, setState] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace', { state, minPrice, maxPrice, propertyType, page }],
    queryFn: () => api.get('/marketplace', {
      params: {
        ...(state && { state }),
        ...(minPrice && { minPrice }),
        ...(maxPrice && { maxPrice }),
        ...(propertyType && { propertyType }),
        page, limit: 12,
      }
    }).then(r => r.data),
  });

  const saveDeal = useMutation({
    mutationFn: (dealId: string) => api.post(`/marketplace/deals/${dealId}/save`).then(r => r.data),
    onSuccess: () => toast.success('Deal saved!'),
  });

  const listings = data?.data ?? [];
  const meta = data?.meta ?? {};

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Marketplace</h1>
        <p className="text-sm text-gray-500 mt-0.5">Public deal feed — visible to all buyers</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={state} onChange={e => setState(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
          <option value="">All states</option>
          {US_STATES.filter(s => s).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="number" placeholder="Min price" value={minPrice} onChange={e => setMinPrice(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 w-32" />
        <input type="number" placeholder="Max price" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 w-32" />
        <select value={propertyType} onChange={e => setPropertyType(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500">
          <option value="">All types</option>
          {PROPERTY_TYPES.filter(t => t).map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20">
          <Home size={40} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No listings yet</p>
          <p className="text-gray-600 text-sm mt-1">Publish deals from the Deals page to list them here</p>
          <a href="/dashboard/deals" className="inline-block mt-4 text-xs text-blue-400 border border-blue-500/30 px-4 py-2 rounded-lg hover:text-blue-300 transition-colors">
            Go to Deals →
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {listings.map((listing: any) => {
            const deal = listing.deal;
            return (
              <div key={listing.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all group">
                {/* Photo placeholder */}
                <div className="h-36 bg-gray-800 flex items-center justify-center">
                  <Home size={32} className="text-gray-700" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-white">{deal?.address}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} />{deal?.city}, {deal?.state} {deal?.zipCode}
                      </p>
                    </div>
                    <button onClick={() => saveDeal.mutate(deal?.id)}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-pink-400 hover:bg-pink-500/10 transition-colors">
                      <Heart size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <p className="text-gray-600">Asking</p>
                      <p className="text-white font-semibold">{formatCurrency(deal?.askingPrice)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">ARV</p>
                      <p className="text-gray-300">{deal?.arv ? formatCurrency(deal.arv) : '—'}</p>
                    </div>
                  </div>
                  {deal?.flipScore && (
                    <div className="flex items-center gap-2 mb-3">
                      <Brain size={11} className="text-blue-400" />
                      <div className="flex-1 h-1 bg-gray-800 rounded-full">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${deal.flipScore}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{Math.round(deal.flipScore)} flip score</span>
                    </div>
                  )}
                  <a href={`/dashboard/deals/${deal?.id}`}
                    className="flex items-center justify-center gap-1 w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors">
                    View deal <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
