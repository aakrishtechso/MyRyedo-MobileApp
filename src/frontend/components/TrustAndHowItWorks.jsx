import React from 'react';
import { UserCheck, ShieldCheck, Lock, Headphones, Search, Calendar, Compass, Flag } from 'lucide-react';

const trustItems = [
  [UserCheck, 'Verified people', 'Every renter and owner goes through verification.'],
  [ShieldCheck, 'Verified vehicles', 'Vehicle information is reviewed before listing.'],
  [Lock, 'Secure bookings', 'Payments and booking information stay protected.'],
  [Headphones, '24/7 support', "We're always here to help you, anytime."]
];

const steps = [
  [Search, '01', 'DISCOVER', 'Find the perfect ride near you'],
  [ShieldCheck, '02', 'VERIFY', 'Get verified for a safer experience'],
  [Calendar, '03', 'BOOK', 'Choose dates & book securely'],
  [Compass, '04', 'RIDE', 'Enjoy your ride with confidence'],
  [Flag, '05', 'RETURN', 'Return the vehicle on time']
];

export const TrustAndHowItWorks = () => (
  <section id="how-it-works-section" className="w-full py-10 sm:py-14">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-5 rounded-[28px] bg-[#1754CF] text-white p-6 sm:p-8 shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Built around trust.</h2>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {trustItems.map(([Icon, title, description]) => (
              <div key={title} className="rounded-2xl border border-white/15 bg-white/10 p-4 min-h-[132px]">
                <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center"><Icon className="w-4 h-4 text-[#1754CF]" /></span>
                <h3 className="mt-4 text-sm font-black">{title}</h3>
                <p className="mt-1 text-[11px] leading-5 text-blue-100">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 rounded-[28px] bg-white border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">How it works</h2>
          <div className="relative mt-9">
            <div className="hidden sm:block absolute top-5 left-8 right-8 h-px border-t border-dashed border-[#FF7A00]/60" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-5 relative">
              {steps.map(([Icon, number, title, copy], index) => (
                <div key={title} className={`text-center ${index === 4 ? 'col-span-2 sm:col-span-1' : ''}`}>
                  <div className="mx-auto w-10 h-10 rounded-full bg-white border-2 border-[#1769D1] flex items-center justify-center text-[#1769D1] relative z-10">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="mt-2 text-xs font-black text-[#1769D1]">{number}</div>
                  <div className="mt-0.5 text-[11px] font-black tracking-wide text-slate-950">{title}</div>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
