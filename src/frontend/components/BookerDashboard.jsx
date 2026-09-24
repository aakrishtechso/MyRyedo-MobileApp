import React, { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  Download, 
  Clock, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Phone, 
  MessageSquare, 
  CreditCard, 
  Banknote, 
  Sparkles,
  ArrowRight,
  XCircle,
  FileText,
  Car
} from 'lucide-react';

export const BookerDashboard = ({
  currentUser,
  bookings = [],
  onOpenVehicleDetails,
  onOpenChat,
  onCancelBooking,
  onExploreVehicles
}) => {
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'active' | 'completed' | 'cancelled'
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState(null);

  // Filter bookings for this booker
  const userBookings = currentUser 
    ? bookings.filter(b => b.bookerId === currentUser.id || b.renterId === currentUser.id || b.bookerName === currentUser.name)
    : bookings;

  const activeBookings = userBookings.filter(b => b.status === 'active');
  const upcomingBookings = userBookings.filter(b => b.status === 'confirmed' || b.status === 'pending');
  const completedBookings = userBookings.filter(b => b.status === 'completed');
  const cancelledBookings = userBookings.filter(b => b.status === 'cancelled' || b.status === 'rejected');

  const nextUpcoming = upcomingBookings[0] || activeBookings[0];

  const getDisplayedList = () => {
    switch (activeTab) {
      case 'active': return activeBookings;
      case 'upcoming': return upcomingBookings;
      case 'completed': return completedBookings;
      case 'cancelled': return cancelledBookings;
      default: return upcomingBookings;
    }
  };

  const currentList = getDisplayedList();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* Top Welcome & Summary Header */}
      <div className="bg-[#111827] text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-gray-900/10 mb-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#FF6400] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Booker Account
              </span>
              <span className="text-xs text-gray-400">MyRyedo Verified Member</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">
              Welcome, {currentUser?.name || 'Valued Member'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
              Track your upcoming reservations, access digital invoices, and verify vehicle pickup requirements.
            </p>
          </div>

          <button
            onClick={onExploreVehicles}
            className="bg-[#FF6400] hover:bg-[#e05800] active:scale-95 text-white font-black text-xs px-5 py-3.5 rounded-2xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
          >
            <span>Book Another Ride</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* HIGHLIGHTED NEXT UPCOMING BOOKING BANNER */}
      {nextUpcoming && (
        <div className="mb-8 bg-orange-50/60 border-2 border-orange-200/80 rounded-3xl p-6 relative">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {nextUpcoming.vehicle?.images?.[0] ? (
                <img
                  src={nextUpcoming.vehicle.images[0]}
                  alt={nextUpcoming.vehicle?.name || 'Vehicle'}
                  className="w-full sm:w-36 h-28 object-cover rounded-2xl border border-orange-200"
                />
              ) : (
                <div className="w-full sm:w-36 h-28 bg-orange-100/50 rounded-2xl border border-orange-200 flex items-center justify-center text-[#FF6400]">
                  <Car className="w-10 h-10" />
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-[#FF6400] text-white px-2 py-0.5 rounded-md">
                    Next Up
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-600">
                    Ref: {nextUpcoming.id}
                  </span>
                </div>
                <h3 className="text-lg font-black text-gray-900">
                  {nextUpcoming.vehicle.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-gray-600 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#FF6400]" />
                    {nextUpcoming.startDate} ({nextUpcoming.pickupTime || '10:00 AM'})
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {nextUpcoming.pickupLocation}
                  </span>
                </div>
                <p className="text-xs text-orange-950/80 font-medium pt-1">
                  🔒 Reminder: Original Driving Licence & ID must be shown to owner at pickup.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end lg:self-center">
              <button
                type="button"
                onClick={() => onOpenVehicleDetails(nextUpcoming.vehicle)}
                className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-xs font-bold text-gray-800 transition-all cursor-pointer shadow-xs"
              >
                Vehicle Specs
              </button>
              <button
                type="button"
                onClick={() => onCancelBooking(nextUpcoming.id)}
                className="px-4 py-2.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-xs font-bold text-rose-600 transition-all cursor-pointer shadow-xs"
              >
                Cancel Ride
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-gray-200 mb-6 gap-2 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-3 px-2 text-xs sm:text-sm font-black transition-all cursor-pointer relative whitespace-nowrap ${
            activeTab === 'upcoming'
              ? 'text-[#FF6400] border-b-2 border-[#FF6400]'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          Upcoming Bookings ({upcomingBookings.length})
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 px-2 text-xs sm:text-sm font-black transition-all cursor-pointer relative whitespace-nowrap ${
            activeTab === 'active'
              ? 'text-[#FF6400] border-b-2 border-[#FF6400]'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          Active Trips ({activeBookings.length})
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`pb-3 px-2 text-xs sm:text-sm font-black transition-all cursor-pointer relative whitespace-nowrap ${
            activeTab === 'completed'
              ? 'text-[#FF6400] border-b-2 border-[#FF6400]'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          Completed ({completedBookings.length})
        </button>

        <button
          onClick={() => setActiveTab('cancelled')}
          className={`pb-3 px-2 text-xs sm:text-sm font-black transition-all cursor-pointer relative whitespace-nowrap ${
            activeTab === 'cancelled'
              ? 'text-[#FF6400] border-b-2 border-[#FF6400]'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          Cancelled ({cancelledBookings.length})
        </button>
      </div>

      {/* BOOKING LIST */}
      {currentList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900">No {activeTab} bookings</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              You do not have any {activeTab} reservations. Browse our verified fleet to find your next ride.
            </p>
          </div>
          <button
            type="button"
            onClick={onExploreVehicles}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF6400] text-white text-xs font-black hover:bg-[#e05800] transition-colors cursor-pointer shadow-xs"
          >
            <span>Explore Available Vehicles</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentList.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition-all space-y-4"
            >
              {/* Card top */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {b.vehicle?.images?.[0] ? (
                    <img
                      src={b.vehicle.images[0]}
                      alt={b.vehicle?.name || 'Vehicle'}
                      className="w-16 h-12 object-cover rounded-xl border border-gray-100"
                    />
                  ) : (
                    <div className="w-16 h-12 bg-gray-100 rounded-xl border border-gray-100 flex items-center justify-center text-gray-400">
                      <Car className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-black text-gray-900">{b.vehicle?.name || 'Vehicle'}</h4>
                    <span className="text-[11px] font-mono text-gray-400">ID: {b.id}</span>
                  </div>
                </div>

                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                  b.status === 'confirmed' || b.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : b.status === 'cancelled'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {b.status}
                </span>
              </div>

              {/* Card dates & location */}
              <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs text-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium">Rental Period:</span>
                  <span className="font-bold">{b.startDate} to {b.endDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium">Pickup Hub:</span>
                  <span className="font-bold truncate max-w-[200px]">{b.pickupLocation}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium">Payment Mode:</span>
                  <span className="font-bold text-[#FF6400] uppercase text-[11px]">
                    {b.paymentMethod === 'online' ? 'Paid Online' : 'Pay at Pickup'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                  <span className="text-gray-500 font-bold">Total Tariff:</span>
                  <span className="font-black text-gray-900">₹{(b.totalAmount || b.basePrice).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Card action buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceBooking(b)}
                  className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-gray-400" />
                  <span>View Tax Invoice</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenChat && onOpenChat(b)}
                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer"
                    title="Contact Host"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  {(b.status === 'confirmed' || b.status === 'pending') && (
                    <button
                      type="button"
                      onClick={() => onCancelBooking(b.id)}
                      className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAX INVOICE MODAL VIEW */}
      {selectedInvoiceBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-gray-100 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900">Tax Invoice</h3>
                <span className="text-xs text-gray-400 font-mono">Invoice #{selectedInvoiceBooking.id}</span>
              </div>
              <button
                onClick={() => setSelectedInvoiceBooking(null)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Booked By:</span>
                <span className="font-bold text-gray-900">{selectedInvoiceBooking.bookerName || currentUser?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vehicle:</span>
                <span className="font-bold text-gray-900">{selectedInvoiceBooking.vehicle.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Duration:</span>
                <span className="font-bold text-gray-900">{selectedInvoiceBooking.totalDays || 1} Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Base Tariff:</span>
                <span className="font-bold text-gray-900">₹{selectedInvoiceBooking.basePrice?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Platform Fee:</span>
                <span className="font-bold text-gray-900">₹{Number(selectedInvoiceBooking.platformFee ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">GST / Taxes:</span>
                <span className="font-bold text-gray-900">₹{Number(selectedInvoiceBooking.taxes ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-black text-gray-900">
                <span>Total Amount:</span>
                <span className="text-[#FF6400]">₹{(selectedInvoiceBooking.totalAmount || selectedInvoiceBooking.basePrice)?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between">
              <span>Status: {selectedInvoiceBooking.paymentStatus === 'paid' ? 'PAID ONLINE' : 'PAY AT PICKUP'}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>

            <button
              type="button"
              onClick={() => setSelectedInvoiceBooking(null)}
              className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
            >
              Close Invoice
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
