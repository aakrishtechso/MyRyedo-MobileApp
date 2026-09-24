import React from 'react';
import { Search, ShieldCheck, CreditCard, Key, RotateCcw, MapPin, ArrowRight } from 'lucide-react';

export const HowItWorks = ({ onExploreClick }) => {
  const steps = [
    {
      num: '01',
      title: 'Discover',
      desc: 'Browse verified cars, bikes, scooters & EVs around your neighbourhood or target city.',
      icon: <Search className="w-5 h-5 text-[#1769D1]" />
    },
    {
      num: '02',
      title: 'Verify',
      desc: 'Quick 2-minute digital verification of your ID and Driving Licence with instant approval.',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />
    },
    {
      num: '03',
      title: 'Book',
      desc: 'Select flexible pick-up & return dates. Pay securely with zero deposit surprises.',
      icon: <CreditCard className="w-5 h-5 text-[#FF7A00]" />
    },
    {
      num: '04',
      title: 'Ride',
      desc: 'Meet the verified host or use contactless smart unlock to begin your journey.',
      icon: <Key className="w-5 h-5 text-[#1769D1]" />
    },
    {
      num: '05',
      title: 'Return',
      desc: 'Drop off the vehicle at the agreed meetup location and share your honest trip review.',
      icon: <RotateCcw className="w-5 h-5 text-purple-600" />
    }
  ];

  return (
    <section id="how-it-works-section" className="w-full py-16 bg-[#F7F9FC] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 bg-[#EAF3FF] text-[#1769D1] px-3.5 py-1 rounded-full text-xs font-extrabold mb-3">
            <MapPin className="w-3.5 h-3.5 text-[#FF7A00]" />
            SEAMLESS 5-STEP JOURNEY
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
            How <span className="text-[#1769D1]">My</span><span className="text-[#FF6400]">Ryedo</span> Works
          </h2>
          <p className="text-sm sm:text-base text-gray-500 mt-2">
            Rent a pristine vehicle in five simple steps with complete peace of mind.
          </p>
        </div>

        {/* 5 Steps with Connecting Route Line Visual */}
        <div className="relative">
          
          {/* Subtle Route Line (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-12 right-12 -translate-y-8 h-1 bg-gradient-to-r from-[#1769D1]/30 via-[#FF7A00]/40 to-purple-500/30 z-0">
            {/* Animated Pulses along route */}
            <div className="w-4 h-4 bg-[#FF7A00] rounded-full absolute -top-1.5 left-1/3 animate-ping" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl p-6 border border-[#EAF3FF] shadow-lg shadow-blue-900/5 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black text-[#1769D1]/30 group-hover:text-[#1769D1] transition-colors">
                      {step.num}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#F7F9FC] border border-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      {step.icon}
                    </div>
                  </div>

                  <h3 className="text-lg font-extrabold text-[#111827] mb-2">
                    {step.title}
                  </h3>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-50 flex items-center text-[10px] font-bold text-gray-400">
                  <span>Step {idx + 1} of 5</span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Quick CTA */}
        <div className="mt-12 text-center">
          <button
            onClick={onExploreClick}
            className="inline-flex items-center gap-2 bg-[#1769D1] hover:bg-[#0B3B82] text-white text-xs sm:text-sm font-extrabold px-6 py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
          >
            <span>Start Exploring Available Rides</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
};
