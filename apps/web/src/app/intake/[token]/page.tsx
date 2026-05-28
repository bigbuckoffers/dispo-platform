'use client';
import { useState, useEffect, useCallback } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const STRATEGIES = ['Fix & Flip', 'Buy & Hold', 'Subject-To', 'Seller Finance', 'BRRRR', 'Wholesale', 'Multifamily', 'Section 8', 'Airbnb/STR', 'Land'];
const FUNDING = ['Cash', 'Hard Money', 'DSCR Loan', 'Conventional', 'Private Money', 'Subject-To', 'Seller Finance'];
const REHAB_OPTS = [
  { v: 'COSMETIC_ONLY', l: '🎨 Turnkey only', sub: 'Paint, carpet, cosmetic' },
  { v: 'LIGHT', l: '🔧 Light rehab', sub: 'Minor updates, no major systems' },
  { v: 'MEDIUM', l: '🏗 Medium rehab', sub: 'Kitchen, bath, some systems' },
  { v: 'HEAVY', l: '💪 Heavy rehab', sub: 'Major systems, structural OK' },
  { v: 'FULL_GUT', l: '🔨 Full gut', sub: 'Down to the studs, anything goes' },
];
const PROP_TYPES = ['SFH', 'Duplex', 'Triplex', 'Fourplex', 'Multi-Family (5+)', 'Mobile Home', 'Condo', 'Townhouse', 'Commercial'];
const PRICE_RANGES = ['Under $50k', '$50k–$100k', '$100k–$150k', '$150k–$250k', '$250k–$500k', '$500k+', 'Any price'];
const CLOSE_SPEEDS = ['7 days', '14 days', '21 days', '30 days', '45+ days'];
const CONTACT_PREFS = ['Text only', 'Text first, then call', 'Call me', 'Email'];
const SEND_FREQ = ['Every deal', 'Only strong matches', 'Weekly digest', 'Only top deals'];
const OCCUPANCY = ['Vacant only', 'Tenant-occupied OK', 'No preference'];

function Chip({ label, sub, selected, onClick }: any) {
  return (
    <button onClick={onClick} className={`px-4 py-3 rounded-xl text-left border transition-all ${selected ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:border-gray-500'}`}>
      <div className="text-sm font-medium">{label}</div>
      {sub && <div className={`text-xs mt-0.5 ${selected ? 'text-blue-200' : 'text-gray-500'}`}>{sub}</div>}
    </button>
  );
}

function Question({ children }: any) {
  return <p className="text-gray-400 text-sm mb-4 leading-relaxed">{children}</p>;
}

export default function IntakePage({ params }: { params: { token: string } }) {
  const [buyer, setBuyer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  const [form, setForm] = useState<any>({
    firstName: '', lastName: '', phone: '', email: '',
    buyingStatus: '', monthlyCapacity: '',
    marketPrimary: '', marketSecondary: '', states: '', zipCodes: '', anyZipOk: false, excludedAreas: '',
    propertyTypes: [], minBeds: '', occupancy: '', hoaOk: '', minYearBuilt: '',
    priceRange: '', minPrice: '', maxPrice: '', anyPrice: false, minArv: '', minProfit: '', maxRehab: '', minCashFlow: '',
    strategies: [], rehabTolerance: '', hardNoCriteria: '',
    fundingTypes: [], closeSpeed: '', maxEmd: '', inspectionDays: '', proofOfFunds: '',
    preferredContact: '', dealSendFreq: '',
    freeformNotes: '',
  });

  const set = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }));
  const toggle = (key: string, val: string) => setForm((f: any) => ({
    ...f, [key]: f[key].includes(val) ? f[key].filter((x: string) => x !== val) : [...f[key], val]
  }));

  useEffect(() => {
    fetch(`${API}/intake/token/${params.token}`)
      .then(r => r.json())
      .then(d => {
        if (d.statusCode === 404) { setError('This link is invalid or expired.'); return; }
        setBuyer(d);
        setForm((f: any) => ({
          ...f,
          firstName: d.firstName === 'Unknown' ? '' : d.firstName || '',
          lastName: d.lastName === 'Buyer' ? '' : d.lastName || '',
          phone: d.phone || '',
          email: d.email || '',
          marketPrimary: d.marketPrimary || '',
          strategies: d.preferredStrategies || [],
          minPrice: d.buyBox?.minPrice || '',
          maxPrice: d.buyBox?.maxPrice || '',
          anyPrice: d.buyBox?.anyPrice || false,
          rehabTolerance: d.buyBox?.rehabTolerance || '',
          zipCodes: (d.buyBox?.zipCodes || []).join(', '),
          anyZipOk: d.buyBox?.anyZipOk || false,
          propertyTypes: d.buyBox?.propertyTypes || [],
          states: (d.buyBox?.states || []).join(', '),
        }));
      })
      .catch(() => setError('Failed to load. Please try again.'))
      .finally(() => setLoading(false));
  }, [params.token]);

  // Auto-save on every step change
  const autoSave = useCallback(async () => {
    try {
      await fetch(`${API}/intake/token/${params.token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, _partial: true, _step: step }),
      });
    } catch {}
  }, [form, step, params.token]);

  const nextStep = async () => {
    await autoSave();
    setStep(s => s + 1);
    window.scrollTo(0, 0);
  };

  const prevStep = () => { setStep(s => s - 1); window.scrollTo(0, 0); };

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/intake/token/${params.token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, _partial: false }),
      });
      const d = await r.json();
      if (d.success) setSubmitted(true);
      else alert('Submission failed. Please try again.');
    } catch { alert('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>;
  if (error) return <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6"><p className="text-red-400 text-center">{error}</p></div>;

  if (submitted) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🎯</div>
        <h1 className="text-2xl font-bold text-white mb-3">You're in the system!</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-4">We'll start matching wholesale deals to your buy box and reach out when something fits. The more specific your criteria, the better the matches.</p>
        <p className="text-gray-600 text-xs">BigBuck Offers · AI-Powered Deal Matching</p>
      </div>
    </div>
  );

  const firstName = form.firstName || buyer?.firstName || 'there';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900/80 border-b border-gray-800 px-5 py-4 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-bold">B</div>
            <span className="font-semibold text-sm text-white">BigBuck Offers</span>
          </div>
          <span className="text-gray-500 text-xs">{step}/{totalSteps}</span>
        </div>
        {/* Progress bar */}
        <div className="max-w-lg mx-auto mt-3 flex gap-1">
          {Array.from({length: totalSteps}).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < step ? 'bg-blue-500' : 'bg-gray-800'}`} />
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 pb-32">

        {/* STEP 1 — Who are you + buying status */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Hey! Let's get you set up 👋</h2>
              <p className="text-gray-400 text-sm">We use AI to match wholesale deals directly to your buy box. This takes about 2 minutes.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-500 text-xs block mb-1.5">First Name</label>
                <input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="John" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-gray-500 text-xs block mb-1.5">Last Name</label>
                <input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Smith" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1.5">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 000-0000" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1.5">Email (optional)</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com" type="email" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-2">Are you actively buying right now?</label>
              <div className="grid grid-cols-2 gap-2">
                {[{v:'ACTIVELY_BUYING',l:'🔥 Yes, actively buying'},{v:'BUYING_SELECTIVELY',l:'👀 Yes, selectively'},{v:'PAUSED',l:'⏸ Paused for now'},{v:'JUST_LOOKING',l:'👋 Just looking'}].map(o => (
                  <Chip key={o.v} label={o.l} selected={form.buyingStatus===o.v} onClick={()=>set('buyingStatus',o.v)} />
                ))}
              </div>
            </div>
            {(form.buyingStatus==='ACTIVELY_BUYING'||form.buyingStatus==='BUYING_SELECTIVELY') && (
              <div className="pb-24">
                <label className="text-gray-500 text-xs block mb-1.5">How many deals per month can you take on?</label>
                <div className="flex gap-2 flex-wrap">
                  {['1','2','3','4-5','5+'].map(n => (
                    <button key={n} onClick={()=>set('monthlyCapacity',n)} className={`px-5 py-3 rounded-xl text-sm border transition ${form.monthlyCapacity===n?'bg-blue-600 border-blue-500 text-white':'bg-gray-800 border-gray-700 text-gray-300'}`}>{n}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2 — Markets */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Where do you buy? 📍</h2>
              <Question>Tell us your markets so we only send you deals in areas you actually want.</Question>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1.5">Primary Market <span className="text-red-400">*</span></label>
              <input value={form.marketPrimary} onChange={e => set('marketPrimary', e.target.value)} placeholder="e.g. Birmingham, AL" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1.5">Other Markets (optional)</label>
              <input value={form.marketSecondary} onChange={e => set('marketSecondary', e.target.value)} placeholder="e.g. Atlanta, Tampa, Dallas" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1.5">States</label>
              <input value={form.states} onChange={e => set('states', e.target.value)} placeholder="e.g. AL, FL, TX" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1.5">Preferred Zip Codes (optional)</label>
              <input value={form.zipCodes} onChange={e => set('zipCodes', e.target.value)} disabled={form.anyZipOk} placeholder="e.g. 35206, 35208" className={`w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 ${form.anyZipOk?'opacity-40':''}`} />
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={form.anyZipOk} onChange={e => set('anyZipOk', e.target.checked)} className="accent-blue-500 w-4 h-4" />
                <span className="text-gray-400 text-sm">Any zip code is fine — entire market works for me</span>
              </label>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1.5">Areas to avoid (optional)</label>
              <input value={form.excludedAreas} onChange={e => set('excludedAreas', e.target.value)} placeholder="e.g. No rural, no flood zones" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        )}

        {/* STEP 3 — Property + Price */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">What are you buying? 🏠</h2>
              <Question>Property types, price range, and what you need out of each deal.</Question>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-2">Property Types (tap all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {PROP_TYPES.map(p => (
                  <button key={p} onClick={() => toggle('propertyTypes', p)} className={`px-3 py-2 rounded-xl text-sm border transition ${form.propertyTypes.includes(p)?'bg-blue-600 border-blue-500 text-white':'bg-gray-800 border-gray-700 text-gray-300'}`}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-2">Price Range</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-500 text-xs block mb-1.5">Min Price</label>
                  <input type="number" value={form.minPrice} onChange={e=>set('minPrice',e.target.value)} disabled={form.anyPrice} placeholder="e.g. 50000" className={`w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 ${form.anyPrice?'opacity-40':''}`} />
                </div>
                <div>
                  <label className="text-gray-500 text-xs block mb-1.5">Max Price</label>
                  <input type="number" value={form.maxPrice} onChange={e=>set('maxPrice',e.target.value)} disabled={form.anyPrice} placeholder="e.g. 300000" className={`w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 ${form.anyPrice?'opacity-40':''}`} />
                </div>
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={form.anyPrice} onChange={e=>set('anyPrice',e.target.checked)} className="accent-blue-500 w-4 h-4" />
                <span className="text-gray-400 text-sm">No price limit — I buy at any price point</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-500 text-xs block mb-1.5">Min Bedrooms</label>
                <div className="flex gap-1.5">
                  {['1','2','3','4+'].map(n=>(
                    <button key={n} onClick={()=>set('minBeds',n)} className={`flex-1 py-2.5 rounded-xl text-sm border transition ${form.minBeds===n?'bg-blue-600 border-blue-500 text-white':'bg-gray-800 border-gray-700 text-gray-300'}`}>{n}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-gray-500 text-xs block mb-1.5">HOA OK?</label>
                <div className="flex gap-1.5">
                  {['Yes','No'].map(n=>(
                    <button key={n} onClick={()=>set('hoaOk',n)} className={`flex-1 py-2.5 rounded-xl text-sm border transition ${form.hoaOk===n?'bg-blue-600 border-blue-500 text-white':'bg-gray-800 border-gray-700 text-gray-300'}`}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-2">Occupancy preference</label>
              <div className="flex gap-2 flex-wrap">
                {OCCUPANCY.map(o=>(
                  <Chip key={o} label={o} selected={form.occupancy===o} onClick={()=>set('occupancy',o)} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1.5">Min Year Built (optional)</label>
              <input type="number" value={form.minYearBuilt} onChange={e=>set('minYearBuilt',e.target.value)} placeholder="e.g. 1970" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        )}

        {/* STEP 4 — Strategy + Rehab */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Strategy & Rehab 🔨</h2>
              <Question>What's your investment approach and how much work can you handle?</Question>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-2">Investment Strategy (tap all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {STRATEGIES.map(s=>(
                  <button key={s} onClick={()=>toggle('strategies',s)} className={`px-3 py-2 rounded-xl text-sm border transition ${form.strategies.includes(s)?'bg-blue-600 border-blue-500 text-white':'bg-gray-800 border-gray-700 text-gray-300'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-2">Rehab Tolerance</label>
              <div className="space-y-2">
                {REHAB_OPTS.map(r=>(
                  <Chip key={r.v} label={r.l} sub={r.sub} selected={form.rehabTolerance===r.v} onClick={()=>set('rehabTolerance',r.v)} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1.5">Automatic deal-killers (optional)</label>
              <textarea value={form.hardNoCriteria} onChange={e=>set('hardNoCriteria',e.target.value)} placeholder="e.g. No foundation issues, no flood zones, no rural, no mold..." className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none h-20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-500 text-xs block mb-1.5">Min ARV needed (optional)</label>
                <input type="number" value={form.minArv} onChange={e=>set('minArv',e.target.value)} placeholder="e.g. 100000" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-gray-500 text-xs block mb-1.5">Min profit needed (optional)</label>
                <input type="number" value={form.minProfit} onChange={e=>set('minProfit',e.target.value)} placeholder="e.g. 25000" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 — Funding + Close */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Funding & Closing 💰</h2>
              <Question>How you fund deals and how fast you can move helps us prioritize you for new listings.</Question>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-2">How do you fund deals? (tap all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {FUNDING.map(f=>(
                  <button key={f} onClick={()=>toggle('fundingTypes',f)} className={`px-3 py-2 rounded-xl text-sm border transition ${form.fundingTypes.includes(f)?'bg-blue-600 border-blue-500 text-white':'bg-gray-800 border-gray-700 text-gray-300'}`}>{f}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-2">How fast can you close?</label>
              <div className="flex flex-wrap gap-2">
                {CLOSE_SPEEDS.map(s=>(
                  <Chip key={s} label={s} selected={form.closeSpeed===s} onClick={()=>set('closeSpeed',s)} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-500 text-xs block mb-1.5">Max EMD (optional)</label>
                <input type="number" value={form.maxEmd} onChange={e=>set('maxEmd',e.target.value)} placeholder="e.g. 2500" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-gray-500 text-xs block mb-1.5">Inspection period (days)</label>
                <input type="number" value={form.inspectionDays} onChange={e=>set('inspectionDays',e.target.value)} placeholder="e.g. 7" className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-2">Do you have proof of funds?</label>
              <div className="flex gap-2 flex-wrap">
                {['Yes, I can send on request','Yes, I have it ready','No, I use hard money','Not applicable'].map(o=>(
                  <Chip key={o} label={o} selected={form.proofOfFunds===o} onClick={()=>set('proofOfFunds',o)} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 6 — Preferences + Freeform */}
        {step === 6 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Almost done! 🎯</h2>
              <Question>How you want us to work with you, and anything else we should know.</Question>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-2">How do you prefer we contact you about deals?</label>
              <div className="flex flex-wrap gap-2">
                {CONTACT_PREFS.map(c=>(
                  <Chip key={c} label={c} selected={form.preferredContact===c} onClick={()=>set('preferredContact',c)} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-2">How often do you want deal alerts?</label>
              <div className="flex flex-wrap gap-2">
                {SEND_FREQ.map(s=>(
                  <Chip key={s} label={s} selected={form.dealSendFreq===s} onClick={()=>set('dealSendFreq',s)} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1.5">Anything else we should know? 💬</label>
              <p className="text-gray-600 text-xs mb-2">Creative finance preferences, partnership interests, past deals, specific neighborhoods, anything — the more detail the better our AI can match you.</p>
              <textarea value={form.freeformNotes} onChange={e=>set('freeformNotes',e.target.value)} placeholder="e.g. I love Subject-To deals under $35k entry in Birmingham. I close in 7 days cash, no inspection. I'm part of the Subto community. I also wholesale so I have buyers if you need JV partners..." className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none h-36" />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-950/95 border-t border-gray-800 px-5 py-4 backdrop-blur">
          <div className="max-w-lg mx-auto flex gap-3">
            {step > 1 && (
              <button onClick={prevStep} className="px-5 py-3.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition">← Back</button>
            )}
            {step < totalSteps ? (
              <button onClick={nextStep} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition">
                Continue →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition">
                {submitting ? 'Submitting...' : '✓ Submit My Buy Box'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
