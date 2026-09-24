import React, { useEffect, useState } from 'react';
import { Building2, MapPin } from 'lucide-react';

export const LocationPicker = ({ initialAddress = '', initialCity = '', initialCoords = null, initialPickupType = 'public_nearby', initialInstructions = '', onChange }) => {
  const [address, setAddress] = useState(initialAddress);
  const [city, setCity] = useState(initialCity);
  const [stateName, setStateName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [pickupType, setPickupType] = useState(initialPickupType);
  const [instructions, setInstructions] = useState(initialInstructions);

  useEffect(() => {
    onChange?.({ address, city, state: stateName, postalCode, pickupType, instructions, coordinates: initialCoords || null });
  }, [address, city, stateName, postalCode, pickupType, instructions]);

  const field = (label, value, setValue, placeholder, required = false) => (
    <label className="block">
      <span className="text-[11px] font-black text-slate-700">{label}{required ? ' *' : ''}</span>
      <input value={value} onChange={(e) => setValue(e.target.value)} required={required} placeholder={placeholder} className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#FF6400] focus:ring-2 focus:ring-orange-100 focus:outline-none" />
    </label>
  );

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2"><span className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center"><MapPin className="w-4 h-4 text-[#FF6400]" /></span><div><h4 className="text-sm font-black text-slate-950">Vehicle Pickup Location</h4><p className="text-xs text-slate-500 mt-0.5">Enter the location that bookers should use to collect the vehicle.</p></div></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {field('Pickup address / landmark', address, setAddress, 'e.g. Baner High Street, near Metro Station', true)}
        {field('City', city, setCity, 'e.g. Pune', true)}
        {field('State', stateName, setStateName, 'e.g. Maharashtra')}
        {field('PIN code', postalCode, setPostalCode, 'e.g. 411045')}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Handover location</p>
        <div className="mt-3 grid sm:grid-cols-2 gap-2">
          {[
            ['public_nearby', 'Nearby public landmark', 'Use a mall, metro station, commercial garage or another suitable pickup point.'],
            ['exact', 'Exact home / office spot', 'Use the exact address when that is the pickup arrangement.']
          ].map(([value, title, copy]) => <button key={value} type="button" onClick={() => setPickupType(value)} className={`p-3 rounded-xl border text-left transition-all ${pickupType === value ? 'border-[#FF6400] bg-orange-50 ring-1 ring-orange-200' : 'border-slate-200 bg-white hover:border-slate-300'}`}><div className="flex items-center gap-2 text-xs font-black text-slate-900"><Building2 className="w-3.5 h-3.5 text-[#FF6400]" />{title}</div><p className="mt-1 text-[10px] leading-4 text-slate-500">{copy}</p></button>)}
        </div>
      </div>
      <label className="block"><span className="text-[11px] font-black text-slate-700">Handover instructions</span><textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} placeholder="Optional: key handover instructions, meeting point, or arrival notes" className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#FF6400] focus:ring-2 focus:ring-orange-100 focus:outline-none resize-none" /></label>
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">MyRyedo will save the location you enter with this vehicle. Bookers can open the saved pickup location in Google Maps when they need directions.</div>
    </div>
  );
};
