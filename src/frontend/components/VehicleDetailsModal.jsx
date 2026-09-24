import React, { useState } from 'react';
import { 
  X, 
  Car,
  Star, 
  ShieldCheck, 
  MapPin, 
  Fuel, 
  Gauge, 
  Users, 
  Zap, 
  Calendar, 
  CheckCircle2, 
  MessageSquare, 
  Phone, 
  Award, 
  Share2, 
  Heart, 
  ChevronRight,
  Info,
  Clock,
  Sparkles,
  Lock
} from 'lucide-react';
import { backendService } from '../../backend/api.js';
import { VehicleLocationMap } from './VehicleLocationMap.jsx';

export const VehicleDetailsModal = ({
  vehicle,
  isOpen,
  onClose,
  onStartBooking,
  onOpenChat,
  isFavorite,
  onToggleFavorite
}) => {
  const safeVehicle = vehicle || {};
  const vehicleImages = Array.isArray(safeVehicle.images) ? safeVehicle.images.filter(Boolean) : [];
  const hourlyEnabled = !!safeVehicle.hourlyRentalEnabled;
  const dailyEnabled = safeVehicle.dailyRentalEnabled !== false;

  // Default mode based on vehicle availability
  const initialMode = hourlyEnabled && !dailyEnabled ? 'hourly' : 'daily';
  const [rentalType, setRentalType] = useState(initialMode);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Dynamic Dates & Times
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [pickupDate, setPickupDate] = useState(todayStr);
  const [returnDate, setReturnDate] = useState(tomorrowStr);
  const [pickupTime, setPickupTime] = useState('10:00');
  const [returnTime, setReturnTime] = useState('14:00');
  const [customHours, setCustomHours] = useState(vehicle?.minRentalHours ?? 1);
  const [reviews, setReviews] = useState(Array.isArray(vehicle?.reviews) ? vehicle.reviews : []);

  // Fetch real verified reviews for this vehicle
  React.useEffect(() => {
    if (vehicle?.id) {
      backendService.getReviews(vehicle.id).then((data) => {
        if (Array.isArray(data)) {
          setReviews(data);
        }
      });
    }
  }, [vehicle?.id]);

  // Synchronize initial mode when vehicle changes
  React.useEffect(() => {
    if (hourlyEnabled && !dailyEnabled) {
      setRentalType('hourly');
    } else if (!hourlyEnabled && dailyEnabled) {
      setRentalType('daily');
    }
  }, [vehicle?.id, hourlyEnabled, dailyEnabled]);

  if (!isOpen || !vehicle) return null;

  // Hourly duration calculation
  const startDt = new Date(`${pickupDate}T${pickupTime}`);
  const endDt = new Date(`${pickupDate}T${returnTime}`);
  const timeDiffMs = endDt.getTime() - startDt.getTime();
  const calculatedHours = timeDiffMs > 0 ? Math.max(1, Math.round(timeDiffMs / (1000 * 60 * 60))) : (vehicle.minRentalHours || 1);

  const finalHours = customHours || calculatedHours;

  // Daily duration calculation
  const startDay = new Date(pickupDate);
  const endDay = new Date(returnDate);
  const dayDiffMs = endDay.getTime() - startDay.getTime();
  const calculatedDays = dayDiffMs > 0 ? Math.max(1, Math.ceil(dayDiffMs / (1000 * 60 * 60 * 24))) : (vehicle.minRentalDays || 1);

  // Authoritative pricing calculation via backendService
  const pricing = backendService.calculateRentalPricing({
    vehicle,
    rentalType,
    pickupDate,
    pickupTime,
    returnDate: rentalType === 'hourly' ? pickupDate : returnDate,
    returnTime: rentalType === 'hourly' ? returnTime : pickupTime,
    hoursCount: rentalType === 'hourly' ? finalHours : null,
    daysCount: rentalType === 'daily' ? calculatedDays : null
  });

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-gray-100 my-4 max-h-[92vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Top Floating Bar */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#FF6400] bg-orange-50 px-2.5 py-1 rounded-lg">
              {vehicle.type}
            </span>
            {vehicle.verified && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified Listing
              </span>
            )}
            {vehicle.instantBooking && (
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-blue-600" />
                Instant Booking
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-xl text-gray-500 hover:text-[#FF6400] hover:bg-orange-50 transition-colors cursor-pointer"
              title="Share ride"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {copiedLink && (
              <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded">Copied!</span>
            )}

            <button
              onClick={() => onToggleFavorite(vehicle.id)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isFavorite ? 'text-rose-500 bg-rose-50' : 'text-gray-500 hover:text-rose-500 hover:bg-gray-100'
              }`}
              title="Save to favorites"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            <button
              id="close-vehicle-details-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 lg:p-8 space-y-8">
          
          {/* 1. Large Image Gallery & Thumbnails */}
          <div className="space-y-3">
            <div className="relative aspect-16/9 sm:aspect-21/9 w-full rounded-2xl overflow-hidden bg-gray-900 shadow-md">
              {vehicleImages[activeImageIndex] || vehicleImages[0] ? (
                <img
                  src={vehicleImages[activeImageIndex] || vehicleImages[0]}
                  alt={vehicle.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400"><Car className="w-12 h-12" /></div>
              )}
              <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-3 py-1 rounded-lg backdrop-blur-xs font-bold">
                {vehicleImages.length ? `${activeImageIndex + 1} / ${vehicleImages.length}` : 'No photos'}
              </div>
            </div>

            {/* Thumbnails row */}
            {vehicleImages.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {vehicleImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-[#FF6400] ring-2 ring-orange-200'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`${vehicle.name} thumb ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Specs, Owner, Reviews (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{vehicle.location}</span>
                  <span>·</span>
                  <span>Plate: {vehicle.plateNumber}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
                  {vehicle.name}
                </h2>
                <div className="flex items-center gap-3 mt-2 text-xs font-bold">
                  <span className="flex items-center gap-1 text-amber-500">
                    <Star className="w-4 h-4 fill-amber-500" />
                    {Number.isFinite(Number(vehicle.rating)) && Number(vehicle.rating) > 0 ? Number(vehicle.rating).toFixed(1) : 'No rating'}{vehicle.tripsCount ? ` (${vehicle.tripsCount} trips)` : ''}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Reg. {vehicle.year}
                  </span>
                </div>
              </div>

              {/* Quick Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <Fuel className="w-4 h-4 text-[#FF6400] mb-1" />
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Fuel</span>
                  <span className="text-xs font-bold text-gray-800 capitalize">{vehicle.fuel}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <Gauge className="w-4 h-4 text-[#FF6400] mb-1" />
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Transmission</span>
                  <span className="text-xs font-bold text-gray-800 capitalize">{vehicle.transmission}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <Users className="w-4 h-4 text-[#FF6400] mb-1" />
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Capacity</span>
                  <span className="text-xs font-bold text-gray-800">{vehicle.seats} Seats</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <Zap className="w-4 h-4 text-[#FF6400] mb-1" />
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Category</span>
                  <span className="text-xs font-bold text-gray-800 capitalize">{vehicle.category}</span>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100 space-y-2">
                <h3 className="text-sm font-black text-gray-900">About this vehicle</h3>
                <p className="text-xs text-gray-600 leading-relaxed font-normal">
                  {vehicle.description || 'Maintained in showroom condition with clean interiors, sanitized cabin, and periodic authorized services.'}
                </p>
              </div>

              {/* Features Chips */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100 space-y-3">
                <h3 className="text-sm font-black text-gray-900">Vehicle Features</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(vehicle.features || []).map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-bold text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Owner Profile Card with Instant Chat Action */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={vehicle.owner.avatar}
                    alt={vehicle.owner.name}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-orange-500/20"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-base font-black text-gray-900">{vehicle.owner.name}</h4>
                      {vehicle.owner.verified && (
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {vehicle.owner.joinedDate ? `Joined ${vehicle.owner.joinedDate}` : 'Owner profile'}{vehicle.owner.trips ? ` · ${vehicle.owner.trips} trips hosted` : ''}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] font-semibold text-gray-600 mt-1">
                      {Number.isFinite(Number(vehicle.owner.rating)) && Number(vehicle.owner.rating) > 0 && <span>Rating: <strong className="text-gray-900">★ {Number(vehicle.owner.rating).toFixed(1)}</strong></span>}
                      <span>•</span>
                      {vehicle.owner.responseTime && <span>Replies {vehicle.owner.responseTime}</span>}
                    </div>
                  </div>
                </div>

                <button
                  id="chat-owner-btn"
                  onClick={() => onOpenChat(vehicle.owner.id, vehicle.id)}
                  className="bg-orange-50 hover:bg-orange-100 text-[#FF6400] text-xs font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat with Host</span>
                </button>
              </div>

              {/* Real Google Map Pickup Location & Nearby Amenities */}
              <VehicleLocationMap vehicle={vehicle} />

              {/* Important Pickup Requirements Notice */}
              <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-black text-[#1769D1]">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>🔒 Important Pickup Requirements</span>
                </div>
                <p className="text-xs text-blue-900">
                  Please carry your original <strong>Driving Licence</strong> and <strong>Aadhaar Card / Government ID</strong>. The host will inspect these at handover before transferring the keys.
                </p>
              </div>

              {/* Customer Reviews Section */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-gray-900">
                    Verified Reviews ({reviews.length})
                  </h3>
                  {reviews.length > 0 && (
                    <div className="flex items-center gap-1 text-xs font-black text-amber-500">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      <span>{Number.isFinite(Number(vehicle.rating)) && Number(vehicle.rating) > 0 ? `${Number(vehicle.rating).toFixed(1)} out of 5.0` : 'No rating yet'}</span>
                    </div>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <p className="text-xs text-gray-500 py-3 italic">
                    No verified reviews yet for this vehicle. Reviews appear here automatically once renters complete verified trips.
                  </p>
                ) : (
                  <div className="space-y-4 divide-y divide-gray-100">
                    {reviews.map((rev) => (
                      <div key={rev.id || Math.random()} className="pt-3 first:pt-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-orange-100 text-[#FF6400] font-bold text-xs flex items-center justify-center">
                              {rev.userName ? rev.userName[0].toUpperCase() : 'R'}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-gray-900 block">{rev.userName || 'Verified Renter'}</span>
                              <span className="text-[10px] text-gray-400">{rev.date || 'Recent trip'}</span>
                            </div>
                          </div>
                          <div className="flex items-center text-amber-500 text-xs font-bold">
                            {'★'.repeat(Math.round(rev.rating || 5))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed pl-9">
                          "{rev.comment}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Right Sticky Booking Box (5 cols) */}
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xl shadow-gray-900/5 space-y-5">
                
                {/* Rental Mode Selector (Hourly vs Daily) */}
                {hourlyEnabled && dailyEnabled ? (
                  <div className="bg-gray-100 p-1 rounded-2xl grid grid-cols-2 gap-1 text-xs font-black">
                    <button
                      type="button"
                      onClick={() => setRentalType('hourly')}
                      className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        rentalType === 'hourly'
                          ? 'bg-white text-[#FF6400] shadow-sm'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Hourly Rental</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRentalType('daily')}
                      className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        rentalType === 'daily'
                          ? 'bg-white text-[#1769D1] shadow-sm'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Daily Rental</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[#1769D1] bg-[#EBF3FE] px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      {rentalType === 'hourly' ? <Clock className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                      {rentalType === 'hourly' ? 'Hourly Rental Only' : 'Daily Rental Only'}
                    </span>
                  </div>
                )}

                {/* Price Header */}
                <div className="flex items-baseline justify-between pb-4 border-b border-gray-100">
                  <div>
                    <span className="text-2xl sm:text-3xl font-black text-gray-900">
                      ₹{rentalType === 'hourly' 
                        ? (vehicle.hourlyPrice || 0).toLocaleString('en-IN') 
                        : (vehicle.dailyPrice || vehicle.pricePerDay || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      {rentalType === 'hourly' ? ' / hour' : ' / day'}
                    </span>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 text-xs font-black px-2.5 py-1 rounded-xl">
                    ✓ Available Now
                  </span>
                </div>

                {/* Owner limits pill */}
                <div className="text-[11px] font-bold text-gray-500 flex items-center justify-between bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>
                      {rentalType === 'hourly'
                        ? `Owner limits: Min ${vehicle.minRentalHours || 1} hrs · Max ${vehicle.maxRentalHours || 24} hrs`
                        : `Owner limits: Min ${vehicle.minRentalDays || 1} day${(vehicle.minRentalDays || 1) === 1 ? '' : 's'} · Max ${
                            vehicle.maxRentalDays ? `${vehicle.maxRentalDays} days` : 'Unlimited'
                          }`}
                    </span>
                  </div>
                  {rentalType === 'daily' && !vehicle.maxRentalDays && (
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      ✨ No max limit
                    </span>
                  )}
                </div>

                {/* Duration Discounts (For Daily) */}
                {rentalType === 'daily' && (vehicle.weeklyDiscountPercent > 0 || vehicle.monthlyDiscountPercent > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {vehicle.weeklyDiscountPercent > 0 && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg">
                        🏷️ {vehicle.weeklyDiscountPercent}% off (7+ days)
                      </span>
                    )}
                    {vehicle.monthlyDiscountPercent > 0 && (
                      <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded-lg">
                        🏷️ {vehicle.monthlyDiscountPercent}% off (30+ days)
                      </span>
                    )}
                  </div>
                )}

                {/* Date & Time Selection */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                  {rentalType === 'hourly' ? (
                    // Hourly Mode Controls
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                          Rental Date
                        </label>
                        <input
                          type="date"
                          value={pickupDate}
                          min={todayStr}
                          onChange={(e) => setPickupDate(e.target.value)}
                          className="w-full bg-white px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-900"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                            Pick-up Time
                          </label>
                          <input
                            type="time"
                            value={pickupTime}
                            onChange={(e) => setPickupTime(e.target.value)}
                            className="w-full bg-white px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                            Return Time
                          </label>
                          <input
                            type="time"
                            value={returnTime}
                            onChange={(e) => setReturnTime(e.target.value)}
                            className="w-full bg-white px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-900"
                          />
                        </div>
                      </div>

                      {/* Quick Hours Selector */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                          Or select hours directly:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[2, 3, 4, 6, 8, 12].map((hrs) => {
                            const minH = vehicle.minRentalHours || 1;
                            const maxH = vehicle.maxRentalHours || 24;
                            if (hrs < minH || hrs > maxH) return null;
                            return (
                              <button
                                key={hrs}
                                type="button"
                                onClick={() => {
                                  setCustomHours(hrs);
                                  // Auto set return time
                                  const [h, m] = pickupTime.split(':').map(Number);
                                  const newH = (h + hrs) % 24;
                                  setReturnTime(`${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                                }}
                                className={`px-2.5 py-1 text-xs font-black rounded-lg border transition-all cursor-pointer ${
                                  pricing.duration === hrs
                                    ? 'bg-[#FF6400] text-white border-[#FF6400]'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                                }`}
                              >
                                {hrs} hrs
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs font-black text-[#FF6400] pt-2 border-t border-gray-200/60">
                        <span>Calculated Duration:</span>
                        <span>{pricing.duration || 0} hours</span>
                      </div>
                    </div>
                  ) : (
                    // Daily Mode Controls
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Pick-up Date</label>
                          <input
                            type="date"
                            value={pickupDate}
                            min={todayStr}
                            onChange={(e) => setPickupDate(e.target.value)}
                            className="w-full bg-white px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Return Date</label>
                          <input
                            type="date"
                            value={returnDate}
                            min={pickupDate || todayStr}
                            onChange={(e) => setReturnDate(e.target.value)}
                            className="w-full bg-white px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-900"
                          />
                        </div>
                      </div>

                      {/* Quick Days Selector */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">
                            Quick duration:
                          </label>
                          {!vehicle.maxRentalDays && (
                            <span className="text-[10px] text-emerald-600 font-semibold">
                              Any duration allowed
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[1, 2, 3, 5, 7, 10, 15, 20, 30, 45, 60, 90].map((dys) => {
                            const minD = vehicle.minRentalDays ? Number(vehicle.minRentalDays) : 1;
                            const maxD = (vehicle.maxRentalDays !== null && vehicle.maxRentalDays !== undefined && vehicle.maxRentalDays !== '' && Number(vehicle.maxRentalDays) > 0)
                              ? Number(vehicle.maxRentalDays)
                              : null;
                            if (dys < minD) return null;
                            if (maxD !== null && dys > maxD) return null;
                            return (
                              <button
                                key={dys}
                                type="button"
                                onClick={() => {
                                  const base = new Date(pickupDate);
                                  base.setDate(base.getDate() + dys);
                                  setReturnDate(base.toISOString().split('T')[0]);
                                }}
                                className={`px-2 py-1 text-xs font-black rounded-lg border transition-all cursor-pointer ${
                                  pricing.duration === dys
                                    ? 'bg-[#1769D1] text-white border-[#1769D1]'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                                }`}
                              >
                                {dys}d
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Days Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <label className="text-[10px] font-bold text-gray-500 shrink-0">
                          Or enter exact days:
                        </label>
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="number"
                            min={vehicle.minRentalDays ? Number(vehicle.minRentalDays) : 1}
                            max={vehicle.maxRentalDays ? Number(vehicle.maxRentalDays) : undefined}
                            value={pricing.duration || 1}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              const base = new Date(pickupDate);
                              base.setDate(base.getDate() + val);
                              setReturnDate(base.toISOString().split('T')[0]);
                            }}
                            className="w-20 bg-white px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-black text-gray-900 text-center"
                          />
                          <span className="text-xs font-bold text-gray-500">days</span>
                          {!vehicle.maxRentalDays && (
                            <span className="text-[10px] text-gray-400 ml-auto">
                              (No maximum cap)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs font-black text-[#1769D1] pt-2 border-t border-gray-200/60">
                        <span>Calculated Duration:</span>
                        <span>{pricing.duration || 0} {pricing.duration === 1 ? 'day' : 'days'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Validation Error Notice if any */}
                {!pricing.valid && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-2xl text-xs font-bold flex items-start gap-2 border border-red-100">
                    <span className="text-base leading-none">⚠️</span>
                    <span>{pricing.error}</span>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>
                      Rental ({pricing.duration || 0} {pricing.durationUnit || 'units'} × ₹{(pricing.ratePerUnit || 0).toLocaleString('en-IN')})
                    </span>
                    <span className="font-bold text-gray-900">₹{(pricing.rawBase || 0).toLocaleString('en-IN')}</span>
                  </div>

                  {pricing.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Duration Discount ({pricing.discountPercent}%)</span>
                      <span>- ₹{pricing.discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-600">
                    <span>Platform fee (8%)</span>
                    <span className="font-bold text-gray-900">₹{(pricing.platformFee || 0).toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between text-gray-600">
                    <span>Taxes & GST (12%)</span>
                    <span className="font-bold text-gray-900">₹{(pricing.taxes || 0).toLocaleString('en-IN')}</span>
                  </div>

                  {(pricing.deposit || 0) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Refundable Security Deposit</span>
                      <span className="font-bold text-gray-900">₹{(pricing.deposit || 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-100 flex justify-between items-baseline">
                    <span className="text-sm font-black text-gray-900">Total Payable</span>
                    <span className="text-xl font-black text-[#FF6400]">
                      ₹{(pricing.totalPayable || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Book Action Button */}
                <button
                  id="book-this-ride-btn"
                  type="button"
                  disabled={!pricing.valid}
                  onClick={() => {
                    if (!pricing.valid) return;
                    onStartBooking(vehicle, {
                      rentalType,
                      pickupDate,
                      pickupTime,
                      returnDate: rentalType === 'hourly' ? pickupDate : returnDate,
                      returnTime: rentalType === 'hourly' ? returnTime : pickupTime,
                      duration: pricing.duration,
                      durationUnit: pricing.durationUnit,
                      pricing
                    });
                  }}
                  className={`w-full font-black text-sm py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    pricing.valid
                      ? 'bg-[#FF6400] hover:bg-[#e05800] active:scale-98 text-white shadow-orange-500/25'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <span>Book This Ride</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <p className="text-[11px] text-center text-gray-400">
                  🔒 Safe reservation · Pay Online or Pay at Pickup
                </p>

              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
