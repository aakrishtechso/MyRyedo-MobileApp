import React from 'react';
import { Home, CarFront, CalendarDays, Bell, Search, ListPlus, LayoutDashboard, Compass } from 'lucide-react';

const Item = ({ active, label, icon: Icon, onClick, badge }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 text-[10px] font-extrabold transition-all sm:text-[11px] ${
      active ? 'text-[#1769D1] bg-[#EEF5FF]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    }`}
    aria-current={active ? 'page' : undefined}
  >
    <span className="relative">
      <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
      {badge > 0 && (
        <span className="absolute -right-2 -top-2 min-w-[17px] h-[17px] rounded-full bg-[#FF6400] px-1 text-[9px] font-black text-white flex items-center justify-center border-2 border-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </span>
    <span className="truncate">{label}</span>
  </button>
);

export const BottomNav = ({ currentUser, currentView, setCurrentView, unreadCount = 0, onOpenAuth, onListVehicle }) => {
  const go = (view) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const search = () => {
    if (currentView !== 'home') {
      setCurrentView('home');
      window.setTimeout(() => document.getElementById('search-area')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
    } else {
      document.getElementById('search-area')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const explore = () => {
    if (currentView !== 'home') {
      setCurrentView('home');
      window.setTimeout(() => document.getElementById('vehicles-near-you')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } else {
      document.getElementById('vehicles-near-you')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const userItems = [
    { label: 'Home', icon: Home, active: currentView === 'home', onClick: () => go('home') },
    { label: 'Vehicles', icon: CarFront, active: false, onClick: explore },
    { label: 'Bookings', icon: CalendarDays, active: currentView === 'booker-dashboard' || currentView === 'renter-dashboard', onClick: () => currentUser ? go('booker-dashboard') : onOpenAuth('login') },
    { label: 'Notifications', icon: Bell, active: currentView === 'notifications', onClick: () => currentUser ? go('notifications') : onOpenAuth('login'), badge: unreadCount },
    { label: 'Search', icon: Search, active: currentView === 'search', onClick: search },
  ];

  const ownerItems = [
    { label: 'Home', icon: Home, active: currentView === 'home', onClick: () => go('home') },
    { label: 'Listings', icon: ListPlus, active: currentView === 'list-vehicle' || currentView === 'edit-vehicle', onClick: () => go('owner-dashboard') },
    { label: 'Search', icon: Search, active: currentView === 'search', onClick: search },
    { label: 'Dashboard', icon: LayoutDashboard, active: currentView === 'owner-dashboard', onClick: () => go('owner-dashboard') },
    { label: 'Notifications', icon: Bell, active: currentView === 'notifications', onClick: () => go('notifications'), badge: unreadCount },
  ];

  const guestItems = [
    { label: 'Home', icon: Home, active: currentView === 'home', onClick: () => go('home') },
    { label: 'Search', icon: Search, active: false, onClick: search },
    { label: 'Explore', icon: Compass, active: false, onClick: explore },
    { label: 'List', icon: ListPlus, active: false, onClick: () => onListVehicle() },
    { label: 'Notifications', icon: Bell, active: currentView === 'notifications', onClick: () => onOpenAuth('login') },
  ];

  const items = currentUser?.role === 'owner' ? ownerItems : currentUser ? userItems : guestItems;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-2 pb-[max(8px,env(safe-area-inset-bottom))] sm:px-4" aria-label="Primary navigation">
      <div className="mx-auto flex max-w-3xl items-center gap-1 rounded-[24px] border border-slate-200/90 bg-white/95 p-2 shadow-[0_12px_45px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        {items.map((item) => <Item key={item.label} {...item} />)}
      </div>
    </nav>
  );
};
