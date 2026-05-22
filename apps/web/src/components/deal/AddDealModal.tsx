'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Sparkles, PenLine, MessageSquare, Loader2, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

type IntakeMode = 'choose' | 'paste' | 'manual' | 'sms';
type ManualStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface AddDealModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const MANUAL_STEPS = [
  { num: 1, label: 'Source' },
  { num: 2, label: 'Property' },
  { num: 3, label: 'Deal Math' },
  { num: 4, label: 'Condition' },
  { num: 5, label: 'Timeline' },
  { num: 6, label: 'Links' },
  { num: 7, label: 'Review' },
];

export default function AddDealModal({ onClose, onSuccess }: AddDealModalProps) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<IntakeMode>('choose');
  const [step, setStep] = useState<ManualStep>(1);
  const [pasteText, setPasteText] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [sourceType, setSourceType] = useState('MANUAL');
  const [parsedData, setParsedData] = useState<any>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const parseMutation = useMutation({
    mutationFn: () => api.post('/deals/import/raw', { rawText: pasteText, facebookUrl, sourceType }).then(r => r.data),
    onSuccess: (data) => {
      setParsedData(data);
      setForm(data);
      setMode('paste');
      toast.success('Deal parsed! Review and save.');
    },
    onError: () => toast.error('Parse failed — try manual entry'),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.post('/deals', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal saved!');
      onSuccess();
    },
    onError: () => toast.error('Failed to save deal'),
  });

  const handleSave = (status = 'DRAFT') => {
    saveMutation.mutate({ ...form, status, sourceType });
  };

  const F = ({ label, id, type = 'text', placeholder = '', options = null, small = false }: any) => (
    <div>
      <label className="text-gray-400 text-xs mb-1 block">{label}</label>
      {options ? (
        <select
          value={form[id] || ''}
          onChange={e => set(id, e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        >
          <option value="">Select...</option>
          {options.map((o: any) => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={form[id] || ''}
          onChange={e => set(id, type === 'number' ? parseFloat(e.target.value) || '' : e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 ${small ? 'text-xs' : ''}`}
        />
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div>
            <h2 className="text-white font-bold text-lg">Add Deal</h2>
            <p className="text-gray-500 text-xs mt-0.5">
              {mode === 'choose' && 'Choose how to add this deal'}
              {mode === 'paste' && (parsedData ? 'Review parsed deal' : 'Paste deal text or Facebook post')}
              {mode === 'manual' && `Step ${step} of 7 — ${MANUAL_STEPS[step - 1].label}`}
              {mode === 'sms' && 'SMS / Twilio Deal Preview'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator for manual */}
        {mode === 'manual' && (
          <div className="flex px-5 pt-3 gap-1">
            {MANUAL_STEPS.map(s => (
              <div
                key={s.num}
                className={`flex-1 h-1 rounded-full transition ${s.num < step ? 'bg-blue-500' : s.num === step ? 'bg-blue-400' : 'bg-gray-800'}`}
              />
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* === CHOOSE MODE === */}
          {mode === 'choose' && (
            <div className="space-y-3">
              <button
                onClick={() => setMode('paste')}
                className="w-full flex items-start gap-4 p-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-blue-600/50 rounded-xl transition text-left"
              >
                <div className="p-2 bg-blue-900/40 rounded-lg mt-0.5">
                  <Sparkles size={20} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Paste Deal / Facebook Post</p>
                  <p className="text-gray-500 text-sm mt-0.5">Paste raw text, a Facebook post, or JV deal blast. AI extracts the details automatically.</p>
                </div>
                <ChevronRight size={16} className="text-gray-600 mt-1 ml-auto shrink-0" />
              </button>

              <button
                onClick={() => setMode('manual')}
                className="w-full flex items-start gap-4 p-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-blue-600/50 rounded-xl transition text-left"
              >
                <div className="p-2 bg-purple-900/40 rounded-lg mt-0.5">
                  <PenLine size={20} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Manual Deal Entry</p>
                  <p className="text-gray-500 text-sm mt-0.5">Step-by-step form for entering a deal you already have details for.</p>
                </div>
                <ChevronRight size={16} className="text-gray-600 mt-1 ml-auto shrink-0" />
              </button>

              <button
                onClick={() => setMode('sms')}
                className="w-full flex items-start gap-4 p-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl transition text-left"
              >
                <div className="p-2 bg-green-900/40 rounded-lg mt-0.5">
                  <MessageSquare size={20} className="text-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium">SMS / Twilio Preview</p>
                  <p className="text-gray-500 text-sm mt-0.5">Preview how an inbound SMS deal would be parsed. Twilio setup coming soon.</p>
                  <span className="text-xs text-gray-600 mt-1 block">Coming soon — Twilio not yet configured</span>
                </div>
                <ChevronRight size={16} className="text-gray-600 mt-1 ml-auto shrink-0" />
              </button>
            </div>
          )}

          {/* === PASTE MODE === */}
          {mode === 'paste' && !parsedData && (
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Source Type</label>
                <div className="flex gap-2 flex-wrap">
                  {['FACEBOOK', 'JV', 'SMS', 'BIRD_DOG', 'MANUAL'].map(s => (
                    <button
                      key={s}
                      onClick={() => setSourceType(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${sourceType === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                      {s.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Paste Deal Text</label>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder={`Paste Facebook post, JV blast, SMS, or raw deal info here...\n\nExample:\n3/2 SFR Jacksonville 32206\nAsk 78k, ARV 140k\nNeeds 35-40k work\nVacant, cash only\nDM for pics`}
                  rows={8}
                  className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 resize-none font-mono"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Facebook Post URL (optional)</label>
                <input
                  type="url"
                  value={facebookUrl}
                  onChange={e => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/groups/..."
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* === PARSED REVIEW === */}
          {mode === 'paste' && parsedData && (
            <div className="space-y-4">
              <div className="p-3 bg-green-900/20 border border-green-800/40 rounded-lg">
                <p className="text-green-400 text-sm font-medium">✓ Deal parsed successfully</p>
                {parsedData.buyerFacingSummary && (
                  <p className="text-gray-400 text-xs mt-1">{parsedData.buyerFacingSummary}</p>
                )}
              </div>
              {parsedData.missingFields?.length > 0 && (
                <div className="p-3 bg-amber-900/20 border border-amber-800/40 rounded-lg">
                  <p className="text-amber-400 text-xs font-medium mb-1">Missing info:</p>
                  <p className="text-gray-400 text-xs">{parsedData.missingFields.join(', ')}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <F label="Address" id="address" />
                <F label="City" id="city" />
                <F label="State" id="state" />
                <F label="ZIP" id="zipCode" />
                <F label="Asking Price" id="askingPrice" type="number" />
                <F label="ARV" id="arv" type="number" />
                <F label="Repair Estimate" id="repairEstimate" type="number" />
                <F label="Beds" id="beds" type="number" />
              </div>
            </div>
          )}

          {/* === MANUAL STEPS === */}
          {mode === 'manual' && (
            <div className="space-y-4">
              {step === 1 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <F label="Source Type" id="sourceType" options={[
                      { value: 'OWN', label: 'Own Deal' },
                      { value: 'JV', label: 'JV Partner' },
                      { value: 'FACEBOOK', label: 'Facebook' },
                      { value: 'SMS', label: 'SMS' },
                      { value: 'BIRD_DOG', label: 'Bird Dog' },
                      { value: 'AGENT', label: 'Agent' },
                      { value: 'WHOLESALER', label: 'Wholesaler' },
                      { value: 'MANUAL', label: 'Manual' },
                    ]} />
                  </div>
                  <F label="Source Name" id="sourceName" placeholder="John Smith" />
                  <F label="Source Phone" id="sourcePhone" placeholder="+1 (555) 000-0000" />
                  <F label="Source Email" id="sourceEmail" placeholder="john@example.com" />
                  <F label="Source Company" id="sourceCompany" />
                  <F label="Facebook Post URL" id="facebookPostUrl" />
                  <F label="Facebook Profile URL" id="facebookProfileUrl" />
                  <F label="JV Split" id="jvSplit" placeholder="50/50" />
                  <F label="JV Agreement Status" id="jvAgreementStatus" options={[
                    'Verbal', 'Email Agreement', 'Signed', 'Not Started'
                  ]} />
                  <div className="col-span-2">
                    <label className="text-gray-400 text-xs mb-1 block">Source Notes</label>
                    <textarea value={form.sourceNotes || ''} onChange={e => set('sourceNotes', e.target.value)}
                      rows={2} className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none" />
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><F label="Address" id="address" placeholder="123 Main St" /></div>
                  <F label="City" id="city" />
                  <F label="State" id="state" placeholder="FL" />
                  <F label="ZIP Code" id="zipCode" />
                  <F label="County" id="county" />
                  <F label="Property Type" id="propertyType" options={[
                    'SFR', 'DUPLEX', 'TRIPLEX', 'QUAD', 'CONDO', 'TOWNHOUSE', 'MOBILE_HOME', 'LAND', 'COMMERCIAL', 'MIXED_USE'
                  ]} />
                  <F label="Beds" id="beds" type="number" />
                  <F label="Baths" id="baths" type="number" />
                  <F label="Sqft" id="sqft" type="number" />
                  <F label="Year Built" id="yearBuilt" type="number" />
                  <F label="Occupancy" id="occupancy" options={[
                    { value: 'VACANT', label: 'Vacant' },
                    { value: 'OWNER_OCCUPIED', label: 'Owner Occupied' },
                    { value: 'TENANT_OCCUPIED', label: 'Tenant Occupied' },
                    { value: 'UNKNOWN', label: 'Unknown' },
                  ]} />
                  <F label="Access" id="accessInfo" options={[
                    'Lockbox', 'By Appointment', 'Drive-by Only', 'Tenant Access', 'No Access Yet', 'Unknown'
                  ]} />
                  <F label="HOA" id="hoaStatus" options={['YES', 'NO', 'UNKNOWN']} />
                  <F label="Flood Zone" id="floodZone" options={['YES', 'NO', 'UNKNOWN']} />
                  <div className="col-span-2">
                    <label className="text-gray-400 text-xs mb-1 block">Description / Notes</label>
                    <textarea value={form.description || ''} onChange={e => set('description', e.target.value)}
                      rows={3} className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none" />
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="grid grid-cols-2 gap-3">
                  <F label="Asking / Dispo Price" id="askingPrice" type="number" />
                  <F label="Buyer-Facing Price" id="buyerFacingPrice" type="number" />
                  <F label="ARV" id="arv" type="number" />
                  <F label="Repair Estimate" id="repairEstimate" type="number" />
                  <F label="Rent Estimate (mo)" id="rentEstimate" type="number" />
                  <F label="Current Rent (mo)" id="currentRent" type="number" />
                  <F label="Annual Taxes" id="taxesAnnual" type="number" />
                  <F label="Insurance Est. (mo)" id="insuranceEstimate" type="number" />
                  <F label="HOA Monthly" id="hoaMonthly" type="number" />
                  <F label="Internal Contract Price" id="internalContractPrice" type="number" />
                  <F label="Assignment Fee" id="assignmentFee" type="number" />
                  <F label="JV Fee" id="jvFee" type="number" />
                  {form.askingPrice && form.arv && (
                    <div className="col-span-2 p-3 bg-gray-800 rounded-lg">
                      <p className="text-gray-400 text-xs mb-1">Quick Math</p>
                      <div className="flex gap-4 text-sm">
                        <div><span className="text-gray-500">Spread: </span>
                          <span className={((form.arv || 0) - (form.askingPrice || 0) - (form.repairEstimate || 0)) > 0 ? 'text-green-400' : 'text-red-400'}>
                            ${((form.arv || 0) - (form.askingPrice || 0) - (form.repairEstimate || 0)).toLocaleString()}
                          </span>
                        </div>
                        <div><span className="text-gray-500">70% Rule Max: </span>
                          <span className="text-white">${((form.arv || 0) * 0.70 - (form.repairEstimate || 0)).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {step === 4 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <F label="Overall Condition" id="overallCondition" options={[
                      { value: 'TURNKEY', label: 'Turnkey' },
                      { value: 'LIGHT_REHAB', label: 'Light Rehab' },
                      { value: 'MEDIUM_REHAB', label: 'Medium Rehab' },
                      { value: 'HEAVY_REHAB', label: 'Heavy Rehab' },
                      { value: 'FULL_GUT', label: 'Full Gut' },
                      { value: 'TEAR_DOWN', label: 'Tear Down' },
                      { value: 'UNKNOWN', label: 'Unknown' },
                    ]} />
                  </div>
                  {['roofCondition', 'hvacCondition', 'foundationCondition', 'plumbingCondition', 'electricalCondition', 'kitchenCondition', 'bathroomCondition', 'flooringCondition'].map(f => (
                    <F key={f} label={f.replace(/([A-Z])/g, ' $1').replace('Condition', '').trim()} id={f}
                      options={['Good', 'Fair', 'Poor', 'Unknown']} />
                  ))}
                  <F label="Roof Age" id="roofAge" placeholder="5 years" />
                  <F label="HVAC Age" id="hvacAge" placeholder="3 years" />
                  <div className="col-span-2 space-y-2">
                    {[['moldOrWaterDamage', 'Mold / Water Damage'], ['fireDamage', 'Fire Damage'], ['codeIssues', 'Code Issues']].map(([id, label]) => (
                      <label key={id as string} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!form[id as string]} onChange={e => set(id as string, e.target.checked)}
                          className="w-4 h-4 rounded accent-red-500" />
                        <span className="text-gray-300 text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="col-span-2">
                    <label className="text-gray-400 text-xs mb-1 block">Condition Notes</label>
                    <textarea value={form.conditionNotes || ''} onChange={e => set('conditionNotes', e.target.value)}
                      rows={2} className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none" />
                  </div>
                </div>
              )}
              {step === 5 && (
                <div className="grid grid-cols-2 gap-3">
                  <F label="Contract Date" id="contractDate" type="date" />
                  <F label="Inspection Deadline" id="inspectionDeadline" type="date" />
                  <F label="EMD Due Date" id="emdDueDate" type="date" />
                  <F label="Closing Date / COE" id="closingDate" type="date" />
                  <F label="Assignment Deadline" id="assignmentDeadline" type="date" />
                  <F label="Title Company" id="titleCompany" />
                  <F label="Escrow Officer" id="escrowOfficer" />
                  <F label="Assignment Allowed" id="assignmentAllowed" options={['YES', 'NO', 'UNKNOWN']} />
                  <F label="Double Close Needed" id="doubleCloseNeeded" options={['YES', 'NO', 'UNKNOWN']} />
                  <F label="Financing Allowed" id="financingAllowed" options={[
                    { value: 'CASH_ONLY', label: 'Cash Only' },
                    { value: 'HARD_MONEY_OK', label: 'Hard Money OK' },
                    { value: 'CONVENTIONAL_OK', label: 'Conventional OK' },
                    { value: 'FHA_OK', label: 'FHA OK' },
                    { value: 'UNKNOWN', label: 'Unknown' },
                  ]} />
                  <F label="Vacant at Close" id="vacantAtClose" options={['YES', 'NO', 'UNKNOWN']} />
                </div>
              )}
              {step === 6 && (
                <div className="grid grid-cols-2 gap-3">
                  <F label="Zillow URL" id="zillowUrl" />
                  <F label="Zillow Estimate" id="zillowZestimate" type="number" />
                  <F label="Realtor.com URL" id="realtorUrl" />
                  <F label="Realtor Estimate" id="realtorEstimate" type="number" />
                  <F label="Redfin URL" id="redfinUrl" />
                  <F label="Redfin Estimate" id="redfinEstimate" type="number" />
                  <F label="Google Maps URL" id="googleMapsUrl" />
                  <F label="Street View URL" id="streetViewUrl" />
                  <F label="Photos URL" id="photosUrl" />
                  <F label="Google Drive Folder" id="googleDriveUrl" />
                  <F label="Inspection Report URL" id="inspectionReportUrl" />
                  <F label="Repair Quote URL" id="repairQuoteUrl" />
                </div>
              )}
              {step === 7 && (
                <div className="space-y-4">
                  <h3 className="text-white font-medium">Deal Summary</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ['Address', [form.address, form.city, form.state].filter(Boolean).join(', ')],
                      ['Source', `${form.sourceType || 'Manual'}${form.sourceName ? ' — ' + form.sourceName : ''}`],
                      ['Property', `${form.propertyType || '—'} · ${form.beds || '?'}bd/${form.baths || '?'}ba · ${form.sqft?.toLocaleString() || '?'} sqft`],
                      ['Asking', form.askingPrice ? `$${form.askingPrice.toLocaleString()}` : '—'],
                      ['ARV', form.arv ? `$${form.arv.toLocaleString()}` : '—'],
                      ['Repairs', form.repairEstimate ? `$${form.repairEstimate.toLocaleString()}` : '—'],
                      ['Spread', form.arv && form.askingPrice ? `$${((form.arv || 0) - (form.askingPrice || 0) - (form.repairEstimate || 0)).toLocaleString()}` : '—'],
                      ['Condition', form.overallCondition || '—'],
                      ['Occupancy', form.occupancy || '—'],
                      ['Closing', form.closingDate || '—'],
                    ].map(([k, v]) => (
                      <div key={k as string} className="bg-gray-900 rounded-lg p-3">
                        <p className="text-gray-500 text-xs">{k}</p>
                        <p className="text-white text-sm mt-0.5 truncate">{v || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === SMS PREVIEW === */}
          {mode === 'sms' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-900/20 border border-amber-800/40 rounded-xl">
                <p className="text-amber-300 text-sm font-medium">🔧 Twilio SMS not yet configured</p>
                <p className="text-gray-400 text-sm mt-1">Once set up, wholesalers can text deal info to a dedicated number and DispoAI will auto-create the deal.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Inbound Phone" id="sourcePhone" placeholder="+1 (555) 000-0000" />
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Raw SMS Text</label>
                  <textarea value={form.rawInputText || ''} onChange={e => set('rawInputText', e.target.value)}
                    rows={4} placeholder="3/2 Jax FL 32206, ask 78k, ARV 140k, needs 35k work, vacant"
                    className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none col-span-2" />
                </div>
              </div>
              <button
                onClick={() => { setMode('paste'); setPasteText(form.rawInputText || ''); }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition"
              >
                Parse with AI →
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-800 flex items-center justify-between gap-3">
          {mode !== 'choose' && (
            <button
              onClick={() => mode === 'manual' && step > 1 ? setStep((step - 1) as ManualStep) : setMode('choose')}
              className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition"
            >
              <ChevronLeft size={14} /> Back
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            {mode === 'paste' && !parsedData && (
              <button
                onClick={() => parseMutation.mutate()}
                disabled={!pasteText.trim() || parseMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition"
              >
                {parseMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Parse Deal with AI
              </button>
            )}
            {(mode === 'paste' && parsedData) && (
              <>
                <button onClick={() => handleSave('DRAFT')} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
                  Save as Draft
                </button>
                <button
                  onClick={() => handleSave('NEEDS_INFO')}
                  disabled={saveMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition"
                >
                  {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save & Review
                </button>
              </>
            )}
            {mode === 'manual' && step < 7 && (
              <button
                onClick={() => setStep((step + 1) as ManualStep)}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition"
              >
                Next <ChevronRight size={14} />
              </button>
            )}
            {mode === 'manual' && step === 7 && (
              <>
                <button onClick={() => handleSave('DRAFT')} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
                  Save as Draft
                </button>
                <button
                  onClick={() => handleSave(form.arv && form.askingPrice ? 'READY_TO_MATCH' : 'NEEDS_INFO')}
                  disabled={saveMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition"
                >
                  {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save Deal
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
