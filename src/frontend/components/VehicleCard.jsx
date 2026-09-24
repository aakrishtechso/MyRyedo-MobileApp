import React from 'react';
import { Heart, MapPin, Star, ArrowRight } from 'lucide-react';

const money = (value) => Number(value || 0).toLocaleString('en-IN');

export const VehicleCard = ({ vehicle, isFavorite, onToggleFavorite, onSelect, onRequestWaitlist, isHighlighted = false, isTimeUnavailable = false }) => {
  const title = vehicle?.name || [vehicle?.brand, vehicle?.model].filter(Boolean).join(' ') || 'Vehicle';
  const specs = [vehicle?.category, vehicle?.transmission, vehicle?.seats ? `${vehicle.seats} seats` : null].filter(Boolean);
  const daily = vehicle?.dailyRentalEnabled !== false && (vehicle?.dailyPrice ?? vehicle?.pricePerDay) != null ? Number(vehicle.dailyPrice ?? vehicle.pricePerDay) : 0;
  const hourly = vehicle?.hourlyRentalEnabled && vehicle?.hourlyPrice != null ? Number(vehicle.hourlyPrice) : 0;
  const rating = Number(vehicle?.rating);
  const hasRating = Number.isFinite(rating) && rating > 0;
  const available = vehicle?.isAvailable !== false && !isTimeUnavailable;
  const statusLabel = vehicle?.isAvailable === false ? 'Paused by owner' : isTimeUnavailable ? 'Booked for selected time' : 'Available';

  return (
    <article
      id={`vehicle-card-${vehicle.id}`}
      onClick={() => onSelect(vehicle)}
      className={`group overflow-hidden bg-white rounded-[22px] border transition-all duration-300 cursor-pointer min-h-[280px] ${
        isHighlighted ? 'border-[#FF6400] ring-2 ring-orange-100 shadow-lg' : 'border-slate-200/80 shadow-sm hover:-translate-y-1 hover:shadow-xl hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-end px-4 pt-4 sm:px-5 sm:pt-5">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(vehicle.id); }}
          className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-rose-500 transition-colors"
          aria-label={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>
      </div>

      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">{title}</h3>
            <p className="mt-1 text-xs text-slate-500 font-medium truncate">{specs.join(' · ') || 'Vehicle details available'}</p>
          </div>
          {vehicle?.verified && <span className="shrink-0 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">Verified</span>}
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 min-w-0">
          {hasRating && <span className="inline-flex items-center gap-1 font-bold text-slate-800 shrink-0"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{rating.toFixed(1)}{vehicle?.reviewsCount != null && <span className="font-medium text-slate-400">({vehicle.reviewsCount})</span>}</span>}
          {vehicle?.location && <span className="inline-flex items-center gap-1 min-w-0"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate">{vehicle.location}</span></span>}
        </div>

        <div className="mt-3">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${available ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-rose-700 bg-rose-50 border-rose-100'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${available ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            {statusLabel}
          </span>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-end justify-between gap-3">
          <div>
            {hourly > 0 && <div className="text-sm font-black text-slate-900">₹{money(hourly)} <span className="text-[11px] font-bold text-slate-500">/ hour</span></div>}
            {daily > 0 && <div className={`${hourly > 0 ? 'mt-0.5 text-base' : 'text-lg'} font-black text-slate-950`}>₹{money(daily)} <span className="text-[11px] font-bold text-slate-500">/ day</span></div>}
            {!hourly && !daily && <div className="text-sm font-bold text-slate-500">Price shown during booking</div>}
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); if (isTimeUnavailable && onRequestWaitlist) onRequestWaitlist(vehicle); else onSelect(vehicle); }} className="shrink-0 inline-flex items-center gap-1.5 bg-slate-900 text-white hover:bg-[#FF6400] px-4 py-2.5 rounded-xl text-xs font-black transition-colors">
            {isTimeUnavailable ? 'Join Waiting List' : 'View Vehicle'} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};
