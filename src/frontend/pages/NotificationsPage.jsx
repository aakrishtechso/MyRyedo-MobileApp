import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export const NotificationsPage = ({
  notifications = [],
  unreadCount = 0,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigateNotification,
  onBack
}) => {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(
    () => notifications.filter((n) => filter === 'all' || !n.read),
    [notifications, filter]
  );

  const formatTime = (value) => {
    if (!value) return 'Just now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recent';
    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const iconFor = (type) => {
    if (type === 'NEW_MESSAGE') return <MessageSquare className="w-5 h-5" />;
    if (type === 'BOOKING_REQUEST') return <Clock className="w-5 h-5" />;
    if (type === 'BOOKING_ACCEPTED' || type === 'BOOKING_CONFIRMED') return <CheckCircle2 className="w-5 h-5" />;
    if (type === 'BOOKING_REJECTED' || type === 'BOOKING_CANCELLED' || type === 'cancellation') return <XCircle className="w-5 h-5" />;
    if (type === 'waitlist_available') return <Sparkles className="w-5 h-5" />;
    return <Bell className="w-5 h-5" />;
  };

  const iconClass = (type) => {
    if (type === 'NEW_MESSAGE') return 'bg-blue-50 text-blue-600';
    if (type === 'BOOKING_REQUEST') return 'bg-amber-50 text-amber-700';
    if (type === 'BOOKING_ACCEPTED' || type === 'BOOKING_CONFIRMED') return 'bg-emerald-50 text-emerald-700';
    if (type === 'BOOKING_REJECTED' || type === 'BOOKING_CANCELLED' || type === 'cancellation') return 'bg-rose-50 text-rose-600';
    return 'bg-orange-50 text-[#FF6400]';
  };

  const openNotification = (notification) => {
    if (!notification.read) onMarkAsRead?.(notification.id);
    onNavigateNotification?.(notification);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F8FAFC] py-6 sm:py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-7 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600"
                aria-label="Back to home"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#111827]">Notifications</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {unreadCount ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'You are all caught up.'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-orange-50 text-[#FF6400] text-xs font-black hover:bg-orange-100"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all as read
              </button>
            )}
          </div>

          <div className="px-5 sm:px-7 py-3 border-b border-gray-100 flex gap-2">
            <button type="button" onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${filter === 'all' ? 'bg-[#111827] text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              All ({notifications.length})
            </button>
            <button type="button" onClick={() => setFilter('unread')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${filter === 'unread' ? 'bg-[#FF6400] text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              Unread ({unreadCount})
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 px-6 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
                <Bell className="w-7 h-7" />
              </div>
              <h2 className="mt-4 text-sm font-black text-gray-800">No notifications</h2>
              <p className="mt-1 text-xs text-gray-500">Booking updates, messages and other account activity will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={`w-full text-left p-5 sm:p-6 flex items-start gap-4 hover:bg-gray-50 transition-colors ${notification.read ? 'bg-white' : 'bg-orange-50/30'}`}
                >
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconClass(notification.type)}`}>
                    {iconFor(notification.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className={`text-sm ${notification.read ? 'font-bold' : 'font-black'} text-[#111827]`}>{notification.title || 'MyRyedo notification'}</h3>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{formatTime(notification.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-gray-600 leading-relaxed">{notification.message || 'You have a new account update.'}</p>
                    {!notification.read && <span className="inline-block mt-2 text-[10px] font-black text-[#FF6400]">NEW</span>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-2" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
