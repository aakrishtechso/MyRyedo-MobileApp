import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, MapPin, Users } from 'lucide-react';
import { backendService } from '../../backend/api.js';
import { VehicleVisual } from '../components/VehicleVisual.jsx';

export const VehicleWaitlistPage = ({ vehicle, bookingDetails = {}, currentUser, onBack, onFindAnother, showToast }) => {
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  if (!vehicle) return null;

  const start = bookingDetails.pickupDate && `${bookingDetails.pickupDate}T${bookingDetails.pickupTime || '10:00'}`;
  const endDate = bookingDetails.rentalType === 'hourly' ? bookingDetails.pickupDate : bookingDetails.returnDate;
  const end = endDate && `${endDate}T${bookingDetails.returnTime || bookingDetails.pickupTime || '10:00'}`;

  const join = async () => {
    if (!currentUser) return;
    setSubmitting(true);
    try {
      const res = await backendService.joinVehicleWaitlist(vehicle.id, {
        startDateTime: start,
        endDateTime: end,
        rentalType: bookingDetails.rentalType || 'daily',
        pickupDate: bookingDetails.pickupDate,
        pickupTime: bookingDetails.pickupTime,
        returnDate: bookingDetails.returnDate,
        returnTime: bookingDetails.returnTime
      });
      if (res?.success) {
        setJoined(true);
        showToast?.('You joined the vehicle waiting list.');
      } else {
        showToast?.(res?.error || 'We could not add you to the waiting list.');
      }
    } catch {
      showToast?.('Something went wrong. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] py-7 sm:py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-5">
        <button onClick={onBack} className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:text-slate-900 shadow-sm"><ArrowLeft className="w-4 h-4" /> Back to Vehicle</button>
        <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-5">
          <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm"><VehicleVisual vehicle={vehicle} className="w-full h-full" aspectRatio="aspect-[1.15/1]" /></div>
          <div className="bg-white rounded-[26px] border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col justify-center">
            {!joined ? <>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 border border-amber-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-700">Unavailable for your selected time</span>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">This vehicle is booked for that time.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">You can join the waiting list for this exact vehicle and time, or choose another ride now.</p>
              <div className="mt-6 space-y-2">
                {bookingDetails.pickupDate && <div className="flex items-center gap-3 text-xs font-bold text-slate-700"><CalendarDays className="w-4 h-4 text-[#FF6400]" />{bookingDetails.pickupDate}{bookingDetails.pickupTime ? ` · ${bookingDetails.pickupTime}` : ''}</div>}
                {end && <div className="flex items-center gap-3 text-xs font-bold text-slate-700"><Clock3 className="w-4 h-4 text-[#FF6400]" />Ends {endDate}{bookingDetails.returnTime ? ` · ${bookingDetails.returnTime}` : ''}</div>}
                {vehicle.location && <div className="flex items-center gap-3 text-xs font-bold text-slate-700"><MapPin className="w-4 h-4 text-[#FF6400]" />{vehicle.location}</div>}
              </div>
              <div className="mt-7 grid sm:grid-cols-2 gap-3">
                <button disabled={submitting} onClick={join} className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[#FF6400] text-white text-xs font-black hover:bg-[#e85a00] disabled:opacity-60"><Users className="w-4 h-4" />{submitting ? 'Joining...' : 'Join Waiting List'}</button>
                <button onClick={onFindAnother} className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-black hover:border-slate-400">Find Another Vehicle <ArrowRight className="w-4 h-4" /></button>
              </div>
              <p className="mt-4 text-[11px] text-slate-400">Your booking is never created while the vehicle is unavailable. Availability is checked again on the server before a booking is confirmed.</p>
            </> : <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8 text-emerald-600" /></div>
              <h1 className="mt-5 text-2xl font-black text-slate-950">You're on the waiting list.</h1>
              <p className="mt-2 text-sm text-slate-500">If this vehicle becomes available for your selected time, MyRyedo can notify you according to the waiting-list rules.</p>
              <button onClick={onFindAnother} className="mt-6 inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-900 text-white text-xs font-black">Find Another Vehicle <ArrowRight className="w-4 h-4" /></button>
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
};
