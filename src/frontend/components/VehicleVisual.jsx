import React, { useMemo, useState } from 'react';

const normalize = (value) => String(value || '').toLowerCase();

// Curated, realistic automotive imagery used only when a listing has no uploaded image.
// These are intentionally generic: the UI never presents a fallback photo as the exact vehicle model.
const FALLBACK_IMAGES = {
  electric: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1400&q=88',
  bike: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1400&q=88',
  van: 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=1400&q=88',
  suv: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1400&q=88',
  car: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=88',
};

const getImage = (vehicle) => {
  const uploaded = Array.isArray(vehicle?.images) ? vehicle.images.find(Boolean) : vehicle?.image;
  if (uploaded) return uploaded;

  const category = normalize(vehicle?.category || vehicle?.type);
  const fuel = normalize(vehicle?.fuel);
  if (fuel.includes('electric') || category.includes('ev')) return FALLBACK_IMAGES.electric;
  if (category.includes('bike') || category.includes('motorcycle') || category.includes('scooter')) return FALLBACK_IMAGES.bike;
  if (category.includes('van') || category.includes('mpv') || category.includes('traveller') || category.includes('bus')) return FALLBACK_IMAGES.van;
  if (category.includes('suv') || category.includes('crossover')) return FALLBACK_IMAGES.suv;
  return FALLBACK_IMAGES.car;
};

export const VehicleVisual = ({ vehicle, className = '', aspectRatio = 'aspect-[16/10]' }) => {
  const primary = useMemo(() => getImage(vehicle), [vehicle]);
  const [src, setSrc] = useState(primary);
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    setSrc(primary);
    setLoaded(false);
  }, [primary]);

  return (
    <div className={`relative overflow-hidden ${aspectRatio} bg-slate-100 ${className}`}>
      <img
        src={src}
        alt={vehicle?.name ? `${vehicle.name} vehicle` : 'Vehicle available on MyRyedo'}
        className={`absolute inset-0 w-full h-full object-cover transition duration-700 ${loaded ? 'scale-100 opacity-100' : 'scale-[1.02] opacity-0'}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (src !== FALLBACK_IMAGES.car) {
            setSrc(FALLBACK_IMAGES.car);
          }
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-transparent pointer-events-none" />
      {!loaded && <div className="absolute inset-0 animate-pulse bg-slate-100" aria-hidden="true" />}
      <div className="absolute left-4 bottom-4 right-4 flex items-end justify-between gap-3 pointer-events-none">
        <span className="inline-flex items-center rounded-full bg-white/92 backdrop-blur px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-800 shadow-sm">
          Vehicle
        </span>
        {vehicle?.verified && (
          <span className="inline-flex items-center rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[10px] font-black text-emerald-700 shadow-sm">
            Verified listing
          </span>
        )}
      </div>
    </div>
  );
};
