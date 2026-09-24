import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  MapPin, 
  DollarSign, 
  HelpCircle,
  FileText,
  Loader2,
  Users
} from 'lucide-react';
import { backendService } from '../../backend/api.js';
import { VehicleVisual } from '../components/VehicleVisual.jsx';

export const CancellationPage = ({
  booking,
  onBack,
  onCancelled,
  showToast
}) => {
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [preview, setPreview] = useState(null);
  const [reason, setReason] = useState('Change of travel plans');
  const [customNotes, setCustomNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelledSuccess, setIsCancelledSuccess] = useState(false);
  const [cancellationResult, setCancellationResult] = useState(null);

  useEffect(() => {
    if (!booking) return;
    setLoadingPreview(true);
    backendService.getCancelPreview(booking.id)
      .then((data) => {
        if (data.success) {
          setPreview(data);
        } else {
          showToast(data.error || 'Failed to load cancellation preview');
        }
      })
      .catch((err) => {
        console.error('Cancellation preview error', err);
        showToast('Network error loading cancellation policy calculation');
      })
      .finally(() => {
        setLoadingPreview(false);
      });
  }, [booking?.id]);

  if (!booking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 font-bold">No active booking selected for cancellation.</p>
        <button 
          onClick={onBack}
          className="mt-4 px-6 py-2.5 bg-[#FF6400] text-white font-bold rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleConfirmCancellation = async () => {
    setIsSubmitting(true);
    try {
      const fullReason = customNotes.trim() ? `${reason} - ${customNotes.trim()}` : reason;
      const res = await backendService.cancelBookingWithRefund(booking.id, fullReason);
      if (res.success) {
        setIsCancelledSuccess(true);
        setCancellationResult(res);
        if (onCancelled) {
          onCancelled(res.booking);
        }
        showToast('Booking cancelled successfully. Refund initiated.');
      } else {
        showToast(res.error || 'Could not cancel booking.');
      }
    } catch (e) {
      showToast('Network error processing cancellation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const vehicle = booking.vehicle || {};
  const totalAmount = Number(booking.totalPrice || booking.totalPayable || 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        
        {/* Breadcrumb / Back button */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#111827] bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {isCancelledSuccess ? (
          /* Success Screen */
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-100 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black text-emerald-600 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full">
                Cancellation Processed
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#111827]">
                Booking #{booking.id} has been cancelled
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                Your cancellation request and refund calculation have been permanently recorded.
              </p>
            </div>

            {/* Refund Receipt Summary */}
            <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-gray-100 text-left max-w-lg mx-auto space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500">Total Booking Paid</span>
                <span className="font-black text-gray-900">₹{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500">Applicable Policy</span>
                <span className="font-bold text-blue-600 capitalize">
                  {cancellationResult?.refundCalculation?.tierName || 'Policy'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500">Cancellation Fee</span>
                <span className="font-bold text-rose-600">
                  - ₹{(cancellationResult?.refundCalculation?.cancellationFee || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 text-sm">
                <span className="font-black text-gray-900">Refund Amount Credited</span>
                <span className="font-black text-emerald-600">
                  ₹{(cancellationResult?.refundCalculation?.refundAmount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Notification note */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-800 flex items-center gap-3 text-left max-w-lg mx-auto">
              <Users className="w-5 h-5 text-[#1769D1] shrink-0" />
              <span>
                The vehicle has been automatically released back to the fleet, and next eligible users on the priority waiting list have been notified.
              </span>
            </div>

            <div>
              <button
                onClick={onBack}
                className="bg-[#111827] hover:bg-black text-white text-xs font-black px-8 py-3 rounded-xl cursor-pointer shadow-md"
              >
                Return to My Bookings
              </button>
            </div>
          </div>
        ) : (
          /* Cancellation Review & Confirmation Form */
          <div className="space-y-6">
            
            {/* Header Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-rose-100 text-rose-700 text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                  Cancellation & Refund
                </span>
                <span className="text-xs text-gray-400 font-bold">Booking #{booking.id}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#111827]">
                Cancel Reservation
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Review your transparent refund calculation under MyRyedo's cancellation policy.
              </p>
            </div>

            {/* Vehicle & Trip Summary Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-slate-200"><VehicleVisual vehicle={vehicle} className="w-full h-full" aspectRatio="h-full" /></div>
              <div className="flex-1 space-y-1 text-xs">
                <h3 className="text-base font-black text-[#111827]">{vehicle.name || 'Vehicle'}</h3>
                <div className="flex items-center gap-2 text-gray-500">
                  <MapPin className="w-3.5 h-3.5 text-[#FF6400]" />
                  <span>{vehicle.location || vehicle.pickupAddress || 'Pickup location not provided'}</span>
                </div>
                <div className="flex items-center gap-4 text-gray-500 pt-1">
                  <span className="flex items-center gap-1 font-bold">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    {booking.startDate} ({booking.pickupTime || '10:00'})
                  </span>
                  <span>→</span>
                  <span className="flex items-center gap-1 font-bold">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    {booking.endDate} ({booking.returnTime || '10:00'})
                  </span>
                </div>
              </div>
              <div className="text-right sm:border-l sm:border-gray-100 sm:pl-4">
                <span className="text-[11px] text-gray-400 block font-bold">Total Paid</span>
                <span className="text-lg font-black text-gray-900">₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Real-Time Refund Preview Calculation */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Cancellation Refund Breakdown
                </h3>
                {loadingPreview && (
                  <span className="flex items-center gap-1.5 text-xs text-blue-600 font-bold animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Calculating policy...
                  </span>
                )}
              </div>

              {preview?.refundCalculation ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <p className="font-black text-emerald-900">
                        {preview.refundCalculation.tierName}
                      </p>
                      <p className="text-emerald-700">
                        {preview.refundCalculation.message}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-gray-100 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Booking Total Paid</span>
                      <span className="font-bold text-gray-900">₹{preview.refundCalculation.totalPaid?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Cancellation Fee ({preview.refundCalculation.feePercent}%)</span>
                      <span className="font-bold text-rose-600">
                        {preview.refundCalculation.cancellationFee > 0 ? `- ₹${preview.refundCalculation.cancellationFee?.toLocaleString()}` : '₹0 (Free Cancellation)'}
                      </span>
                    </div>
                    {preview.refundCalculation.securityDepositRefund > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Security Deposit Refund (100% Guaranteed)</span>
                        <span className="font-bold text-emerald-600">+ ₹{preview.refundCalculation.securityDepositRefund?.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-sm font-black">
                      <span className="text-gray-900">Estimated Refund to Original Payment Method</span>
                      <span className="text-emerald-600">₹{preview.refundCalculation.refundAmount?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ) : !loadingPreview ? (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-700">
                  We couldn't load the live cancellation calculation. Please try again before confirming cancellation.
                </div>
              ) : null}

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-600">
                The refund amount shown above is calculated from the booking's current cancellation rules. Review the live calculation before you confirm.
              </div>
            </div>

            {/* Cancellation Reason Form */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-gray-900">
                Please tell us why you are cancelling
              </h3>

              <div className="space-y-2 text-xs">
                {[
                  'Change of travel plans',
                  'Found alternative transport',
                  'Booked incorrect vehicle or dates by mistake',
                  'Emergency or health reason',
                  'Other reason'
                ].map((opt) => (
                  <label 
                    key={opt}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      reason === opt 
                        ? 'border-[#FF6400] bg-orange-50/50 font-bold text-gray-900' 
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      value={opt}
                      checked={reason === opt}
                      onChange={() => setReason(opt)}
                      className="accent-[#FF6400]"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Share any details that could help us improve..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-gray-200 text-xs focus:border-[#FF6400] focus:ring-1 focus:ring-[#FF6400] outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onBack}
                disabled={isSubmitting}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black rounded-xl cursor-pointer"
              >
                Keep My Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancellation}
                disabled={isSubmitting || loadingPreview}
                className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl cursor-pointer shadow-lg shadow-rose-600/20 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Confirm & Cancel Reservation</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
export default CancellationPage;
