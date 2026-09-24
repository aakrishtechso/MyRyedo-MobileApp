import React, { useMemo, useState } from 'react';
import { ArrowLeft, Car, CheckCircle2 } from 'lucide-react';
import { VehicleCard } from '../components/VehicleCard';

const categories = [
  { id: 'all', label: 'All' },
  { id: 'cars', label: 'Cars' },
  { id: 'bikes', label: 'Bikes' },
  { id: 'scooters', label: 'Scooters' },
  { id: 'evs', label: 'EV' },
  { id: 'suvs', label: 'SUV' },
  { id: 'vans', label: 'Vans' },
  { id: 'luxury', label: 'Luxury' }
];

const normalizeCategory = (value) => {
  const raw = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (['car', 'cars', 'sedan', 'hatchback', 'mpv', 'coupe'].includes(raw)) return 'cars';
  if (['bike', 'bikes', 'motorcycle', 'motorcycles'].includes(raw)) return 'bikes';
  if (['scooter', 'scooters'].includes(raw)) return 'scooters';
  if (['ev', 'evs', 'electric', 'electricvehicle', 'electricvehicles'].includes(raw)) return 'evs';
  if (['suv', 'suvs'].includes(raw)) return 'suvs';
  if (['van', 'vans', 'minivan', 'mpvvan'].includes(raw)) return 'vans';
  if (raw === 'luxury') return 'luxury';
  return raw;
};

const getVehicleCategory = (vehicle) => {
  const category = normalizeCategory(vehicle?.category);
  const type = normalizeCategory(vehicle?.type);

  // Prefer a specific vehicle type when the stored category is generic.
  if (type && ['suvs', 'scooters', 'bikes', 'vans', 'luxury', 'evs'].includes(type)) return type;
  if (category) return category;

  const fuel = String(vehicle?.fuel || vehicle?.fuelType || '').trim().toLowerCase();
  if (['electric', 'ev'].includes(fuel)) return 'evs';
  return type;
};

export const AllVehiclesPage = ({
  vehicles = [],
  isLoading = false,
  favorites = [],
  onToggleFavorite,
  onSelectVehicle,
  onBack
}) => {
  const [activeCategory, setActiveCategory] = useState('all');

  const visibleVehicles = useMemo(() => {
    const availableVehicles = vehicles.filter((vehicle) => vehicle?.isAvailable !== false);
    if (activeCategory === 'all') return availableVehicles;
    return availableVehicles.filter((vehicle) => getVehicleCategory(vehicle) === activeCategory);
  }, [vehicles, activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">Explore Vehicles</h1>
          <p className="mt-1 text-sm text-slate-500">Find the right ride for your next journey.</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" role="tablist" aria-label="Vehicle categories">
        {categories.map((category) => {
          const active = activeCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveCategory(category.id)}
              className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black transition-colors ${
                active
                  ? 'border-slate-950 bg-slate-950 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-72 rounded-[22px] border border-slate-200 bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : visibleVehicles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {visibleVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                isFavorite={favorites.includes(vehicle.id)}
                onToggleFavorite={onToggleFavorite}
                onSelect={onSelectVehicle}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[22px] border border-slate-200 bg-white px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <Car className="w-6 h-6" />
            </div>
            <h2 className="mt-4 text-base font-black text-slate-900">No vehicles available in this category yet.</h2>
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white hover:bg-[#FF6400]"
            >
              <CheckCircle2 className="w-4 h-4" />
              All Vehicles
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
