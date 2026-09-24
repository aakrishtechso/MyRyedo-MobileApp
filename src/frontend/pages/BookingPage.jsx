import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  MapPin, 
  CreditCard, 
  Banknote, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Info,
  Car,
  User,
  Fuel,
  Users,
  Tag,
  Loader2,
  FileText,
  Award,
  MessageSquare,
  Check,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { backendService } from '../../backend/api.js';
import { VehicleVisual } from '../components/VehicleVisual.jsx';

export const BookingPage = ({
  vehicle,
  bookingDetails = {},
  currentUser,
  existingBookings = [],
  onBack,
  onBookingConfirmed,
  onOpenAuthModal,
  onGoToOwnerDashboard,
  onOpenChat,
  showToast
}) => {
  if (!vehicle) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 font-bold">No vehicle selected for booking.</p>
        <button 
          onClick={onBack}
          className="mt-4 px-6 py-2.5 bg-[#FF6400] text-white font-bold rounded-xl cursor-pointer"
        >
          Explore Fleet
        </button>
      </div>
    );
  }

  // Owner accounts are providers, not renters.
  const isOwnerRole = currentUser?.role === 'owner';

  // Check if current user owns this vehicle
  const isOwnerOfThisVehicle = Boolean(
    currentUser && (
      (vehicle.ownerId && currentUser.id === vehicle.ownerId) ||
      (vehicle.owner?.id && currentUser.id === vehicle.owner.id) ||
      (vehicle.owner?.email && currentUser.email && vehicle.owner.email.toLowerCase() === currentUser.email.toLowerCase())
    )
  );

  // If owner tries to access booking page for their own vehicle, show strict block
  if (isOwnerRole || isOwnerOfThisVehicle) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6">
        <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 border border-gray-100 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 bg-orange-100 text-[#FF6400] rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-[#111827]">
            Host Booking Restriction
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Owner accounts cannot book vehicles. Manage your fleet and guest reservations from your Owner Dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={onBack}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-black rounded-xl cursor-pointer"
            >
              Back to Details
            </button>
            {onGoToOwnerDashboard && (
              <button
                onClick={onGoToOwnerDashboard}
                className="px-5 py-2.5 bg-[#FF6400] hover:bg-[#e05800] text-white text-xs font-black rounded-xl cursor-pointer shadow-md shadow-orange-500/20"
              >
                Go to Owner Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Determine Rental Mode
  const hourlyEnabled = !!vehicle.hourlyRentalEnabled;
  const dailyEnabled = vehicle.dailyRentalEnabled !== false;
  const resolvedRentalType = bookingDetails.rentalType || (hourlyEnabled && !dailyEnabled ? 'hourly' : 'daily');
  const [rentalType, setRentalType] = useState(resolvedRentalType);

  // Dates & Times
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [pickupDate, setPickupDate] = useState(bookingDetails.pickupDate || todayStr);
  const [pickupTime, setPickupTime] = useState(bookingDetails.pickupTime || '10:00');
  const [returnDate, setReturnDate] = useState(bookingDetails.returnDate || (rentalType === 'hourly' ? todayStr : tomorrowStr));
  const [returnTime, setReturnTime] = useState(bookingDetails.returnTime || (rentalType === 'hourly' ? '14:00' : '10:00'));

  // Quick duration selection
  const [selectedDurationDays, setSelectedDurationDays] = useState(1);
  const quickDurations = [1, 2, 3, 5, 7, 10, 15, 20, 30, 45, 60, 90];

  useEffect(() => {
    let active = true;
    backendService.getCancellationPolicy().then((data) => {
      if (active && data?.success && data.policy) setCancellationPolicy(data.policy);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const handleQuickDuration = (days) => {
    setSelectedDurationDays(days);
    const pDate = new Date(pickupDate);
    if (!isNaN(pDate.getTime())) {
      const rDate = new Date(pDate);
      rDate.setDate(rDate.getDate() + days);
      setReturnDate(rDate.toISOString().split('T')[0]);
    }
  };

  // Payment & Confirmation state
  const [paymentMethod, setPaymentMethod] = useState('online'); // 'online' | 'pay_at_pickup'
  const [onlineType, setOnlineType] = useState('upi'); // 'upi' | 'card' | 'netbanking'
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [cancellationPolicy, setCancellationPolicy] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Driver Requirement Checkboxes (Mandatory 5)
  const [reqDL, setReqDL] = useState(false);
  const [reqGovtId, setReqGovtId] = useState(false);
  const [reqHandoverInspection, setReqHandoverInspection] = useState(false);
  const [reqFuelMatch, setReqFuelMatch] = useState(false);
  const [reqDepositEscrow, setReqDepositEscrow] = useState(false);

  const allRequirementsAgreed = reqDL && reqGovtId && reqHandoverInspection && reqFuelMatch && reqDepositEscrow;

  // Resolve prices safely
  const resolvedDailyPrice = Number(vehicle.dailyPrice || vehicle.pricePerDay || vehicle.price || 0);
  const resolvedHourlyPrice = Number(vehicle.hourlyPrice || 0);
  const resolvedDeposit = Number(vehicle.securityDeposit || 0);

  // Pricing calculations
  const calculateDays = () => {
    if (rentalType === 'hourly') return 1;
    const start = new Date(pickupDate);
    const end = new Date(returnDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const rentalDays = calculateDays();
  const rentalHours = rentalType === 'hourly' ? Math.max(1, Math.round((new Date(`${returnDate || pickupDate}T${returnTime}`) - new Date(`${pickupDate}T${pickupTime}`)) / (1000 * 60 * 60))) : 0;
  const baseFare = rentalType === 'hourly'
    ? resolvedHourlyPrice * rentalHours
    : resolvedDailyPrice * rentalDays;
  const discountPercent = rentalType === 'daily'
    ? (rentalDays >= 30 ? Number(vehicle.monthlyDiscountPercent || 0) : rentalDays >= 7 ? Number(vehicle.weeklyDiscountPercent || 0) : 0)
    : 0;
  const baseDiscount = Math.round(baseFare * discountPercent / 100);
  let discount = baseDiscount + (appliedPromo ? Math.round((baseFare - baseDiscount) * (appliedPromo.discountPercent || 0) / 100) : 0);
  const netBase = Math.max(0, baseFare - discount);
  const platformFee = Math.round(netBase * 0.08);
  const taxes = Math.round((netBase + platformFee) * 0.12);
  const totalPayable = Math.max(0, netBase + platformFee + taxes + resolvedDeposit);

  const handleApplyPromo = () => {
    setPromoError(null);
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    if (code === 'MYRYEDO10' && baseFare >= 1000) {
      setAppliedPromo({ code: 'MYRYEDO10', discountPercent: 10 });
      if (showToast) showToast('10% discount promo applied successfully!');
    } else {
      setPromoError('That promo code is invalid or the booking does not meet its minimum amount.');
    }
  };

  // Final confirmation handler
  const handlePayAndConfirm = async () => {
    setErrorMessage(null);

    // 1. Session verification
    const activeToken = backendService.getToken() || (currentUser && currentUser.token) || localStorage.getItem('myryedo_token') || localStorage.getItem('ridely_token');
    if (!currentUser && !activeToken) {
      if (onOpenAuthModal) {
        onOpenAuthModal('login');
      } else {
        setErrorMessage('Please sign in to confirm your booking.');
      }
      return;
    }

    // 2. Requirements agreement check
    if (!allRequirementsAgreed) {
      setErrorMessage('Please check all driver requirements checkboxes before confirming your reservation.');
      return;
    }

    setIsProcessing(true);

    try {
      const payload = {
        vehicleId: vehicle.id,
        rentalType,
        pickupDate,
        pickupTime,
        returnDate: rentalType === 'hourly' ? pickupDate : returnDate,
        returnTime: rentalType === 'hourly' ? returnTime : pickupTime,
        daysCount: rentalDays,
        paymentMethod,
        promoCode: appliedPromo?.code || null,
        totalPrice: totalPayable,
        securityDeposit: resolvedDeposit,
        token: activeToken
      };

      const data = await backendService.createBooking(payload);

      if (data.success && data.booking) {
        setIsProcessing(false);
        setConfirmedBooking(data.booking);
        if (onBookingConfirmed) onBookingConfirmed(data.booking);
        try {
          confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
        } catch (e) {}
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setIsProcessing(false);
        setErrorMessage(data.error || 'This vehicle is already booked for your selected time. Please go back and choose another vehicle.');
      }
    } catch (err) {
      setIsProcessing(false);
      setErrorMessage('Network connection error while confirming booking.');
    }
  };

  const images = Array.isArray(vehicle.images) ? vehicle.images.filter(Boolean) : (vehicle.image ? [vehicle.image] : []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 sm:py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">

        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#111827] bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Vehicle Details</span>
          </button>

          <span className="text-xs font-black text-[#FF6400] bg-orange-50 px-3 py-1 rounded-full border border-orange-100 uppercase">
            Secure Booking Process
          </span>
        </div>

        {/* Confirmation Success Screen */}
        {confirmedBooking ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-xl text-center space-y-6 animate-in fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="bg-emerald-50 text-emerald-700 text-xs font-black px-3 py-1 rounded-full uppercase">
                Reservation Confirmed
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#111827]">
                You're Ready to Roll!
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Your reservation has been confirmed.
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-gray-100 text-left space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500">Booking Reference</span>
                <span className="font-mono font-black text-gray-900 text-sm">
                  #{confirmedBooking.id || 'RL-CONFIRMED'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500">Vehicle</span>
                <span className="font-bold text-gray-900">{vehicle.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500">Pickup Location</span>
                <span className="font-bold text-gray-900">{vehicle.location}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500">Rental Duration</span>
                <span className="font-bold text-gray-900">
                  {pickupDate} ({pickupTime}) → {rentalType === 'hourly' ? pickupDate : returnDate} ({rentalType === 'hourly' ? returnTime : pickupTime})
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500">Payment Status</span>
                <span className="font-bold text-emerald-600 uppercase">
                  {paymentMethod === 'online' ? 'Paid via UPI' : 'Pay at Pickup Approved'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 text-sm font-black">
                <span className="text-gray-900">Total Payable</span>
                <span className="text-[#FF6400]">₹{totalPayable.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-800 text-left flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-emerald-950">Refundable Security Deposit</p>
                <p className="text-[11px] text-emerald-700">
                  ₹{resolvedDeposit.toLocaleString('en-IN')} is safeguarded in MyRyedo Escrow and will be refunded to your source account upon return.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                onClick={onBack}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#111827] hover:bg-black text-white text-xs font-black rounded-xl cursor-pointer shadow-md"
              >
                Return to Fleet
              </button>
            </div>
          </div>
        ) : (
          /* Main 10-Section Form Layout */
          <div className="space-y-8">

            {/* ======================================================== */}
            {/* 1. VEHICLE IMAGES */}
            {/* ======================================================== */}
            <div className="rounded-3xl overflow-hidden border border-slate-200 bg-white relative shadow-sm">
              <VehicleVisual vehicle={vehicle} className="w-full" aspectRatio="aspect-[16/7]" />
            </div>

            {/* ======================================================== */}
            {/* 2. VEHICLE NAME */}
            {/* ======================================================== */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-[#FF6400]/10 text-[#FF6400] text-xs font-black px-3 py-1 rounded-full uppercase">
                  {vehicle.category}
                </span>
                {vehicle.verified && <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified listing
                </span>}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#111827]">
                {vehicle.name}
              </h1>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-[#FF6400]" />
                {vehicle.location}
              </p>
            </div>

            {/* ======================================================== */}
            {/* 3–6. REAL VEHICLE INFORMATION */}
            {/* ======================================================== */}
            {vehicle.owner && (vehicle.owner.name || vehicle.owner.avatar) && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  {vehicle.owner.avatar && <img src={vehicle.owner.avatar} alt="" className="w-14 h-14 rounded-2xl object-cover border border-slate-200" />}
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Vehicle owner</span>
                    <h2 className="mt-1 text-base font-black text-slate-900">{vehicle.owner.name || 'Vehicle owner'}</h2>
                  </div>
                </div>
                {onOpenChat && vehicle.owner.id && <button onClick={() => onOpenChat(vehicle.owner.id, vehicle.id)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-xl cursor-pointer flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-[#FF6400]" /> Message Owner</button>}
              </div>
            )}

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-black text-slate-950">About This Ride</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {vehicle.transmission && <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100"><span className="text-slate-400 block font-bold">Transmission</span><span className="font-black text-slate-900 text-sm">{vehicle.transmission}</span></div>}
                {vehicle.fuel && <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100"><span className="text-slate-400 block font-bold">Fuel</span><span className="font-black text-slate-900 text-sm">{vehicle.fuel}</span></div>}
                {vehicle.seats != null && <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100"><span className="text-slate-400 block font-bold">Seating</span><span className="font-black text-slate-900 text-sm">{vehicle.seats} seats</span></div>}
                {(vehicle.regNumber || vehicle.plateNumber) && <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100"><span className="text-slate-400 block font-bold">Registration</span><span className="font-mono font-bold text-slate-900 text-sm uppercase">{vehicle.regNumber || vehicle.plateNumber}</span></div>}
              </div>
              <p className="text-sm text-slate-600 leading-7">{vehicle.description || 'No additional description was provided for this vehicle.'}</p>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-black text-slate-950 flex items-center gap-2"><MapPin className="w-4 h-4 text-[#FF6400]" /> Pickup Location</h2>
              {vehicle.location || vehicle.pickupAddress ? <>
                <div className="p-4 bg-orange-50/60 border border-orange-100 rounded-2xl"><span className="text-[11px] text-slate-500 font-bold block">Vehicle pickup point</span><span className="text-sm font-black text-slate-900 block mt-1">{vehicle.location || vehicle.pickupAddress}</span></div>
                <div className="flex flex-wrap gap-2">
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vehicle.location || vehicle.pickupAddress)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-[#FF6400]"><ExternalLink className="w-4 h-4" /> View on Google Maps</a>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(vehicle.location || vehicle.pickupAddress)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl text-xs font-black hover:border-slate-400">Get Directions</a>
                </div>
              </> : <p className="text-sm text-slate-500">No pickup location has been provided for this vehicle yet.</p>}
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-black text-slate-950 flex items-center gap-2"><FileText className="w-4 h-4 text-[#FF6400]" /> Pickup Requirements</h2>
              {Array.isArray(vehicle.pickupRequirements) && vehicle.pickupRequirements.length > 0 ? <div className="grid sm:grid-cols-2 gap-3">{vehicle.pickupRequirements.map((item, i) => <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 flex gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" />{typeof item === 'string' ? item : item?.label || item?.name || JSON.stringify(item)}</div>)}</div> : <p className="text-sm text-slate-500">No additional pickup requirements were provided for this listing. Any required information will be shown during booking.</p>}
            </div>
            {/* ======================================================== */}
            {/* 7. PRICING / FARE BREAKDOWN */}
            {/* ======================================================== */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#FF6400]" />
                Pricing & Fare Breakdown
              </h2>

              <div className="space-y-2.5 text-xs text-gray-600">
                <div className="flex justify-between items-center">
                  <span>Base Vehicle Rental ({rentalDays} day{rentalDays > 1 ? 's' : ''} × ₹{resolvedDailyPrice.toLocaleString('en-IN')})</span>
                  <span className="font-bold text-gray-900">₹{baseFare.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Platform Service Fee</span>
                  <span className="font-bold text-gray-900">₹{platformFee.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>GST & Road Safety Cess (5%)</span>
                  <span className="font-bold text-gray-900">₹{taxes.toLocaleString('en-IN')}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between items-center text-emerald-600 font-bold">
                    <span>Promo Discount (MYRYEDO10)</span>
                    <span>-₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-black text-[#111827] pt-2 border-t border-gray-100">
                  <span>Total Amount Payable</span>
                  <span className="text-[#FF6400] text-base">₹{totalPayable.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px] text-blue-900 flex items-center justify-between">
                  <span>Refundable Security Deposit (Escrow)</span>
                  <span className="font-bold">₹{resolvedDeposit.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Promo Code Input */}
              <div className="pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter coupon (e.g. MYRYEDO10)"
                    className="flex-1 p-2.5 text-xs rounded-xl border border-gray-200 uppercase font-bold focus:border-[#FF6400] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-black rounded-xl cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {promoError && <p className="text-[11px] text-rose-600 mt-1 font-semibold">{promoError}</p>}
              </div>
            </div>

            {/* ======================================================== */}
            {/* 8. RENTAL DATES & TIMES (With Quick Duration Options) */}
            {/* ======================================================== */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#FF6400]" />
                  Selected Rental Schedule
                </h2>
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit">
                  {rentalDays} day{rentalDays > 1 ? 's' : ''} duration
                </span>
              </div>

              {/* Quick Duration Options */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-700 block">
                  Quick duration options:
                </span>
                <div className="flex flex-wrap gap-2">
                  {quickDurations.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleQuickDuration(d)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        selectedDurationDays === d && rentalDays === d
                          ? 'bg-[#FF6400] text-white border-[#FF6400] shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                  <span className="font-bold text-gray-700">Host limits:</span>
                  <span>Min {vehicle.minRentalDays || 1} day</span>
                  <span>·</span>
                  <span className="text-[#FF6400] font-bold">
                    {vehicle.maxRentalDays ? `Max ${vehicle.maxRentalDays} days` : '✨ Unlimited duration'}
                  </span>
                </div>
              </div>

              {/* Pickup & Return Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                <div className="space-y-1.5">
                  <label className="block font-bold text-gray-700">Pickup Date & Time</label>
                  <input
                    type="date"
                    min={todayStr}
                    value={pickupDate}
                    onChange={(e) => {
                      setPickupDate(e.target.value);
                      const pDate = new Date(e.target.value);
                      if (!isNaN(pDate.getTime())) {
                        const rDate = new Date(pDate);
                        rDate.setDate(rDate.getDate() + selectedDurationDays);
                        setReturnDate(rDate.toISOString().split('T')[0]);
                      }
                    }}
                    className="w-full p-3 rounded-xl border border-gray-200 font-bold focus:border-[#FF6400] outline-none"
                  />
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 font-bold focus:border-[#FF6400] outline-none mt-1"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-gray-700">Return Date & Time</label>
                  <input
                    type="date"
                    min={pickupDate}
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 font-bold focus:border-[#FF6400] outline-none"
                  />
                  <input
                    type="time"
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 font-bold focus:border-[#FF6400] outline-none mt-1"
                  />
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* 9. DRIVER REQUIREMENTS (Checkboxes) */}
            {/* ======================================================== */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#FF6400]" />
                Driver Acknowledgment & Requirements
              </h2>
              <p className="text-xs text-gray-500">
                You must confirm and accept each condition before completing your reservation:
              </p>

              <div className="space-y-3 text-xs">
                <label className="flex items-start gap-3 p-3 rounded-2xl border border-gray-200 hover:bg-gray-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reqDL}
                    onChange={(e) => setReqDL(e.target.checked)}
                    className="w-4 h-4 text-[#FF6400] rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-gray-900 block">Valid Original Driving License</span>
                    <span className="text-gray-500 text-[11px]">I confirm that I hold a valid, non-expired physical original driving license and will present it at pickup.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-2xl border border-gray-200 hover:bg-gray-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reqGovtId}
                    onChange={(e) => setReqGovtId(e.target.checked)}
                    className="w-4 h-4 text-[#FF6400] rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-gray-900 block">Government Photo ID</span>
                    <span className="text-gray-500 text-[11px]">I agree to carry my original Aadhaar card or Passport matching my booking identity.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-2xl border border-gray-200 hover:bg-gray-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reqHandoverInspection}
                    onChange={(e) => setReqHandoverInspection(e.target.checked)}
                    className="w-4 h-4 text-[#FF6400] rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-gray-900 block">Joint Vehicle Inspection</span>
                    <span className="text-gray-500 text-[11px]">I agree to photograph and inspect existing scratches and odometer reading together with the host.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-2xl border border-gray-200 hover:bg-gray-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reqFuelMatch}
                    onChange={(e) => setReqFuelMatch(e.target.checked)}
                    className="w-4 h-4 text-[#FF6400] rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-gray-900 block">Fuel Policy Match</span>
                    <span className="text-gray-500 text-[11px]">I agree to return the vehicle with the same fuel level as provided during handover.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-2xl border border-gray-200 hover:bg-gray-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reqDepositEscrow}
                    onChange={(e) => setReqDepositEscrow(e.target.checked)}
                    className="w-4 h-4 text-[#FF6400] rounded mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-gray-900 block">Refundable Deposit & Escrow Agreement</span>
                    <span className="text-gray-500 text-[11px]">I accept that ₹{resolvedDeposit.toLocaleString('en-IN')} is held securely in escrow and refunded upon on-time, undamaged return.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* ======================================================== */}
            {/* 10. PAYMENT / CONFIRMATION */}
            {/* ======================================================== */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl space-y-6">
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#FF6400]" />
                Select Payment Method
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('online')}
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                    paymentMethod === 'online'
                      ? 'border-[#FF6400] bg-orange-50/50 shadow-2xs'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-gray-900 text-sm">Online Payment</span>
                    <CreditCard className="w-4 h-4 text-[#FF6400]" />
                  </div>
                  <p className="text-gray-500 text-[11px]">
                    Instant confirmation via UPI (Google Pay, PhonePe, Paytm) or Card.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('pay_at_pickup')}
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                    paymentMethod === 'pay_at_pickup'
                      ? 'border-[#FF6400] bg-orange-50/50 shadow-2xs'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-gray-900 text-sm">Pay at Pickup</span>
                    <Banknote className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-gray-500 text-[11px]">
                    Pay cash/UPI directly to the host when you inspect the vehicle.
                  </p>
                </button>
              </div>

              {/* Error Notification */}
              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{errorMessage}</span>
                </div>
              )}

              {/* Final Confirm CTA */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={handlePayAndConfirm}
                className="w-full py-4 bg-[#FF6400] hover:bg-[#e05800] text-white text-base font-black rounded-2xl cursor-pointer shadow-lg shadow-orange-500/30 transition-all transform active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Confirming Reservation...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay & Confirm (₹{totalPayable.toLocaleString('en-IN')})</span>
                  </>
                )}
              </button>

              {cancellationPolicy && (
                <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4 text-xs text-slate-700 space-y-2">
                  <div className="flex items-center gap-2 font-black text-slate-900"><Clock className="w-4 h-4 text-[#FF6400]" /> Cancellation Policy</div>
                  <ul className="space-y-1 text-[11px] leading-5">
                    <li>• Within 1 hour of booking: 100% refund.</li>
                    <li>• Within 2 hours: {cancellationPolicy.afterOneHourCancellationFeePercent}% cancellation fee.</li>
                    <li>• Within 3 hours: {cancellationPolicy.afterTwoHoursCancellationFeePercent}% cancellation fee.</li>
                    <li>• 6–24 hours before pickup: {cancellationPolicy.sameDayCancellationFeePercent}% fee; under 6 hours: {cancellationPolicy.lateCancellationFeePercent}% fee.</li>
                    <li>• 24–48 hours before pickup: {cancellationPolicy.nextDayCancellationFeePercent}% fee; more than 48 hours: {cancellationPolicy.advanceCancellationFeePercent}% fee.</li>
                    <li>• Security deposit: fully refundable.</li>
                  </ul>
                </div>
              )}

              <div className="text-center">
                <span className="text-[11px] text-gray-400">Review the cancellation policy above before confirming your booking.</span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
export default BookingPage;
