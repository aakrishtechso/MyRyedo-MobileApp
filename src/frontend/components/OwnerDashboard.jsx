import React, { useState } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Car, 
  PlusCircle, 
  ShieldCheck, 
  Check, 
  X, 
  Edit3, 
  Sparkles, 
  Clock, 
  Users, 
  CreditCard, 
  Banknote, 
  ToggleLeft, 
  ToggleRight,
  Trash2,
  MapPin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const OwnerDashboard = ({
  currentUser,
  vehicles = [],
  bookings = [],
  payouts = [],
  onOpenListVehicle,
  onOpenEditVehicle,
  onToggleVehicleAvailability,
  onOpenVehicleDetails,
  onApproveBooking,
  onRejectBooking,
  onRequestPayout
}) => {
  const [activeTab, setActiveTab] = useState('listings'); // 'listings' | 'incoming' | 'payouts'
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);

  // Filter vehicles owned by host strictly by real authenticated user account
  const hostVehicles = currentUser?.role === 'owner'
    ? vehicles.filter(v => String(v.ownerId || v.owner?.id || '') === String(currentUser.id))
    : [];

  const hostVehicleIds = new Set(hostVehicles.map(v => v.id));
  const hostBookings = bookings.filter(b => hostVehicleIds.has(b.vehicleId));
  const pendingRequests = hostBookings.filter(b => b.status === 'pending');
  const confirmedBookings = hostBookings.filter(b => b.status === 'confirmed' || b.status === 'active');
  const completedBookings = hostBookings.filter(b => b.status === 'completed');

  // Dynamic earnings calculations (strictly computed from real store data)
  const totalGrossEarnings = hostBookings.reduce((sum, b) => {
    if (b.paymentStatus === 'paid' || b.status === 'completed' || b.status === 'confirmed') {
      return sum + (Number(b.basePrice) || Number(b.totalAmount) || 0);
    }
    return sum;
  }, 0);

  const platformCut = Math.round(totalGrossEarnings * 0.10); // 10% platform commission
  const netEarnings = totalGrossEarnings - platformCut;
  const requestedPayoutsTotal = payouts.reduce((sum, p) => p.status !== 'rejected' ? sum + (Number(p.amount) || 0) : sum, 0);
  const availablePayout = Math.max(0, netEarnings - requestedPayoutsTotal);

  const handlePayoutClick = () => {
    setIsRequestingPayout(true);
    setTimeout(() => {
      if (onRequestPayout) onRequestPayout(availablePayout);
      setIsRequestingPayout(false);
    }, 700);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* Top Banner with Fleet & Host Overview */}
      <div className="bg-[#111827] text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-gray-900/10 mb-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#FF6400] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Owner Fleet Portal
              </span>
              <span className="text-xs text-gray-400">Verified Fleet Host</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">
              Welcome, {currentUser?.name || 'Partner Host'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
              Control your vehicle listings, customize tariffs, accept reservations, and manage real-time payouts.
            </p>
          </div>

          <button
            id="owner-add-listing-btn"
            onClick={onOpenListVehicle}
            className="bg-[#FF6400] hover:bg-[#e05800] active:scale-95 text-white font-black text-xs px-5 py-3.5 rounded-2xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer self-start lg:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ List a New Vehicle</span>
          </button>
        </div>
      </div>

      {/* DYNAMIC METRIC CARDS (Section 39 requirements) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-gray-200">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Fleet</span>
          <span className="text-xl font-black text-gray-900 mt-1 block">{hostVehicles.length}</span>
          <span className="text-[10px] text-gray-500">Vehicles listed</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Active Listings</span>
          <span className="text-xl font-black text-emerald-600 mt-1 block">
            {hostVehicles.filter(v => v.isAvailable).length}
          </span>
          <span className="text-[10px] text-gray-500">Live in search</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Pending Requests</span>
          <span className={`text-xl font-black mt-1 block ${pendingRequests.length > 0 ? 'text-[#FF6400]' : 'text-gray-900'}`}>
            {pendingRequests.length}
          </span>
          <span className="text-[10px] text-gray-500">Requires action</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Confirmed</span>
          <span className="text-xl font-black text-blue-600 mt-1 block">{confirmedBookings.length}</span>
          <span className="text-[10px] text-gray-500">Booked & upcoming</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Completed</span>
          <span className="text-xl font-black text-gray-900 mt-1 block">{completedBookings.length}</span>
          <span className="text-[10px] text-gray-500">Rentals closed</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Net Revenue</span>
          <span className="text-xl font-black text-[#FF6400] mt-1 block">
            ₹{netEarnings.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-gray-500">After 10% fee</span>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex border-b border-gray-200 mb-6 gap-4">
        <button
          onClick={() => setActiveTab('listings')}
          className={`pb-3 text-xs sm:text-sm font-black transition-all cursor-pointer relative ${
            activeTab === 'listings'
              ? 'text-[#FF6400] border-b-2 border-[#FF6400]'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          My Vehicle Fleet ({hostVehicles.length})
        </button>

        <button
          onClick={() => setActiveTab('incoming')}
          className={`pb-3 text-xs sm:text-sm font-black transition-all cursor-pointer relative ${
            activeTab === 'incoming'
              ? 'text-[#FF6400] border-b-2 border-[#FF6400]'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          Incoming Bookings ({hostBookings.length})
          {pendingRequests.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-black bg-[#FF6400] text-white rounded-full">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`pb-3 text-xs sm:text-sm font-black transition-all cursor-pointer relative ${
            activeTab === 'payouts'
              ? 'text-[#FF6400] border-b-2 border-[#FF6400]'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          Payouts & Earnings
        </button>
      </div>

      {/* TAB 1: FLEET LISTINGS */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hostVehicles.map((vh) => (
              <div
                key={vh.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 bg-slate-50">
                    {Array.isArray(vh.images) && vh.images[0] ? (
                      <img
                        src={vh.images[0]}
                        alt={vh.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <Car className="w-10 h-10 mx-auto text-slate-300" />
                          <p className="mt-2 text-[11px] font-bold text-slate-400">{vh.category || 'Vehicle'}</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        vh.isAvailable 
                          ? 'bg-emerald-500 text-white shadow-xs' 
                          : 'bg-gray-700 text-white'
                      }`}>
                        {vh.isAvailable ? 'Active in Search' : 'Paused / Offline'}
                      </span>

                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/90 text-gray-800 shadow-xs">
                        {Number.isFinite(Number(vh.rating)) && Number(vh.rating) > 0 ? `★ ${Number(vh.rating).toFixed(1)}` : 'No rating yet'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-black text-gray-900">{vh.name}</h4>
                        <span className="text-xs text-gray-400 font-mono block">Plate: {vh.plateNumber}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-[#FF6400]">₹{vh.pricePerDay}</span>
                        <span className="text-[10px] text-gray-400 block">/ day</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{vh.location}</span>
                    </div>

                    <div className="text-[11px] text-gray-500 flex gap-2 font-medium">
                      <span>{vh.fuel}</span>
                      <span>·</span>
                      <span>{vh.transmission}</span>
                      <span>·</span>
                      <span>{vh.seats} Seats</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-gray-100 flex items-center justify-between mt-2">
                  {/* Availability Toggle */}
                  <button
                    type="button"
                    onClick={() => onToggleVehicleAvailability(vh.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-gray-900 cursor-pointer"
                  >
                    {vh.isAvailable ? (
                      <ToggleRight className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-400" />
                    )}
                    <span className="text-[11px]">{vh.isAvailable ? 'Listed' : 'Paused'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenEditVehicle(vh)}
                      className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer"
                      title="Edit vehicle details & pricing"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenVehicleDetails(vh)}
                      className="px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold cursor-pointer transition-colors"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: INCOMING BOOKINGS */}
      {activeTab === 'incoming' && (
        <div className="space-y-4">
          {hostBookings.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center text-gray-500">
              No booking requests received yet.
            </div>
          ) : (
            <div className="space-y-3">
              {hostBookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center gap-4">
                    {b.vehicle?.images?.[0] ? (
                      <img
                        src={b.vehicle.images[0]}
                        alt={b.vehicle.name}
                        className="w-16 h-12 object-cover rounded-xl border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-12 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center shrink-0 text-gray-400">
                        <Car className="w-6 h-6" />
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-gray-900">{b.vehicle?.name || 'Vehicle'}</h4>
                        <span className="text-xs font-mono text-gray-400">Ref: {b.id}</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Booker: <strong className="text-gray-900">{b.bookerName || 'Verified Renter'}</strong> {b.bookerPhone ? `(${b.bookerPhone})` : ''}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{b.startDate} to {b.endDate} ({b.totalDays || 1} Days)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-sm font-black text-[#FF6400]">
                        ₹{Number(b.basePrice ?? b.totalAmount ?? 0).toLocaleString('en-IN')}
                      </span>
                      <span className={`text-[10px] font-black uppercase block ${
                        b.status === 'confirmed' ? 'text-emerald-600' : b.status === 'pending' ? 'text-amber-600' : 'text-gray-500'
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    {b.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onApproveBooking(b.id)}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRejectBooking(b.id)}
                          className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAYOUTS & EARNINGS */}
      {activeTab === 'payouts' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-gray-400 block">
                  Available for Instant Payout
                </span>
                <span className="text-3xl font-black text-[#FF6400] mt-1 block">
                  ₹{availablePayout.toLocaleString('en-IN')}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Transfers directly via IMPS / NEFT to your registered bank account.
                </p>
              </div>

              <button
                type="button"
                disabled={availablePayout <= 0 || isRequestingPayout}
                onClick={handlePayoutClick}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-600/20"
              >
                {isRequestingPayout ? 'Transferring...' : 'Request Payout Now'}
              </button>
            </div>

            {/* Linked Bank Account Card */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1769D1] flex items-center justify-center">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-gray-900">
                    {currentUser?.bankName ? `${currentUser.bankName} Account` : 'Registered Bank Account'}
                  </h5>
                  <span className="text-[11px] text-gray-500 font-mono">
                    {currentUser?.bankAccount ? `A/C: •••• ${currentUser.bankAccount.slice(-4)}` : 'Bank transfer enabled via NEFT/IMPS'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Verified Account
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
