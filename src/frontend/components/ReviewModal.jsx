import React, { useState } from 'react';
import { 
  X, 
  Star, 
  Sparkles, 
  Check, 
  ThumbsUp, 
  MessageSquare,
  ShieldCheck,
  Car as CarIconPlaceholder
} from 'lucide-react';

export const ReviewModal = ({
  booking,
  isOpen,
  onClose,
  onSubmitReview
}) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [cleanliness, setCleanliness] = useState(5);
  const [maintenance, setMaintenance] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [value, setValue] = useState(5);
  const [comment, setComment] = useState('');

  if (!isOpen || !booking) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const newReview = {
      id: `rev-${Date.now()}`,
      bookingId: booking.id,
      vehicleId: booking.vehicleId,
      ownerId: booking.vehicle.owner.id,
      renterId: booking.renterId,
      userName: booking.renterName,
      userAvatar: booking.renterAvatar || null,
      rating,
      cleanlinessRating: cleanliness,
      maintenanceRating: maintenance,
      communicationRating: communication,
      valueRating: value,
      comment,
      tripVehicle: booking.vehicle.name
    };

    onSubmitReview(newReview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-[#EAF3FF] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#F7F9FC] border-b border-[#EAF3FF] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FF7A00]" />
            <span className="text-sm font-black text-[#111827]">Rate Your Experience</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Vehicle info */}
          <div className="flex items-center gap-3 bg-[#F7F9FC] p-3 rounded-2xl border border-gray-100">
            {booking.vehicle.images?.[0] ? <img src={booking.vehicle.images[0]} alt={booking.vehicle.name} className="w-14 h-11 rounded-xl object-cover" /> : <div className="w-14 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400"><CarIconPlaceholder /></div>}
            <div>
              <h4 className="text-xs font-black text-[#111827]">{booking.vehicle.name}</h4>
              <p className="text-[11px] text-gray-500">Hosted by {booking.vehicle.owner.name} · {booking.totalDays} day rental</p>
            </div>
          </div>

          {/* Main Star Rating */}
          <div className="text-center space-y-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400 block">
              Overall Rating
            </span>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 text-2xl transition-transform hover:scale-115 focus:outline-hidden"
                >
                  <Star 
                    className={`w-8 h-8 ${
                      (hoverRating || rating) >= star 
                        ? 'fill-amber-400 text-amber-400' 
                        : 'text-gray-300'
                    }`} 
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-[#1769D1]">
              {rating === 5 ? 'Excellent 🌟' : rating === 4 ? 'Very Good 👍' : rating === 3 ? 'Average' : 'Below Expectations'}
            </p>
          </div>

          {/* Sub-aspect ratings */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-[#FAFBFD] p-3.5 rounded-2xl border border-gray-100">
            <div>
              <div className="flex justify-between font-bold text-gray-700 mb-1">
                <span>Cleanliness</span>
                <span className="text-[#1769D1]">{cleanliness}/5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={cleanliness}
                onChange={(e) => setCleanliness(Number(e.target.value))}
                className="w-full accent-[#1769D1]"
              />
            </div>
            <div>
              <div className="flex justify-between font-bold text-gray-700 mb-1">
                <span>Vehicle Maintenance</span>
                <span className="text-[#1769D1]">{maintenance}/5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={maintenance}
                onChange={(e) => setMaintenance(Number(e.target.value))}
                className="w-full accent-[#1769D1]"
              />
            </div>
            <div>
              <div className="flex justify-between font-bold text-gray-700 mb-1">
                <span>Host Communication</span>
                <span className="text-[#1769D1]">{communication}/5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={communication}
                onChange={(e) => setCommunication(Number(e.target.value))}
                className="w-full accent-[#1769D1]"
              />
            </div>
            <div>
              <div className="flex justify-between font-bold text-gray-700 mb-1">
                <span>Value for Money</span>
                <span className="text-[#1769D1]">{value}/5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-full accent-[#1769D1]"
              />
            </div>
          </div>

          {/* Written feedback */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
              Your Review & Tips for future drivers
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was the pickup, fuel efficiency, ride comfort, and communication with the host?"
              className="w-full p-3 rounded-xl border border-gray-200 text-xs text-[#111827] focus:ring-2 focus:ring-[#1769D1]/20 outline-hidden"
              required
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-review-btn"
              type="submit"
              className="bg-[#FF7A00] hover:bg-[#e06c00] text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Publish Verified Review</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
