import React from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, ExternalLink, FileText, Fuel, Heart, MapPin, MessageSquare, Share2, ShieldCheck, Star, Users, Settings2 } from 'lucide-react';

const money = (value) => Number(value || 0).toLocaleString('en-IN');
const mapsUrl = (location) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location || '')}`;

const Detail = ({ icon: Icon, label, value }) => value ? (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wide"><Icon className="w-4 h-4 text-[#FF6400]" />{label}</div>
    <div className="mt-2 text-sm font-black text-slate-900">{value}</div>
  </div>
) : null;

export const VehicleDetailsPage = ({ vehicle, currentUser, isFavorite, onToggleFavorite, onStartBooking, onOpenChat, onEditVehicle, onGoToOwnerDashboard, onBack, showToast }) => {
  if (!vehicle) return null;

  const title = vehicle.name || [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Vehicle';
  const location = vehicle.location || vehicle.pickupAddress || vehicle.address || '';
  const daily = vehicle?.dailyPrice ?? vehicle?.pricePerDay;
  const hourly = vehicle?.hourlyPrice;
  const isOwnerOfVehicle = Boolean(currentUser && ((vehicle.ownerId && String(currentUser.id) === String(vehicle.ownerId)) || (vehicle.owner?.id && String(currentUser.id) === String(vehicle.owner.id)) || (vehicle.owner?.email && currentUser.email && vehicle.owner.email.toLowerCase() === currentUser.email.toLowerCase())));
  const isOwner = currentUser?.role === 'owner';
  const hasRating = Number.isFinite(Number(vehicle.rating)) && Number(vehicle.rating) > 0;
  const requirements = Array.isArray(vehicle.pickupRequirements) ? vehicle.pickupRequirements : (vehicle.pickupRequirements ? [vehicle.pickupRequirements] : []);
  const cancellationPolicy = vehicle.cancellationPolicy;

  const handleShare = async () => {
    const share = { title: `${title} on MyRyedo`, text: location ? `${title} • ${location}` : title, url: window.location.href };
    if (navigator.share) { try { await navigator.share(share); } catch {} }
    else { try { await navigator.clipboard?.writeText(window.location.href); showToast?.('Vehicle link copied'); } catch {} }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] py-6 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between gap-3">
          <button onClick={onBack} className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-sm" aria-label="Share vehicle"><Share2 className="w-4 h-4" /></button>
            <button onClick={() => onToggleFavorite(vehicle.id)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-rose-500 shadow-sm" aria-label={isFavorite ? 'Remove favorite' : 'Save favorite'}><Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} /></button>
          </div>
        </div>

        <section className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-7">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {vehicle.verified && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black"><ShieldCheck className="w-3.5 h-3.5" /> Verified</span>}
                {vehicle.category && <span className="px-2.5 py-1 rounded-full bg-orange-50 border border-orange-100 text-[#FF6400] text-[10px] font-black uppercase">{vehicle.category}</span>}
              </div>
              <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">{title}</h1>
              {location && <p className="mt-3 flex items-start gap-2 text-sm text-slate-500"><MapPin className="w-4 h-4 text-[#FF6400] mt-0.5 shrink-0" />{location}</p>}
              {hasRating && <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-slate-800"><Star className="w-4 h-4 fill-amber-400 text-amber-400" />{Number(vehicle.rating).toFixed(1)}{vehicle.reviewsCount != null && <span className="font-medium text-slate-400">({vehicle.reviewsCount})</span>}</div>}
              <div className="mt-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border ${vehicle.isAvailable === false ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${vehicle.isAvailable === false ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  {vehicle.isAvailable === false ? 'Unavailable' : 'Available'}
                </span>
              </div>
            </div>

            <div className="w-full lg:w-[330px] shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">Pricing</div>
              <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
                {hourly != null && <div><span className="text-3xl font-black text-slate-950">₹{money(hourly)}</span><span className="text-xs text-slate-500"> / hour</span></div>}
                {daily != null && <div><span className={hourly != null ? 'text-lg font-black text-slate-900' : 'text-3xl font-black text-slate-950'}>₹{money(daily)}</span><span className="text-xs text-slate-500"> / day</span></div>}
                {hourly == null && daily == null && <span className="text-sm font-bold text-slate-500">Price shown during booking</span>}
              </div>
              {!isOwner && !isOwnerOfVehicle && <button onClick={() => onStartBooking(vehicle)} className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-[#FF6400] hover:bg-[#e85a00] text-white rounded-xl text-sm font-black shadow-md shadow-orange-500/20 transition-all">Book This Vehicle <ArrowRight className="w-4 h-4" /></button>}
            </div>
          </div>

          {isOwner && !isOwnerOfVehicle && (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-black text-blue-950">Owner account</p>
              <p className="mt-1 text-xs text-blue-800">Owner accounts manage vehicles and cannot book rentals. Use a renter/booker account to make a booking.</p>
            </div>
          )}

          {isOwnerOfVehicle && <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-sm font-black text-orange-950">This is your vehicle.</p>
            <p className="mt-1 text-xs text-orange-800">Manage the listing or booking requests from your owner dashboard.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {onEditVehicle && <button onClick={() => onEditVehicle(vehicle)} className="px-3.5 py-2 bg-[#FF6400] text-white rounded-xl text-xs font-black">Edit Listing</button>}
              {onGoToOwnerDashboard && <button onClick={onGoToOwnerDashboard} className="px-3.5 py-2 bg-white border border-orange-200 text-orange-900 rounded-xl text-xs font-black">Owner Dashboard</button>}
            </div>
          </div>}
        </section>

        {vehicle.owner && (vehicle.owner.name || vehicle.owner.avatar) && <section className="bg-white rounded-[24px] border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {vehicle.owner.avatar && <img src={vehicle.owner.avatar} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-200" />}
            <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Vehicle owner</p><p className="mt-1 text-sm font-black text-slate-900">{vehicle.owner.name || 'Vehicle owner'}</p></div>
          </div>
          {onOpenChat && vehicle.owner.id && <button onClick={() => onOpenChat(vehicle.owner.id, vehicle.id)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-700 hover:border-slate-400"><MessageSquare className="w-4 h-4" /> Message Owner</button>}
        </section>}

        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Detail icon={Settings2} label="Transmission" value={vehicle.transmission} />
          <Detail icon={Fuel} label="Fuel" value={vehicle.fuel} />
          <Detail icon={Users} label="Seats" value={vehicle.seats != null ? `${vehicle.seats} seats` : null} />
          <Detail icon={CalendarDays} label="Year" value={vehicle.year} />
        </section>

        <section className="grid lg:grid-cols-[1fr_.85fr] gap-5">
          <div className="bg-white rounded-[24px] border border-slate-200 p-6 sm:p-7 shadow-sm space-y-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-[#FF6400]">The ride</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">About This Ride</h2>
              {vehicle.description ? <p className="mt-3 text-sm text-slate-600 leading-7">{vehicle.description}</p> : <p className="mt-3 text-sm text-slate-500">No additional description was provided for this vehicle.</p>}
            </div>
            {Array.isArray(vehicle.features) && vehicle.features.length > 0 && <div className="pt-5 border-t border-slate-100"><h3 className="text-sm font-black text-slate-900">Available features</h3><div className="mt-3 grid sm:grid-cols-2 gap-2">{vehicle.features.map((feature, i) => <div key={i} className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />{typeof feature === 'string' ? feature : feature?.label || feature?.name || 'Available feature'}</div>)}</div></div>}
          </div>

          <div className="space-y-5">
            <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-wider text-[#FF6400]">Before you book</p><h2 className="mt-1 text-xl font-black text-slate-950">Pickup Requirements</h2></div><FileText className="w-5 h-5 text-[#FF6400]" /></div>
              {requirements.length > 0 ? <div className="mt-4 space-y-2">{requirements.map((item, i) => <div key={i} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"><Check className="w-4 h-4 text-emerald-600 shrink-0" />{typeof item === 'string' ? item : item?.label || item?.name || JSON.stringify(item)}</div>)}</div> : <p className="mt-4 text-sm text-slate-500">No additional pickup requirements were provided for this listing. Any required information will be shown during booking.</p>}
            </div>

            <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
              <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0"><MapPin className="w-5 h-5 text-[#FF6400]" /></div><div><h2 className="text-xl font-black text-slate-950">Pickup Location</h2><p className="mt-1 text-sm text-slate-500">This is where you'll collect the vehicle.</p></div></div>
              {location ? <><div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-800">{location}</div><div className="mt-3 grid sm:grid-cols-2 gap-2"><a href={mapsUrl(location)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-[#FF6400] transition-colors"><ExternalLink className="w-4 h-4" /> View on Google Maps</a><a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-black hover:border-slate-400 transition-colors"><ArrowRight className="w-4 h-4" /> Get Directions</a></div></> : <p className="mt-4 text-sm text-slate-500">The owner has not provided a pickup location yet.</p>}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-[24px] border border-slate-200 p-6 sm:p-7 shadow-sm">
          <div className="flex items-center gap-3"><Clock3 className="w-5 h-5 text-[#FF6400]" /><div><h2 className="text-xl font-black text-slate-950">Cancellation Policy</h2><p className="text-xs text-slate-500 mt-0.5">Review the applicable policy before confirming your booking.</p></div></div>
          <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 leading-6">{typeof cancellationPolicy === 'string' ? cancellationPolicy : cancellationPolicy?.description || 'The applicable cancellation charge is calculated from the booking policy when you select your dates. Review the policy on the booking screen before payment.'}</div>
        </section>

      </div>
    </div>
  );
};

export default VehicleDetailsPage;
