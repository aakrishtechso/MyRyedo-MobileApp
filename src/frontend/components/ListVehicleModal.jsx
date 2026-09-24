import React, { useMemo, useState } from 'react';
import { 
  X, 
  Car, 
  CheckCircle2, 
  ShieldCheck, 
  MapPin, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Fuel, 
  Gauge, 
  Users, 
  CreditCard,
  Banknote,
  Check,
  AlertCircle
} from 'lucide-react';
import { LocationPicker } from './LocationPicker.jsx';
import { VehicleVisual } from './VehicleVisual.jsx';
import { backendService } from '../../backend/api.js';

export const ListVehicleModal = ({
  isOpen,
  onClose,
  currentUser,
  onVehicleAdded,
  isPageMode = false
}) => {
  const [step, setStep] = useState(1);
  const [errorText, setErrorText] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Vehicle Details
  const [category, setCategory] = useState('cars');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [fuel, setFuel] = useState('Petrol');
  const [transmission, setTransmission] = useState('Manual');
  const [seats, setSeats] = useState(5);
  const [description, setDescription] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [imageError, setImageError] = useState(null);

  // Step 2: Pricing & Rental Duration Limits
  const [dailyRentalEnabled, setDailyRentalEnabled] = useState(true);
  const [pricePerDay, setPricePerDay] = useState('');
  const [minRentalDays, setMinRentalDays] = useState(1);
  const [hasMaxDaysLimit, setHasMaxDaysLimit] = useState(false);
  const [maxRentalDays, setMaxRentalDays] = useState(15);
  const [weeklyDiscount, setWeeklyDiscount] = useState(0);
  const [monthlyDiscount, setMonthlyDiscount] = useState(0);
  const [securityDeposit, setSecurityDeposit] = useState('');

  // Hourly Rental (Separate Configuration)
  const [hourlyRentalEnabled, setHourlyRentalEnabled] = useState(false);
  const [hourlyPrice, setHourlyPrice] = useState('');
  const [minRentalHours, setMinRentalHours] = useState(1);
  const [maxRentalHours, setMaxRentalHours] = useState(24);

  // Step 3: Availability & Rules
  const [isAvailable, setIsAvailable] = useState(true);
  const [instantBooking, setInstantBooking] = useState(true);
  const [allowInterstate, setAllowInterstate] = useState(true);

  // Step 4: Pickup Location
  const [locationCity, setLocationCity] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [locationCoords, setLocationCoords] = useState(null);
  const [pickupType, setPickupType] = useState('public_nearby');
  const [stateName, setStateName] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Step 5: Payment Options
  const [acceptOnline, setAcceptOnline] = useState(true);
  const [acceptPayAtPickup, setAcceptPayAtPickup] = useState(true);

  const stepsList = [
    'Vehicle Details',
    'Pricing & Duration',
    'Availability & Rules',
    'Pickup Location',
    'Payment Options',
    'Review & Publish'
  ];

  if (!isOpen && !isPageMode) return null;

  const handleImageFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setImageError(null);
    const accepted = files.filter((file) => file.type.startsWith('image/') && file.size <= 2 * 1024 * 1024);
    if (accepted.length !== files.length) {
      setImageError('Only image files up to 2 MB each can be added.');
    }
    const available = Math.max(0, 6 - imageUrls.length);
    const selected = accepted.slice(0, available);
    const encoded = await Promise.all(selected.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxSide = 1600;
          const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
          canvas.height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Image processing is unavailable.'));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = String(reader.result || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
    setImageUrls((prev) => [...prev, ...encoded.filter(Boolean)].slice(0, 6));
    event.target.value = '';
  };

  const removeImage = (index) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    setErrorText(null);
    if (step === 1) {
      if (!brand.trim() || !model.trim() || !year || !fuel || !transmission || !seats) {
        setErrorText('Please enter the vehicle make, model, year, fuel type, transmission and seat count.');
        return;
      }
      const numericYear = Number(year);
      const numericSeats = Number(seats);
      if (!Number.isInteger(numericYear) || numericYear < 1950 || numericYear > new Date().getFullYear()) {
        setErrorText('Please enter a valid registration year.');
        return;
      }
      if (!Number.isInteger(numericSeats) || numericSeats <= 0) {
        setErrorText('Please select a valid seating capacity.');
        return;
      }
      if (!regNumber.trim()) {
        setErrorText('Please enter the registration plate number (e.g., MH-12-AB-1234).');
        return;
      }
    }
    if (step === 2) {
      if (dailyRentalEnabled && (!pricePerDay || Number(pricePerDay) < 100)) {
        setErrorText('Enter a valid daily price of at least ₹100.');
        return;
      }
      if (hourlyRentalEnabled && (!hourlyPrice || Number(hourlyPrice) <= 0)) {
        setErrorText('Enter a valid hourly price.');
        return;
      }
    }
    if (step === 4) {
      if (!pickupAddress.trim()) {
        setErrorText('Please provide a specific pickup location or address.');
        return;
      }
    }
    if (step === 5) {
      if (!acceptOnline && !acceptPayAtPickup) {
        setErrorText('Please select at least one accepted payment option (Online or Pay at Pickup).');
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 6));
  };

  const handleBack = () => {
    setErrorText(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorText(null);

    const authCheck = backendService.authorizeAction(currentUser, 'create_vehicle');
    if (!authCheck.authorized) {
      setErrorText(authCheck.error);
      return;
    }

    const newVehicle = {
      id: `vh-${Date.now()}`,
      name: `${brand.trim()} ${model.trim()} (${year})`,
      category,
      type: `${brand.trim()} ${category === 'bikes' ? 'Motorcycle' : category === 'scooters' ? 'Scooter' : category === 'suvs' ? 'SUV' : 'Vehicle'}`,
      brand: brand.trim(),
      model: model.trim(),
      year: Number(year),
      tripsCount: 0,
      location: `${locationCity} · ${pickupAddress}`,
      pickupAddress,
      pickupInstructions,
      pickupType,
      coordinates: locationCoords,
      state: stateName,
      postalCode,
      fuel,
      transmission,
      seats: Number(seats),
      plateNumber: regNumber.trim().toUpperCase(),
      images: imageUrls.filter(Boolean).slice(0, 6),
      features: [],
      specs: {},
      verified: false,
      verificationStatus: 'pending',
      description: description.trim(),
      isAvailable,
      instantBooking,
      dailyRentalEnabled,
      dailyPrice: Number(pricePerDay),
      pricePerDay: Number(pricePerDay),
      minRentalDays: Number(minRentalDays) || 1,
      maxRentalDays: (dailyRentalEnabled && hasMaxDaysLimit && Number(maxRentalDays) > 0) ? Number(maxRentalDays) : null,
      weeklyDiscountPercent: Number(weeklyDiscount) || 0,
      monthlyDiscountPercent: Number(monthlyDiscount) || 0,
      securityDeposit: Number(securityDeposit) || 0,
      hourlyRentalEnabled,
      hourlyPrice: Number(hourlyPrice),
      minRentalHours: Number(minRentalHours) || 1,
      maxRentalHours: Number(maxRentalHours) || 24,
      allowInterstate,
      paymentOptions: {
        acceptOnline,
        acceptPayAtPickup
      },
      owner: {
        id: currentUser?.id || '',
        name: currentUser?.name || '',
        avatar: currentUser?.avatar || null,
        phone: currentUser?.phone || '',
        email: currentUser?.email || '',
        tripsCount: 0,
        
      },
      createdAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      const res = await backendService.createVehicle(newVehicle);
      if (res && res.success && res.vehicle) {
        onVehicleAdded?.(res.vehicle);
        onClose?.();
      } else {
        setErrorText(res?.error || 'We could not publish this vehicle. Please try again.');
      }
    } catch {
      setErrorText('We could not reach MyRyedo. Your vehicle was not published. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewVehicle = {
    name: `${brand} ${model} (${year})`,
    category,
    brand,
    model,
    year,
    fuel,
    transmission,
    images: imageUrls.filter(Boolean)
  };

  return (
    <div className={isPageMode ? "w-full max-w-4xl mx-auto" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"}>
      <div className={`bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 my-8 transition-all animate-in fade-in zoom-in-95 duration-200 ${isPageMode ? 'shadow-sm border' : ''}`}>
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6400]/10 text-[#FF6400] flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#111827]">List Your Vehicle on MyRyedo</h3>
              <p className="text-xs text-gray-500">Earn income by sharing your vehicle with verified drivers</p>
            </div>
          </div>
          {!isPageMode && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Bar & Steps indicator */}
        <div className="px-6 pt-4 pb-2 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-[#FF6400]">
              Step {step} of 6: {stepsList[step - 1]}
            </span>
            <span className="text-[11px] font-bold text-gray-400">
              {Math.round((step / 6) * 100)}% Completed
            </span>
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-[#FF6400] h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Error banner */}
        {errorText && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* STEP 1: VEHICLE DETAILS */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-gray-500 uppercase block mb-1">
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'cars', label: 'Cars', icon: Car },
                    { id: 'bikes', label: 'Bikes', icon: Sparkles },
                    { id: 'scooters', label: 'Scooters', icon: Sparkles },
                    { id: 'evs', label: 'EV', icon: Sparkles },
                    { id: 'suvs', label: 'SUVs', icon: Car },
                    { id: 'vans', label: 'Vans', icon: Car },
                    { id: 'luxury', label: 'Luxury', icon: Sparkles }
                  ].map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        category === cat.id
                          ? 'border-[#FF6400] bg-orange-50 text-[#FF6400] shadow-xs'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <cat.icon className="w-5 h-5" />
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase block mb-1">
                    Brand / Manufacturer *
                  </label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Tata, Hyundai, Royal Enfield"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#111827] focus:border-[#FF6400] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase block mb-1">
                    Model Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. Nexon EV, Creta, Classic 350"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#111827] focus:border-[#FF6400] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase block mb-1">
                    Registration Year
                  </label>
                  <input
                    type="number"
                    min="2012"
                    max="2026"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#111827] focus:border-[#FF6400] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase block mb-1">
                    License Plate *
                  </label>
                  <input
                    type="text"
                    required
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    placeholder="MH-12-AB-1234"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#111827] uppercase focus:border-[#FF6400] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase block mb-1">
                    Seating Capacity
                  </label>
                  <select
                    value={seats}
                    onChange={(e) => setSeats(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#111827] focus:border-[#FF6400] focus:outline-none"
                  >
                    {[2, 4, 5, 7, 8].map((s) => (
                      <option key={s} value={s}>{s} Seats</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase block mb-1">
                    Fuel Type
                  </label>
                  <select
                    value={fuel}
                    onChange={(e) => setFuel(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#111827] focus:border-[#FF6400] focus:outline-none"
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric (EV)</option>
                    <option value="CNG">CNG</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-gray-500 uppercase block mb-1">
                    Transmission
                  </label>
                  <select
                    value={transmission}
                    onChange={(e) => setTransmission(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#111827] focus:border-[#FF6400] focus:outline-none"
                  >
                    <option value="Manual">Manual</option>
                    <option value="Automatic">Automatic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-gray-500 uppercase block mb-1">
                  Vehicle Description & Special Features
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your vehicle's condition, features, or guidelines for drivers..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-[#111827] focus:border-[#FF6400] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-black text-gray-500 uppercase">Vehicle Images</label>
                  <span className="text-[10px] font-bold text-gray-400">Optional · up to 6 images</span>
                </div>
                <label className="flex items-center justify-center min-h-24 rounded-2xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={handleImageFiles} />
                  <span className="text-xs font-black text-slate-600">Choose vehicle photos</span>
                </label>
                {imageError && <p className="text-[11px] font-bold text-rose-600">{imageError}</p>}
                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {imageUrls.map((url, index) => (
                      <div key={`${url.slice(0, 24)}-${index}`} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                        <img src={url} alt={`Vehicle preview ${index + 1}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeImage(index)} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/95 text-slate-700 shadow-sm flex items-center justify-center" aria-label={`Remove image ${index + 1}`}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PRICING & RENTAL DURATIONS */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    Daily Rental Tariff
                  </h4>
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    Standard Booking
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-black text-gray-500 uppercase block mb-1">
                    Daily Tariff Rate (₹ / Day) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-gray-400 font-black text-xs">₹</span>
                    <input
                      type="number"
                      min="100"
                      step="50"
                      value={pricePerDay}
                      onChange={(e) => setPricePerDay(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm font-black text-[#111827] focus:border-[#FF6400] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                      Maximum Duration Limit
                    </label>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                        <input
                          type="radio"
                          name="maxDurationType"
                          checked={!hasMaxDaysLimit}
                          onChange={() => setHasMaxDaysLimit(false)}
                          className="accent-[#FF6400]"
                        />
                        <span>No Maximum Limit</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                        <input
                          type="radio"
                          name="maxDurationType"
                          checked={hasMaxDaysLimit}
                          onChange={() => setHasMaxDaysLimit(true)}
                          className="accent-[#FF6400]"
                        />
                        <span>Cap Max Rental Days</span>
                      </label>
                    </div>
                  </div>
                </div>

                {hasMaxDaysLimit && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs flex items-center gap-2">
                    <span className="font-bold text-amber-900">Cap max rental at:</span>
                    <input
                      type="number"
                      min={minRentalDays}
                      value={maxRentalDays}
                      onChange={(e) => setMaxRentalDays(Math.max(minRentalDays, Number(e.target.value)))}
                      className="w-20 px-2 py-1 bg-white rounded-lg border border-amber-300 font-bold text-gray-900 text-xs text-center"
                    />
                    <span className="font-bold text-amber-900">days</span>
                  </div>
                )}
              </div>

              {/* Security Deposit */}
              <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-gray-900 block">
                  Refundable Security Deposit (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-gray-400 font-black text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="250"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm font-black text-[#111827] focus:border-[#FF6400] focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  Safely held in MyRyedo Escrow during the rental and released back to renter upon return.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: AVAILABILITY & RULES */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-2xl border border-gray-100">
                <div>
                  <h5 className="text-xs font-black text-[#111827]">Active in Search</h5>
                  <p className="text-[11px] text-gray-500">Make this vehicle immediately visible to bookers.</p>
                </div>
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="w-5 h-5 accent-[#FF6400] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-2xl border border-gray-100">
                <div>
                  <h5 className="text-xs font-black text-[#111827]">Instant Booking</h5>
                  <p className="text-[11px] text-gray-500">Verified drivers can book without prior host manual approval.</p>
                </div>
                <input
                  type="checkbox"
                  checked={instantBooking}
                  onChange={(e) => setInstantBooking(e.target.checked)}
                  className="w-5 h-5 accent-[#FF6400] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-2xl border border-gray-100">
                <div>
                  <h5 className="text-xs font-black text-[#111827]">Allow Interstate Travel</h5>
                  <p className="text-[11px] text-gray-500">Permit drivers to travel across state borders.</p>
                </div>
                <input
                  type="checkbox"
                  checked={allowInterstate}
                  onChange={(e) => setAllowInterstate(e.target.checked)}
                  className="w-5 h-5 accent-[#FF6400] rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* STEP 4: PICKUP LOCATION */}
          {step === 4 && (
            <LocationPicker
              initialAddress={pickupAddress}
              initialCity={locationCity}
              initialCoords={locationCoords}
              initialPickupType={pickupType}
              initialInstructions={pickupInstructions}
              onChange={(loc) => {
                if (loc.coordinates) setLocationCoords(loc.coordinates);
                if (loc.address) setPickupAddress(loc.address);
                if (loc.city) setLocationCity(loc.city);
                if (loc.state) setStateName(loc.state);
                if (loc.postalCode) setPostalCode(loc.postalCode);
                if (loc.pickupType) setPickupType(loc.pickupType);
                if (loc.instructions !== undefined) setPickupInstructions(loc.instructions);
              }}
            />
          )}

          {/* STEP 5: PAYMENT OPTIONS */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-[#111827]">Accepted Payment Methods</h4>
                <p className="text-xs text-gray-500">
                  Select which payment modes you accept from drivers.
                </p>
              </div>

              <div 
                onClick={() => setAcceptOnline(!acceptOnline)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  acceptOnline 
                    ? 'border-[#FF6400] bg-orange-50/40' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-[#111827]">Accept Online Payment</h5>
                    <p className="text-[11px] text-gray-500">UPI, Cards, Net Banking secured in MyRyedo Escrow</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={acceptOnline}
                  onChange={() => {}}
                  className="w-5 h-5 accent-[#FF6400] rounded cursor-pointer"
                />
              </div>

              <div 
                onClick={() => setAcceptPayAtPickup(!acceptPayAtPickup)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  acceptPayAtPickup 
                    ? 'border-[#FF6400] bg-orange-50/40' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-[#111827]">Accept Pay at Pickup</h5>
                    <p className="text-[11px] text-gray-500">Allow drivers to pay at key handover</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={acceptPayAtPickup}
                  onChange={() => {}}
                  className="w-5 h-5 accent-[#FF6400] rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW & PUBLISH */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-gray-100 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-200">
                    <VehicleVisual vehicle={previewVehicle} className="w-full h-full" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#111827]">
                      {brand} {model} ({year})
                    </h4>
                    <p className="text-xs text-gray-500">
                      {fuel} · {transmission} · {seats} Seats · {regNumber || 'Registration pending'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-200/60">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Daily Rate</span>
                    <span className="font-black text-[#FF6400] text-sm">₹{pricePerDay} / day</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Deposit</span>
                    <span className="font-bold text-gray-800">₹{securityDeposit}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Pickup Location</span>
                    <span className="font-bold text-gray-800 truncate block">{locationCity} · {pickupAddress}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Payment Modes</span>
                    <span className="font-bold text-gray-800">
                      {[acceptOnline && 'Online', acceptPayAtPickup && 'Pay at Pickup'].filter(Boolean).join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-medium text-emerald-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Your vehicle will be listed immediately on MyRyedo and ready for bookings.</span>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : <div />}

            {step < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-[#FF6400] hover:bg-[#e05800] text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Publishing...' : 'Publish Vehicle Listing'}</span>
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};
