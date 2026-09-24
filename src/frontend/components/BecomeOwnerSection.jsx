import React from 'react';
import { ArrowRight, CalendarDays, Car, CircleDollarSign, Clock3, ListChecks } from 'lucide-react';
import { VehicleVisual } from './VehicleVisual.jsx';

export const BecomeOwnerSection = ({ onListVehicle, onExploreClick }) => (
  <section className="w-full py-10 sm:py-14">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-2 items-stretch">
          <div className="p-7 sm:p-10 lg:p-12">
            <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#FF6400]">For vehicle owners</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">Have a vehicle you're not riding?</h2>
            <p className="mt-4 max-w-xl text-sm sm:text-base leading-7 text-slate-600">Turn your idle vehicle into an earning opportunity. List your car, bike, van or other eligible vehicle, choose when it's available, and manage bookings from one place.</p>
            <div className="mt-7 grid sm:grid-cols-2 gap-3">
              {[
                [CalendarDays, 'Set your availability'],
                [CircleDollarSign, 'Choose your pricing'],
                [ListChecks, 'Receive booking requests'],
                [Clock3, 'Manage your vehicle time']
              ].map(([Icon, label]) => <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5"><span className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center"><Icon className="w-4 h-4 text-[#FF6400]" /></span><span className="text-xs font-black text-slate-800">{label}</span></div>)}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={onListVehicle} className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-[#FF6400] hover:bg-[#e85a00] text-white text-sm font-black shadow-md shadow-orange-500/20 transition-all">List Your Vehicle <ArrowRight className="w-4 h-4" /></button>
              <button onClick={onExploreClick} className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-black hover:border-slate-400 transition-colors">Explore Vehicles</button>
            </div>
          </div>
          <div className="bg-slate-50 min-h-[330px] flex items-center justify-center p-6 sm:p-10 border-t lg:border-t-0 lg:border-l border-slate-200">
            <div className="w-full max-w-lg">
              <VehicleVisual vehicle={{ category: 'cars', name: 'Your vehicle on MyRyedo' }} className="rounded-[26px] border border-slate-200 shadow-sm" aspectRatio="aspect-[1.35/1]" />
              <div className="mt-3 flex items-center gap-3 text-xs text-slate-500"><Car className="w-4 h-4 text-[#FF6400]" /> You control when your vehicle is available.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
