import React, { useState, useEffect, useRef } from 'react';
import { Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { 
  MapPin, 
  Navigation, 
  Search, 
  ShieldCheck, 
  Star, 
  Fuel, 
  Zap, 
  SlidersHorizontal, 
  Crosshair,
  Car,
  Bike
} from 'lucide-react';

const DEFAULT_CENTER = null;

export const MapView = ({
  vehicles = [],
  selectedVehicle,
  onSelectVehicle,
  onViewAll,
  onBookNow
}) => {
  const [activeVehicleId, setActiveVehicleId] = useState(selectedVehicle?.id || vehicles[0]?.id || null);
  const [mapCenter, setMapCenter] = useState(selectedVehicle?.coordinates || DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(13);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null);
  const [showNearbyAmenities, setShowNearbyAmenities] = useState(false);

  const map = useMap();
  const placesLib = useMapsLibrary('places');

  // Sync with selectedVehicle prop
  useEffect(() => {
    if (selectedVehicle?.id) {
      setActiveVehicleId(selectedVehicle.id);
      if (selectedVehicle.coordinates) {
        setMapCenter(selectedVehicle.coordinates);
        if (map) {
          map.panTo(selectedVehicle.coordinates);
          map.setZoom(14);
        }
      }
    }
  }, [selectedVehicle, map]);

  const handleSelectVehicle = (veh) => {
    setActiveVehicleId(veh.id);
    if (veh.coordinates) {
      setMapCenter(veh.coordinates);
      if (map) {
        map.panTo(veh.coordinates);
        map.setZoom(14);
      }
    }
    if (onSelectVehicle) {
      onSelectVehicle(veh);
    }
  };

  // "Use My Current Location" button
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setLocationStatus('Locating you...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setIsLocating(false);
        setLocationStatus('Location found! Centering map.');
        setMapCenter(userLoc);
        if (map) {
          map.panTo(userLoc);
          map.setZoom(14);
        }
        setTimeout(() => setLocationStatus(null), 3000);
      },
      (error) => {
        setIsLocating(false);
        setLocationStatus('Location permission denied or unavailable.');
        setTimeout(() => setLocationStatus(null), 3000);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Search area handler (geocoding or filtering nearby)
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Search vehicles first by location name or brand
    const query = searchQuery.toLowerCase();
    const matched = vehicles.find(v => 
      v.location.toLowerCase().includes(query) ||
      v.name.toLowerCase().includes(query) ||
      v.brand.toLowerCase().includes(query)
    );

    if (matched && matched.coordinates) {
      handleSelectVehicle(matched);
      setLocationStatus(`Showing vehicles in ${matched.location}`);
      setTimeout(() => setLocationStatus(null), 3000);
      return;
    }

    setLocationStatus(`No matching vehicle location was found for "${searchQuery}".`);
    setTimeout(() => setLocationStatus(null), 3000);
  };

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId) || vehicles[0];
  const listVehicles = vehicles.slice(0, 4);

  return (
    <section id="map-experience-section" className="w-full py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Container */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-100 shadow-sm space-y-5">
          
          {/* Top Control Bar: Title, Search, and Locate Me */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-gray-100">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight">
                Find your ride on the map
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Real-time vehicles from the connected MyRyedo database.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Map Search input */}
              <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search area (e.g. Baner, Wakad)..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 focus:border-[#FF6400] focus:outline-none"
                />
              </form>

              {/* Use My Location button */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                title="Center map on your current location"
              >
                <Crosshair className={`w-3.5 h-3.5 text-[#FF6400] ${isLocating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isLocating ? 'Locating...' : 'Use My Location'}</span>
              </button>

              {/* Nearby Amenities Toggle */}
              <button
                type="button"
                onClick={() => setShowNearbyAmenities(!showNearbyAmenities)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  showNearbyAmenities
                    ? 'bg-orange-50 border-orange-200 text-[#FF6400]'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Fuel className="w-3.5 h-3.5" />
                <span>Nearby Fuel & Hubs</span>
              </button>
            </div>
          </div>

          {locationStatus && (
            <div className="p-2.5 bg-orange-50/80 border border-orange-200 text-xs font-bold text-[#FF6400] rounded-xl flex items-center gap-2 animate-in fade-in">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{locationStatus}</span>
            </div>
          )}

          {/* Main Grid: Left Vehicle Cards (~35%) | Right Real Google Map (~65%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Vehicle List */}
            <div className="lg:col-span-4 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                  {vehicles.length} Vehicles Nearby
                </span>
                <span className="text-[11px] font-bold text-gray-400">
                  Click card to focus map
                </span>
              </div>

              {/* Vehicle Cards List */}
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {listVehicles.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-gray-200 text-center space-y-2 bg-gray-50/50">
                    <Car className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="text-xs font-bold text-gray-700">No vehicles located in this view</p>
                    <p className="text-[11px] text-gray-400">List your vehicle to be the first live car or bike in this area.</p>
                  </div>
                ) : (
                  listVehicles.map((veh) => {
                  const isActive = veh.id === activeVehicleId;
                  return (
                    <div
                      key={veh.id}
                      onClick={() => handleSelectVehicle(veh)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? 'border-[#FF6400] bg-orange-50/40 shadow-sm ring-1 ring-[#FF6400]'
                          : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-16 h-14 rounded-xl bg-white border border-gray-100 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-xs">
                          <img
                            src={veh.images?.[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=400&q=80'}
                            alt={veh.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-black text-[#111827] truncate">
                            {veh.name}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                            <span className="flex items-center gap-0.5 text-gray-600 font-bold">
                              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate">{veh.location}</span>
                            </span>
                            <span>·</span>
                            <span className="text-gray-400 shrink-0">{veh.distanceKm || 0} km</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 mt-1">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span>{Number.isFinite(Number(veh.rating)) && Number(veh.rating) > 0 ? Number(veh.rating).toFixed(1) : 'No rating'}{veh.tripsCount ? ` (${veh.tripsCount} trips)` : ''}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-black text-[#FF6400] block">
                          ₹{veh.pricePerDay?.toLocaleString('en-IN') || 0}
                        </span>
                        <span className="text-[10px] text-gray-400 block font-semibold">
                          / day
                        </span>
                        {isActive && onBookNow && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onBookNow(veh);
                            }}
                            className="mt-1 text-[10px] font-black text-white bg-[#FF6400] hover:bg-[#e05800] px-2 py-0.5 rounded-lg shadow-xs"
                          >
                            Book
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }))}
              </div>

              {/* View All Vehicles button */}
              <button
                type="button"
                onClick={onViewAll}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-[#1769D1] bg-[#EAF3FF] hover:bg-[#dfeafc] transition-colors cursor-pointer text-center"
              >
                View all {vehicles.length} vehicles
              </button>
            </div>

            {/* Right Column: Real Google Map */}
            <div className="lg:col-span-8 relative h-[380px] sm:h-[460px] rounded-2xl overflow-hidden border border-gray-200 shadow-inner bg-gray-50">
              <Map
                defaultCenter={mapCenter}
                center={mapCenter}
                defaultZoom={mapZoom}
                      internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                disableDefaultUI={false}
                gestureHandling="greedy"
                className="w-full h-full"
              >
                {/* Vehicle Markers with Price Tags */}
                {vehicles.map((veh) => {
                  if (!veh.coordinates) return null;
                  const isActive = veh.id === activeVehicleId;

                  return (
                    <AdvancedMarker
                      key={veh.id}
                      position={veh.coordinates}
                      title={veh.name}
                      onClick={() => handleSelectVehicle(veh)}
                    >
                      <div className={`cursor-pointer transition-all duration-200 transform -translate-y-2 ${
                        isActive ? 'scale-110 z-30' : 'hover:scale-105 z-10'
                      }`}>
                        {/* Custom Price Pill */}
                        <div className={`px-2.5 py-1 rounded-full text-xs font-black shadow-lg flex items-center gap-1.5 border whitespace-nowrap ${
                          isActive
                            ? 'bg-[#FF6400] text-white border-white ring-2 ring-orange-300'
                            : 'bg-white text-gray-900 border-gray-200 hover:border-[#FF6400]'
                        }`}>
                          <span>{veh.category === 'bikes' || veh.category === 'scooters' ? '🏍️' : '🚗'}</span>
                          <span>₹{veh.pricePerDay.toLocaleString('en-IN')}</span>
                        </div>
                        {/* Marker Pin Point */}
                        <div className="w-2 h-2 bg-[#FF6400] rotate-45 mx-auto -mt-1 shadow-sm" />
                      </div>
                    </AdvancedMarker>
                  );
                })}

                {/* Nearby Fuel & Amenities Markers (when toggled) */}
                {showNearbyAmenities && (
                  <>
                    <AdvancedMarker
                      position={{ lat: 18.5620, lng: 73.7840 }}
                      title="IOCL Petrol & EV Charging Station"
                    >
                      <div className="w-7 h-7 rounded-full bg-amber-500 text-white shadow-md flex items-center justify-center border-2 border-white">
                        <Fuel className="w-3.5 h-3.5" />
                      </div>
                    </AdvancedMarker>

                    <AdvancedMarker
                      position={{ lat: 18.5550, lng: 73.7920 }}
                      title="Shell Fuel & Convenience Mart"
                    >
                      <div className="w-7 h-7 rounded-full bg-amber-500 text-white shadow-md flex items-center justify-center border-2 border-white">
                        <Fuel className="w-3.5 h-3.5" />
                      </div>
                    </AdvancedMarker>
                  </>
                )}
              </Map>

              {/* Active Vehicle Floating Preview Card on Map */}
              {activeVehicle && (
                <div 
                  onClick={() => onSelectVehicle && onSelectVehicle(activeVehicle)}
                  className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-80 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-gray-200 shadow-xl flex items-center gap-3 cursor-pointer hover:border-orange-200 transition-all animate-in fade-in slide-in-from-bottom-2 z-20"
                >
                  {activeVehicle.images?.[0] ? (
                    <img
                      src={activeVehicle.images[0]}
                      alt={activeVehicle.name}
                      className="w-14 h-12 object-contain rounded-xl bg-gray-50 p-1 border border-gray-100 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-12 rounded-xl bg-gray-50 border border-gray-100 shrink-0 flex items-center justify-center" aria-hidden="true"><Car className="w-5 h-5 text-slate-400" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-gray-900 truncate">
                      {activeVehicle.name}
                    </h4>
                    <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#FF6400] shrink-0" />
                      <span>{activeVehicle.location}</span>
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-black text-[#FF6400]">
                        ₹{activeVehicle.pricePerDay.toLocaleString('en-IN')}<span className="text-[10px] text-gray-400 font-normal">/day</span>
                      </span>
                      <span className="text-[10px] font-bold text-[#1769D1]">
                        View Details →
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
