import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  FileText, 
  Edit3, 
  Save, 
  ArrowLeft, 
  Clock, 
  Calendar, 
  Car, 
  CheckCircle2, 
  LogOut,
  LayoutDashboard,
  PlusCircle,
  Settings as SettingsIcon,
  Bell,
  Lock,
  Loader2
} from 'lucide-react';
import { backendService } from '../../backend/api.js';

export const ProfilePage = ({
  currentUser,
  bookings = [],
  onBack,
  onUpdateUser,
  onLogout,
  onOpenBookings,
  onGoToOwnerDashboard,
  onAddNewVehicle,
  showToast
}) => {
  const isOwner = currentUser?.role === 'owner';
  
  // Default selected tab based on role
  const [activeTab, setActiveTab] = useState(isOwner ? 'owner_profile' : 'my_profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [city, setCity] = useState(currentUser?.city || 'Bengaluru');
  const [licenseNumber, setLicenseNumber] = useState(currentUser?.licenseNumber || 'KA01-20230048291');

  // Settings State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setCity(currentUser.city || 'Bengaluru');
      setLicenseNumber(currentUser.licenseNumber || 'KA01-20230048291');
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 font-bold">Please sign in to view your profile.</p>
        <button 
          onClick={onBack}
          className="mt-4 px-6 py-2.5 bg-[#FF6400] text-white font-bold rounded-xl cursor-pointer"
        >
          Return to Home
        </button>
      </div>
    );
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updates = {
        name,
        phone,
        city,
        licenseNumber
      };
      const res = await backendService.updateProfile(updates);
      if (res.success && res.user) {
        if (onUpdateUser) onUpdateUser(res.user);
        setIsEditing(false);
        if (showToast) showToast('Profile details updated successfully!');
      } else {
        if (showToast) showToast(res.error || 'Failed to update profile.');
      }
    } catch (e) {
      if (showToast) showToast('Network error saving profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter bookings for this user
  const userBookings = bookings.filter(b => 
    (b.userId && b.userId === currentUser.id) ||
    (b.renterEmail && b.renterEmail.toLowerCase() === currentUser.email?.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">

        {/* Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#111827] bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Main Menu</span>
          </button>

          <span className="text-xs font-black text-gray-400">
            Account ID: <span className="font-mono text-gray-700">{currentUser.id?.slice(0, 10) || 'USER'}</span>
          </span>
        </div>

        {/* Profile Card Banner */}
        <div className="bg-[#111827] text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                  alt={currentUser.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/20 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-[#111827]" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black">{currentUser.name}</h1>
                  <span className="bg-[#FF6400] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {isOwner ? 'Vehicle Owner' : 'Verified Renter'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {currentUser.email}
                </p>
                <p className="text-[11px] text-gray-400">
                  Member since {currentUser.joinedDate || '2026'} • Verified Status
                </p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="px-4 py-2.5 bg-white/10 hover:bg-rose-600/90 text-white text-xs font-bold rounded-xl border border-white/10 flex items-center gap-2 cursor-pointer transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ROLE SPECIFIC LAYOUT & TABS */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          
          {/* Navigation Options Sidebar */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm space-y-1.5">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-3 pb-1 block">
              {isOwner ? 'Owner Menu' : 'User Menu'}
            </span>

            {isOwner ? (
              /* OWNER ONLY: Profile, Owner Dashboard, Add New Vehicle, Logout */
              <>
                <button
                  onClick={() => setActiveTab('owner_profile')}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'owner_profile'
                      ? 'bg-[#FF6400] text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </button>

                <button
                  onClick={() => {
                    if (onGoToOwnerDashboard) onGoToOwnerDashboard();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#1769D1]" />
                  <span>Owner Dashboard</span>
                </button>

                <button
                  onClick={() => {
                    if (onAddNewVehicle) onAddNewVehicle();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  <span>Add New Vehicle</span>
                </button>

                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              /* BOOKER / NORMAL USER ONLY: My Profile, My Bookings, Settings, Logout */
              <>
                <button
                  onClick={() => setActiveTab('my_profile')}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'my_profile'
                      ? 'bg-[#FF6400] text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>My Profile</span>
                </button>

                <button
                  onClick={() => {
                    if (onOpenBookings) {
                      onOpenBookings();
                    } else {
                      setActiveTab('my_bookings');
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'my_bookings'
                      ? 'bg-[#FF6400] text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Car className="w-4 h-4 text-[#1769D1]" />
                  <span>My Bookings</span>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-[#FF6400] text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <SettingsIcon className="w-4 h-4 text-gray-500" />
                  <span>Settings</span>
                </button>

                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>

          {/* Right 3 Columns: Active Tab Content */}
          <div className="md:col-span-3">

            {/* TAB: MY PROFILE / OWNER PROFILE */}
            {(activeTab === 'my_profile' || activeTab === 'owner_profile') && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-black text-[#111827] flex items-center gap-2">
                      <User className="w-4 h-4 text-[#FF6400]" />
                      {isOwner ? 'Owner Profile Details' : 'Personal Profile & Credentials'}
                    </h2>
                    <p className="text-xs text-gray-500">
                      Manage your legal contact details and verified government records.
                    </p>
                  </div>

                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-black rounded-xl cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="px-4 py-1.5 bg-[#FF6400] hover:bg-[#e05800] text-white text-xs font-black rounded-xl cursor-pointer flex items-center gap-1.5"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Save Changes</span>
                      </button>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                        Full Legal Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        disabled={!isEditing}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 disabled:bg-gray-50 disabled:text-gray-700 font-bold focus:border-[#FF6400] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                        Email Address (Permanent Account ID)
                      </label>
                      <input
                        type="email"
                        value={currentUser.email}
                        disabled
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 font-medium cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                        Mobile Phone
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        disabled={!isEditing}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 disabled:bg-gray-50 disabled:text-gray-700 font-bold focus:border-[#FF6400] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                        City / Primary Hub
                      </label>
                      <input
                        type="text"
                        value={city}
                        disabled={!isEditing}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 disabled:bg-gray-50 disabled:text-gray-700 font-bold focus:border-[#FF6400] outline-none"
                      />
                    </div>
                  </div>

                  {!isOwner && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                        Driving License Number (Verified)
                      </label>
                      <input
                        type="text"
                        value={licenseNumber}
                        disabled={!isEditing}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className="w-full sm:w-1/2 px-3.5 py-2.5 rounded-xl border border-gray-200 disabled:bg-gray-50 disabled:text-gray-700 font-mono font-bold focus:border-[#FF6400] outline-none uppercase"
                      />
                    </div>
                  )}
                </form>

                {/* Trust and Safety Badges */}
                <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-950 block">KYC Verified</span>
                      <span className="text-[11px] text-emerald-700">Aadhaar & License identity verified.</span>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <span className="font-bold text-blue-950 block">Account Status: Good Standing</span>
                      <span className="text-[11px] text-blue-700">Eligible for all MyRyedo rentals and privileges.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: MY BOOKINGS (For standard user) */}
            {activeTab === 'my_bookings' && !isOwner && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h2 className="text-base font-black text-[#111827] flex items-center gap-2">
                    <Car className="w-4 h-4 text-[#FF6400]" />
                    My Rental Bookings
                  </h2>
                  <span className="text-xs font-bold text-gray-500">
                    {userBookings.length} booking{userBookings.length === 1 ? '' : 's'} recorded
                  </span>
                </div>

                {userBookings.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <Car className="w-12 h-12 text-gray-300 mx-auto" />
                    <p className="text-xs text-gray-500 font-medium">No bookings found yet.</p>
                    <button
                      onClick={onBack}
                      className="px-5 py-2.5 bg-[#FF6400] text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Browse Available Vehicles
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userBookings.map((b) => (
                      <div key={b.id} className="p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-gray-500">#{b.id}</span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700">
                              {b.status || 'Confirmed'}
                            </span>
                          </div>
                          <h3 className="text-sm font-black text-gray-900">{b.vehicle?.name || b.vehicleName || 'Vehicle'}</h3>
                          <p className="text-xs text-gray-500">
                            {b.pickupDate} → {b.returnDate} • Total: ₹{Number(b.totalPrice || b.totalAmount || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: SETTINGS (For standard user) */}
            {activeTab === 'settings' && !isOwner && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
                <div className="pb-3 border-b border-gray-100">
                  <h2 className="text-base font-black text-[#111827] flex items-center gap-2">
                    <SettingsIcon className="w-4 h-4 text-[#FF6400]" />
                    Account Preferences & Settings
                  </h2>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-gray-500" />
                      <div>
                        <span className="font-bold text-gray-900 block">Email Notifications</span>
                        <span className="text-gray-500 text-[11px]">Booking updates and invoice receipts.</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="w-4 h-4 text-[#FF6400] rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-500" />
                      <div>
                        <span className="font-bold text-gray-900 block">SMS Handover Alerts</span>
                        <span className="text-gray-500 text-[11px]">Live pickup updates directly on mobile.</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={smsNotifications}
                      onChange={(e) => setSmsNotifications(e.target.checked)}
                      className="w-4 h-4 text-[#FF6400] rounded"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
export default ProfilePage;
