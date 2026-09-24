import React, { useState, useEffect } from 'react';
import { Map, AdvancedMarker, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Fuel, Zap, Coffee, ParkingCircle, Train, ExternalLink, ShieldCheck } from 'lucide-react';

export const VehicleLocationMap = ({
  vehicle
}) => {
  const coords = vehicle?.coordinates || { lat: 18.5590, lng: 73.7868 };
  const placesLib = useMapsLibrary('places');
  const map = useMap();

  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'fuel' | 'transit' | 'parking'
  const [activePlace, setActivePlace] = useState(null);

  // Pan to vehicle location when selected
  useEffect(() => {
    if (map && coords) {
      map.panTo(coords);
    }
  }, [map, coords]);

  // Query nearby places using Google Places API (New) if placesLib is available
  useEffect(() => {
    if (!placesLib?.Place?.searchNearby) {
      // Fallback curated nearby amenities matching the vehicle's actual neighborhood
      const defaultNearby = [
        {
          id: 'nb-1',
          name: 'IOCL Fuel & FastTag Station',
          type: 'fuel',
          icon: 'fuel',
          distance: '0.4 km',
          address: 'Main Arterial Road, Baner',
          rating: 4.5,
          location: { lat: coords.lat + 0.002, lng: coords.lng + 0.003 }
        },
        {
          id: 'nb-2',
          name: 'Pickup location',
          type: 'fuel',
          icon: 'zap',
          distance: '0.6 km',
          address: 'Commercial Hub Bay 2',
          rating: 4.8,
          location: { lat: coords.lat - 0.003, lng: coords.lng + 0.002 }
        },
        {
          id: 'nb-3',
          name: 'Metro Transit Station & Bus Terminal',
          type: 'transit',
          icon: 'train',
          distance: '0.8 km',
          address: 'Line 3 Station Entry Gate B',
          rating: 4.6,
          location: { lat: coords.lat + 0.004, lng: coords.lng - 0.002 }
        },
        {
          id: 'nb-4',
          name: 'Secure Multi-Level Car Parking',
          type: 'parking',
          icon: 'parking',
          distance: '0.3 km',
          address: 'Commercial Complex Basement',
          rating: 4.4,
          location: { lat: coords.lat - 0.002, lng: coords.lng - 0.003 }
        },
        {
          id: 'nb-5',
          name: 'Blue Tokai Cafe & 24/7 Store',
          type: 'cafe',
          icon: 'coffee',
          distance: '0.5 km',
          address: 'High Street Arcade',
          rating: 4.7,
          location: { lat: coords.lat + 0.003, lng: coords.lng + 0.004 }
        }
      ];
      setNearbyPlaces(defaultNearby);
      return;
    }

    // Call modern Places API searchNearby
    try {
      const centerLatLng = new google.maps.LatLng(coords.lat, coords.lng);
      placesLib.Place.searchNearby({
        locationRestriction: {
          center: centerLatLng,
          radius: 1200
        },
        fields: ['displayName', 'formattedAddress', 'location', 'rating', 'types'],
        maxResultCount: 6
      })
        .then((res) => {
          if (res.places && res.places.length > 0) {
            const mapped = res.places.map((p, idx) => {
              const types = p.types || [];
              let category = 'other';
              if (types.some(t => t.includes('gas') || t.includes('charging'))) category = 'fuel';
              else if (types.some(t => t.includes('transit') || t.includes('subway') || t.includes('train'))) category = 'transit';
              else if (types.some(t => t.includes('parking'))) category = 'parking';
              else if (types.some(t => t.includes('cafe') || t.includes('restaurant') || t.includes('store'))) category = 'cafe';

              return {
                id: `place-${idx}`,
                name: p.displayName || 'Nearby Point of Interest',
                type: category,
                address: p.formattedAddress || 'Nearby',
                rating: p.rating || 4.5,
                distance: 'Nearby',
                location: {
                  lat: p.location?.lat() || coords.lat,
                  lng: p.location?.lng() || coords.lng
                }
              };
            });
            setNearbyPlaces(mapped);
          }
        })
        .catch((err) => {
          console.warn('searchNearby fetch error:', err);
        });
    } catch (e) {
      console.warn('Places search failed', e);
    }
  }, [placesLib, coords.lat, coords.lng]);

  const filteredPlaces = selectedFilter === 'all'
    ? nearbyPlaces
    : nearbyPlaces.filter(p => p.type === selectedFilter);

  const getIcon = (item) => {
    if (item.type === 'fuel') return <Fuel className="w-3.5 h-3.5 text-amber-500" />;
    if (item.type === 'transit') return <Train className="w-3.5 h-3.5 text-blue-500" />;
    if (item.type === 'parking') return <ParkingCircle className="w-3.5 h-3.5 text-indigo-500" />;
    return <Coffee className="w-3.5 h-3.5 text-emerald-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#FF6400]" />
            <span>Pickup Location & Nearby Amenities</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {vehicle.pickupAddress || vehicle.location} · {vehicle.distanceKm || '2.1'} km from city center
          </p>
        </div>

        <a
          href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1769D1] hover:underline"
        >
          <span>Open in Google Maps</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Real Interactive Google Map */}
      <div className="relative h-64 sm:h-80 w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
        <Map
          defaultCenter={coords}
          center={coords}
          defaultZoom={15}
          zoom={15}
          internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
          disableDefaultUI={false}
          gestureHandling="greedy"
          className="w-full h-full"
        >
          {/* Main Vehicle Marker */}
          <AdvancedMarker
            position={coords}
            title={vehicle.name}
          >
            <div className="flex flex-col items-center cursor-pointer -translate-y-2">
              <div className="bg-[#111827] text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg border border-white flex items-center gap-1 whitespace-nowrap mb-1">
                <span>🚗</span>
                <span>{vehicle.name}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#FF6400] text-white shadow-xl flex items-center justify-center ring-4 ring-orange-200">
                <MapPin className="w-5 h-5 fill-white text-[#FF6400]" />
              </div>
            </div>
          </AdvancedMarker>

          {/* Nearby Amenities Markers */}
          {filteredPlaces.map((pl) => (
            <AdvancedMarker
              key={pl.id}
              position={pl.location}
              title={pl.name}
              onClick={() => setActivePlace(pl)}
            >
              <div className="w-7 h-7 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                {getIcon(pl)}
              </div>
            </AdvancedMarker>
          ))}
        </Map>

        {/* Selected Place Popup Banner */}
        {activePlace && (
          <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-gray-200 shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-black text-gray-900">
                {getIcon(activePlace)}
                <span className="truncate">{activePlace.name}</span>
              </div>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">{activePlace.address}</p>
            </div>
            <button
              onClick={() => setActivePlace(null)}
              className="text-[11px] font-bold text-gray-400 hover:text-gray-700 px-2 py-1 rounded-md"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs for Nearby Amenities */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
          <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 mr-1">Nearby:</span>
          {[
            { id: 'all', label: 'All Places' },
            { id: 'fuel', label: '⛽ Fuel / EV Charging' },
            { id: 'transit', label: '🚇 Metro & Transit' },
            { id: 'parking', label: '🅿️ Parking' },
            { id: 'cafe', label: '☕ Food & Cafes' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap text-xs ${
                selectedFilter === tab.id
                  ? 'bg-[#111827] text-white font-black shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 font-semibold'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List of nearby amenities cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredPlaces.slice(0, 4).map((pl) => (
            <div
              key={pl.id}
              onClick={() => {
                setActivePlace(pl);
                if (map) map.panTo(pl.location);
              }}
              className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-orange-50/30 hover:border-orange-200 transition-all cursor-pointer flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                  {getIcon(pl)}
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-gray-900 truncate">{pl.name}</h5>
                  <p className="text-[10px] text-gray-500 truncate">{pl.address}</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-gray-600 shrink-0">{pl.distance}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pickup Safety & Privacy Guarantee */}
      <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900 font-medium">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          <strong>Exact handover address & host phone</strong> are confirmed immediately upon booking reservation.
        </span>
      </div>
    </div>
  );
};
