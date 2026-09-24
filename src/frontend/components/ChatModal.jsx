import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Phone, 
  ShieldCheck, 
  MapPin, 
  Image as ImageIcon, 
  Paperclip, 
  Smile, 
  Clock,
  Sparkles,
  Car
} from 'lucide-react';

import { backendService } from '../../backend/api.js';

export const ChatModal = ({
  isOpen,
  onClose,
  ownerId,
  vehicleId,
  currentUserId,
  vehicles = [],
  messages = [],
  onSendMessage
}) => {
  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && ownerId) {
      backendService.markMessagesAsRead(ownerId).catch(() => {});
    }
  }, [isOpen, ownerId]);

  if (!isOpen) return null;

  const matchedVehicle = vehicles.find((v) => v.id === vehicleId || v.owner?.id === ownerId);
  const ownerInfo = matchedVehicle?.owner || {
    id: ownerId,
    name: 'Verified Host',
    avatar: null,
    responseRate: '100%',
    responseTime: 'within 10 mins',
    rating: matchedVehicle?.rating ?? null,
    trips: matchedVehicle?.tripsCount || 0,
    phone: matchedVehicle?.owner?.phone || '',
    verified: true
  };

  const conversationMessages = messages.filter(
    (m) => (m.senderId === ownerId || m.recipientId === ownerId)
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages, isOpen]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    onSendMessage(inputVal.trim(), ownerId, vehicleId);
    setInputVal('');
  };

  const quickReplies = [
    'Is the vehicle available for instant pickup?',
    'Where is the pickup point?',
    'What should I bring for pickup?',
    'Can I extend the return time by 2 hours?'
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white w-full max-w-2xl h-[85vh] max-h-[700px] rounded-3xl overflow-hidden shadow-2xl border border-[#EAF3FF] flex flex-col relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Chat Header */}
        <div className="bg-[#F7F9FC] px-5 py-4 border-b border-[#EAF3FF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              {ownerInfo.avatar ? (
                <img
                  src={ownerInfo.avatar}
                  alt={ownerInfo.name}
                  className="w-11 h-11 rounded-2xl object-cover ring-2 ring-[#1769D1]/20"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-orange-100 text-[#FF6400] font-bold text-base flex items-center justify-center ring-2 ring-orange-500/20">
                  {ownerInfo.name ? ownerInfo.name[0].toUpperCase() : 'H'}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-[#111827]">{ownerInfo.name}</h3>
                {ownerInfo.verified && <ShieldCheck className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-gray-500">
                {Number.isFinite(Number(ownerInfo.rating)) && Number(ownerInfo.rating) > 0 ? `★ ${Number(ownerInfo.rating).toFixed(1)} · ` : ''}Online
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${ownerInfo.phone}`}
              className="p-2 text-[#1769D1] bg-[#EAF3FF] hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
              title="Call Host"
            >
              <Phone className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Vehicle Snapshot Header if available */}
        {matchedVehicle && (
          <div className="bg-[#EAF3FF]/40 px-5 py-2.5 border-b border-[#EAF3FF] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 truncate">
              <Car className="w-4 h-4 text-[#1769D1] shrink-0" />
              <span className="font-bold text-[#111827] truncate">{matchedVehicle.name}</span>
              <span className="text-gray-400">•</span>
              <span className="text-[#FF7A00] font-extrabold">₹{matchedVehicle.pricePerDay}/day</span>
            </div>
            <span className="text-[11px] text-gray-500 font-medium shrink-0">📍 {matchedVehicle.location}</span>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#FBFDFF]">
          {conversationMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1769D1] flex items-center justify-center mb-2">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-gray-600">Start the conversation with {ownerInfo.name}</p>
              <p className="text-[11px] text-gray-400 max-w-xs mt-1">
                Ask about pickup directions, custom luggage needs, or flexible timings.
              </p>
            </div>
          ) : (
            conversationMessages.map((msg) => {
              const isSentByMe = currentUserId ? msg.senderId === currentUserId : (!msg.isOwner);
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 max-w-[85%] ${
                    isSentByMe ? 'self-end ml-auto flex-row-reverse' : 'self-start'
                  }`}
                >
                  {msg.senderAvatar ? (
                    <img
                      src={msg.senderAvatar}
                      alt={msg.senderName || 'User'}
                      className="w-7 h-7 rounded-full object-cover shrink-0 mt-1"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-orange-100 text-[#FF6400] text-xs font-bold flex items-center justify-center shrink-0 mt-1">
                      {msg.senderName ? msg.senderName[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <div>
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed ${
                        isSentByMe
                          ? 'bg-[#FF6400] text-white shadow-md shadow-orange-500/15 rounded-tr-xs'
                          : 'bg-white text-gray-800 border border-gray-100 shadow-xs rounded-tl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className={`text-[10px] text-gray-400 mt-1 block px-1 ${isSentByMe ? 'text-right' : ''}`}>
                      {msg.timestamp || (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto no-scrollbar">
          {quickReplies.map((qr, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSendMessage(qr, ownerId, vehicleId)}
              className="text-[11px] font-semibold text-gray-600 bg-gray-100 hover:bg-[#EAF3FF] hover:text-[#1769D1] px-3 py-1.5 rounded-full whitespace-nowrap transition-colors shrink-0 cursor-pointer"
            >
              {qr}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 sm:p-4 bg-white border-t border-[#EAF3FF] flex items-center gap-2">
          <input
            id="chat-input-field"
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={`Message ${ownerInfo.name}...`}
            className="flex-1 bg-[#F7F9FC] text-xs sm:text-sm px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:border-[#1769D1] focus:bg-white text-[#111827] font-medium"
          />
          <button
            id="chat-send-btn"
            type="submit"
            disabled={!inputVal.trim()}
            className="bg-[#1769D1] hover:bg-[#0B3B82] disabled:opacity-40 text-white p-3 rounded-2xl transition-transform active:scale-95 shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
