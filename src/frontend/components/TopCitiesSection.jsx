import React from 'react';
import { MapPin, ShieldCheck, KeyRound, CheckCircle2, Sparkles } from 'lucide-react';

const normalizeArea = (area) => ({
  name: area?.name || area?.city || '',
  subtitle: area?.subtitle || [area?.city, area?.state].filter(Boolean).join(' · '),
  image: area?.image || area?.imageUrl || '',
  badge: area?.badge || ''
});


export const TopCitiesSection = ({ cities = [], onSelectCity, onOpenWaitlist }) => {
  const normalizedCities = cities.map(normalizeArea).filter(city => city.name && city.image);
  if (normalizedCities.length === 0) return null;
  const selectCity = (city) => onSelectCity?.(city);

  return (
    <section className="w-full py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950">Top cities & service hubs</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Explore vehicles in active operational clusters.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button type="button" onClick={() => onOpenWaitlist?.()} className="text-xs sm:text-sm font-black text-[#FF6400] hover:underline inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Request my area</button>
            <button type="button" onClick={() => selectCity('')} className="text-xs sm:text-sm font-black text-[#1769D1] hover:underline">View all</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {normalizedCities.map((city) => (
            <button key={city.name} type="button" onClick={() => selectCity(city.name)} className="group relative h-40 sm:h-44 rounded-2xl overflow-hidden text-left shadow-sm border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6400]">
              <img src={city.image} alt={`${city.name} driving and vehicle rental`} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              {city.badge && <span className="absolute top-3 left-3 bg-[#FF6400] text-white text-[10px] font-black px-2.5 py-1 rounded-full">{city.badge}</span>}
              <div className="absolute left-4 right-4 bottom-4 text-white">
                <h3 className="text-base font-black">{city.name}</h3>
                <p className="mt-0.5 text-[11px] text-white/85 font-medium">{city.subtitle}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-4 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Highlight icon={ShieldCheck} title="100% ID Verified" text="Verified driving licenses" />
          <Highlight icon={KeyRound} title="Inspected Vehicles" text="Digital pre-trip handover logs" />
          <Highlight icon={CheckCircle2} title="Trip Protection" text="24/7 Roadside assistance" />
          <Highlight icon={Sparkles} title="Direct Host Rates" text="No hidden commissions" />
        </div>
      </div>
    </section>
  );
};

const Highlight = ({ icon: Icon, title, text }) => (
  <div className="flex items-center gap-3">
    <span className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-[#FF7A00]" /></span>
    <div><div className="text-sm font-black text-slate-950">{title}</div><div className="text-[11px] text-slate-500 font-medium mt-0.5">{text}</div></div>
  </div>
);
