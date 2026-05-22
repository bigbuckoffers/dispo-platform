'use client';
import { useState, useCallback, useRef } from 'react';
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

// Stable input component — never re-renders parent on change
function Field({ label, id, type = 'text', placeholder = '', options, value, onChange }: {
  label: string; id: string; type?: string; placeholder?: string;
  options?: (string | { value: string; label: string })[]; value: any;
  onChange: (id: string, val: any) => void;
}) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = type === 'number' ? (parseFloat(e.target.value) || '') : e.target.value;
    onChange(id, val);
  }, [id, type, onChange]);

  return (
    <div>
      <label className="text-gray-400 text-xs mb-1 block">{label}</label>
      {options ? (
        <select value={value || ''} onChange={handleChange}
          className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
          <option value="">Select...</option>
          {options.map((o: any) => (
            <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
          ))}
        </select>
      ) : (
        <input type={type} value={value || ''} onChange={handleChange} placeholder={placeholder}
          className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
      )}
    </div>
  );
}

function TextArea({ label, id, placeholder, value, onChange, rows = 3 }: any) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(id, e.target.value);
  }, [id, onChange]);
  return (
    <div>
      <label className="text-gray-400 text-xs mb-1 block">{label}</label>
      <textarea value={value || ''} onChange={handleChange} placeholder={placeholder} rows={rows}
        className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none" />
    </div>
  );
}

export default function AddDealModal({ onClose, onSuccess }: AddDealModalProps) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<IntakeMode>('choose');
  const [step, setStep] = useState<ManualStep>(1);
  const [pasteText, setPasteText] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [sourceType, setSourceType] = useState('MANUAL');
  const [parsedData, setParsedData] = useState<any>(null);
  // Use a ref for form data to avoid re-renders, but also state for display
  const formRef = useRef<Record<string, any>>({});
  const [formDisplay, setFormDisplay] = useState<Record<string, any>>({});

  const setField = useCallback((key: string, val: any) => {
    formRef.current = { ...formRef.current, [key]: val };
    setFormDisplay(prev => ({ ...prev, [key]: val }));
  }, []);

  const parseMutation = useMutation({
    mutationFn: () => api.post('/deals/import/raw', { rawText: pasteText, facebookUrl, sourceType }).then(r => r.data),
    onSuccess: (data) => {
      formRef.current = data;
      setFormDisplay(data);
      setParsedData(data);
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
    saveMutation.mutate({ ...formRef.current, status, sourceType });
  };

  const f = formDisplay;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
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
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition"><X size={18} /></button>
        </div>

        {/* Step bar */}
        {mode === 'manual' && (
          <div className="flex px-5 pt-3 gap-1">
            {MANUAL_STEPS.map(s => (
              <div key={s.num} className={`flex-1 h-1 rounded-full transition ${s.num < step ? 'bg-blue-500' : s.num === step ? 'bg-blue-400' : 'bg-gray-800'}`} />
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* CHOOSE */}
          {mode === 'choose' && (
            <div className="space-y-3">
              {[
                { id: 'paste', icon: Sparkles, color: 'text-blue-400', bg: 'bg-blue-900/40', title: 'Paste Deal / Facebook Post', desc: 'Paste raw text, a Facebook post, or JV deal blast. AI extracts the details automatically.' },
                { id: 'manual', icon: PenLine, color: 'text-purple-400', bg: 'bg-purple-900/40', title: 'Manual Deal Entry', desc: 'Step-by-step form for entering a deal you already have details for.' },
                { id: 'sms', icon: MessageSquare, color: 'text-green-400', bg: 'bg-green-900/40', title: 'SMS / Twilio Preview', desc: 'Preview how an inbound SMS deal would be parsed. Twilio setup coming soon.' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setMode(opt.id as IntakeMode)}
                  className="w-full flex items-start gap-4 p-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-blue-600/50 rounded-xl transition text-left">
                  <div className={`p-2 ${opt.bg} rounded-lg mt-0.5`}><opt.icon size={20} className={opt.color} /></div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{opt.title}</p>
                    <p className="text-gray-500 text-sm mt-0.5">{opt.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-600 mt-1 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* PASTE */}
          {mode === 'paste' && !parsedData && (
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Source Type</label>
                <div className="flex gap-2 flex-wrap">
                  {['FACEBOOK', 'JV', 'SMS', 'BIRD_DOG', 'MANUAL'].map(s => (
                    <button key={s} onClick={() => setSourceType(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${sourceType === s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                      {s.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Paste Deal Text</label>
                <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={8}
                  placeholder={`Paste Facebook post, JV blast, SMS, or raw deal info here...\n\nExample:\n3/2 SFR Jacksonville 32206\nAsk 78k, ARV 140k\nNeeds 35-40k work\nVacant, cash only\nDM for pics`}
                  className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 resize-none font-mono" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Facebook Post URL (optional)</label>
                <input type="url" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/groups/..."
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          )}

          {/* PARSED REVIEW */}
          {mode === 'paste' && parsedData && (
            <div className="space-y-4">
              <div className="p-3 bg-green-900/20 border border-green-800/40 rounded-lg">
                <p className="text-green-400 text-sm font-medium">✓ Deal parsed successfully</p>
                {parsedData.buyerFacingSummary && <p className="text-gray-400 text-xs mt-1">{parsedData.buyerFacingSummary}</p>}
              </div>
              {parsedData.missingFields?.length > 0 && (
                <div className="p-3 bg-amber-900/20 border border-amber-800/40 rounded-lg">
                  <p className="text-amber-400 text-xs font-medium mb-1">Missing info:</p>
                  <p className="text-gray-400 text-xs">{parsedData.missingFields.join(', ')}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {(['address','city','state','zipCode','askingPrice','arv','repairEstimate','beds'] as const).map(id => (
                  <Field key={id} label={id} id={id} type={['askingPrice','arv','repairEstimate','beds'].includes(id) ? 'number' : 'text'}
                    value={f[id]} onChange={setField} />
                ))}
              </div>
            </div>
          )}

          {/* MANUAL STEPS */}
          {mode === 'manual' && (
            <div className="space-y-4">
              {step === 1 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field label="Source Type" id="sourceType" value={f.sourceType} onChange={setField}
                      options={[{value:'OWN',label:'Own Deal'},{value:'JV',label:'JV Partner'},{value:'FACEBOOK',label:'Facebook'},{value:'SMS',label:'SMS'},{value:'BIRD_DOG',label:'Bird Dog'},{value:'AGENT',label:'Agent'},{value:'WHOLESALER',label:'Wholesaler'},{value:'MANUAL',label:'Manual'}]} />
                  </div>
                  <Field label="Source Name" id="sourceName" placeholder="John Smith" value={f.sourceName} onChange={setField} />
                  <Field label="Source Phone" id="sourcePhone" placeholder="+1 (555) 000-0000" value={f.sourcePhone} onChange={setField} />
                  <Field label="Source Email" id="sourceEmail" placeholder="john@example.com" value={f.sourceEmail} onChange={setField} />
                  <Field label="Source Company" id="sourceCompany" value={f.sourceCompany} onChange={setField} />
                  <Field label="Facebook Post URL" id="facebookPostUrl" value={f.facebookPostUrl} onChange={setField} />
                  <Field label="Facebook Profile URL" id="facebookProfileUrl" value={f.facebookProfileUrl} onChange={setField} />
                  <Field label="JV Split" id="jvSplit" placeholder="50/50" value={f.jvSplit} onChange={setField} />
                  <Field label="JV Agreement Status" id="jvAgreementStatus" value={f.jvAgreementStatus} onChange={setField}
                    options={['Verbal','Email Agreement','Signed','Not Started']} />
                  <div className="col-span-2">
                    <TextArea label="Source Notes" id="sourceNotes" value={f.sourceNotes} onChange={setField} rows={2} />
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Field label="Address" id="address" placeholder="123 Main St" value={f.address} onChange={setField} /></div>
                  <Field label="City" id="city" value={f.city} onChange={setField} />
                  <Field label="State" id="state" placeholder="FL" value={f.state} onChange={setField} />
                  <Field label="ZIP Code" id="zipCode" value={f.zipCode} onChange={setField} />
                  <Field label="County" id="county" value={f.county} onChange={setField} />
                  <Field label="Property Type" id="propertyType" value={f.propertyType} onChange={setField}
                    options={['SFR','DUPLEX','TRIPLEX','QUAD','CONDO','TOWNHOUSE','MOBILE_HOME','LAND','COMMERCIAL','MIXED_USE']} />
                  <Field label="Beds" id="beds" type="number" value={f.beds} onChange={setField} />
                  <Field label="Baths" id="baths" type="number" value={f.baths} onChange={setField} />
                  <Field label="Sqft" id="sqft" type="number" value={f.sqft} onChange={setField} />
                  <Field label="Year Built" id="yearBuilt" type="number" value={f.yearBuilt} onChange={setField} />
                  <Field label="Occupancy" id="occupancy" value={f.occupancy} onChange={setField}
                    options={[{value:'VACANT',label:'Vacant'},{value:'OWNER_OCCUPIED',label:'Owner Occupied'},{value:'TENANT_OCCUPIED',label:'Tenant Occupied'},{value:'UNKNOWN',label:'Unknown'}]} />
                  <Field label="Access" id="accessInfo" value={f.accessInfo} onChange={setField}
                    options={['Lockbox','By Appointment','Drive-by Only','Tenant Access','No Access Yet','Unknown']} />
                  <Field label="HOA" id="hoaStatus" value={f.hoaStatus} onChange={setField} options={['YES','NO','UNKNOWN']} />
                  <Field label="Flood Zone" id="floodZone" value={f.floodZone} onChange={setField} options={['YES','NO','UNKNOWN']} />
                  <div className="col-span-2"><TextArea label="Description / Notes" id="description" value={f.description} onChange={setField} rows={3} /></div>
                </div>
              )}
              {step === 3 && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Asking / Dispo Price" id="askingPrice" type="number" value={f.askingPrice} onChange={setField} />
                  <Field label="Buyer-Facing Price" id="buyerFacingPrice" type="number" value={f.buyerFacingPrice} onChange={setField} />
                  <Field label="ARV" id="arv" type="number" value={f.arv} onChange={setField} />
                  <Field label="Repair Estimate" id="repairEstimate" type="number" value={f.repairEstimate} onChange={setField} />
                  <Field label="Rent Estimate (mo)" id="rentEstimate" type="number" value={f.rentEstimate} onChange={setField} />
                  <Field label="Current Rent (mo)" id="currentRent" type="number" value={f.currentRent} onChange={setField} />
                  <Field label="Annual Taxes" id="taxesAnnual" type="number" value={f.taxesAnnual} onChange={setField} />
                  <Field label="Insurance Est. (mo)" id="insuranceEstimate" type="number" value={f.insuranceEstimate} onChange={setField} />
                  <Field label="HOA Monthly" id="hoaMonthly" type="number" value={f.hoaMonthly} onChange={setField} />
                  <Field label="Assignment Fee" id="assignmentFee" type="number" value={f.assignmentFee} onChange={setField} />
                  <Field label="JV Fee" id="jvFee" type="number" value={f.jvFee} onChange={setField} />
                  {f.askingPrice && f.arv && (
                    <div className="col-span-2 p-3 bg-gray-800 rounded-lg">
                      <p className="text-gray-400 text-xs mb-1">Quick Math</p>
                      <div className="flex gap-4 text-sm">
                        <div><span className="text-gray-500">Spread: </span>
                          <span className={((f.arv||0)-(f.askingPrice||0)-(f.repairEstimate||0))>0?'text-green-400':'text-red-400'}>
                            ${((f.arv||0)-(f.askingPrice||0)-(f.repairEstimate||0)).toLocaleString()}
                          </span>
                        </div>
                        <div><span className="text-gray-500">70% Rule: </span>
                          <span className="text-white">${((f.arv||0)*0.70-(f.repairEstimate||0)).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {step === 4 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field label="Overall Condition" id="overallCondition" value={f.overallCondition} onChange={setField}
                      options={[{value:'TURNKEY',label:'Turnkey'},{value:'LIGHT_REHAB',label:'Light Rehab'},{value:'MEDIUM_REHAB',label:'Medium Rehab'},{value:'HEAVY_REHAB',label:'Heavy Rehab'},{value:'FULL_GUT',label:'Full Gut'},{value:'TEAR_DOWN',label:'Tear Down'},{value:'UNKNOWN',label:'Unknown'}]} />
                  </div>
                  {['roofCondition','hvacCondition','foundationCondition','plumbingCondition','electricalCondition','kitchenCondition','bathroomCondition','flooringCondition'].map(id => (
                    <Field key={id} label={id.replace(/([A-Z])/g,' $1').replace('Condition','').trim()} id={id}
                      value={f[id]} onChange={setField} options={['Good','Fair','Poor','Unknown']} />
                  ))}
                  <Field label="Roof Age" id="roofAge" placeholder="5 years" value={f.roofAge} onChange={setField} />
                  <Field label="HVAC Age" id="hvacAge" placeholder="3 years" value={f.hvacAge} onChange={setField} />
                  <div className="col-span-2 space-y-2">
                    {[['moldOrWaterDamage','Mold / Water Damage'],['fireDamage','Fire Damage'],['codeIssues','Code Issues']].map(([id,label]) => (
                      <label key={id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!f[id]} onChange={e => setField(id, e.target.checked)} className="w-4 h-4 rounded accent-red-500" />
                        <span className="text-gray-300 text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="col-span-2"><TextArea label="Condition Notes" id="conditionNotes" value={f.conditionNotes} onChange={setField} rows={2} /></div>
                </div>
              )}
              {step === 5 && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Contract Date" id="contractDate" type="date" value={f.contractDate} onChange={setField} />
                  <Field label="Inspection Deadline" id="inspectionDeadline" type="date" value={f.inspectionDeadline} onChange={setField} />
                  <Field label="EMD Due Date" id="emdDueDate" type="date" value={f.emdDueDate} onChange={setField} />
                  <Field label="Closing Date / COE" id="closingDate" type="date" value={f.closingDate} onChange={setField} />
                  <Field label="Assignment Deadline" id="assignmentDeadline" type="date" value={f.assignmentDeadline} onChange={setField} />
                  <Field label="Title Company" id="titleCompany" value={f.titleCompany} onChange={setField} />
                  <Field label="Escrow Officer" id="escrowOfficer" value={f.escrowOfficer} onChange={setField} />
                  <Field label="Assignment Allowed" id="assignmentAllowed" value={f.assignmentAllowed} onChange={setField} options={['YES','NO','UNKNOWN']} />
                  <Field label="Double Close Needed" id="doubleCloseNeeded" value={f.doubleCloseNeeded} onChange={setField} options={['YES','NO','UNKNOWN']} />
                  <Field label="Financing Allowed" id="financingAllowed" value={f.financingAllowed} onChange={setField}
                    options={[{value:'CASH_ONLY',label:'Cash Only'},{value:'HARD_MONEY_OK',label:'Hard Money OK'},{value:'CONVENTIONAL_OK',label:'Conventional OK'},{value:'FHA_OK',label:'FHA OK'},{value:'UNKNOWN',label:'Unknown'}]} />
                  <Field label="Vacant at Close" id="vacantAtClose" value={f.vacantAtClose} onChange={setField} options={['YES','NO','UNKNOWN']} />
                </div>
              )}
              {step === 6 && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Zillow URL" id="zillowUrl" value={f.zillowUrl} onChange={setField} />
                  <Field label="Zillow Estimate" id="zillowEstimate" type="number" value={f.zillowEstimate} onChange={setField} />
                  <Field label="Realtor.com URL" id="realtorUrl" value={f.realtorUrl} onChange={setField} />
                  <Field label="Realtor Estimate" id="realtorEstimate" type="number" value={f.realtorEstimate} onChange={setField} />
                  <Field label="Redfin URL" id="redfinUrl" value={f.redfinUrl} onChange={setField} />
                  <Field label="Redfin Estimate" id="redfinEstimate" type="number" value={f.redfinEstimate} onChange={setField} />
                  <Field label="Google Maps URL" id="googleMapsUrl" value={f.googleMapsUrl} onChange={setField} />
                  <Field label="Street View URL" id="streetViewUrl" value={f.streetViewUrl} onChange={setField} />
                  <Field label="Photos URL" id="photosUrl" value={f.photosUrl} onChange={setField} />
                  <Field label="Google Drive Folder" id="googleDriveUrl" value={f.googleDriveUrl} onChange={setField} />
                  <Field label="Inspection Report URL" id="inspectionReportUrl" value={f.inspectionReportUrl} onChange={setField} />
                  <Field label="Repair Quote URL" id="repairQuoteUrl" value={f.repairQuoteUrl} onChange={setField} />
                </div>
              )}
              {step === 7 && (
                <div className="space-y-4">
                  <h3 className="text-white font-medium">Deal Summary</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      ['Address', [f.address, f.city, f.state].filter(Boolean).join(', ')],
                      ['Source', `${f.sourceType || 'Manual'}${f.sourceName ? ' — ' + f.sourceName : ''}`],
                      ['Property', `${f.propertyType || '—'} · ${f.beds || '?'}bd/${f.baths || '?'}ba · ${f.sqft?.toLocaleString() || '?'} sqft`],
                      ['Asking', f.askingPrice ? `$${f.askingPrice.toLocaleString()}` : '—'],
                      ['ARV', f.arv ? `$${f.arv.toLocaleString()}` : '—'],
                      ['Repairs', f.repairEstimate ? `$${f.repairEstimate.toLocaleString()}` : '—'],
                      ['Spread', f.arv && f.askingPrice ? `$${((f.arv||0)-(f.askingPrice||0)-(f.repairEstimate||0)).toLocaleString()}` : '—'],
                      ['Condition', f.overallCondition || '—'],
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

          {/* SMS */}
          {mode === 'sms' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-900/20 border border-amber-800/40 rounded-xl">
                <p className="text-amber-300 text-sm font-medium">🔧 Twilio SMS not yet configured</p>
                <p className="text-gray-400 text-sm mt-1">Once set up, wholesalers can text deal info to a dedicated number and DispoAI will auto-create the deal.</p>
              </div>
              <Field label="Inbound Phone" id="sourcePhone" value={f.sourcePhone} onChange={setField} placeholder="+1 (555) 000-0000" />
              <TextArea label="Raw SMS Text" id="rawInputText" value={f.rawInputText} onChange={setField} rows={4}
                placeholder="3/2 Jax FL 32206, ask 78k, ARV 140k, needs 35k work, vacant" />
              <button onClick={() => { setMode('paste'); setPasteText(f.rawInputText || ''); }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition">
                Parse with AI →
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-800 flex items-center justify-between gap-3">
          {mode !== 'choose' && (
            <button onClick={() => mode === 'manual' && step > 1 ? setStep((step - 1) as ManualStep) : setMode('choose')}
              className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition">
              <ChevronLeft size={14} /> Back
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            {mode === 'paste' && !parsedData && (
              <button onClick={() => parseMutation.mutate()} disabled={!pasteText.trim() || parseMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition">
                {parseMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Parse Deal with AI
              </button>
            )}
            {mode === 'paste' && parsedData && (<>
              <button onClick={() => handleSave('DRAFT')} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">Save as Draft</button>
              <button onClick={() => handleSave('NEEDS_INFO')} disabled={saveMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition">
                {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save & Review
              </button>
            </>)}
            {mode === 'manual' && step < 7 && (
              <button onClick={() => setStep((step + 1) as ManualStep)}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition">
                Next <ChevronRight size={14} />
              </button>
            )}
            {mode === 'manual' && step === 7 && (<>
              <button onClick={() => handleSave('DRAFT')} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">Save as Draft</button>
              <button onClick={() => handleSave(f.arv && f.askingPrice ? 'READY_TO_MATCH' : 'NEEDS_INFO')} disabled={saveMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition">
                {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Deal
              </button>
            </>)}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
