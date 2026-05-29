'use client';
import React, { useState, useRef, useCallback } from 'react';

interface Props {
  sub: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

function FastInput({ label, fieldKey, formRef, submitted, type }: any) {
  const subVal = String(submitted[fieldKey] || '').trim();
  const inputRef = useRef<HTMLInputElement>(null);
  const applySubmitted = () => {
    formRef.current[fieldKey] = submitted[fieldKey];
    if (inputRef.current) inputRef.current.value = String(submitted[fieldKey] || '');
  };
  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-1 gap-2">
        <label className="text-gray-500 text-xs shrink-0">{label}</label>
        {subVal && (
          <button onClick={applySubmitted} className="text-xs text-blue-400 hover:text-blue-200 transition truncate max-w-[200px]" title={subVal}>
            Submitted: <span className="font-medium text-blue-300">{subVal}</span> — apply
          </button>
        )}
      </div>
      <input ref={inputRef} type={type || 'text'} defaultValue={formRef.current[fieldKey] || ''} onBlur={e => { formRef.current[fieldKey] = e.target.value; }} className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
    </div>
  );
}

function FastSelect({ label, fieldKey, formRef, options }: any) {
  const [val, setVal] = useState(formRef.current[fieldKey] || '');
  return (
    <div className="p-2">
      {label !== undefined && <label className="text-gray-500 text-xs block mb-1">{label}</label>}
      <select value={val} onChange={e => { formRef.current[fieldKey] = e.target.value; setVal(e.target.value); }} className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500">
        {options.map((o: any) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function PoFSection({ formRef, submitted }: any) {
  const [selected, setSelected] = useState(formRef.current.proofOfFunds || (submitted ? submitted : ''));
  const opts = ['Yes, I can send on request','Yes, I have it ready','No, I use hard money','Not applicable'];
  return (
    <div>
      <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 pt-1">Proof of Funds</h3>
      <div className="px-2">
        {submitted && <p className="text-blue-400 text-xs mb-2">Buyer submitted: <span className="font-medium">{submitted}</span></p>}
        <div className="flex flex-wrap gap-1.5">
          {opts.map(v => (
            <button key={v} onClick={()=>{ formRef.current.proofOfFunds=v; setSelected(v); }}
              className={'text-xs px-3 py-1.5 rounded-lg border transition '+(selected===v?'bg-blue-600 text-white border-blue-500':'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500')}>
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SubmissionReviewModal({ sub, onClose, onSave }: Props) {
  const d = sub.submittedData || {};
  const b = sub.buyer || {};
  const bb = b.buyBox || {};

  const formRef = useRef<any>({
    marketPrimary:    b.marketPrimary || d.marketPrimary || '',
    marketSecondary:  (b.marketSecondary || []).join(', ') || d.marketSecondary || '',
    states:           (bb.states || []).join(', ') || d.states || '',
    zipCodes:         (bb.zipCodes || []).join(', ') || d.zipCodes || '',
    excludedAreas:    bb.excludedAreas || d.excludedAreas || '',
    minBeds:          bb.minBeds || d.minBeds || '',
    minYearBuilt:     bb.minYearBuilt || d.minYearBuilt || '',
    minPrice:         bb.minPrice || d.minPrice || '',
    maxPrice:         bb.maxPrice || d.maxPrice || '',
    minArv:           bb.minArv || d.minArv || '',
    minProfit:        bb.minProfit || d.minProfit || '',
    maxEmd:           bb.maxEmd || d.maxEmd || '',
    inspectionDays:   bb.inspectionDays || d.inspectionDays || '',
    hardNoCriteria:   bb.hardNoCriteria || d.hardNoCriteria || '',
    strategies:       (b.preferredStrategies || []).join(', ') || (d.strategies || []).join(', ') || '',
    fundingTypes:     b.notes || (d.fundingTypes || []).join(', ') || '',
    closeSpeed:       b.avgCloseSpeedDays || d.closeSpeed || '',
    monthlyCapacity:  b.monthlyCapacity || d.monthlyCapacity || '',
    preferredContact: b.preferredContact || d.preferredContact || '',
    dealSendFreq:     d.dealSendFreq || b.dealSendFreq || '',
    proofOfFunds:     b.proofOfFunds || d.proofOfFunds || '',
    privateNotes:     b.privateNotes || '',
  });

  const [anyZipOk,       setAnyZipOk]       = useState(!!(bb.anyZipOk ?? d.anyZipOk));
  const [anyPrice,       setAnyPrice]       = useState(!!(bb.anyPrice ?? d.anyPrice));
  const [hoaOk,          setHoaOk]          = useState(bb.hoaOk || d.hoaOk || '');
  const [occupancy,      setOccupancy]      = useState(bb.occupancy || d.occupancy || '');
  const [rehabTolerance, setRehabTolerance] = useState(bb.rehabTolerance || d.rehabTolerance || '');
  const [buyingStatus,   setBuyingStatus]   = useState(b.buyingStatus || d.buyingStatus || '');
  const [propertyTypes,  setPropertyTypes]  = useState<string>((bb.propertyTypes || []).join(', ') || (d.propertyTypes || []).join(', ') || '');

  const sub_d: any = {
    marketPrimary: d.marketPrimary, marketSecondary: d.marketSecondary, states: d.states,
    zipCodes: d.zipCodes, excludedAreas: d.excludedAreas, minBeds: d.minBeds,
    minSqft: d.minSqft,
    minYearBuilt: d.minYearBuilt,
    maxRehab: d.maxRehab,
    minCashFlow: d.minCashFlow, minPrice: d.minPrice, maxPrice: d.maxPrice,
    minArv: d.minArv, minProfit: d.minProfit, maxEmd: d.maxEmd,
    inspectionDays: d.inspectionDays, hardNoCriteria: d.hardNoCriteria,
    strategies: (d.strategies || []).join(', '), fundingTypes: (d.fundingTypes || []).join(', '),
    closeSpeed: d.closeSpeed, monthlyCapacity: d.monthlyCapacity,
  };

  const handleSave = useCallback(() => {
    const form = formRef.current;
    const buyerFields: any = {};
    const buyBoxFields: any = {};
    if (form.marketPrimary)    buyerFields.marketPrimary = form.marketPrimary;
    if (form.marketSecondary)  buyerFields.marketSecondary = form.marketSecondary.split(',').map((s:string)=>s.trim()).filter(Boolean);
    if (form.strategies)       buyerFields.preferredStrategies = form.strategies.split(',').map((s:string)=>s.trim()).filter(Boolean);
    if (form.fundingTypes)     buyerFields.notes = form.fundingTypes;
    if (buyingStatus)          buyerFields.buyingStatus = buyingStatus;
    if (form.monthlyCapacity)  buyerFields.monthlyCapacity = form.monthlyCapacity;
    if (form.closeSpeed)       buyerFields.avgCloseSpeedDays = isNaN(parseInt(form.closeSpeed)) ? form.closeSpeed : parseInt(form.closeSpeed);
    if (form.preferredContact) buyerFields.preferredContact = form.preferredContact;
    if (form.dealSendFreq)     buyerFields.dealSendFreq = form.dealSendFreq;
    if (form.proofOfFunds)     buyerFields.proofOfFunds = form.proofOfFunds;
    buyerFields.privateNotes = form.privateNotes || '';
    if (form.states)           buyBoxFields.states = form.states.split(',').map((s:string)=>s.trim()).filter(Boolean);
    if (form.zipCodes)         buyBoxFields.zipCodes = form.zipCodes.split(',').map((z:string)=>z.trim()).filter(Boolean);
    buyBoxFields.anyZipOk = anyZipOk;
    if (form.excludedAreas)    buyBoxFields.excludedAreas = form.excludedAreas;
    if (propertyTypes)         buyBoxFields.propertyTypes = propertyTypes.split(',').map((s:string)=>s.trim()).filter(Boolean);
    if (form.minBeds)          buyBoxFields.minBeds = parseInt(form.minBeds);
    if (form.minYearBuilt)     buyBoxFields.minYearBuilt = parseInt(form.minYearBuilt);
    if (hoaOk)                 buyBoxFields.hoaOk = hoaOk;
    if (occupancy)             buyBoxFields.occupancy = occupancy;
    if (form.minPrice)         buyBoxFields.minPrice = parseFloat(form.minPrice);
    if (form.maxPrice)         buyBoxFields.maxPrice = parseFloat(form.maxPrice);
    buyBoxFields.anyPrice = anyPrice;
    if (form.minArv)           buyBoxFields.minArv = parseFloat(form.minArv);
    if (form.minProfit)        buyBoxFields.minProfit = parseFloat(form.minProfit);
    if (form.maxEmd)           buyBoxFields.maxEmd = parseFloat(form.maxEmd);
    if (form.inspectionDays)   buyBoxFields.inspectionDays = parseInt(form.inspectionDays);
    if (rehabTolerance)        buyBoxFields.rehabTolerance = rehabTolerance;
    if (form.hardNoCriteria)   buyBoxFields.hardNoCriteria = form.hardNoCriteria;
    onSave({ buyerFields, buyBoxFields });
  }, [anyZipOk, anyPrice, hoaOk, occupancy, rehabTolerance, buyingStatus, propertyTypes, onSave]);

  const FI = (p: any) => <FastInput {...p} formRef={formRef} submitted={sub_d} />;
  const PROP_TYPES = ['SFH','Duplex','Triplex','Fourplex','Multi-Family (5+)','Mobile Home','Condo','Townhouse','Commercial'];
  const S = ({ t }: any) => <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 pt-1">{t}</h3>;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-8">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 rounded-t-2xl z-10">
          <div><h2 className="text-white font-semibold text-base">Review Buy Box Submission</h2><p className="text-gray-400 text-xs mt-0.5">{b.firstName} {b.lastName} · {b.phone} · {new Date(sub.createdAt).toLocaleDateString()}</p></div>
          <div className="flex gap-2"><button onClick={onClose} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition">Cancel</button><button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg font-medium transition">✓ Save to Buy Box</button></div>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div><S t="Buying Status" />
            <div className="grid grid-cols-2 gap-1">
              <div className="p-2 col-span-2">
                <label className="text-gray-500 text-xs block mb-2">Buying Status {d.buyingStatus && <span className="ml-1 text-blue-400">· Buyer: {d.buyingStatus}</span>}</label>
                <div className="flex flex-wrap gap-1.5">
                  {[{v:'ACTIVELY_BUYING',l:'🔥 Actively Buying'},{v:'BUYING_SELECTIVELY',l:'👀 Selectively'},{v:'PAUSED',l:'⏸ Paused'},{v:'JUST_LOOKING',l:'👋 Just Looking'}].map(o=>(
                    <button key={o.v} onClick={()=>{setBuyingStatus(o.v);formRef.current.buyingStatus=o.v;}} className={'text-xs px-2.5 py-1.5 rounded-lg border transition '+(buyingStatus===o.v?'bg-blue-600 text-white border-blue-500':'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500')}>{o.l}</button>
                  ))}
                </div>
              </div>
              <FI label="Monthly Capacity" fieldKey="monthlyCapacity" />
            </div>
          </div>
          <div><S t="Markets" />
            <div className="grid grid-cols-2 gap-1">
              <FI label="Primary Market" fieldKey="marketPrimary" />
              <FI label="Secondary Markets" fieldKey="marketSecondary" />
              <FI label="States" fieldKey="states" />
              <FI label="Zip Codes" fieldKey="zipCodes" />
              <div className="col-span-2 px-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={anyZipOk} onChange={e=>{setAnyZipOk(e.target.checked);formRef.current.anyZipOk=e.target.checked;}} className="accent-blue-500" />
                  <span className="text-gray-400 text-xs">Any zip OK — entire market {d.anyZipOk && <span className="text-blue-400 font-medium">(buyer checked this ✓)</span>}</span>
                </label>
              </div>
              <div className="col-span-2"><FI label="Excluded Areas" fieldKey="excludedAreas" /></div>
            </div>
          </div>
          <div><S t="Property" />
            <div className="px-2 mb-3">
              <label className="text-gray-500 text-xs block mb-2">Property Types {d.propertyTypes?.length>0 && <span className="text-blue-400">· Buyer: {(d.propertyTypes||[]).join(', ')}</span>}</label>
              <div className="flex flex-wrap gap-1.5">
                {PROP_TYPES.map(pt=>{const sel=propertyTypes.includes(pt);return(<button key={pt} onClick={()=>{const cur=propertyTypes?propertyTypes.split(',').map((s:string)=>s.trim()).filter(Boolean):[];const upd=sel?cur.filter((s:string)=>s!==pt):[...cur,pt];const nv=upd.join(', ');setPropertyTypes(nv);formRef.current.propertyTypes=nv;}} className={'text-xs px-2.5 py-1 rounded-full border transition '+(sel?'bg-blue-600 text-white border-blue-500':'bg-gray-800 text-gray-400 border-gray-700')}>{pt}</button>);})}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <FI label="Min Beds" fieldKey="minBeds" type="number" />
              <FI label="Min Sqft" fieldKey="minSqft" type="number" />
              <FI label="Min Year Built" fieldKey="minYearBuilt" type="number" />
              <div className="p-2">
                <label className="text-gray-500 text-xs block mb-1">HOA OK? {d.hoaOk&&<span className="text-blue-400">· {d.hoaOk}</span>}</label>
                <div className="flex gap-1.5">{['Yes','No','Unknown'].map(v=>(<button key={v} onClick={()=>{setHoaOk(v);formRef.current.hoaOk=v;}} className={'flex-1 py-1.5 rounded text-xs border transition '+(hoaOk===v?'bg-blue-600 text-white border-blue-500':'bg-gray-800 text-gray-400 border-gray-700')}>{v}</button>))}</div>
              </div>
            </div>
            <div className="px-2 mt-2">
              <label className="text-gray-500 text-xs block mb-2">Occupancy {d.occupancy&&<span className="text-blue-400">· Buyer: {d.occupancy}</span>}</label>
              <div className="flex gap-1.5 flex-wrap">{['Vacant only','Tenant-occupied OK','No preference'].map(v=>(<button key={v} onClick={()=>{setOccupancy(v);formRef.current.occupancy=v;}} className={'text-xs px-3 py-1.5 rounded-lg border transition '+(occupancy===v?'bg-blue-600 text-white border-blue-500':'bg-gray-800 text-gray-400 border-gray-700')}>{v}</button>))}</div>
            </div>
          </div>
          <div><S t="Price & Financials" />
            <div className="grid grid-cols-2 gap-1">
              <FI label="Min Price" fieldKey="minPrice" type="number" />
              <FI label="Max Price" fieldKey="maxPrice" type="number" />
            </div>
            <div className="px-2 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={anyPrice} onChange={e=>{setAnyPrice(e.target.checked);formRef.current.anyPrice=e.target.checked;}} className="accent-blue-500" />
                <span className="text-gray-400 text-xs">No price limit {d.anyPrice&&<span className="text-blue-400 font-medium">(buyer checked this ✓)</span>}</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <FI label="Max Rehab Budget" fieldKey="maxRehab" type="number" />
              <FI label="Min Cash Flow/mo" fieldKey="minCashFlow" type="number" />


            </div>
          </div>
          <div><S t="Strategy & Rehab" />
            <div className="grid grid-cols-2 gap-1">
              <FI label="Strategies" fieldKey="strategies" />
              <div className="p-2">
                <label className="text-gray-500 text-xs block mb-2">Rehab Tolerance {d.rehabTolerance&&<span className="text-blue-400">· Buyer: {d.rehabTolerance}</span>}</label>
                <div className="flex flex-wrap gap-1.5">{[{v:'COSMETIC_ONLY',l:'Turnkey'},{v:'LIGHT',l:'Light'},{v:'MEDIUM',l:'Medium'},{v:'HEAVY',l:'Heavy'},{v:'FULL_GUT',l:'Full gut'}].map(o=>(<button key={o.v} onClick={()=>{setRehabTolerance(o.v);formRef.current.rehabTolerance=o.v;}} className={'text-xs px-2.5 py-1.5 rounded-lg border transition '+(rehabTolerance===o.v?'bg-blue-600 text-white border-blue-500':'bg-gray-800 text-gray-400 border-gray-700')}>{o.l}</button>))}</div>
              </div>
              <div className="col-span-2"><FI label="Hard No Criteria" fieldKey="hardNoCriteria" /></div>
            </div>
          </div>
          <div><S t="Funding & Closing" />
            <div className="grid grid-cols-2 gap-1">
              <FI label="Funding Types" fieldKey="fundingTypes" />
              <FI label="Close Speed" fieldKey="closeSpeed" />
            </div>
          </div>
          <div><S t="Preferences" />
            <div className="grid grid-cols-2 gap-1">
              <FastSelect label={<>Preferred Contact {d.preferredContact&&<span className="text-blue-400 font-normal">· {d.preferredContact}</span>}</>} fieldKey="preferredContact" formRef={formRef} options={[{v:'',l:'Unknown'},{v:'Text only',l:'Text only'},{v:'Text first, then call',l:'Text first, then call'},{v:'Call me',l:'Call me'},{v:'Email',l:'Email'}]} />
              <FastSelect label={<>Deal Frequency {d.dealSendFreq&&<span className="text-blue-400 font-normal">· {d.dealSendFreq}</span>}</>} fieldKey="dealSendFreq" formRef={formRef} options={[{v:'',l:'Unknown'},{v:'Every deal',l:'Every deal'},{v:'Only strong matches',l:'Only strong matches'},{v:'Weekly digest',l:'Weekly digest'},{v:'Only top deals',l:'Only top deals'}]} />
            </div>
          </div>
          <PoFSection formRef={formRef} submitted={d.proofOfFunds} />
          <div><S t="Private Notes" />
            <div className="px-2">
              <textarea defaultValue={formRef.current.privateNotes||''} onBlur={e=>{formRef.current.privateNotes=e.target.value;}} placeholder="Private notes about this buyer (not visible to buyer)..." rows={3} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 resize-none placeholder-gray-600" />
            </div>
          </div>
          {d.freeformNotes&&(<div><S t="Buyer's Notes (from intake form)" /><div className="px-2"><div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-gray-300 text-xs leading-relaxed">{d.freeformNotes}</div></div></div>)}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-800">
          <button onClick={onClose} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg font-medium transition">Save to Buy Box</button>
        </div>
      </div>
    </div>
  );
}
