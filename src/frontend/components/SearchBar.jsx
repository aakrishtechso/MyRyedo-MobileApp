import React, { useState } from 'react';
import { MapPin, Calendar, Car, ChevronDown, Check, SlidersHorizontal } from 'lucide-react';



export const SearchBar = ({
  filters,
  onFilterChange,
  onSearch,
  onOpenFiltersModal,
  onOpenFilters,
  totalResultsCount
}) => {
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const handleOpenFilters = onOpenFiltersModal || onOpenFilters;
  const today = new Date().toISOString().slice(0, 10);
  const minReturnDate = filters.pickupDate || today;


  const categories = [
    { id: 'all', label: 'All vehicles' },
    { id: 'cars', label: 'Cars' },
    { id: 'bikes', label: 'Bikes' },
    { id: 'scooters', label: 'Scooters' },
    { id: 'evs', label: 'EVs' },
    { id: 'suvs', label: 'SUVs' },
    { id: 'vans', label: 'Vans' },
    { id: 'luxury', label: 'Luxury' }
  ];

  const currentCategoryLabel = categories.find(c => c.id === filters.category)?.label || 'All vehicles';

  return (
    <div id="main-search-bar" className="w-full relative z-20">
      <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-lg shadow-blue-900/5 border border-gray-100 transition-all">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-0 items-center">
          
          {/* 1. Location */}
          <div className="md:col-span-3 relative md:pr-4 md:border-r border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EBF3FE] flex items-center justify-center text-[#1769D1] shrink-0">
              <MapPin className="w-5 h-5 text-[#1769D1]" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[11px] font-semibold text-gray-400 block">
                Location
              </label>
              <div 
                className="cursor-pointer"
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
              >
                <input
                  id="search-location-input"
                  type="text"
                  value={filters.searchLocation}
                  onChange={(e) => onFilterChange({ searchLocation: e.target.value })}
                  placeholder="e.g. Wakad, Pune"
                  className="w-full bg-transparent border-none outline-none p-0 text-xs sm:text-sm font-semibold text-[#111827] truncate focus:ring-0"
                />
              </div>
            </div>

            {/* Location helper — no hardcoded service areas. */}
            {showLocationDropdown && (
              <div className="absolute top-full left-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50 animate-in fade-in slide-in-from-top-1">
                <p className="text-xs font-semibold text-gray-600">
                  Enter a city, area, or pickup address from the vehicle listing.
                </p>
              </div>
            )}
          </div>

          {/* 2. Pick-up Date */}
          <div className="md:col-span-3 relative md:px-4 md:border-r border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EBF3FE] flex items-center justify-center text-[#1769D1] shrink-0">
              <Calendar className="w-5 h-5 text-[#1769D1]" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[11px] font-semibold text-gray-400 block">
                Pick-up Date
              </label>
              <input
                id="search-pickup-date"
                type="date"
                min={today}
                value={filters.pickupDate}
                onChange={(e) => {
                  const pickupDate = e.target.value;
                  onFilterChange({
                    pickupDate,
                    ...(filters.returnDate && filters.returnDate < pickupDate ? { returnDate: '' } : {})
                  });
                }}
                className="w-full bg-transparent border-none outline-none p-0 text-xs sm:text-sm font-semibold text-[#111827] focus:ring-0 cursor-pointer"
              />
              <input
                id="search-pickup-time"
                type="time"
                value={filters.pickupTime || '10:00'}
                onChange={(e) => onFilterChange({ pickupTime: e.target.value })}
                className="mt-1 w-full bg-transparent border-none outline-none p-0 text-[11px] font-semibold text-gray-500 focus:ring-0 cursor-pointer"
                aria-label="Pick-up time"
              />
            </div>
          </div>

          {/* 3. Return Date */}
          <div className="md:col-span-3 relative md:px-4 md:border-r border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EBF3FE] flex items-center justify-center text-[#1769D1] shrink-0">
              <Calendar className="w-5 h-5 text-[#1769D1]" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[11px] font-semibold text-gray-400 block">
                Return Date
              </label>
              <input
                id="search-return-date"
                type="date"
                min={minReturnDate}
                value={filters.returnDate}
                onChange={(e) => onFilterChange({ returnDate: e.target.value })}
                className="w-full bg-transparent border-none outline-none p-0 text-xs sm:text-sm font-semibold text-[#111827] focus:ring-0 cursor-pointer"
              />
              <input
                id="search-return-time"
                type="time"
                value={filters.returnTime || '10:00'}
                onChange={(e) => onFilterChange({ returnTime: e.target.value })}
                className="mt-1 w-full bg-transparent border-none outline-none p-0 text-[11px] font-semibold text-gray-500 focus:ring-0 cursor-pointer"
                aria-label="Return time"
              />
            </div>
          </div>

          {/* 4. Vehicle Type Dropdown */}
          <div className="md:col-span-2 relative md:px-3 flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#EBF3FE] flex items-center justify-center text-[#1769D1] shrink-0">
              <Car className="w-5 h-5 text-[#1769D1]" />
            </div>
            <div 
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              <label className="text-[11px] font-semibold text-gray-400 block">
                Vehicle type
              </label>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-[#111827] truncate">
                  {currentCategoryLabel}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
              </div>
            </div>

            {/* Dropdown */}
            {showCategoryDropdown && (
              <div className="absolute top-full left-0 mt-3 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in">
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        onFilterChange({ category: cat.id });
                        setShowCategoryDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl flex items-center justify-between cursor-pointer ${
                        filters.category === cat.id
                          ? 'bg-[#EBF3FE] text-[#1769D1]'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {filters.category === cat.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. Filter & Search Actions */}
          <div className="md:col-span-1 flex items-center gap-2 justify-end">
            {handleOpenFilters && (
              <button
                type="button"
                onClick={handleOpenFilters}
                className="p-3 rounded-xl border border-gray-200 text-gray-600 hover:text-[#1769D1] hover:bg-[#EBF3FE] transition-colors"
                title="Open Advanced Filters"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            )}

            <button
              id="search-submit-btn"
              type="button"
              onClick={onSearch}
              className="w-full md:w-auto bg-[#FF7A00] hover:bg-[#e06c00] active:scale-95 text-white font-black text-xs sm:text-sm px-5 py-3.5 rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer text-center"
            >
              Search
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
