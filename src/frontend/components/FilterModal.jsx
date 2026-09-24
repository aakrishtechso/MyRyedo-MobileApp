import React from 'react';
import { 
  X, 
  SlidersHorizontal, 
  Check, 
  RotateCcw, 
  Star, 
  ShieldCheck, 
  Zap, 
  Fuel, 
  Gauge 
} from 'lucide-react';

export const FilterModal = ({
  isOpen,
  onClose,
  filters,
  onUpdateFilters,
  onResetFilters,
  totalResultsCount
}) => {
  if (!isOpen) return null;

  const toggleFuel = (fuel) => {
    const next = filters.fuelTypes.includes(fuel)
      ? filters.fuelTypes.filter(f => f !== fuel)
      : [...filters.fuelTypes, fuel];
    onUpdateFilters({ ...filters, fuelTypes: next });
  };

  const toggleTransmission = (trans) => {
    const next = filters.transmissions.includes(trans)
      ? filters.transmissions.filter(t => t !== trans)
      : [...filters.transmissions, trans];
    onUpdateFilters({ ...filters, transmissions: next });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-[#EAF3FF] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#F7F9FC] border-b border-[#EAF3FF] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#1769D1]" />
            <span className="text-sm font-black text-[#111827]">Filters & Sorting</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Filters Body */}
        <div className="p-6 overflow-y-auto max-h-[72vh] space-y-6">
          
          {/* Price Range Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-extrabold text-[#111827]">Daily Price Range</span>
              <span className="text-xs font-black text-[#1769D1]">
                ₹{filters.minPrice} - ₹{filters.maxPrice} / day
              </span>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min="400"
                max="8000"
                step="200"
                value={filters.maxPrice}
                onChange={(e) => onUpdateFilters({ ...filters, maxPrice: Number(e.target.value) })}
                className="w-full accent-[#1769D1] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-bold text-gray-400">
                <span>Min: ₹400</span>
                <span>₹2,500</span>
                <span>₹5,000</span>
                <span>Max: ₹8,000+</span>
              </div>
            </div>
          </div>

          {/* Sort By */}
          <div className="space-y-2.5">
            <span className="text-xs font-extrabold text-[#111827] block">Sort Listings By</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'recommended', label: 'Recommended' },
                { id: 'price_low', label: 'Price: Low to High' },
                { id: 'price_high', label: 'Price: High to Low' },
                { id: 'rating', label: 'Highest Rated' },
                { id: 'distance', label: 'Closest Distance' }
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onUpdateFilters({ ...filters, sortBy: s.id })}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    filters.sortBy === s.id
                      ? 'border-[#1769D1] bg-[#EAF3FF] text-[#1769D1]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fuel Type */}
          <div className="space-y-2.5">
            <span className="text-xs font-extrabold text-[#111827] block">Fuel / Power Type</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['Petrol', 'Diesel', 'Electric', 'Hybrid'].map((f) => {
                const active = filters.fuelTypes.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFuel(f)}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      active
                        ? 'border-[#1769D1] bg-[#1769D1] text-white shadow-xs'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{f}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transmission */}
          <div className="space-y-2.5">
            <span className="text-xs font-extrabold text-[#111827] block">Transmission</span>
            <div className="grid grid-cols-2 gap-2">
              {['Manual', 'Automatic'].map((t) => {
                const active = filters.transmissions.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTransmission(t)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? 'border-[#1769D1] bg-[#1769D1] text-white shadow-xs'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{t}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Minimum Rating */}
          <div className="space-y-2.5">
            <span className="text-xs font-extrabold text-[#111827] block">Minimum Host & Vehicle Rating</span>
            <div className="flex gap-2">
              {[0, 4.5, 4.8, 4.9].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onUpdateFilters({ ...filters, minRating: r })}
                  className={`flex-1 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    filters.minRating === r
                      ? 'border-[#FF7A00] bg-[#FFF0E3] text-[#FF7A00]'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {r === 0 ? (
                    <span>All</span>
                  ) : (
                    <>
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{r}+</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Verification & Instant Booking Toggles */}
          <div className="space-y-2.5">
            <div 
              onClick={() => onUpdateFilters({ ...filters, onlyVerified: !filters.onlyVerified })}
              className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                filters.onlyVerified ? 'border-emerald-200 bg-emerald-50/60' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-[#111827]">Verified Listings Only (RC & Insurance checked)</span>
              </div>
              <input
                type="checkbox"
                checked={filters.onlyVerified}
                onChange={() => {}}
                className="w-4 h-4 accent-emerald-600"
              />
            </div>

            <div 
              onClick={() => onUpdateFilters({ ...filters, instantBookingOnly: !filters.instantBookingOnly })}
              className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                filters.instantBookingOnly ? 'border-blue-200 bg-blue-50/60' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#1769D1]" />
                <span className="text-xs font-bold text-[#111827]">Instant Booking Only (No host approval wait)</span>
              </div>
              <input
                type="checkbox"
                checked={filters.instantBookingOnly}
                onChange={() => {}}
                className="w-4 h-4 accent-[#1769D1]"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F7F9FC] border-t border-[#EAF3FF] flex items-center justify-between">
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>

          <button
            id="apply-filters-btn"
            type="button"
            onClick={onClose}
            className="bg-[#1769D1] hover:bg-[#0B3B82] text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer"
          >
            <span>Show {totalResultsCount} Rides</span>
          </button>
        </div>

      </div>
    </div>
  );
};
