import React from 'react';
import { ArrowRight, CalendarCheck, CircleDollarSign, Clock3, ListChecks, Search, Car, Users } from 'lucide-react';

export const HomeAboutSection = ({ vehicle, onExplore, onListVehicle }) => (
  <section className="w-full py-10 sm:py-14" id="about-myryedo">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-6 lg:gap-10 items-center">
        <div className="order-2 lg:order-1">
          <span className="text-[11px] font-black uppercase tracking-[.18em] text-[#FF6400]">About MyRyedo</span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">One place to find and share vehicles</h2>
          <p className="mt-4 text-sm sm:text-base leading-7 text-slate-600 max-w-2xl">
            MyRyedo connects people who need a vehicle with people who have one available. Find a car, bike, van or other eligible vehicle, choose when you need it, and book directly through MyRyedo. Vehicle owners can list vehicles they are not using, set their availability and pricing, and earn from bookings.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={onExplore} className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-[#FF6400] hover:bg-[#e85a00] text-white text-sm font-black shadow-md shadow-orange-500/20 transition-all">
              Explore Vehicles <ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={onListVehicle} className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-black hover:border-slate-400 transition-colors">
              List Your Vehicle
            </button>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <img
              src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1400&q=88"
              alt="Driver choosing a modern vehicle for a trip"
              loading="lazy"
              className="w-full h-[280px] sm:h-[340px] object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-slate-950/70 to-transparent">
              <p className="text-xs font-black uppercase tracking-[.16em] text-white/80">Find the right vehicle</p>
              <p className="mt-1 text-lg font-black text-white">Choose a ride that fits your trip.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export const HomeOwnerSection = ({ onListVehicle, onExplore }) => (
  <section className="w-full py-10 sm:py-14" id="vehicle-owners">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 overflow-hidden">
        <div className="grid lg:grid-cols-[.95fr_1.05fr] gap-8 items-center p-6 sm:p-9 lg:p-11">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[.18em] text-[#FF6400]">For vehicle owners</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">Have a vehicle you're not riding?</h2>
            <p className="mt-4 text-sm sm:text-base leading-7 text-slate-600 max-w-xl">
              Turn your idle vehicle into an earning opportunity. List your car, bike, van or other eligible vehicle, choose when it's available, and manage bookings from one place.
            </p>
            <div className="mt-6 grid sm:grid-cols-2 gap-2.5">
              {[
                [CalendarCheck, 'Set Your Availability'],
                [CircleDollarSign, 'Choose Your Pricing'],
                [ListChecks, 'Receive Booking Requests'],
                [Clock3, 'Manage Your Vehicle']
              ].map(([Icon, label]) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 p-3.5">
                  <span className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-[#FF6400]" /></span>
                  <span className="text-xs font-black text-slate-800">{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={onListVehicle} className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-[#FF6400] hover:bg-[#e85a00] text-white text-sm font-black shadow-md shadow-orange-500/20 transition-all">List Your Vehicle <ArrowRight className="w-4 h-4" /></button>
              <button type="button" onClick={onExplore} className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-black hover:border-slate-400 transition-colors">Explore Vehicles</button>
            </div>
          </div>
          <div className="hidden lg:flex justify-center">
            <div className="relative w-full max-w-md">
              <div className="absolute -inset-4 rounded-[32px] bg-gradient-to-br from-orange-100/70 via-white to-blue-100/60 blur-2xl" />
              <div className="relative rounded-[26px] border border-white bg-white shadow-sm p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><Car className="w-5 h-5 text-[#FF6400]" /><p className="mt-3 text-xs font-black text-slate-900">Your vehicle</p><p className="mt-1 text-[11px] text-slate-500">Listed when you choose</p></div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><CalendarCheck className="w-5 h-5 text-blue-600" /><p className="mt-3 text-xs font-black text-slate-900">Your schedule</p><p className="mt-1 text-[11px] text-slate-500">Set availability</p></div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><CircleDollarSign className="w-5 h-5 text-emerald-600" /><p className="mt-3 text-xs font-black text-slate-900">Your pricing</p><p className="mt-1 text-[11px] text-slate-500">Choose your rate</p></div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><Users className="w-5 h-5 text-slate-700" /><p className="mt-3 text-xs font-black text-slate-900">Your bookings</p><p className="mt-1 text-[11px] text-slate-500">Manage in one place</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export const CompactHowItWorks = () => (
  <section className="w-full py-8 sm:py-10" id="how-it-works">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[.18em] text-[#FF6400]">How MyRyedo works</span>
            <h2 className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight text-slate-950">Find · Choose · Ride</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md">A simple booking flow with the details you need at each step.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-2">
          {[
            [Search, '01', 'Find', 'Explore available vehicles.'],
            [CalendarCheck, '02', 'Choose', 'Select your vehicle and time.'],
            [Car, '03', 'Ride', 'Confirm and head to pickup.']
          ].map(([Icon, num, title, copy], index) => (
            <div key={title} className="relative flex items-start gap-3 rounded-2xl bg-slate-50/70 border border-slate-100 p-4">
              <span className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-[#FF6400]" /></span>
              <div><div className="text-[10px] font-black text-slate-400">{num}</div><h3 className="mt-0.5 text-sm font-black text-slate-900">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{copy}</p></div>
              {index < 2 && <span className="hidden md:block absolute -right-1.5 top-1/2 w-3 h-px bg-slate-200" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export const FinalHomeCTA = ({ onExplore, onListVehicle }) => (
  <section className="w-full pt-4 pb-12 sm:pb-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="rounded-[26px] bg-slate-950 px-6 py-9 sm:px-10 sm:py-10 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Ready to get moving?</h2>
          <p className="mt-2 text-sm text-slate-300 max-w-xl">Find a vehicle for your next trip or list your own vehicle on MyRyedo.</p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <button type="button" onClick={onExplore} className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-[#FF6400] hover:bg-[#e85a00] text-white text-sm font-black transition-colors">Explore Vehicles <ArrowRight className="w-4 h-4" /></button>
          <button type="button" onClick={onListVehicle} className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-black transition-colors">List Your Vehicle</button>
        </div>
      </div>
    </div>
  </section>
);
