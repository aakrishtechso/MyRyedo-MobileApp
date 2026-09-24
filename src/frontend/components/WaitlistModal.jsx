import React, { useState } from 'react';
import { X, MapPin, CheckCircle2, Sparkles, Mail, Phone, User } from 'lucide-react';
import { backendService } from '../../backend/api';

export const WaitlistModal = ({ isOpen, onClose, defaultCity = '', onJoined }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState(defaultCity || '');
  const [area, setArea] = useState('');
  const [interest, setInterest] = useState('renter');
  const [vehicleTypeInterest, setVehicleTypeInterest] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await backendService.joinWaitlist({
        name,
        email,
        phone,
        city,
        area,
        interest,
        vehicleTypeInterest
      });

      if (res.success) {
        setIsSuccess(true);
        if (onJoined) onJoined(res.item);
      } else {
        setError(res.error || 'Failed to submit registration.');
      }
    } catch (err) {
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-[#111827]">You're on the Priority List!</h3>
            <p className="text-xs text-gray-600">
              Thank you for registering. We'll keep your request on record and contact you when relevant MyRyedo availability reaches your area.
            </p>
            <button
              onClick={onClose}
              className="mt-4 bg-[#FF6400] text-white text-xs font-black px-6 py-2.5 rounded-xl cursor-pointer hover:bg-orange-600"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-50 text-[#FF6400] rounded-xl">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#111827]">MyRyedo Neighborhood Expansion</h3>
                <p className="text-[11px] text-gray-500">Vote for your area and get priority access when we launch.</p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Your Name</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priyansh Jain"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#1769D1]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#1769D1]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#1769D1]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">City</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Indore"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#1769D1]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Locality / Neighborhood</label>
                  <input
                    type="text"
                    placeholder="e.g. Palasia, Rau..."
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#1769D1]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">I want to...</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInterest('renter')}
                    className={`py-2 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                      interest === 'renter'
                        ? 'bg-[#EAF3FF] border-[#1769D1] text-[#1769D1]'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    Rent Vehicles
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterest('host')}
                    className={`py-2 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                      interest === 'host'
                        ? 'bg-orange-50 border-orange-500 text-orange-600'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    List My Vehicle (Host)
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[#FF6400] hover:bg-[#e05800] active:scale-98 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Registering...' : 'Join Priority Launch Waitlist'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
