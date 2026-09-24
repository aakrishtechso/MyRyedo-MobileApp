import React, { useState } from 'react';
import { ChevronDown, User, LogOut, Menu, X, CarFront, LayoutDashboard, ListPlus, CalendarDays } from 'lucide-react';

export const Navbar = ({ currentView, setCurrentView, currentUser, onOpenAuthModal, onLogout, onOpenListVehicle }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isOwner = currentUser?.role === 'owner';

  const go = (view) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
    setShowProfileMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          id="navbar-logo-btn"
          onClick={() => go('home')}
          className="flex items-center gap-2.5 cursor-pointer focus:outline-none"
          aria-label="MyRyedo home"
        >
          <img src="/myryedo-logo.png" alt="MyRyedo" className="h-11 w-11 rounded-xl object-contain" />
          <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
            My<span className="text-[#FF6400]">Ryedo</span>
          </span>
        </button>

        <div className="hidden md:flex items-center gap-2">
          <button onClick={() => { setCurrentView('home'); setTimeout(() => document.getElementById('vehicles-near-you')?.scrollIntoView({ behavior: 'smooth' }), 60); }} className="rounded-xl px-3.5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-950">Explore Vehicles</button>
          {currentUser && isOwner && (
            <button onClick={() => go('owner-dashboard')} className="rounded-xl px-3.5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-950 flex items-center gap-2"><LayoutDashboard className="h-4 w-4" /> Dashboard</button>
          )}
          {currentUser && !isOwner && (
            <button onClick={() => go('booker-dashboard')} className="rounded-xl px-3.5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-950 flex items-center gap-2"><CalendarDays className="h-4 w-4" /> My Bookings</button>
          )}
          {!currentUser && (
            <button onClick={() => onOpenListVehicle()} className="rounded-xl px-3.5 py-2 text-sm font-bold text-[#FF6400] hover:bg-orange-50 flex items-center gap-2"><ListPlus className="h-4 w-4" /> List Your Vehicle</button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="relative">
              <button
                id="profile-dropdown-btn"
                onClick={() => setShowProfileMenu(v => !v)}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 hover:border-slate-300 transition-colors"
                aria-label="Open profile"
              >
                {currentUser.avatar ? <img src={currentUser.avatar} alt="" className="h-9 w-9 rounded-xl object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF5FF] text-sm font-black text-[#1769D1]">{(currentUser.name || 'U').charAt(0).toUpperCase()}</span>}
                <span className="hidden sm:block max-w-[120px] truncate text-xs font-black text-slate-900">{currentUser.name || 'Account'}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                  <div className="border-b border-slate-100 px-3 pb-3 pt-2">
                    <p className="truncate text-sm font-black text-slate-900">{currentUser.name || 'Account'}</p>
                    <p className="truncate text-xs text-slate-400">{currentUser.email}</p>
                    <span className="mt-2 inline-flex rounded-full bg-orange-50 px-2 py-1 text-[10px] font-black uppercase text-[#FF6400]">{currentUser.role} account</span>
                  </div>
                  <button onClick={() => go('profile')} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"><User className="h-4 w-4 text-[#1769D1]" /> My Profile & Settings</button>
                  {!isOwner && <button onClick={() => go('booker-dashboard')} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"><CalendarDays className="h-4 w-4 text-slate-400" /> My Bookings</button>}
                  {isOwner && <button onClick={() => go('owner-dashboard')} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"><CarFront className="h-4 w-4 text-slate-400" /> My Vehicle Listings</button>}
                  {isOwner && <button onClick={() => { onOpenListVehicle(); setShowProfileMenu(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"><ListPlus className="h-4 w-4 text-slate-400" /> List a Vehicle</button>}
                  <div className="my-1 border-t border-slate-100" />
                  <button onClick={onLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50"><LogOut className="h-4 w-4" /> Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <button id="sign-in-nav-btn" onClick={() => onOpenAuthModal('login')} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white hover:bg-black">Sign In / Sign Up</button>
          )}

          <button onClick={() => setMobileMenuOpen(v => !v)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-50 md:hidden" aria-label="Open menu">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
          <div className="mx-auto max-w-7xl space-y-1">
            <button onClick={() => go('home')} className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">Explore Vehicles</button>
            {currentUser && !isOwner && <button onClick={() => go('booker-dashboard')} className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">My Bookings</button>}
            {currentUser && isOwner && <button onClick={() => go('owner-dashboard')} className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">Owner Dashboard</button>}
            {currentUser && isOwner && <button onClick={() => { onOpenListVehicle(); setMobileMenuOpen(false); }} className="w-full rounded-xl px-3 py-3 text-left text-sm font-black text-[#FF6400] hover:bg-orange-50">List Your Vehicle</button>}
            {currentUser && <button onClick={() => go('profile')} className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">My Profile & Settings</button>}
            {!currentUser && <button onClick={() => { onOpenAuthModal('login'); setMobileMenuOpen(false); }} className="w-full rounded-xl px-3 py-3 text-left text-sm font-black text-[#FF6400] hover:bg-orange-50">Sign In / Sign Up</button>}
          </div>
        </div>
      )}
    </header>
  );
};
