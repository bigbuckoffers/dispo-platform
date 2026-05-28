'use client';
import { useState, useEffect } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const STRATEGIES = ['Fix & Flip', 'Buy & Hold', 'Subject-To', 'Seller Finance', 'BRRRR', 'Wholesale', 'Multifamily', 'Section 8', 'Airbnb/STR', 'Land'];
const FUNDING = ['Cash', 'Hard Money', 'DSCR Loan', 'Conventional', 'Private Money', 'Subject-To', 'Seller Finance', 'Line of Credit'];
const REHAB = [{ v: 'COSMETIC_ONLY', l: 'Turnkey / Cosmetic Only' }, { v: 'LIGHT', l: 'Light Rehab' }, { v: 'MEDIUM', l: 'Medium Rehab' }, { v: 'HEAVY', l: 'Heavy Rehab' }, { v: 'FULL_GUT', l: 'Full Gut' }];
const PROP_TYPES = ['SFH', 'Duplex', 'Triplex', 'Fourplex', 'Multi-Family (5+)', 'Mobile Home', 'Condo', 'Commercial'];

export default function IntakePage({ params }: { params: { token: string } }) {
  const [buyer, setBuyer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '',
    marketPrimary: '', marketSecondary: '',
    states: [] as string[], zipCodes: '', anyZipOk: false,
    minPrice: '', maxPrice: '', anyPrice: false,
    strategies: [] as string[],
    rehabTolerance: '',
    fundingTypes: [] as string[],
    propertyTypes: [] as string[],
    minBeds: '', tenantsOk: '', hoaOk: '',
    closeSpeed: '', proofOfFunds: '',
    hardNoCriteria: '', notes: '',
  });

  useEffect(() => {
    fetch(`${API}/intake/token/${params.token}`)
      .then(r => r.json())
      .then(d => {
        if (d.statusCode === 404) { setError('This link is invalid or has expired.'); return; }
        setBuyer(d);
        setForm(f => ({
          ...f,
          firstName: d.firstName || '',
          lastName: d.lastName === 'Buyer' ? '' : d.lastName || '',
          phone: d.phone || '',
          email: d.email || '',
          marketPrimary: d.marketPrimary || '',
          marketSecondary: (d.marketSecondary || []).join(', '),
          strategies: d.preferredStrategies || [],
          minPrice: d.buyBox?.minPrice || '',
          maxPrice: d.buyBox?.maxPrice || '',
          anyPrice: d.buyBox?.anyPrice || false,
          rehabTolerance: d.buyBox?.rehabTolerance || '',
          zipCodes: (d.buyBox?.zipCodes || []).join(', '),
          anyZipOk: d.buyBox?.anyZipOk || false,
          propertyTypes: d.buyBox?.propertyTypes || [],
          states: d.buyBox?.states || [],
        }));
      })
      .catch(() => setError('Failed to load form. Please try again.'))
      .finally(() => setLoading(false));
  }, [params.token]);

  const toggle = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  async function handleSubmit() {
    if (!form.marketPrimary && !form.states.length) {
      alert('Please enter at least one market or state.');
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/intake/token/${params.token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) setSubmitted(true);
      else alert('Submission failed. Please try again.');
    } catch { alert('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-white text-sm">Loading...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="text-center"><p className="text-red-400 text-lg font-medium">{error}</p></div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-white mb-3">You're all set!</h1>
        <p className="text-gray-400 text-sm leading-relaxed">Your buy box has been submitted. We'll review it and start matching you to deals that fit your criteria.</p>
        <p className="text-gray-500 text-xs mt-4">BigBuck Offers · AI-Powered Deal Matching</p>
      </div>
    </div>
  );

  const totalSteps = 4;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm font-bold">B</div>
            <span className="font-bold text-white">BigBuck Offers</span>
          </div>
          <p className="text-gray-400 text-xs">AI-powered wholesale deal matching — we send you deals that fit your exact buy box</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-6">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white mb-1">
            {buyer?.firstName && buyer.firstName !== 'Unknown' ? `Hey ${buyer.firstName}! 👋` : 'Hey there! 👋'}
          </h1>
          <p className="text-gray-400 text-sm">Fill out your buy box below so we can match wholesale deals directly to your criteria. Takes about 2 minutes.</p>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-6">
          {Array.from({length: totalSteps}).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < step ? 'bg-blue-600' : 'bg-gray-800'}`} />
          ))}
        </div>

        {/* Step 1 — Contact Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white">Step 1 — Your Info</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-500 text-xs block mb-1">First Name</label>
                <input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="John" className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-gray-500 text-xs block mb-1">Last Name</label>
                <input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Smith" className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 000-0000" className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Email (optional)</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com" type="email" className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        )}

        {/* Step 2 — Markets & Price */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white">Step 2 — Markets & Price</h2>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Primary Market <span className="text-red-400">*</span></label>
              <input value={form.marketPrimary} onChange={e => set('marketPrimary', e.target.value)} placeholder="e.g. Birmingham, AL" className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Other Markets (optional)</label>
              <input value={form.marketSecondary} onChange={e => set('marketSecondary', e.target.value)} placeholder="e.g. Atlanta, Tampa, Dallas" className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Preferred Zip Codes (optional)</label>
              <input value={form.zipCodes} onChange={e => set('zipCodes', e.target.value)} disabled={form.anyZipOk} placeholder="e.g. 35206, 35208" className={`w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 ${form.anyZipOk ? 'opacity-40' : ''}`} />
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={form.anyZipOk} onChange={e => set('anyZipOk', e.target.checked)} className="accent-blue-500" />
                <span className="text-gray-400 text-xs">Any zip code is fine — entire market works</span>
              </label>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-2">Price Range</label>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={form.minPrice} onChange={e => set('minPrice', e.target.value)} disabled={form.anyPrice} placeholder="Min $" className={`bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 ${form.anyPrice ? 'opacity-40' : ''}`} />
                <input type="number" value={form.maxPrice} onChange={e => set('maxPrice', e.target.value)} disabled={form.anyPrice} placeholder="Max $" className={`bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 ${form.anyPrice ? 'opacity-40' : ''}`} />
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={form.anyPrice} onChange={e => set('anyPrice', e.target.checked)} className="accent-blue-500" />
                <span className="text-gray-400 text-xs">No price limit — I buy at any price point</span>
              </label>
            </div>
          </div>
        )}

        {/* Step 3 — Strategy & Property */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white">Step 3 — Strategy & Property</h2>
            <div>
              <label className="text-gray-500 text-xs block mb-2">Investment Strategy <span className="text-red-400">*</span> (select all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {STRATEGIES.map(s => (
                  <button key={s} onClick={() => set('strategies', toggle(form.strategies, s))}
                    className={`px-3 py-1.5 rounded-full text-xs border transition ${form.strategies.includes(s) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-2">Property Types</label>
              <div className="flex flex-wrap gap-2">
                {PROP_TYPES.map(p => (
                  <button key={p} onClick={() => set('propertyTypes', toggle(form.propertyTypes, p))}
                    className={`px-3 py-1.5 rounded-full text-xs border transition ${form.propertyTypes.includes(p) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-2">Rehab Tolerance</label>
              <div className="flex flex-col gap-2">
                {REHAB.map(r => (
                  <label key={r.v} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border border-gray-700 hover:border-gray-600 transition">
                    <input type="radio" name="rehab" value={r.v} checked={form.rehabTolerance === r.v} onChange={() => set('rehabTolerance', r.v)} className="accent-blue-500" />
                    <span className="text-gray-300 text-sm">{r.l}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Min Bedrooms</label>
              <select value={form.minBeds} onChange={e => set('minBeds', e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                <option value="">No minimum</option>
                <option value="1">1+</option><option value="2">2+</option>
                <option value="3">3+</option><option value="4">4+</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 4 — Funding & Preferences */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white">Step 4 — Funding & Preferences</h2>
            <div>
              <label className="text-gray-500 text-xs block mb-2">How do you fund deals? (select all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {FUNDING.map(f => (
                  <button key={f} onClick={() => set('fundingTypes', toggle(form.fundingTypes, f))}
                    className={`px-3 py-1.5 rounded-full text-xs border transition ${form.fundingTypes.includes(f) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-2">Tenants OK?</label>
              <div className="flex gap-3">
                {['Yes', 'No', 'Depends'].map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="tenants" value={v} checked={form.tenantsOk === v} onChange={() => set('tenantsOk', v)} className="accent-blue-500" />
                    <span className="text-gray-300 text-sm">{v}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">How fast can you close?</label>
              <select value={form.closeSpeed} onChange={e => set('closeSpeed', e.target.value)} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                <option value="">Select...</option>
                <option value="7">7 days or less</option>
                <option value="14">14 days</option>
                <option value="21">21 days</option>
                <option value="30">30 days</option>
                <option value="45">45+ days</option>
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Hard No Criteria (what you absolutely won't buy)</label>
              <textarea value={form.hardNoCriteria} onChange={e => set('hardNoCriteria', e.target.value)} placeholder="e.g. No foundation issues, no flood zones, no rural..." className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none h-20" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Anything else we should know?</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Creative finance preferences, partnership interests, anything else..." className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none h-20" />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition">
              ← Back
            </button>
          )}
          {step < totalSteps ? (
            <button onClick={() => setStep(s => s + 1)} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition">
              Continue →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition">
              {submitting ? 'Submitting...' : '✓ Submit My Buy Box'}
            </button>
          )}
        </div>

        <p className="text-gray-600 text-xs text-center mt-4">BigBuck Offers · Your information is private and only used for deal matching</p>
      </div>
    </div>
  );
}
