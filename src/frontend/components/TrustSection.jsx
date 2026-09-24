import React from 'react';
import { ShieldCheck, UserCheck, Lock, CheckCircle2, Award } from 'lucide-react';

export const TrustSection = () => {
  const trustPoints = [
    {
      icon: <UserCheck className="w-8 h-8 text-[#1769D1]" />,
      badge: '🪪 VERIFIED PROFILES',
      title: 'Verified People',
      description: 'Every renter and vehicle owner completes government ID and driving licence verification before making or accepting their first trip.',
      features: ['Aadhaar & Passport verification', 'Driving Licence validity check', 'Host background screening']
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-[#1769D1]" />,
      badge: '🚗 ROAD-READY RIDES',
      title: 'Verified Vehicles',
      description: 'Vehicle RC documents, periodic maintenance logs, and fitness certificates are reviewed before listing is published on the network.',
      features: ['Physical condition review', 'Insurance compliance check', 'Sanitization standards']
    },
    {
      icon: <Lock className="w-8 h-8 text-[#FF7A00]" />,
      badge: '🔒 SAFE & SECURE',
      title: 'Secure Booking',
      description: 'Booking payments are held in escrow and only released to the owner after smooth handover. Refundable security deposits with instant return.',
      features: ['256-bit encrypted checkout', 'Trip protection coverage', 'Instant refundable deposit']
    }
  ];

  return (
    <section className="w-full py-16 bg-white border-y border-[#EAF3FF] relative overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#EAF3FF] rounded-full blur-3xl opacity-40 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 bg-[#EAF3FF] text-[#1769D1] px-3.5 py-1 rounded-full text-xs font-extrabold mb-3">
            <Award className="w-3.5 h-3.5" />
            SAFETY & RELIABILITY GUARANTEE
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
            Built around <span className="text-[#1769D1]">trust</span>.
          </h2>
          <p className="text-sm sm:text-base text-gray-500 mt-2">
            MyRyedo ensures strict peer-to-peer security standards so you can focus on the road ahead.
          </p>
        </div>

        {/* 3 Trust Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {trustPoints.map((item, index) => (
            <div
              key={index}
              className="bg-[#F7F9FC] rounded-3xl p-6 sm:p-8 border border-[#EAF3FF] flex flex-col justify-between hover:bg-white hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 group"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>

                <span className="text-[10px] font-extrabold text-[#1769D1] uppercase tracking-wider block mb-1">
                  {item.badge}
                </span>

                <h3 className="text-xl font-extrabold text-[#111827] mb-3">
                  {item.title}
                </h3>

                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6">
                  {item.description}
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-gray-200/70">
                {item.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
