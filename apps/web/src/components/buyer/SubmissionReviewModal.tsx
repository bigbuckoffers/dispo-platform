'use client';
import React, { useState, useRef, useCallback } from 'react';

interface Props {
  sub: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

function FastInput({ label, fieldKey, formRef, submitted, type }: any) {
  const curVal = String(formRef.current[fieldKey] || '').trim();
  const subVal = String(submitted[fieldKey] || '').trim();
  const conflict = curVal && subVal && curVal !== subVal;
  const isNew = !curVal && subVal;
  const inputRef = useRef<HTMLInputElement>(null);
  const acceptNew = () => { formRef.current[fieldKey] = submitted[fieldKey]; if (inputRef.current) inputRef.current.value = String(submitted[fieldKey] || ''); };
  const keepCurrent = () => { if (inputRef.current) inputRef.current.value = curVal; };
  return (
    <div className={'rounded-lg p-2 ' + (conflict ? 'bg-yellow-500/5 border border-yellow-500/20' : isNew ? 'bg-green-500/5 border border-green-500/20' : '')}>
      <label className="text-gray-500 text-xs block mb-1">{label}{conflict && <span className="ml-2 text-yellow-400 text-xs">⚠ Conflict</span>}{isNew && <span className="ml-2 text-green-400 text-xs">✓ New</span>}</label>
      {conflict && (<div className="flex gap-2 mb-1.5 flex-wrap"><span className="text-xs text-yellow-300 bg-yellow-500/10 px-2 py-0.5 rounded">Current: {curVal}</span><span className="text-xs text-green-300 bg-green-500/10 px-2 py-0.5 rounded">New: {subVal}</span><button onClick={acceptNew} className="text-xs bg-green-600 hover:bg-green-500 text-white px-2 py-0.5 rounded transition">Use New</button><button onClick={keepCurrent} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded transition">Keep</button></div>)}
      {isNew && (<div className="flex gap-2 mb-1.5"><button onClick={acceptNew} className="text-xs bg-green-600 hover:bg-green-500 text-white px-2 py-0.5 rounded transition">Accept: {subVal}</button></div>)}
      <input ref={inputRef} type={type || 'text'} defaultValue={formRef.current[fieldKey] || ''} onBlur={e => { formRef.current[fieldKey] = e.target.value; }} className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
    </div>
  );
}

function FastSelect({ label, fieldKey, formRef, submitted, options }: any) {
  const [val, setVal] = useState(formRef.current[fieldKey] || '');
  return (
    <div className="rounded-lg p-2">
      <label className="text-gray-500 text-xs block mb-1">{label}</label>
      <select value={val} onChange={e => { formRef.current[fieldKey] = e.target.value; setVal(e.target.value); }} className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500">
        {options.map((o: any) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

export function SubmissionReviewModal({ sub, onClose, onSave }: Props) {
  const d = sub.submittedData || {};
  const b = sub.buyer || {};
  const bb = b.buyBox || {};
  const formRef = useRef<any>({
    marketPrimary: b.marketPrimary || d.marketPrimary || '',
    marketSecondary: (b.marketSecondary || []).join(', '),
    states: (bb.states || []).join(', ') || d.states || '',
    zipCodes: (bb.zipCodes || []).join(', ') || d.zipCodes || '',
    anyZipOk: bb.anyZipOk || false,
    excludedAreas: bb.excludedAreas || d.excludedAreas || '',
    propertyTypes: (bb.propertyTypes || []).join(', ') || (d.propertyTypes || []).join(', ') || '',
    minBeds: bb.minBeds || '', minPrice: bb.minPrice || d.minPrice || '',
    maxPrice: bb.maxPrice || d.maxPrice || '', anyPrice: bb.anyPrice || false,
    rehabTolerance: bb.rehabTolerance || d.rehabTolerance || '',
    hardNoCriteria: bb.hardNoCriteria || d.hardNoCriteria || '',
    minArv: bb.minArv || d.minArv || '', minProfit: bb.minProfit || '',
    maxEmd: bb.maxEmd || '', inspectionDays: bb.inspectionDays || '',
    minYearBuilt: bb.minYearBuilt || '', occupancy: bb.occupancy || d.occupancy || '',
    hoaOk: bb.hoaOk || '',
    strategies: (b.preferredStrategies || []).join(', ') || (d.strategies || []).join(', ') || '',
    fundingTypes: b.notes || (d.fundingTypes || []).join(', ') || '',
    closeSpeed: b.avgCloseSpeedDays || d.closeSpeed || '',
    buyingStatus: b.buyingStatus || d.buyingStatus || '',
    monthlyCapacity: b.monthlyCapacity || d.monthlyCapacity || '',
    preferredContact: b.preferredContact || d.preferredContact || '',
    dealSendFreq: b.dealSendFreq || '', privateNotes: b.privateNotes || '',
  });
  const [anyZipOk, setAnyZipOk] = useState(!!bb.anyZipOk);
  const [anyPrice, setAnyPrice] = useState(!!bb.anyPrice);
  const [propertyTypes, setPropertyTypes] = useState<string>((bb.propertyTypes || []).join(', ') || (d.propertyTypes || []).join(', ') || '');
  const submitted: any = { marketPrimary: d.marketPrimary, marketSecondary: d.marketSecondary, states: d.states, zipCodes: d.zipCodes, excludedAreas: d.excludedAreas, propertyTypes: (d.propertyTypes || []).join(', '), minBeds: d.minBeds, minPrice: d.minPrice, maxPrice: d.maxPrice, rehabTolerance: d.rehabTolerance, hardNoCriteria: d.hardNoCriteria, minArv: d.minArv, minProfit: d.minProfit, maxEmd: d.maxEmd, inspectionDays: d.inspectionDays, minYearBuilt: d.minYearBuilt, occupancy: d.occupancy, hoaOk: d.hoaOk, strategies: (d.strategies || []).join(', '), fundingTypes: (d.fundingTypes || []).join(', '), closeSpeed: d.closeSpeed, buyingStatus: d.buyingStatus, monthlyCapacity: d.monthlyCapacity, preferredContact: d.preferredContact, dealSendFreq: d.dealSendFreq };
  const handleSave = useCallback(() => {
    const form = formRef.current;
    const buyerFields: any = {};
    const buyBoxFields: any = {};
    if (form.marketPrimary) buyerFields.marketPrimary = form.marketPrimary;
    if (form.marketSecondary) buyerFields.marketSecondary = form.marketSecondary.split(',').map((s:string)=>s.trim()).filter(Boolean);
    if (form.strategies) buyerFields.preferredStrategies = form.strategies.split(',').map((s:string)=>s.trim()).filter(Boolean);
    if (form.fundingTypes) buyerFields.notes = form.fundingTypes;
    if (form.buyingStatus) buyerFields.buyingStatus = form.buyingStatus;
    if (form.monthlyCapacity) buyerFields.monthlyCapacity = form.monthlyCapacity;
    if (form.closeSpeed) buyerFields.avgCloseSpeedDays = parseInt(form.closeSpeed);
    if (form.preferredContact) buyerFields.preferredContact = form.preferredContact;
    if (form.dealSendFreq) buyerFields.dealSendFreq = form.dealSendFreq;
    buyerFields.privateNotes = form.privateNotes || '';
    if (form.states) buyBoxFields.states = form.states.split(',').map((s:string)=>s.trim()).filter(Boolean);
    if (form.zipCodes) buyBoxFields.zipCodes = form.zipCodes.split(',').map((z:string)=>z.trim()).filter(Boolean);
    buyBoxFields.anyZipOk = anyZipOk;
    if (form.minPrice) buyBoxFields.minPrice = parseFloat(form.minPrice);
    if (form.maxPrice) buyBoxFields.maxPrice = parseFloat(form.maxPrice);
    buyBoxFields.anyPrice = anyPrice;
    if (form.rehabTolerance) buyBoxFields.rehabTolerance = form.rehabTolerance;
    if (propertyTypes) buyBoxFields.propertyTypes = propertyTypes.split(',').map((s:string)=>s.trim()).filter(Boolean);
    if (form.minBeds) buyBoxFields.minBeds = parseInt(form.minBeds);
    if (form.hoaOk) buyBoxFields.hoaOk = form.hoaOk;
    if (form.minArv) buyBoxFields.minArv = parseFloat(form.minArv);
    if (form.minProfit) buyBoxFields.minProfit = parseFloat(form.minProfit);
    if (form.maxEmd) buyBoxFields.maxEmd = parseFloat(form.maxEmd);
    if (form.inspectionDays) buyBoxFields.inspectionDays = parseInt(form.inspectionDays);
    if (form.minYearBuilt) buyBoxFields.minYearBuilt = parseInt(form.minYearBuilt);
    if (form.hardNoCriteria) buyBoxFields.hardNoCriteria = form.hardNoCriteria;
    if (form.excludedAreas) buyBoxFields.excludedAreas = form.excludedAreas;
    if (form.occupancy) buyBoxFields.occupancy = form.occupancy;
    onSave({ buyerFields, buyBoxFields });
  }, [anyZipOk, anyPrice, propertyTypes, onSave]);
  const FI = (p: any) => <FastInput {...p} formRef={formRef} submitted={submitted} />;
  const FS = (p: any) => <FastSelect {...p} formRef={formRef} submitted={submitted} />;
  const BS = [{v:'',l:'Unknown'},{v:'ACTIVELY_BUYING',l:'🔥 Actively Buying'},{v:'BUYING_SELECTIVELY',l:'👀 Selectively'},{v:'PAUSED',l:'⏸ Paused'},{v:'JUST_LOOKING',l:'👋 Just Looking'}];
  const RH = [{v:'',l:'Unknown'},{v:'COSMETIC_ONLY',l:'Turnkey only'},{v:'LIGHT',l:'Light rehab'},{v:'MEDIUM',l:'Medium rehab'},{v:'HEAVY',l:'Heavy rehab'},{v:'FULL_GUT',l:'Full gut'}];
  const CO = [{v:'',l:'Unknown'},{v:'Text only',l:'Text only'},{v:'Text first, then call',l:'Text first, then call'},{v:'Call me',l:'Call me'},{v:'Email',l:'Email'}];
  const FQ = [{v:'',l:'Unknown'},{v:'Every deal',l:'Every deal'},{v:'Only strong matches',l:'Only strong matches'},{v:'Weekly digest',l:'Weekly digest'},{v:'Only top deals',l:'Only top deals'}];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto py-8">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 rounded-t-2xl z-10">
          <div><h2 className="text-white font-semibold text-base">Review Buy Box Submission</h2><p className="text-gray-400 text-xs mt-0.5">{b.firstName} {b.lastName} · {b.phone} · {new Date(sub.createdAt).toLocaleDateString()}</p></div>
          <div className="flex gap-2"><button onClick={onClose} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition">Cancel</button><button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg font-medium transition">✓ Save to Buy Box</button></div>
        </div>
        <div className="px-6 py-4 space-y-5">
          <div><h3 className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">Buying Status</h3><div className="grid grid-cols-2 gap-3"><FS label="Buying Status" fieldKey="buyingStatus" options={BS} /><FI label="Monthly Capacity" fieldKey="monthlyCapacity" /></div></div>
          <div><h3 className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">Markets</h3><div className="grid grid-cols-2 gap-3"><FI label="Primary Market" fieldKey="marketPrimary" /><FI label="Secondary Markets" fieldKey="marketSecondary" /><FI label="States" fieldKey="states" /><FI label="Zip Codes" fieldKey="zipCodes" /><div className="col-span-2"><FI label="Excluded Areas" fieldKey="excludedAreas" /></div><div className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={anyZipOk} onChange={e=>{setAnyZipOk(e.target.checked);formRef.current.anyZipOk=e.target.checked;}} className="accent-blue-500" /><span className="text-gray-400 text-xs">Any zip OK — entire market</span></div></div></div>
          <div><h3 className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">Property</h3><div className="mb-3"><label className="text-gray-500 text-xs block mb-2">Property Types</label>{submitted.propertyTypes&&submitted.propertyTypes!==propertyTypes&&(<div className="flex gap-2 mb-2"><span className="text-xs text-yellow-300 bg-yellow-500/10 px-2 py-0.5 rounded">Current: {propertyTypes||'none'}</span><span className="text-xs text-green-300 bg-green-500/10 px-2 py-0.5 rounded">New: {submitted.propertyTypes}</span><button onClick={()=>setPropertyTypes(submitted.propertyTypes)} className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">Use New</button></div>)}<div className="flex flex-wrap gap-1.5">{['SFH','Duplex','Triplex','Fourplex','Multi-Family (5+)','Mobile Home','Condo','Townhouse','Commercial'].map(pt=>{const selected=propertyTypes.includes(pt);return(<button key={pt} onClick={()=>{const cur=propertyTypes?propertyTypes.split(',').map((s:string)=>s.trim()).filter(Boolean):[];const updated=selected?cur.filter((s:string)=>s!==pt):[...cur,pt];const nv=updated.join(', ');setPropertyTypes(nv);formRef.current.propertyTypes=nv;}} className={'text-xs px-2.5 py-1 rounded-full border transition '+(selected?'bg-blue-600 text-white border-blue-500':'bg-gray-800 text-gray-400 border-gray-700')}>{pt}</button>);})}</div></div><div className="grid grid-cols-3 gap-3"><FI label="Min Beds" fieldKey="minBeds" type="number" /><FI label="Min Year Built" fieldKey="minYearBuilt" type="number" /><FS label="HOA OK?" fieldKey="hoaOk" options={[{v:'',l:'Unknown'},{v:'Yes',l:'Yes'},{v:'No',l:'No'}]} /><div className="col-span-3"><FS label="Occupancy" fieldKey="occupancy" options={[{v:'',l:'No preference'},{v:'Vacant only',l:'Vacant only'},{v:'Tenant-occupied OK',l:'Tenant-occupied OK'},{v:'No preference',l:'No preference'}]} /></div></div></div>
          <div><h3 className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">Price and Financials</h3><div className="grid grid-cols-2 gap-3"><FI label="Min Price" fieldKey="minPrice" type="number" /><FI label="Max Price" fieldKey="maxPrice" type="number" /><FI label="Min ARV" fieldKey="minArv" type="number" /><FI label="Min Profit" fieldKey="minProfit" type="number" /><FI label="Max EMD" fieldKey="maxEmd" type="number" /><FI label="Inspection Days" fieldKey="inspectionDays" type="number" /><div className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={anyPrice} onChange={e=>{setAnyPrice(e.target.checked);formRef.current.anyPrice=e.target.checked;}} className="accent-blue-500" /><span className="text-gray-400 text-xs">No price limit</span></div></div></div>
          <div><h3 className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">Strategy and Rehab</h3><div className="grid grid-cols-2 gap-3"><FI label="Strategies" fieldKey="strategies" /><FS label="Rehab Tolerance" fieldKey="rehabTolerance" options={RH} /><div className="col-span-2"><FI label="Hard No Criteria" fieldKey="hardNoCriteria" /></div></div></div>
          <div><h3 className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">Funding and Closing</h3><div className="grid grid-cols-2 gap-3"><FI label="Funding Types" fieldKey="fundingTypes" /><FI label="Close Speed (days)" fieldKey="closeSpeed" type="number" /></div></div>
          <div><h3 className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">Preferences</h3><div className="grid grid-cols-2 gap-3"><FS label="Preferred Contact" fieldKey="preferredContact" options={CO} /><FS label="Deal Frequency" fieldKey="dealSendFreq" options={FQ} /></div></div>
          <div><h3 className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">Private Notes</h3><textarea defaultValue={formRef.current.privateNotes||''} onBlur={e=>{formRef.current.privateNotes=e.target.value;}} placeholder="Add private notes about this buyer (not visible to buyer)..." rows={3} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 resize-none placeholder-gray-600" /></div>
          {d.freeformNotes&&(<div><h3 className="text-gray-300 text-xs font-semibold uppercase tracking-wider mb-3">Buyer Notes</h3><div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-gray-300 text-xs leading-relaxed">{d.freeformNotes}</div></div>)}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-800">
          <button onClick={onClose} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg font-medium transition">Save to Buy Box</button>
        </div>
      </div>
    </div>
  );
}
