import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Car, 
  FileCheck, 
  AlertTriangle, 
  DollarSign, 
  Check, 
  X, 
  ExternalLink, 
  Eye, 
  TrendingUp, 
  Sparkles,
  ArrowRight,
  UserCheck,
  Search,
  Filter,
  MapPin,
  Ticket,
  Megaphone,
  UserPlus,
  Plus
} from 'lucide-react';
import { backendService } from '../../backend/api';

export const AdminDashboard = ({
  users,
  vehicles,
  bookings,
  disputes,
  payouts,
  onApproveVehicle,
  onToggleVehicleFeatured,
  onResolveDispute,
  onApprovePayout
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [vehicleSearch, setVehicleSearch] = useState('');
  
  // Dynamic admin data
  const [serviceAreas, setServiceAreas] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [offers, setOffers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [isLoadingExtras, setIsLoadingExtras] = useState(false);

  // New Area form
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [newArea, setNewArea] = useState({
    name: '',
    city: '',
    state: '',
    status: 'coming_soon',
    radiusKm: 10,
    foundingOwnerEnabled: true
  });

  // New Offer form
  const [isAddingOffer, setIsAddingOffer] = useState(false);
  const [newOffer, setNewOffer] = useState({
    code: '',
    title: '',
    description: '',
    flatDiscount: 200,
    discountPercent: 0,
    minAmount: 500,
    maxUses: 100
  });

  // Fetch admin dynamic resources
  useEffect(() => {
    loadAdminExtras();
  }, []);

  const loadAdminExtras = async () => {
    setIsLoadingExtras(true);
    try {
      const [areasRes, waitlistRes, offersRes, campaignsRes] = await Promise.all([
        backendService.getServiceAreas().catch(() => ({ areas: [] })),
        backendService.getWaitlist().catch(() => ({ waitlist: [] })),
        backendService.getOffers().catch(() => ({ offers: [] })),
        backendService.getCampaigns().catch(() => ({ campaigns: [] }))
      ]);
      setServiceAreas(areasRes.areas || []);
      setWaitlist(waitlistRes.waitlist || []);
      setOffers(offersRes.offers || []);
      setCampaigns(campaignsRes.campaigns || []);
    } catch (e) {
      console.error('Error loading admin resources', e);
    } finally {
      setIsLoadingExtras(false);
    }
  };

  const handleCreateArea = async (e) => {
    e.preventDefault();
    if (!newArea.name || !newArea.city) return;
    try {
      const res = await backendService.addServiceArea({
        name: newArea.name,
        city: newArea.city,
        state: newArea.state,
        status: newArea.status,
        radiusKm: Number(newArea.radiusKm),
        foundingOwnerProgram: {
          enabled: newArea.foundingOwnerEnabled,
          name: `${newArea.name} Founding Host Club`,
          freeCommissionBookingsCount: 10,
          description: '0% platform commission on first 10 rentals'
        }
      });
      if (res.success && res.area) {
        setServiceAreas(prev => [res.area, ...prev]);
        setIsAddingArea(false);
        setNewArea({ name: '', city: '', state: '', status: 'coming_soon', radiusKm: 10, foundingOwnerEnabled: true });
      }
    } catch (err) {
      alert('Failed to add area: ' + err.message);
    }
  };

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (!newOffer.code || !newOffer.title) return;
    try {
      const res = await backendService.createOffer(newOffer);
      if (res.success && res.offer) {
        setOffers(prev => [res.offer, ...prev]);
        setIsAddingOffer(false);
        setNewOffer({ code: '', title: '', description: '', flatDiscount: 200, discountPercent: 0, minAmount: 500, maxUses: 100 });
      }
    } catch (err) {
      alert('Failed to create offer: ' + err.message);
    }
  };

  // Compute metrics
  const totalGMV = bookings.reduce((sum, b) => sum + (b.paymentStatus === 'successful' ? b.totalAmount : 0), 0);
  const platformRevenue = Math.round(totalGMV * 0.10);
  const activeBookingsCount = bookings.filter(b => b.status === 'active' || b.status === 'confirmed').length;
  const verifiedFleetCount = vehicles.filter(v => v.verified).length;
  const openDisputesCount = disputes.filter(d => d.status === 'pending').length;

  const filteredVehicles = vehicles.filter(v => {
    if (!vehicleSearch.trim()) return true;
    const q = vehicleSearch.toLowerCase();
    return (
      v.name?.toLowerCase().includes(q) ||
      v.location?.toLowerCase().includes(q) ||
      v.plateNumber?.toLowerCase().includes(q) ||
      v.owner?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="bg-[#0B3B82] text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="bg-[#1769D1] text-xs font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
              Admin Portal
            </span>
            <span className="text-xs text-blue-200 font-bold">MyRyedo Central Command</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Trust & Safety Operations Center</h1>
          <p className="text-xs sm:text-sm text-blue-200">
            Real-time fleet verification, user governance, service areas, and financial settlements.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl text-center border border-white/10">
            <span className="text-[10px] text-blue-200 uppercase font-bold block">Verified Fleet</span>
            <span className="text-lg font-black text-emerald-300">{verifiedFleetCount}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl text-center border border-white/10">
            <span className="text-[10px] text-blue-200 uppercase font-bold block">Open Disputes</span>
            <span className="text-lg font-black text-rose-300">{openDisputesCount}</span>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {[
          { id: 'overview', label: '📊 Metrics & GMV' },
          { id: 'vehicles', label: `🚗 Fleet Moderation (${vehicles.length})` },
          { id: 'users', label: `👥 Users (${users.length})` },
          { id: 'areas', label: `📍 Service Areas (${serviceAreas.length})` },
          { id: 'waitlist', label: `📋 Waitlist Leads (${waitlist.length})` },
          { id: 'offers', label: `🏷️ Promo Codes (${offers.length})` },
          { id: 'disputes', label: `⚖️ Disputes (${disputes.length})` },
          { id: 'payouts', label: `💰 Host Payouts (${payouts.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#1769D1] text-white shadow-md shadow-blue-500/20'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-[#EAF3FF] shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Marketplace Volume</span>
              <h3 className="text-2xl font-black text-[#111827]">₹{totalGMV.toLocaleString()}</h3>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Real booking revenue
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#EAF3FF] shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Platform Take (10%)</span>
              <h3 className="text-2xl font-black text-[#1769D1]">₹{platformRevenue.toLocaleString()}</h3>
              <span className="text-[11px] font-bold text-gray-500">Net platform fee</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#EAF3FF] shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Active Rentals</span>
              <h3 className="text-2xl font-black text-[#FF7A00]">{activeBookingsCount}</h3>
              <span className="text-[11px] font-bold text-gray-500">Live on road</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#EAF3FF] shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Verified Fleet</span>
              <h3 className="text-2xl font-black text-emerald-700">{verifiedFleetCount}</h3>
              <span className="text-[11px] font-bold text-emerald-600">RC & safety approved</span>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white p-6 rounded-3xl border border-[#EAF3FF] space-y-4">
            <h3 className="text-sm font-black text-[#111827]">Operational Priorities</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div 
                onClick={() => setActiveTab('vehicles')}
                className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <FileCheck className="w-5 h-5 text-emerald-700" />
                  <span className="text-xs font-black bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md">
                    {vehicles.length} Total
                  </span>
                </div>
                <h4 className="text-xs font-black text-emerald-900">Fleet Inspection</h4>
                <p className="text-[11px] text-emerald-700 mt-1">Review newly listed vehicles, photos, and RC papers.</p>
              </div>

              <div 
                onClick={() => setActiveTab('areas')}
                className="p-4 rounded-2xl bg-blue-50 border border-blue-200 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <MapPin className="w-5 h-5 text-[#1769D1]" />
                  <span className="text-xs font-black bg-blue-200 text-blue-900 px-2 py-0.5 rounded-md">
                    {serviceAreas.length} Hubs
                  </span>
                </div>
                <h4 className="text-xs font-black text-blue-900">Service Coverage</h4>
                <p className="text-[11px] text-blue-700 mt-1">Manage active operational clusters and launch programs.</p>
              </div>

              <div 
                onClick={() => setActiveTab('disputes')}
                className="p-4 rounded-2xl bg-rose-50 border border-rose-200 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-5 h-5 text-rose-700" />
                  <span className="text-xs font-black bg-rose-200 text-rose-900 px-2 py-0.5 rounded-md">
                    {openDisputesCount} Active
                  </span>
                </div>
                <h4 className="text-xs font-black text-rose-900">Damage Claims</h4>
                <p className="text-[11px] text-rose-700 mt-1">Arbitrate inspection photo comparisons and deposit deductions.</p>
              </div>

              <div 
                onClick={() => setActiveTab('payouts')}
                className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-indigo-700" />
                  <span className="text-xs font-black bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-md">
                    {payouts.length} Transfers
                  </span>
                </div>
                <h4 className="text-xs font-black text-indigo-900">Host Disbursements</h4>
                <p className="text-[11px] text-indigo-700 mt-1">Settle approved host earnings via automated bank transfers.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. FLEET MODERATION TAB */}
      {activeTab === 'vehicles' && (
        <div className="bg-white p-6 rounded-3xl border border-[#EAF3FF] space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[#111827]">Registered Fleet Moderation</h3>
              <p className="text-xs text-gray-500">Audit vehicle ownership documents, plate numbers, and host profiles.</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search plate, model, or host..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#1769D1]"
              />
            </div>
          </div>

          {filteredVehicles.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl">
              <Car className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-bold">No vehicles found matching the query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVehicles.map((v) => (
                <div key={v.id} className="p-4 rounded-2xl border border-gray-100 bg-[#FAFBFD] flex gap-4 items-start">
                  <img src={v.images?.[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=300&q=80'} alt={v.name} className="w-24 h-20 rounded-xl object-cover" />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-[#111827]">{v.name}</h4>
                      <span className="text-[10px] font-extrabold text-[#1769D1] bg-[#EAF3FF] px-2 py-0.5 rounded">
                        {v.type || v.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Host: {v.owner?.name || 'Verified Host'} · Hub: {v.location}
                    </p>
                    <p className="text-[11px] font-mono text-gray-700">
                      Reg: <strong>{v.plateNumber || 'Pending verification'}</strong> · ₹{v.pricePerDay || v.dailyPrice}/day
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onApproveVehicle(v.id)}
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          v.verified
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-[#FF6400] text-white hover:bg-orange-600'
                        }`}
                      >
                        {v.verified ? '✓ Verified Listing' : 'Approve RC'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleVehicleFeatured(v.id)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border cursor-pointer transition-all ${
                          v.isFeatured 
                            ? 'bg-amber-100 border-amber-300 text-amber-800 font-black' 
                            : 'bg-white border-gray-200 text-gray-600 hover:text-[#1769D1]'
                        }`}
                      >
                        {v.isFeatured ? '★ Featured' : 'Feature on Homepage'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. SERVICE AREAS TAB */}
      {activeTab === 'areas' && (
        <div className="bg-white p-6 rounded-3xl border border-[#EAF3FF] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-[#111827]">Operational Service Areas & Hubs</h3>
              <p className="text-xs text-gray-500">Manage launch zones, geo-radius boundaries, and Founding Host 0% Commission programs.</p>
            </div>
            <button
              onClick={() => setIsAddingArea(true)}
              className="bg-[#1769D1] hover:bg-blue-700 text-white text-xs font-black px-4 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Cluster
            </button>
          </div>

          {isAddingArea && (
            <form onSubmit={handleCreateArea} className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
              <h4 className="text-xs font-black text-[#111827]">Provision Operational Cluster</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Cluster Name (e.g. Vijay Nagar)"
                  value={newArea.name}
                  onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
                  required
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  placeholder="City (e.g. Indore)"
                  value={newArea.city}
                  onChange={(e) => setNewArea({ ...newArea, city: e.target.value })}
                  required
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs"
                />
                <select
                  value={newArea.status}
                  onChange={(e) => setNewArea({ ...newArea, status: e.target.value })}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  <option value="active">Active Service Hub</option>
                  <option value="coming_soon">Coming Soon / Expansion Waitlist</option>
                </select>
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-gray-700 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newArea.foundingOwnerEnabled}
                    onChange={(e) => setNewArea({ ...newArea, foundingOwnerEnabled: e.target.checked })}
                    className="rounded text-[#1769D1]"
                  />
                  Enable 0% Commission Founding Host Program (First 10 bookings)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingArea(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl text-xs font-black text-white bg-[#1769D1] hover:bg-blue-700"
                  >
                    Save Area
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {serviceAreas.map((area) => (
              <div key={area.id} className="p-4 rounded-2xl border border-gray-100 bg-[#FAFBFD] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#1769D1]" />
                    <h4 className="text-xs font-black text-[#111827]">{area.name}, {area.city}</h4>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    area.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {area.status === 'active' ? '● Live Hub' : 'Coming Soon'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">{area.notes || `Operational radius: ${area.radiusKm || 15} km`}</p>
                {area.foundingOwnerProgram?.enabled && (
                  <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black text-orange-900 block">{area.foundingOwnerProgram.name}</span>
                      <span className="text-[10px] text-orange-700">{area.foundingOwnerProgram.description}</span>
                    </div>
                    <span className="text-[10px] font-black bg-orange-200 text-orange-900 px-2 py-0.5 rounded">
                      0% Fee
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. WAITLIST TAB */}
      {activeTab === 'waitlist' && (
        <div className="bg-white p-6 rounded-3xl border border-[#EAF3FF] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-[#111827]">Expansion Waitlist Leads</h3>
              <p className="text-xs text-gray-500">Prospective hosts and renters who requested MyRyedo launch in their neighborhood.</p>
            </div>
            <span className="text-xs font-bold text-gray-400">{waitlist.length} Registrations</span>
          </div>

          {waitlist.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl">
              <UserPlus className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-bold">No waitlist submissions recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 text-xs">
              {waitlist.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[#111827]">{item.name}</h4>
                    <p className="text-[11px] text-gray-500">{item.email} · {item.phone}</p>
                    <span className="text-[10px] font-mono text-gray-400">
                      Location: {item.area ? `${item.area}, ` : ''}{item.city}
                    </span>
                  </div>
                  <div className="text-right space-y-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      item.interest === 'host' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item.interest === 'host' ? 'Interested Host' : 'Interested Renter'}
                    </span>
                    <span className="text-[10px] text-gray-400 block">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. PROMO CODES TAB */}
      {activeTab === 'offers' && (
        <div className="bg-white p-6 rounded-3xl border border-[#EAF3FF] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-[#111827]">Promo Codes & Launch Offers</h3>
              <p className="text-xs text-gray-500">Configure discount codes applied during checkout.</p>
            </div>
            <button
              onClick={() => setIsAddingOffer(true)}
              className="bg-[#1769D1] hover:bg-blue-700 text-white text-xs font-black px-4 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Create Promo Code
            </button>
          </div>

          {isAddingOffer && (
            <form onSubmit={handleCreateOffer} className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
              <h4 className="text-xs font-black text-[#111827]">Create Discount Code</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Code (e.g. FESTIVE300)"
                  value={newOffer.code}
                  onChange={(e) => setNewOffer({ ...newOffer, code: e.target.value.toUpperCase() })}
                  required
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                />
                <input
                  type="text"
                  placeholder="Campaign Title"
                  value={newOffer.title}
                  onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
                  required
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="number"
                  placeholder="Flat Discount ₹ (e.g. 250)"
                  value={newOffer.flatDiscount}
                  onChange={(e) => setNewOffer({ ...newOffer, flatDiscount: Number(e.target.value) })}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingOffer(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700"
                >
                  Save Code
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offers.map((offer) => (
              <div key={offer.id} className="p-4 rounded-2xl border border-gray-100 bg-[#FAFBFD] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-amber-600" />
                    <span className="font-mono font-black text-xs text-[#111827] bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                      {offer.code}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">
                    {offer.usedCount || 0} / {offer.maxUses || 100} redemptions
                  </span>
                </div>
                <h4 className="text-xs font-bold text-[#111827]">{offer.title}</h4>
                <p className="text-[11px] text-gray-500">{offer.description}</p>
                <p className="text-[11px] font-bold text-emerald-600">
                  {offer.flatDiscount ? `₹${offer.flatDiscount} FLAT OFF` : `${offer.discountPercent}% OFF`} (Min booking ₹{offer.minAmount || 0})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. USERS DIRECTORY TAB */}
      {activeTab === 'users' && (
        <div className="bg-white p-6 rounded-3xl border border-[#EAF3FF] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#111827]">Registered User Directory</h3>
            <span className="text-xs text-gray-400">{users.length} Active Accounts</span>
          </div>

          {users.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No registered users found.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map((u) => (
                <div key={u.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black text-[#111827]">{u.name}</h4>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded capitalize ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-800' : u.role === 'owner' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {u.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500">{u.email} {u.phone ? `· ${u.phone}` : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Active Account ✓
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">{u.totalTrips || 0} trips completed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. DISPUTES TAB */}
      {activeTab === 'disputes' && (
        <div className="bg-white p-6 rounded-3xl border border-[#EAF3FF] space-y-4">
          <h3 className="text-sm font-black text-[#111827]">Damage Claims & Security Deposit Arbitration</h3>
          {disputes.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No active disputes or claims recorded.</p>
          ) : (
            <div className="space-y-3">
              {disputes.map((d) => (
                <div key={d.id} className="p-4 rounded-2xl border border-rose-100 bg-rose-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span className="text-xs font-black text-[#111827]">{d.reason}</span>
                    </div>
                    <span className="text-xs font-black text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-md">
                      Claim: ₹{d.amountClaimed}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700">{d.description}</p>
                  <p className="text-[11px] text-gray-500">
                    Vehicle: <strong>{d.vehicleName}</strong> · Renter: {d.renterName} · Host: {d.ownerName}
                  </p>
                  {d.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => onResolveDispute(d.id, 'Claim approved: Deducted from security deposit and disbursed to host.')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Approve Claim & Deduct Deposit
                      </button>
                      <button
                        type="button"
                        onClick={() => onResolveDispute(d.id, 'Claim dismissed after photo inspection audit.')}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Dismiss Claim & Refund Renter
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. PAYOUTS TAB */}
      {activeTab === 'payouts' && (
        <div className="bg-white p-6 rounded-3xl border border-[#EAF3FF] space-y-4">
          <h3 className="text-sm font-black text-[#111827]">Host Settlement & Payout Approvals</h3>
          {payouts.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No host payout requests pending.</p>
          ) : (
            <div className="divide-y divide-gray-100 text-xs">
              {payouts.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-[#111827] block">₹{p.amount.toLocaleString()}</span>
                    <span className="text-[11px] text-gray-500">
                      Host ID: {p.hostId} · {p.date || new Date().toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-gray-600">{p.bankAccount || p.accountNumber || 'HDFC Bank ··· 9821'}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      p.status === 'settled' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {p.status}
                    </span>
                    {p.status !== 'settled' && (
                      <button
                        onClick={() => onApprovePayout(p.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1 rounded-lg cursor-pointer"
                      >
                        Approve & Transfer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
