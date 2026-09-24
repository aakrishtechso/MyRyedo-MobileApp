import React, { useState } from 'react';
import { 
  X, 
  Car, 
  Trash2, 
  Save, 
  ShieldCheck, 
  MapPin, 
  CreditCard,
  Banknote,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { VehicleVisual } from './VehicleVisual.jsx';
import { backendService } from '../../backend/api.js';

export const EditVehicleModal = ({
  vehicle,
  isOpen,
  onClose,
  currentUser,
  onUpdateVehicle,
  onDeleteVehicle,
  isPageMode = false
}) => {
  const [pricePerDay, setPricePerDay] = useState(vehicle?.dailyPrice ?? vehicle?.pricePerDay ?? '');
  const [minRentalDays, setMinRentalDays] = useState(vehicle?.minRentalDays ?? 1);
  const [hasMaxDaysLimit, setHasMaxDaysLimit] = useState(
    vehicle?.maxRentalDays !== null && 
    vehicle?.maxRentalDays !== undefined && 
    vehicle?.maxRentalDays !== '' && 
    Number(vehicle?.maxRentalDays) > 0
  );
  const [maxRentalDays, setMaxRentalDays] = useState(vehicle?.maxRentalDays ?? '');
  const [weeklyDiscountPercent, setWeeklyDiscountPercent] = useState(vehicle?.weeklyDiscountPercent ?? 0);
  const [monthlyDiscountPercent, setMonthlyDiscountPercent] = useState(vehicle?.monthlyDiscountPercent ?? 0);
  const [securityDeposit, setSecurityDeposit] = useState(vehicle?.securityDeposit ?? 0);

  // Hourly Rental (Separate)
  const [hourlyRentalEnabled, setHourlyRentalEnabled] = useState(Boolean(vehicle?.hourlyRentalEnabled));
  const [hourlyPrice, setHourlyPrice] = useState(vehicle?.hourlyPrice ?? '');
  const [minRentalHours, setMinRentalHours] = useState(vehicle?.minRentalHours ?? 1);
  const [maxRentalHours, setMaxRentalHours] = useState(vehicle?.maxRentalHours ?? '');

  const [isAvailable, setIsAvailable] = useState(vehicle?.isAvailable !== false);
  const [instantBooking, setInstantBooking] = useState(Boolean(vehicle?.instantBooking));
  const [location, setLocation] = useState(vehicle?.location || vehicle?.pickupAddress || '');
  const [pickupInstructions, setPickupInstructions] = useState(vehicle?.pickupInstructions || '');
  const [description, setDescription] = useState(vehicle?.description || '');
  const [acceptOnline, setAcceptOnline] = useState(vehicle?.paymentOptions?.acceptOnline ?? true);
  const [acceptPayAtPickup, setAcceptPayAtPickup] = useState(vehicle?.paymentOptions?.acceptPayAtPickup ?? true);
  const [errorText, setErrorText] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  if ((!isOpen && !isPageMode) || !vehicle) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setErrorText(null);

    const authCheck = backendService.authorizeAction(currentUser, 'modify_vehicle', vehicle);
    if (!authCheck.authorized) {
      setErrorText(authCheck.error);
      return;
    }

    const numericDaily = pricePerDay === '' ? null : Number(pricePerDay);
    const numericHourly = hourlyPrice === '' ? null : Number(hourlyPrice);
    if ((numericDaily != null && (!Number.isFinite(numericDaily) || numericDaily < 0)) || (numericHourly != null && (!Number.isFinite(numericHourly) || numericHourly < 0))) {
      setErrorText('Please enter valid rental prices.');
      return;
    }
    if (hourlyRentalEnabled && !(numericHourly > 0)) {
      setErrorText('Enter a valid hourly price when hourly rental is enabled.');
      return;
    }
    if (vehicle.dailyRentalEnabled !== false && !(numericDaily > 0)) {
      setErrorText('Enter a valid daily price.');
      return;
    }
    if (!location.trim()) {
      setErrorText('Pickup location is required.');
      return;
    }
    if (!acceptOnline && !acceptPayAtPickup) {
      setErrorText('Please select at least one accepted payment option.');
      return;
    }

    const finalMaxDays = (hasMaxDaysLimit && Number(maxRentalDays) > 0) ? Number(maxRentalDays) : null;
    const updated = {
      ...vehicle,
      pricePerDay: numericDaily,
      dailyPrice: numericDaily,
      minRentalDays: Math.max(1, Number(minRentalDays) || 1),
      maxRentalDays: finalMaxDays,
      weeklyDiscountPercent: Number(weeklyDiscountPercent) || 0,
      monthlyDiscountPercent: Number(monthlyDiscountPercent) || 0,
      securityDeposit: Number(securityDeposit) || 0,
      hourlyRentalEnabled,
      hourlyPrice: numericHourly,
      minRentalHours: Math.max(1, Number(minRentalHours) || 1),
      maxRentalHours: Number(maxRentalHours) > 0 ? Number(maxRentalHours) : null,
      isAvailable,
      instantBooking,
      location: location.trim(),
      pickupInstructions: pickupInstructions.trim(),
      description: description.trim(),
      paymentOptions: { acceptOnline, acceptPayAtPickup }
    };

    setIsSaving(true);
    try {
      const res = await backendService.updateVehicle(vehicle.id, updated);
      if (res?.success && res.vehicle) {
        onUpdateVehicle?.(res.vehicle);
        onClose?.();
      } else {
        setErrorText(res?.error || 'Could not save vehicle changes. Please try again.');
      }
    } catch {
      setErrorText('Could not reach MyRyedo. Your changes were not saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isSaving) return;
    const authCheck = backendService.authorizeAction(currentUser, 'delete_vehicle', vehicle);
    if (!authCheck.authorized) {
      setErrorText(authCheck.error);
      return;
    }
    setIsSaving(true);
    try {
      const res = await backendService.deleteVehicle(vehicle.id);
      if (res?.success) {
        onDeleteVehicle?.(vehicle.id);
        onClose?.();
      } else {
        setErrorText(res?.error || 'Could not delete this vehicle.');
      }
    } catch {
      setErrorText('Could not reach MyRyedo. The vehicle was not deleted.');
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div 
      className={isPageMode ? "bg-white w-full rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col relative" : "bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col relative max-h-[90vh]"}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-6 py-4 bg-[#F8FAFC] border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="w-5 h-5 text-[#FF6400]" />
          <span className="text-sm font-black text-[#111827]">Edit Vehicle Listing</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
          {errorText && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {/* Vehicle Visual Header */}
          <div className="flex items-center gap-3.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-200/60">
            <div className="w-20 h-14 rounded-xl overflow-hidden shrink-0 border border-gray-200">
              <VehicleVisual vehicle={vehicle} className="w-full h-full" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#111827]">{vehicle.name}</h4>
              <p className="text-xs text-gray-500">{vehicle.fuel} · {vehicle.transmission} · {vehicle.seats} Seats · {vehicle.plateNumber || 'Verified Registration'}</p>
            </div>
          </div>

          {/* Pricing & Rental Duration Limits */}
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                Daily Rental Settings & Pricing
              </h4>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                Standard Booking
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase block mb-1">
                  Daily Rental Price (₹ / day)
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={pricePerDay}
                  onChange={(e) => setPricePerDay(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#111827] focus:border-[#FF6400] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase block mb-1">
                  Refundable Security Deposit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#111827] focus:border-[#FF6400] focus:outline-none"
                />
              </div>

              {/* Minimum & Maximum Rental Duration Settings */}
              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase block mb-1">
                  Minimum Rental Duration
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={minRentalDays}
                    onChange={(e) => setMinRentalDays(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-[#111827] focus:border-[#FF6400] focus:outline-none"
                  />
                  <span className="text-xs font-bold text-gray-500 shrink-0">day(s)</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase block mb-1">
                  Maximum Rental Duration
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="editMaxDurationType"
                      checked={!hasMaxDaysLimit}
                      onChange={() => setHasMaxDaysLimit(false)}
                      className="accent-[#FF6400]"
                    />
                    <span>Unlimited / No Maximum</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="editMaxDurationType"
                      checked={hasMaxDaysLimit}
                      onChange={() => setHasMaxDaysLimit(true)}
                      className="accent-[#FF6400]"
                    />
                    <span>Set Maximum Limit</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Custom maximum limit input vs Unlimited badge */}
            {hasMaxDaysLimit ? (
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/70 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-900">Cap max rental at:</span>
                  <input
                    type="number"
                    min={minRentalDays}
                    value={maxRentalDays}
                    onChange={(e) => setMaxRentalDays(Math.max(minRentalDays, Number(e.target.value)))}
                    className="w-24 px-2.5 py-1 bg-white rounded-lg border border-amber-300 font-black text-gray-900 text-xs text-center"
                  />
                  <span className="font-bold text-amber-900">days</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Renters will not be allowed to book this vehicle for longer than {maxRentalDays} days in a single reservation.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/60 text-[11px] text-emerald-800 flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <strong>Unlimited Duration Enabled:</strong> Renters can choose any number of days (15, 30, 50, 100+ days) as long as your vehicle is available for the full period.
                </span>
              </div>
            )}

            {/* Discounts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase block mb-1">
                  Weekly Discount (7+ Days %)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={weeklyDiscountPercent}
                  onChange={(e) => setWeeklyDiscountPercent(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#111827] focus:border-[#FF6400] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase block mb-1">
                  Monthly Discount (30+ Days %)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={monthlyDiscountPercent}
                  onChange={(e) => setMonthlyDiscountPercent(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#111827] focus:border-[#FF6400] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Hourly Rental Section (Separate) */}
          <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-gray-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                  Hourly Rental Settings
                </h4>
                <p className="text-[11px] text-gray-500">
                  Allows short-duration hourly rentals (independent from daily rentals).
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hourlyRentalEnabled}
                  onChange={(e) => setHourlyRentalEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#FF6400] rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-700">Enable</span>
              </label>
            </div>

            {hourlyRentalEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-200">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                    Hourly Rate (₹ / hr)
                  </label>
                  <input
                    type="number"
                    min="50"
                    step="10"
                    value={hourlyPrice}
                    onChange={(e) => setHourlyPrice(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-[#111827] bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                    Min Duration (hrs)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={minRentalHours}
                    onChange={(e) => setMinRentalHours(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-[#111827] bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                    Max Duration (hrs)
                  </label>
                  <input
                    type="number"
                    min={minRentalHours}
                    max="48"
                    value={maxRentalHours}
                    onChange={(e) => setMaxRentalHours(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-[#111827] bg-white"
                  />
                </div>
                <div className="sm:col-span-3 text-[10px] text-gray-500 italic">
                  Note: Hourly limits apply only to hourly bookings and do not restrict daily rentals.
                </div>
              </div>
            )}
          </div>

          {/* Payment Options */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
              Accepted Payment Options
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <label className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer ${
                acceptOnline ? 'border-[#FF6400] bg-orange-50/40' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#FF6400]" />
                  <span className="text-xs font-bold text-[#111827]">Pay Online</span>
                </div>
                <input
                  type="checkbox"
                  checked={acceptOnline}
                  onChange={(e) => setAcceptOnline(e.target.checked)}
                  className="w-4 h-4 accent-[#FF6400]"
                />
              </label>

              <label className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer ${
                acceptPayAtPickup ? 'border-[#FF6400] bg-orange-50/40' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-[#111827]">Pay at Pickup</span>
                </div>
                <input
                  type="checkbox"
                  checked={acceptPayAtPickup}
                  onChange={(e) => setAcceptPayAtPickup(e.target.checked)}
                  className="w-4 h-4 accent-[#FF6400]"
                />
              </label>
            </div>
          </div>

          {/* Location & Instructions */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
              Location & Handover
            </h4>
            <div>
              <label className="text-[11px] font-black text-gray-500 uppercase block mb-1">
                Pickup Hub Address
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#111827] focus:border-[#FF6400] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-gray-500 uppercase block mb-1">
                Pickup Instructions
              </label>
              <input
                type="text"
                value={pickupInstructions}
                onChange={(e) => setPickupInstructions(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#111827] focus:border-[#FF6400] focus:outline-none"
              />
            </div>
          </div>

          {/* Availability Toggles */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl border border-gray-100">
              <div>
                <span className="text-xs font-black text-[#111827] block">Listing Active & Available</span>
                <span className="text-[11px] text-gray-500">Show in search results for instant booking</span>
              </div>
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="w-5 h-5 accent-[#FF6400] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl border border-gray-100">
              <div>
                <span className="text-xs font-black text-[#111827] block">Instant Booking</span>
                <span className="text-[11px] text-gray-500">Auto-confirm reservations without manual request approval</span>
              </div>
              <input
                type="checkbox"
                checked={instantBooking}
                onChange={(e) => setInstantBooking(e.target.checked)}
                className="w-5 h-5 accent-[#FF6400] rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Listing</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#FF6400] hover:bg-[#e05800] text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
  );

  if (isPageMode) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-8 sm:py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#111827] bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Host Dashboard</span>
          </button>
          {modalContent}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      {modalContent}
    </div>
  );
};
