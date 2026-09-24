import React, { useState } from 'react';
import { 
  X, 
  Camera, 
  Fuel, 
  Gauge, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Check, 
  FileText,
  Sparkles
} from 'lucide-react';

export const InspectionModal = ({
  booking,
  inspectionType,
  isOpen,
  onClose,
  onSaveInspection
}) => {
  const [odometer, setOdometer] = useState('');
  const [fuelLevel, setFuelLevel] = useState('');
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState({
    cleanInterior: false,
    noVisibleDents: false,
    rcInsurancePresent: false,
    spareTireToolkit: false,
    lightsAndIndicators: false
  });
  const [hasDamage, setHasDamage] = useState(false);
  const [damageDescription, setDamageDescription] = useState('');

  if (!isOpen || !booking) return null;

  const toggleCheck = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    const damageItems = Object.entries(checklist)
      .filter(([_, checked]) => !checked)
      .map(([k]) => k);

    const inspectionData = {
      odometer,
      fuelLevel,
      notes: hasDamage ? `${notes} [DAMAGE REPORTED: ${damageDescription}]` : notes,
      damageItems,
      inspectedAt: new Date().toISOString(),
      inspectedBy: booking.renterName
    };

    onSaveInspection(booking.id, inspectionType, inspectionData, hasDamage ? damageDescription : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-[#EAF3FF] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#F7F9FC] border-b border-[#EAF3FF] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#1769D1]" />
            <span className="text-sm font-extrabold text-[#111827]">
              {inspectionType === 'pickup' ? 'Pre-Trip Vehicle Inspection' : 'Post-Trip Return Inspection'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[75vh] space-y-5">
          
          {/* Vehicle summary banner */}
          <div className="flex items-center gap-3 bg-[#F7F9FC] p-3.5 rounded-2xl border border-gray-100">
            <div>
              <h4 className="text-xs font-black text-[#111827]">{booking.vehicle.name}</h4>
              <p className="text-[11px] text-gray-500">Booking Ref: {booking.id} · Host: {booking.vehicle.owner.name}</p>
            </div>
          </div>

          {/* Odometer & Fuel Reading */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#FAFBFD] p-4 rounded-2xl border border-gray-100 space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-[#1769D1]" />
                Odometer Reading (km)
              </label>
              <input
                type="number"
                value={odometer}
                onChange={(e) => setOdometer(Number(e.target.value))}
                className="w-full bg-white p-2 rounded-xl border border-gray-200 text-sm font-black text-[#111827]"
                required
              />
            </div>

            <div className="bg-[#FAFBFD] p-4 rounded-2xl border border-gray-100 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase">
                <span className="flex items-center gap-1">
                  <Fuel className="w-3.5 h-3.5 text-[#FF7A00]" />
                  Fuel / Battery Level
                </span>
                <span className="text-xs font-black text-[#111827]">{fuelLevel}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={fuelLevel}
                onChange={(e) => setFuelLevel(Number(e.target.value))}
                className="w-full accent-[#1769D1] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Empty (E)</span>
                <span>Half (50%)</span>
                <span>Full (100%)</span>
              </div>
            </div>
          </div>

          {/* Digital Inspection Checklist */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-[#111827] block">
              Pre-Ride Multi-Point Checklist
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { key: 'cleanInterior', label: 'Clean sanitized interior' },
                { key: 'noVisibleDents', label: 'No unaccounted scratches/dents' },
                { key: 'rcInsurancePresent', label: 'Original RC & Insurance papers' },
                { key: 'spareTireToolkit', label: 'Spare tire & jack kit in boot' },
                { key: 'lightsAndIndicators', label: 'Headlights & indicators working' }
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleCheck(item.key)}
                  className={`p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                    checklist[item.key]
                      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 font-bold'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                  }`}
                >
                  <span>{item.label}</span>
                  {checklist[item.key] ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Notes & Damage Report */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Inspector Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs text-[#111827]"
              />
            </div>

            {/* Flag Damage or Dispute toggle */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Flag New Damage or Open Damage Dispute
                </span>
                <input
                  type="checkbox"
                  checked={hasDamage}
                  onChange={(e) => setHasDamage(e.target.checked)}
                  className="w-4 h-4 accent-[#FF7A00]"
                />
              </div>

              {hasDamage && (
                <div className="pt-2">
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">
                    Describe damage / incident details for insurance & deposit settlement
                  </label>
                  <textarea
                    rows={2}
                    value={damageDescription}
                    onChange={(e) => setDamageDescription(e.target.value)}
                    placeholder="e.g. Scrape on left side rear quarter panel during highway driving."
                    className="w-full bg-white p-2.5 rounded-xl border border-amber-300 text-xs text-[#111827]"
                    required={hasDamage}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-inspection-btn"
              type="submit"
              className="bg-[#1769D1] hover:bg-[#0B3B82] text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Complete & Sign Inspection</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
