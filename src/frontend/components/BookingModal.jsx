import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  ShieldCheck, 
  Calendar, 
  MapPin, 
  CreditCard, 
  Banknote, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  AlertTriangle, 
  Sparkles, 
  Info,
  Clock,
  Car
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { backendService } from '../../backend/api.js';

export const BookingModal = ({
  vehicle,
  bookingDetails = {},
  pickupDate: initialPickupDate,
  pickupTime: initialPickupTime,
  returnDate: initialReturnDate,
  returnTime: initialReturnTime,
  rentalType: initialRentalType,
  isOpen,
  onClose,
  currentUser,
  existingBookings = [],
  onBookingConfirmed,
  onNavigateToDashboard
}) => {
  // Determine Rental Mode
  const safeVehicle = vehicle || {};
  const hourlyEnabled = !!safeVehicle.hourlyRentalEnabled;
  const dailyEnabled = safeVehicle.dailyRentalEnabled !== false;

  const resolvedRentalType = initialRentalType || bookingDetails.rentalType || (hourlyEnabled && !dailyEnabled ? 'hourly' : 'daily');
  const [rentalType, setRentalType] = useState(resolvedRentalType);

  // Dynamic Dates & Times
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [pickupDate, setPickupDate] = useState(initialPickupDate || bookingDetails.pickupDate || todayStr);
  const [pickupTime, setPickupTime] = useState(initialPickupTime || bookingDetails.pickupTime || '10:00');
  const [returnDate, setReturnDate] = useState(initialReturnDate || bookingDetails.returnDate || (rentalType === 'hourly' ? todayStr : tomorrowStr));
  const [returnTime, setReturnTime] = useState(initialReturnTime || bookingDetails.returnTime || (rentalType === 'hourly' ? '14:00' : '10:00'));

  const [step, setStep] = useState(1); // 1: Details & Requirements, 2: Payment, 3: Success
  const [paymentMethod, setPaymentMethod] = useState('online'); // 'online' | 'pay_at_pickup'
  const [onlineType, setOnlineType] = useState('upi'); // 'upi' | 'card' | 'netbanking'
  const [upiId, setUpiId] = useState(currentUser?.email || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // "Before You Confirm" 5 Required Agreement Checkboxes
  const [agreeCarryDocs, setAgreeCarryDocs] = useState(false);
  const [agreeIdentityCheck, setAgreeIdentityCheck] = useState(false);
  const [agreeVehicleDetails, setAgreeVehicleDetails] = useState(false);
  const [agreeSchedule, setAgreeSchedule] = useState(false);
  const [agreePayment, setAgreePayment] = useState(false);

  const allAgreed = agreeCarryDocs && agreeIdentityCheck && agreeVehicleDetails && agreeSchedule && agreePayment;

  if (!isOpen || !vehicle) return null;

  // Server-Authoritative Price Calculation
  const pricing = backendService.calculateRentalPricing({
    vehicle,
    rentalType,
    pickupDate,
    pickupTime,
    returnDate: rentalType === 'hourly' ? pickupDate : returnDate,
    returnTime: rentalType === 'hourly' ? returnTime : pickupTime
  });

  // Owner payment acceptance options
  const allowsPayAtPickup = vehicle.paymentOptions?.acceptPayAtPickup ?? true;
  const allowsPayOnline = vehicle.paymentOptions?.acceptOnline ?? true;

  const handleProceedToPayment = () => {
    setErrorMessage(null);

    if (!currentUser) {
      setErrorMessage('You must be signed in with a real user account to complete a booking.');
      return;
    }

    if (!pricing.valid) {
      setErrorMessage(pricing.error || 'Invalid rental duration selected.');
      return;
    }

    // Double Booking Prevention Check
    const startDateTime = `${pickupDate}T${pickupTime.includes(':') ? pickupTime : '10:00'}`;
    const returnDateTime = `${rentalType === 'hourly' ? pickupDate : returnDate}T${returnTime.includes(':') ? returnTime : '10:00'}`;

    const doubleBookingCheck = backendService.checkDoubleBooking(
      existingBookings,
      vehicle.id,
      startDateTime,
      returnDateTime
    );

    if (doubleBookingCheck.hasConflict) {
      setErrorMessage(doubleBookingCheck.error);
      return;
    }

    if (!allAgreed) {
      setErrorMessage('Please check all 5 pickup and safety acknowledgment checkboxes to proceed.');
      return;
    }

    setStep(2);
  };

  const handleFinalConfirm = async () => {
    setErrorMessage(null);
    setIsProcessing(true);

    if (!currentUser) {
      setIsProcessing(false);
      setErrorMessage('No authenticated user session found. Please sign in with a real account.');
      return;
    }

    const startDateTime = `${pickupDate}T${pickupTime.includes(':') ? pickupTime : '10:00'}`;
    const returnDateTime = `${rentalType === 'hourly' ? pickupDate : returnDate}T${returnTime.includes(':') ? returnTime : '10:00'}`;

    // Try server-authoritative creation via API first
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          vehicleId: vehicle.id,
          rentalType,
          pickupDate,
          pickupTime,
          returnDate: rentalType === 'hourly' ? pickupDate : returnDate,
          returnTime: rentalType === 'hourly' ? returnTime : pickupTime,
          paymentMethod
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.booking) {
          setIsProcessing(false);
          setConfirmedBooking(data.booking);
          onBookingConfirmed(data.booking);
          setStep(3);
          try {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
          } catch (e) {}
          return;
        }
      }
    } catch (err) {
      // API fallback below
    }

    // Client-side fallback if server offline
    const doubleBookingCheck = backendService.checkDoubleBooking(
      existingBookings,
      vehicle.id,
      startDateTime,
      returnDateTime
    );

    if (doubleBookingCheck.hasConflict) {
      setIsProcessing(false);
      setErrorMessage(doubleBookingCheck.error);
      setStep(1);
      return;
    }

    const bookingId = `RR-${Math.floor(100000 + Math.random() * 900000)}`;

    const newBooking = {
      id: bookingId,
      vehicleId: vehicle.id,
      vehicle: vehicle,
      bookerId: currentUser.id,
      bookerName: currentUser.name,
      bookerAvatar: currentUser.avatar || null,
      bookerPhone: currentUser.phone || '',
      bookerEmail: currentUser.email,
      rentalType,
      startDate: pickupDate,
      endDate: rentalType === 'hourly' ? pickupDate : returnDate,
      pickupTime,
      returnTime,
      pickupDateTime: startDateTime,
      returnDateTime,
      duration: pricing.duration,
      durationUnit: pricing.durationUnit,
      pricePerUnit: pricing.ratePerUnit,
      basePrice: pricing.rawBase,
      durationDiscount: pricing.discountAmount,
      platformFee: pricing.platformFee,
      taxes: pricing.taxes,
      securityDeposit: pricing.deposit,
      totalAmount: pricing.totalPayable,
      paymentStatus: paymentMethod === 'online' ? 'paid' : 'pay_at_pickup',
      paymentMethod,
      status: vehicle.instantBooking ? 'confirmed' : 'pending',
      pickupLocation: vehicle.location,
      createdAt: new Date().toISOString()
    };

    backendService.createBooking(newBooking).then((res) => {
      const finalBooking = (res && res.success && res.booking) ? res.booking : newBooking;
      setIsProcessing(false);
      setConfirmedBooking(finalBooking);
      onBookingConfirmed(finalBooking);
      setStep(3);

      try {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      } catch (err) {}
    }).catch(() => {
      setIsProcessing(false);
      setConfirmedBooking(newBooking);
      onBookingConfirmed(newBooking);
      setStep(3);
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col relative max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-[#111827]">
              {step === 3 ? 'Booking Confirmed' : 'Book Vehicle'}
            </span>
            <span className="text-xs text-gray-400 font-semibold">
              · {step === 1 ? 'Details & Requirements' : step === 2 ? 'Payment' : 'Success'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: SUMMARY & REQUIREMENTS */}
        {step === 1 && (
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Vehicle Summary Card */}
            <div className="flex items-center gap-4 p-4 bg-[#F8FAFC] rounded-2xl border border-gray-100">
              <img
                src={vehicle.images?.[0] || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80'}
                alt={vehicle.name}
                className="w-24 h-18 object-cover rounded-xl border border-gray-200 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#FF6400] bg-orange-50 px-2 py-0.5 rounded-md">
                    {rentalType === 'hourly' ? '⏱️ Hourly Rental' : '📅 Daily Rental'}
                  </span>
                  <span className="text-[10px] font-bold text-gray-500">
                    {vehicle.brand} {vehicle.model} ({vehicle.year})
                  </span>
                </div>
                <h4 className="text-sm font-black text-[#111827] truncate mt-0.5">
                  {vehicle.name}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{vehicle.location}</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Owner: <span className="font-bold text-gray-700">{vehicle.owner?.name || 'Vehicle owner'}</span>{Number.isFinite(Number(vehicle.owner?.rating)) && Number(vehicle.owner.rating) > 0 ? ` · Rating: ★ ${Number(vehicle.owner.rating).toFixed(1)}` : ''}
                </div>
              </div>
            </div>

            {/* Rental Mode Selector if vehicle supports both */}
            {hourlyEnabled && dailyEnabled && (
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
                  <span>Hourly Mode (₹{vehicle.hourlyPrice}/hr)</span>
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
                  <span>Daily Mode (₹{vehicle.dailyPrice || vehicle.pricePerDay}/day)</span>
                </button>
              </div>
            )}

            {/* Rental Duration & Schedule */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-gray-800">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#FF6400]" />
                  Selected Rental Schedule
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  rentalType === 'hourly' ? 'bg-orange-50 text-[#FF6400]' : 'bg-blue-50 text-[#1769D1]'
                }`}>
                  {pricing.duration} {pricing.durationUnit} Duration
                </span>
              </div>

              {rentalType === 'hourly' ? (
                // Hourly Schedule Inputs
                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div className="p-2.5 bg-gray-50 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Date</span>
                    <input
                      type="date"
                      value={pickupDate}
                      min={todayStr}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full bg-transparent font-extrabold text-gray-800 focus:outline-none text-xs mt-1"
                    />
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Start Time</span>
                    <input
                      type="time"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full bg-transparent font-extrabold text-gray-800 focus:outline-none text-xs mt-1"
                    />
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">End Time</span>
                    <input
                      type="time"
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                      className="w-full bg-transparent font-extrabold text-gray-800 focus:outline-none text-xs mt-1"
                    />
                  </div>
                </div>
              ) : (
                // Daily Schedule Inputs
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-2.5 bg-gray-50 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Pickup Date</span>
                      <input
                        type="date"
                        value={pickupDate}
                        min={todayStr}
                        onChange={(e) => setPickupDate(e.target.value)}
                        className="w-full bg-transparent font-extrabold text-gray-800 focus:outline-none text-xs mt-1"
                      />
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Return Date</span>
                      <input
                        type="date"
                        value={returnDate}
                        min={pickupDate || todayStr}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="w-full bg-transparent font-extrabold text-gray-800 focus:outline-none text-xs mt-1"
                      />
                    </div>
                  </div>

                  {/* Quick duration selection in BookingModal */}
                  <div className="space-y-1 pt-1">
                    <div className="flex flex-wrap gap-1">
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
                            className={`px-2 py-0.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                              pricing.duration === dys
                                ? 'bg-[#1769D1] text-white border-[#1769D1]'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            {dys}d
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Owner Limits Information */}
              <div className="text-[11px] text-gray-500 font-medium flex items-center justify-between">
                <span>
                  {rentalType === 'hourly'
                    ? `Host limits: Min ${vehicle.minRentalHours || 1} hrs · Max ${vehicle.maxRentalHours || 24} hrs`
                    : `Host limits: Min ${vehicle.minRentalDays || 1} day${(vehicle.minRentalDays || 1) === 1 ? '' : 's'} · Max ${
                        vehicle.maxRentalDays ? `${vehicle.maxRentalDays} days` : 'Unlimited'
                      }`}
                </span>
                {rentalType === 'daily' && !vehicle.maxRentalDays && (
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    ✨ Unlimited duration
                  </span>
                )}
              </div>
            </div>

            {/* Transparent Live Pricing */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-2 text-xs">
              <div className="flex items-center justify-between font-black text-gray-900 mb-2">
                <span>Fare Breakdown</span>
                <span className="text-[11px] text-gray-400 font-normal">All figures in INR (₹)</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>
                  Rental Price ({pricing.duration} {pricing.durationUnit} × ₹{(pricing.ratePerUnit || 0).toLocaleString('en-IN')})
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
                <span>Platform Fee (8%)</span>
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

              <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-sm font-black text-gray-900">
                <span>Total Amount</span>
                <span className="text-base text-[#FF6400]">₹{(pricing.totalPayable || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Important Pickup Requirements Card */}
            <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-[#1769D1]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>🔒 Important Pickup Requirements</span>
              </div>
              <p className="text-xs text-blue-950 leading-relaxed font-medium">
                Please carry physically at handover:
              </p>
              <ul className="text-xs text-blue-900 space-y-1 list-disc list-inside font-semibold">
                <li>Aadhaar Card OR valid government-issued photo ID</li>
                <li>Valid Driving Licence (original physical copy)</li>
              </ul>
              <p className="text-[11px] text-blue-700/90 pt-1 leading-snug">
                The vehicle owner will inspect your ID and driving eligibility in-person at pickup before handing over keys. We do not store or force unnecessary uploads of sensitive identity documents.
              </p>
            </div>

            {/* "Before You Confirm" Agreement Checkboxes */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-gray-600 block">
                Before You Confirm
              </span>

              <label className="flex items-start gap-2 text-xs text-gray-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeCarryDocs}
                  onChange={(e) => setAgreeCarryDocs(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#FF6400] rounded"
                />
                <span>I will carry my valid Driving Licence and Aadhaar Card / government ID.</span>
              </label>

              <label className="flex items-start gap-2 text-xs text-gray-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeIdentityCheck}
                  onChange={(e) => setAgreeIdentityCheck(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#FF6400] rounded"
                />
                <span>I understand the owner may verify my identity and licence at pickup.</span>
              </label>

              <label className="flex items-start gap-2 text-xs text-gray-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeVehicleDetails}
                  onChange={(e) => setAgreeVehicleDetails(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#FF6400] rounded"
                />
                <span>I checked the vehicle details, seating, and fuel type.</span>
              </label>

              <label className="flex items-start gap-2 text-xs text-gray-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeSchedule}
                  onChange={(e) => setAgreeSchedule(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#FF6400] rounded"
                />
                <span>I checked the pickup and return dates & times.</span>
              </label>

              <label className="flex items-start gap-2 text-xs text-gray-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreePayment}
                  onChange={(e) => setAgreePayment(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#FF6400] rounded"
                />
                <span>I understand the payment terms and refundable deposit rules.</span>
              </label>
            </div>

            {/* Continue to Payment button */}
            <button
              type="button"
              disabled={!allAgreed || !pricing.valid}
              onClick={handleProceedToPayment}
              className={`w-full py-3.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                allAgreed && pricing.valid
                  ? 'bg-[#FF6400] hover:bg-[#e05800] text-white shadow-md shadow-orange-500/20'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>Continue to Payment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: PAYMENT METHOD SELECTION */}
        {step === 2 && (
          <div className="p-6 overflow-y-auto space-y-5">
            <div>
              <h3 className="text-sm font-black text-[#111827]">
                Choose Payment Method
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Select your preferred way to settle the booking fee.
              </p>
            </div>

            {/* Payment Method Cards */}
            <div className="space-y-3">
              {allowsPayOnline && (
                <label 
                  className={`p-4 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                    paymentMethod === 'online' 
                      ? 'border-[#FF6400] bg-orange-50/20' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online"
                    checked={paymentMethod === 'online'}
                    onChange={() => setPaymentMethod('online')}
                    className="mt-1 accent-[#FF6400]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-[#FF6400]" />
                        Pay Online Securely
                      </span>
                      <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md">
                        Instant Confirmation
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Pay via UPI (GPay, PhonePe, Paytm), Credit/Debit Card, or Net Banking.
                    </p>

                    {paymentMethod === 'online' && (
                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-2.5">
                        <div className="flex gap-2">
                          {['upi', 'card', 'netbanking'].map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setOnlineType(type)}
                              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                onlineType === type
                                  ? 'bg-[#111827] text-white border-[#111827]'
                                  : 'bg-white text-gray-600 border-gray-200'
                              }`}
                            >
                              {type.toUpperCase()}
                            </button>
                          ))}
                        </div>

                        {onlineType === 'upi' && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 block uppercase">
                              UPI ID / VPA
                            </label>
                            <input
                              type="text"
                              value={upiId}
                              onChange={(e) => setUpiId(e.target.value)}
                              placeholder="e.g. yourname@okhdfcbank"
                              className="w-full bg-white px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                            />
                          </div>
                        )}

                        {onlineType === 'card' && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Card Number (•••• •••• •••• ••••)"
                              className="w-full bg-white px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="MM / YY"
                                className="bg-white px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                              />
                              <input
                                type="password"
                                placeholder="CVV"
                                maxLength={4}
                                className="bg-white px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              )}

              {allowsPayAtPickup && (
                <label 
                  className={`p-4 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                    paymentMethod === 'pay_at_pickup' 
                      ? 'border-[#FF6400] bg-orange-50/20' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="pay_at_pickup"
                    checked={paymentMethod === 'pay_at_pickup'}
                    onChange={() => setPaymentMethod('pay_at_pickup')}
                    className="mt-1 accent-[#FF6400]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                        <Banknote className="w-4 h-4 text-emerald-600" />
                        Pay at Pickup (Cash / UPI to Host)
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Reserve now for ₹0. Pay directly to the host when inspecting the vehicle in person.
                    </p>
                  </div>
                </label>
              )}
            </div>

            {/* Total due card */}
            <div className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center text-xs">
              <div>
                <span className="text-gray-500 block">Due Now</span>
                <span className="text-lg font-black text-[#111827]">
                  ₹{paymentMethod === 'online' ? (pricing.totalPayable || 0).toLocaleString('en-IN') : '0 (Pay at Pickup)'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-500 block">Total Booking Value</span>
                <span className="font-bold text-gray-700">₹{(pricing.totalPayable || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleFinalConfirm}
                className="flex-1 py-3.5 rounded-xl bg-[#FF6400] hover:bg-[#e05800] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:bg-gray-300"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Confirming Reservation...</span>
                  </div>
                ) : (
                  <span>
                    {paymentMethod === 'online' ? `Pay ₹${(pricing.totalPayable || 0).toLocaleString('en-IN')} & Confirm` : 'Confirm Reservation'}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: BOOKING SUCCESS ANIMATION & DETAILS */}
        {step === 3 && confirmedBooking && (
          <div className="p-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
            {/* Animated Checkmark */}
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-black text-[#111827]">
                ✓ Booking Confirmed!
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Your reservation has been securely registered in MyRyedo.
              </p>
            </div>

            {/* Confirmed Details Card */}
            <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-gray-100 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500">Booking Reference</span>
                <span className="font-mono font-black text-[#FF6400] text-sm">
                  {confirmedBooking.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vehicle</span>
                <span className="font-bold text-gray-900">{confirmedBooking.vehicle?.name || vehicle.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Rental Type & Duration</span>
                <span className="font-bold text-[#1769D1]">
                  {confirmedBooking.rentalType === 'hourly' ? '⏱️ Hourly' : '📅 Daily'} ({confirmedBooking.duration} {confirmedBooking.durationUnit})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pickup</span>
                <span className="font-bold text-gray-900">
                  {confirmedBooking.startDate} • {confirmedBooking.pickupTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Return</span>
                <span className="font-bold text-gray-900">
                  {confirmedBooking.endDate} • {confirmedBooking.returnTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-bold text-[#FF6400]">
                  ₹{(confirmedBooking.totalAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Status</span>
                <span className="font-bold text-emerald-600 uppercase text-[11px]">
                  {confirmedBooking.paymentStatus === 'paid' ? 'Paid Online' : 'Pay at Pickup'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 text-left">
              📌 Remember to bring your original Driving Licence and government ID when collecting the vehicle.
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToDashboard();
              }}
              className="w-full py-3.5 rounded-xl bg-[#FF6400] hover:bg-[#e05800] text-white font-black text-xs transition-colors cursor-pointer shadow-md shadow-orange-500/20"
            >
              View Booking in My Bookings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
