import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowRight, MapPin, Car, Heart, Sparkles } from 'lucide-react';
import { Navbar } from './frontend/components/Navbar';
import { BottomNav } from './frontend/components/BottomNav';
import { SearchBar } from './frontend/components/SearchBar';
import { VehicleCard } from './frontend/components/VehicleCard';
import { HomeAboutSection, HomeOwnerSection, FinalHomeCTA } from './frontend/components/HomeStorySections';
import { TrustAndHowItWorks } from './frontend/components/TrustAndHowItWorks';
import { TopCitiesSection } from './frontend/components/TopCitiesSection';
import { VehicleDetailsModal } from './frontend/components/VehicleDetailsModal';
import { BookingModal } from './frontend/components/BookingModal';
import { ChatModal } from './frontend/components/ChatModal';
import { BookerDashboard } from './frontend/components/BookerDashboard';
import { OwnerDashboard } from './frontend/components/OwnerDashboard';
import { ListVehicleModal } from './frontend/components/ListVehicleModal';
import { EditVehicleModal } from './frontend/components/EditVehicleModal';
import { FilterModal } from './frontend/components/FilterModal';
import { AuthModal } from './frontend/components/AuthModal';
import { ReviewModal } from './frontend/components/ReviewModal';
import { InspectionModal } from './frontend/components/InspectionModal';
import { WaitlistModal } from './frontend/components/WaitlistModal';
import { BookingPage } from './frontend/pages/BookingPage';
import { CancellationPage } from './frontend/pages/CancellationPage';
import { ProfilePage } from './frontend/pages/ProfilePage';
import { VehicleDetailsPage } from './frontend/pages/VehicleDetailsPage';
import { AuthPage } from './frontend/pages/AuthPage';
import { NotificationsPage } from './frontend/pages/NotificationsPage';
import { AllVehiclesPage } from './frontend/pages/AllVehiclesPage';
import { VehicleWaitlistPage } from './frontend/pages/VehicleWaitlistPage';
import { backendService } from './backend/api.js';
import { AdminDashboard } from './frontend/components/AdminDashboard';

export default function App() {
  // Navigation & User State: MyRyedo always opens on Home. Authentication is required only for protected actions.
  const initialRestoredUser = backendService.getRestoredSession();
  const [currentUser, setCurrentUser] = useState(initialRestoredUser);
  const [currentView, setCurrentViewState] = useState('home');
  // Keep a real in-app navigation stack so Back returns to the page the user actually came from.
  const [viewHistory, setViewHistory] = useState([]);
  const currentViewRef = useRef('home');

  const setCurrentView = (nextView) => {
    const fromView = currentViewRef.current;
    if (fromView === nextView) return;

    // Home is a fresh starting point (logo, Explore, logout, etc.).
    if (nextView === 'home') {
      currentViewRef.current = 'home';
      setViewHistory([]);
      setCurrentViewState('home');
      return;
    }

    currentViewRef.current = nextView;
    setViewHistory(prev => [...prev, fromView]);
    setCurrentViewState(nextView);
  };

  const goBack = () => {
    setViewHistory(prev => {
      if (prev.length === 0) {
        currentViewRef.current = 'home';
        setCurrentViewState('home');
        return prev;
      }
      const next = [...prev];
      const previousView = next.pop();
      const destination = previousView || 'home';
      currentViewRef.current = destination;
      setCurrentViewState(destination);
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [allUsers, setAllUsers] = useState([]);

  // Auth Guard & Pending Intent State
  const [pendingAction, setPendingAction] = useState(null);
  const [authIntentMessage, setAuthIntentMessage] = useState(null);
  const [authDefaultMode, setAuthDefaultMode] = useState('login');
  const [authRoleHint, setAuthRoleHint] = useState('booker');

  // Core Data State - Live backend data
  const [vehicles, setVehicles] = useState([]);
  const [ownerVehicles, setOwnerVehicles] = useState([]);
  const [serviceAreas, setServiceAreas] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [unavailableVehicleIds, setUnavailableVehicleIds] = useState([]);

  // Selected vehicle for modal or map
  const [detailsVehicle, setDetailsVehicle] = useState(null);
  const [selectedVehicleForMap, setSelectedVehicleForMap] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);

  const fetchNotifications = async () => {
    try {
      const notifs = await backendService.getNotifications();
      if (Array.isArray(notifs)) {
        setNotifications(notifs);
      }
    } catch {}
  };

  const fetchMessages = async () => {
    if (!currentUser) return;
    try {
      const msgs = await backendService.getMessages();
      if (Array.isArray(msgs)) {
        setMessages(msgs);
      }
    } catch {}
  };

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      fetchMessages();
    }
    const interval = setInterval(() => {
      if (currentUser) {
        fetchNotifications();
        fetchMessages();
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  useEffect(() => {
    backendService.getServiceAreas().then((areas) => {
      if (Array.isArray(areas)) setServiceAreas(areas);
    }).catch(() => {});
  }, []);

  // Load real vehicle fleet on mount
  useEffect(() => {
    setIsLoadingVehicles(true);
    backendService.getVehicles()
      .then((data) => {
        if (Array.isArray(data)) {
          setVehicles(data);
          if (data.length > 0) {
            setSelectedVehicleForMap(data[0]);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load vehicles', err);
      })
      .finally(() => {
        setIsLoadingVehicles(false);
      });
  }, []);

  // Restore authenticated session from backendService on mount and load user's real bookings
  useEffect(() => {
    const savedUser = backendService.getRestoredSession();
    if (savedUser) {
      setCurrentUser(savedUser);
      backendService.getCurrentUser().then((user) => {
        if (user) {
          setCurrentUser(user);
          // Load real bookings for this user from backend
          backendService.getBookings().then((userBookings) => {
            if (Array.isArray(userBookings)) {
              setBookings(userBookings);
            }
          }).catch(() => {});
          fetchNotifications();
          fetchMessages();
        } else {
          setCurrentUser(null);
          setBookings([]);
          setNotifications([]);
          setMessages([]);
          showToast('Your session has expired. Please sign in again.');
        }
      }).catch(() => {});
    }
  }, []);

  // Owner-only private fleet is loaded from the authenticated owner endpoint.
  useEffect(() => {
    let cancelled = false;
    if (currentUser?.role !== 'owner') {
      setOwnerVehicles([]);
      return;
    }
    backendService.getMyVehicles().then((mine) => {
      if (!cancelled) setOwnerVehicles(Array.isArray(mine) ? mine : []);
    }).catch(() => {
      if (!cancelled) setOwnerVehicles([]);
    });
    return () => { cancelled = true; };
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    let cancelled = false;
    if (currentUser?.role !== 'owner') {
      setPayouts([]);
      return;
    }
    backendService.getPayouts().then((data) => {
      if (!cancelled) setPayouts(Array.isArray(data) ? data : []);
    }).catch(() => {
      if (!cancelled) setPayouts([]);
    });
    return () => { cancelled = true; };
  }, [currentUser?.id, currentUser?.role]);

  // Booking modal state
  const [bookingVehicle, setBookingVehicle] = useState(null);
  const [waitlistVehicle, setWaitlistVehicle] = useState(null);

  // Inspection, Review, Dispute Modals
  const [reviewBooking, setReviewBooking] = useState(null);
  const [inspectionTarget, setInspectionTarget] = useState(null);

  // Chat modal state
  const [chatTarget, setChatTarget] = useState(null);

  // Generic Modals
  const [isListVehicleOpen, setIsListVehicleOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState('login');

  // Filter State (No predefined fixed duration)
  const [filters, setFilters] = useState({
    category: 'all',
    searchLocation: '',
    pickupDate: '',
    pickupTime: '10:00',
    returnDate: '',
    returnTime: '10:00',
    minPrice: 0,
    maxPrice: 15000,
    fuelTypes: [],
    transmissions: [],
    onlyVerified: false,
    instantBookingOnly: false,
    sortBy: 'recommended'
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Toggle Favorite
  const handleToggleFavorite = (vehicleId) => {
    setFavorites(prev => {
      const exists = prev.includes(vehicleId);
      if (exists) {
        showToast('Removed from favorites');
        return prev.filter(id => id !== vehicleId);
      } else {
        showToast('Saved to your favorites ❤️');
        return [...prev, vehicleId];
      }
    });
  };

  // Role access is account-based. Never mutate a user's role in frontend state.
  const handleRoleChange = (newRole) => {
    const requestedRole = newRole === 'owner' ? 'owner' : 'booker';
    if (currentUser?.role === requestedRole) {
      setCurrentView(requestedRole === 'owner' ? 'owner-dashboard' : 'home');
      return;
    }
    handleOpenAuthModal('login', `Please sign in with a ${requestedRole === 'owner' ? 'Owner' : 'Booker'} account to continue.`, requestedRole);
  };

  // Open Auth Page with custom intent and mode
  const handleOpenAuthModal = (mode = 'login', message = null, role = 'booker') => {
    setAuthDefaultMode(typeof mode === 'string' ? mode : 'login');
    setAuthIntentMessage(message);
    setAuthRoleHint(role || 'booker');
    setCurrentView('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Guarded initiate booking (preserves intent if guest)
  const handleInitiateBooking = async (vehicle, bookingDetailsOrPickupDate, returnDate) => {
    if (currentUser?.role === 'owner') {
      showToast('Owner accounts cannot book vehicles. Use a renter/booker account to book a ride.');
      return;
    }
    let details = {};
    if (bookingDetailsOrPickupDate && typeof bookingDetailsOrPickupDate === 'object') {
      details = { ...bookingDetailsOrPickupDate };
    } else {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      details = {
        rentalType: vehicle.hourlyRentalEnabled && vehicle.dailyRentalEnabled === false ? 'hourly' : 'daily',
        pickupDate: bookingDetailsOrPickupDate || filters.pickupDate || today,
        returnDate: returnDate || filters.returnDate || tomorrow,
        pickupTime: '10:00',
        returnTime: '14:00'
      };
    }

    // A search can hide a conflicting vehicle, but a user may still reach a
    // listing directly. Re-check the selected window before opening booking.
    if (details.pickupDate && details.returnDate) {
      try {
        const unavailable = await backendService.getUnavailableVehicleIds({
          vehicleIds: [vehicle.id],
          startDateTime: `${details.pickupDate}T${details.pickupTime || '10:00'}`,
          endDateTime: `${details.returnDate}T${details.returnTime || details.pickupTime || '10:00'}`
        });
        if (unavailable.map(String).includes(String(vehicle.id))) {
          const waitlistDetails = { vehicle, ...details };
          if (!currentUser) {
            setPendingAction({ type: 'waitlist', ...waitlistDetails });
            handleOpenAuthModal('login', `This vehicle is unavailable for your selected time. Sign in to join its waiting list.`, 'booker');
          } else {
            setWaitlistVehicle(waitlistDetails);
            setCurrentView('waitlist');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
          return;
        }
      } catch {}
    }

    if (!currentUser) {
      setPendingAction({
        type: 'book',
        vehicle,
        ...details
      });
      handleOpenAuthModal('login', `Please sign in or create an account to book ${vehicle.name}.`, 'booker');
      return;
    }
    setBookingVehicle({
      vehicle,
      ...details
    });
    setCurrentView('booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dedicated view handler to open vehicle details page
  const handleSelectVehicle = (vehicle) => {
    setDetailsVehicle(vehicle);
    setCurrentView('vehicle-details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Guarded initiate list vehicle (preserves intent if guest)
  const handleInitiateListVehicle = () => {
    if (!currentUser) {
      setPendingAction({ type: 'list_vehicle' });
      handleOpenAuthModal('signup', 'Want to list your vehicle? Create an account or log in to get started.', 'owner');
      return;
    }
    if (currentUser.role !== 'owner') {
      showToast('Vehicle listing requires an Owner account. Please sign in with an Owner account.');
      return;
    }
    setCurrentView('list-vehicle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Guarded initiate chat (preserves intent if guest)
  const handleInitiateChat = (ownerId, vehicleId) => {
    if (!currentUser) {
      setPendingAction({ type: 'chat', ownerId, vehicleId });
      handleOpenAuthModal('login', 'Sign in or create an account to message the host.', 'booker');
      return;
    }
    setChatTarget({ ownerId, vehicleId });
  };

  // Login handler: seamlessly resumes pending action if present
  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    const action = pendingAction;
    setPendingAction(null);
    setAuthIntentMessage(null);

    // Keep allUsers in sync if new user
    setAllUsers(prev => {
      if (prev.some(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase())) {
        return prev;
      }
      return [user, ...prev];
    });

    // Fetch real bookings, notifications, and messages for authenticated user
    backendService.getBookings().then((userBookings) => {
      if (Array.isArray(userBookings)) {
        setBookings(userBookings);
      }
    }).catch(() => {});
    fetchNotifications();
    fetchMessages();

    if (action) {
      if (action.type === 'book') {
        setBookingVehicle({
          vehicle: action.vehicle,
          ...action
        });
        setCurrentView('booking');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast(`Welcome, ${user.name}! Resuming booking for ${action.vehicle.name}.`);
        return;
      }
      if (action.type === 'waitlist') {
        setWaitlistVehicle({ vehicle: action.vehicle, ...action });
        setCurrentView('waitlist');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast(`Welcome, ${user.name}! You can join the waiting list for ${action.vehicle.name}.`);
        return;
      }
      if (action.type === 'list_vehicle') {
        if (user.role !== 'owner') {
          setCurrentView('home');
          showToast('An Owner account is required to list a vehicle.');
          return;
        }
        setCurrentView('list-vehicle');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast(`Welcome, ${user.name}! Opening your vehicle listing wizard.`);
        return;
      }
      if (action.type === 'chat') {
        setChatTarget({ ownerId: action.ownerId, vehicleId: action.vehicleId });
        showToast(`Welcome, ${user.name}! Opening host chat.`);
        return;
      }
    }

    // Default flow: Always navigate immediately into the Home view
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Welcome to MyRyedo, ${user.name}!`);
  };

  // Logout handler: completely cleans up session, resets intents, and redirects to Login view
  const handleLogout = () => {
    backendService.logout();
    setCurrentUser(null);
    setBookings([]);
    setNotifications([]);
    setMessages([]);
    setPendingAction(null);
    setAuthIntentMessage(null);
    setAuthDefaultMode('login');
    setViewHistory([]);
    currentViewRef.current = 'home';
    setCurrentViewState('home');
    setIsAuthModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('You have been logged out.');
  };

  // Add a new vehicle (from owner flow)
  const handleVehicleAdded = (newVehicle) => {
    setVehicles(prev => [newVehicle, ...prev.filter(v => v.id !== newVehicle.id)]);
    if (currentUser?.role === 'owner' && String(newVehicle.ownerId || newVehicle.owner?.id || '') === String(currentUser.id)) {
      setOwnerVehicles(prev => [newVehicle, ...prev.filter(v => v.id !== newVehicle.id)]);
    }
    showToast(`Vehicle "${newVehicle.name}" was saved successfully.`);
    setCurrentView('owner-dashboard');
  };

  // Update existing vehicle
  const handleVehicleUpdated = (updatedVehicle) => {
    setVehicles(prev => prev.map(v => (v.id === updatedVehicle.id ? updatedVehicle : v)));
    setOwnerVehicles(prev => prev.map(v => (v.id === updatedVehicle.id ? updatedVehicle : v)));
    showToast(`Updated "${updatedVehicle.name}" settings and rates.`);
  };

  // Delete vehicle
  const handleVehicleDeleted = (vehicleId) => {
    setVehicles(prev => prev.filter(v => v.id !== vehicleId));
    if (selectedVehicleForMap?.id === vehicleId) {
      setSelectedVehicleForMap(null);
    }
    showToast('Vehicle removed from garage.');
  };

  // Toggle vehicle availability
  const handleToggleAvailability = async (vehicleId) => {
    const vehicle = ownerVehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
      showToast('Vehicle not found in your fleet.');
      return;
    }
    const nextAvailability = vehicle.isAvailable === false;
    const result = await backendService.updateVehicle(vehicleId, { isAvailable: nextAvailability });
    if (!result?.success || !result.vehicle) {
      showToast(result?.error || 'Could not update vehicle availability.');
      return;
    }
    setVehicles(prev => prev.map(v => (v.id === vehicleId ? result.vehicle : v)));
    setOwnerVehicles(prev => prev.map(v => (v.id === vehicleId ? result.vehicle : v)));
    showToast(nextAvailability ? 'Vehicle is now available.' : 'Vehicle has been paused.');
  };

  // Add confirmed booking and route to Booker Dashboard
  const handleBookingConfirmed = (newBooking) => {
    setBookings(prev => [newBooking, ...prev]);
    setBookingVehicle(null);
    setCurrentView('booker-dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('🎉 Booking Confirmed! Digital smart key generated.');
  };

  // Initiate full cancellation page
  const handleInitiateCancelBooking = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setCancellingBooking(booking);
      setCurrentView('cancel-booking');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      showToast('Booking not found.');
    }
  };

  // Called when cancellation is successfully completed on CancellationPage
  const handleCancellationCompleted = (bookingId, cancellationData) => {
    setBookings(prev =>
      prev.map(b => (b.id === bookingId ? { ...b, status: 'cancelled', cancellation: cancellationData } : b))
    );
    setCancellingBooking(null);
    setCurrentView('booker-dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Booking cancelled. Refund breakdown has been sent to your email.');
  };

  // Direct cancel fallback
  const handleCancelBooking = (bookingId) => {
    handleInitiateCancelBooking(bookingId);
  };

  // Approve booking request (Owner action)
  const handleApproveBooking = async (bookingId) => {
    const result = await backendService.updateBookingStatus(bookingId, 'confirmed');
    if (!result?.success) {
      showToast(result?.error || 'Booking could not be approved.');
      return;
    }
    setBookings(prev =>
      prev.map(b => (b.id === bookingId ? { ...b, ...(result.booking || {}), status: 'confirmed' } : b))
    );
    await fetchNotifications();
    showToast('Booking approved. The renter has been notified.');
  };

  // Reject booking request (Owner action)
  const handleRejectBooking = async (bookingId) => {
    const result = await backendService.updateBookingStatus(bookingId, 'rejected');
    if (!result?.success) {
      showToast(result?.error || 'Booking could not be declined.');
      return;
    }
    setBookings(prev =>
      prev.map(b => (b.id === bookingId ? { ...b, ...(result.booking || {}), status: 'rejected' } : b))
    );
    await fetchNotifications();
    showToast('Booking request declined.');
  };

  // Notification action handlers
  const handleMarkNotificationAsRead = async (id) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    await backendService.markNotificationAsRead(id);
  };

  const handleMarkAllNotificationsAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await backendService.markAllNotificationsAsRead();
    showToast('All notifications marked as read.');
  };

  const handleNavigateNotification = (notif) => {
    if (notif.type === 'NEW_MESSAGE' || notif.conversationPartnerId) {
      const partnerId = notif.conversationPartnerId || notif.senderId;
      setChatTarget({ ownerId: partnerId, vehicleId: notif.vehicleId });
    } else if (notif.type?.includes('BOOKING') || notif.bookingId) {
      if (currentUser?.role === 'owner') {
        setCurrentView('owner-dashboard');
      } else {
        setCurrentView('booker-dashboard');
      }
    }
  };

  // Request payout through the connected backend. Never fabricate a payout locally.
  const handleRequestPayout = async (amount) => {
    if (!(Number(amount) > 0) || currentUser?.role !== 'owner') return;
    const res = await backendService.requestPayout({
      amount: Number(amount),
      payoutMethod: 'bank_transfer',
      payoutDetails: currentUser?.bankAccount ? `Registered account ending ${String(currentUser.bankAccount).slice(-4)}` : 'Registered bank account'
    });
    if (res?.success && res.payout) {
      setPayouts(prev => [res.payout, ...prev.filter(p => p.id !== res.payout.id)]);
      showToast('Payout request submitted successfully.');
    } else {
      showToast(res?.error || 'Could not submit the payout request.');
    }
  };

  // Send in-app message
  const handleSendMessage = async (text, recipientId, vehicleId) => {
    if (!currentUser) {
      handleOpenAuthModal('login', 'Sign in to message the host.');
      return;
    }

    try {
      const res = await backendService.sendMessage({ recipientId, vehicleId, text });
      if (res && res.success && res.message) {
        setMessages(prev => {
          if (prev.some(m => m.id === res.message.id)) return prev;
          return [...prev, res.message];
        });
        fetchNotifications();
      } else {
        showToast(res?.error || 'Message could not be sent. Please try again.');
      }
    } catch {
      showToast('Message could not be sent. Please try again.');
    }
  };

  // Admin Vehicle Approval
  const handleAdminApproveVehicle = async (vehicleId) => {
    try {
      await backendService.verifyVehicleRc(vehicleId, 'verified', 'Approved by MyRyedo Operations');
      setVehicles(prev =>
        prev.map(v => (v.id === vehicleId ? { ...v, verified: true } : v))
      );
      showToast('Vehicle RC & Insurance verified and approved for marketplace.');
    } catch (err) {
      showToast('Failed to approve vehicle: ' + (err.message || 'Error'));
    }
  };

  // Admin Feature Toggle
  const handleToggleVehicleFeatured = (vehicleId) => {
    setVehicles(prev =>
      prev.map(v => (v.id === vehicleId ? { ...v, isFeatured: !v.isFeatured } : v))
    );
    showToast('Vehicle featured status updated.');
  };

  // Admin Dispute Resolution
  const handleAdminResolveDispute = async (disputeId, resolution) => {
    try {
      await backendService.resolveDispute(disputeId, resolution, 0);
      setDisputes(prev =>
        prev.map(d => (d.id === disputeId ? { ...d, status: 'resolved', resolution } : d))
      );
      showToast(`Dispute arbitrated: ${resolution}`);
    } catch (err) {
      showToast('Failed to arbitrate dispute: ' + (err.message || 'Error'));
    }
  };

  // Admin Payout Settlement
  const handleAdminApprovePayout = async (payoutId) => {
    try {
      const txRef = `TX-${Date.now().toString(36).toUpperCase()}`;
      await backendService.settlePayout(payoutId, 'settled', txRef);
      setPayouts(prev =>
        prev.map(p => (p.id === payoutId ? { ...p, status: 'settled', txRef } : p))
      );
      showToast('Payout settled via automated bank transfer!');
    } catch (err) {
      showToast('Failed to settle payout: ' + (err.message || 'Error'));
    }
  };

  // Submit a verified review through the connected backend.
  const handleSubmitReview = async (review) => {
    if (!reviewBooking) return;
    const res = await backendService.submitReview({
      vehicleId: reviewBooking.vehicleId,
      bookingId: reviewBooking.id,
      rating: review.rating,
      comment: review.comment
    });
    if (res?.success && res.review) {
      setBookings(prev => prev.map(b => (b.id === reviewBooking.id ? { ...b, review: res.review } : b)));
      showToast('Thank you for your review.');
      setReviewBooking(null);
    } else {
      showToast(res?.error || 'Could not save your review. Please try again.');
    }
  };

  // Submit Inspection
  const handleSubmitInspection = (photos, odoReading, notes) => {
    if (inspectionTarget) {
      const { booking, stage } = inspectionTarget;
      setBookings(prev =>
        prev.map(b => {
          if (b.id === booking.id) {
            return {
              ...b,
              inspection: {
                ...b.inspection,
                [stage]: {
                  photos,
                  odometerReading: odoReading,
                  notes,
                  completedAt: new Date().toISOString()
                }
              }
            };
          }
          return b;
        })
      );
      showToast(`${stage === 'pre_trip' ? 'Pre-trip' : 'Return'} inspection documented with photos!`);
      setInspectionTarget(null);
    }
  };

  // File a dispute from Renter
  const handleFileDispute = (booking, reason, description, amount) => {
    const newDispute = {
      id: `disp-${Date.now()}`,
      bookingId: booking.id,
      renterName: booking.renterName,
      ownerName: booking.vehicle.owner.name,
      vehicleName: booking.vehicle.name,
      raisedBy: 'renter',
      reason,
      description,
      amountClaimed: amount,
      photos: [],
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    setDisputes(prev => [newDispute, ...prev]);
    showToast('Dispute filed. MyRyedo arbitration team will review your photos.');
  };

  // When the user searches for a date/time range, hide only vehicles with a
  // real database booking that overlaps that exact window.
  useEffect(() => {
    let cancelled = false;
    const loadAvailability = async () => {
      if (!filters.pickupDate || !filters.returnDate) {
        setUnavailableVehicleIds([]);
        return;
      }

      const startDateTime = `${filters.pickupDate}T${filters.pickupTime || '10:00'}`;
      const endDateTime = `${filters.returnDate}T${filters.returnTime || '10:00'}`;
      if (new Date(endDateTime).getTime() <= new Date(startDateTime).getTime()) {
        setUnavailableVehicleIds([]);
        return;
      }

      const ids = await backendService.getUnavailableVehicleIds({
        vehicleIds: vehicles.map(v => v.id),
        startDateTime,
        endDateTime
      });
      if (!cancelled) setUnavailableVehicleIds(ids.map(String));
    };

    loadAvailability();
    return () => { cancelled = true; };
  }, [filters.pickupDate, filters.pickupTime, filters.returnDate, filters.returnTime, vehicles]);

  const normalizeCategory = (value) => {
    const raw = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
    if (['car', 'cars', 'sedan', 'hatchback', 'mpv', 'coupe'].includes(raw)) return 'cars';
    if (['bike', 'bikes', 'motorcycle', 'motorcycles'].includes(raw)) return 'bikes';
    if (['scooter', 'scooters'].includes(raw)) return 'scooters';
    if (['ev', 'evs', 'electric', 'electricvehicle', 'electricvehicles'].includes(raw)) return 'evs';
    if (['suv', 'suvs'].includes(raw)) return 'suvs';
    if (['van', 'vans', 'minivan', 'mpvvan'].includes(raw)) return 'vans';
    if (raw === 'luxury') return 'luxury';
    return raw;
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      // Category filter
      if (filters.category && filters.category !== 'all') {
        const requestedCategory = normalizeCategory(filters.category);
        const matchesCategory =
          normalizeCategory(v.category) === requestedCategory ||
          normalizeCategory(v.type) === requestedCategory ||
          (requestedCategory === 'evs' && ['electric', 'ev'].includes(String(v.fuel || '').trim().toLowerCase()));
        if (!matchesCategory) return false;
      }

      // Location / vehicle search (safe for incomplete MongoDB records)
      if (filters.searchLocation && filters.searchLocation.trim()) {
        const query = filters.searchLocation.trim().toLowerCase();
        const searchable = [
          v.location, v.name, v.brand, v.model, v.type, v.category,
          v.pickupAddress, v.state, v.postalCode
        ].filter(Boolean).join(' ').toLowerCase();
        const queryParts = query.split(',').map(part => part.trim()).filter(Boolean);
        if (queryParts.length && !queryParts.every(part => searchable.includes(part))) {
          return false;
        }
      }

      // Price filter
      const dailyPrice = Number(v.pricePerDay ?? v.dailyPrice ?? 0);
      if (dailyPrice < Number(filters.minPrice || 0) || dailyPrice > Number(filters.maxPrice || 15000)) {
        return false;
      }

      // Keep a conflicting vehicle visible when a date range is selected so the
      // user can join its waiting list. The card receives the real conflict state.

      // Fuel type
      if (filters.fuelTypes.length > 0 && !filters.fuelTypes.includes(v.fuel)) {
        return false;
      }

      // Transmission
      if (filters.transmissions.length > 0 && !filters.transmissions.includes(v.transmission)) {
        return false;
      }

      // Verified only
      if (filters.onlyVerified && !v.verified) {
        return false;
      }

      // Instant booking only
      if (filters.instantBookingOnly && !v.instantBooking) {
        return false;
      }

      return true;
    });
  }, [vehicles, filters, unavailableVehicleIds]);

  // Category Pills definition with custom icons
  const categoryPills = [
    {
      id: 'cars',
      label: 'Cars',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z"/>
          <circle cx="7.5" cy="14.5" r="1.5"/>
          <circle cx="16.5" cy="14.5" r="1.5"/>
        </svg>
      )
    },
    {
      id: 'bikes',
      label: 'Bikes',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <circle cx="18.5" cy="17.5" r="3.5"/>
          <circle cx="5.5" cy="17.5" r="3.5"/>
          <circle cx="15" cy="5" r="1"/>
          <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
        </svg>
      )
    },
    {
      id: 'scooters',
      label: 'Scooters',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="18" r="3"/>
          <path d="M6 15h7l2-9h3"/>
          <path d="M16 6h4"/>
        </svg>
      )
    },
    {
      id: 'evs',
      label: 'EV',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M19 14v4"/>
          <path d="M22 16h-6"/>
          <path d="M14 6H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Z"/>
          <circle cx="6.5" cy="15.5" r="1.5"/>
          <circle cx="11.5" cy="15.5" r="1.5"/>
        </svg>
      )
    },
    {
      id: 'suvs',
      label: 'SUVs',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M3 13l2-5h14l2 5v5H3v-5z"/>
          <circle cx="7" cy="18" r="2"/>
          <circle cx="17" cy="18" r="2"/>
        </svg>
      )
    },
    {
      id: 'vans',
      label: 'Vans',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <rect x="2" y="6" width="20" height="12" rx="2"/>
          <circle cx="7" cy="18" r="2"/>
          <circle cx="17" cy="18" r="2"/>
          <path d="M15 6v6H2"/>
        </svg>
      )
    },
    {
      id: 'luxury',
      label: 'Luxury',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7z"/>
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-white text-[#111827] flex flex-col font-sans selection:bg-[#1769D1] selection:text-white pb-28">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-60 bg-[#111827] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-gray-700 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-[#FF7A00] shrink-0" />
          <span className="text-xs font-black">{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
        onRoleChange={handleRoleChange}
        onOpenAuthModal={(modeOrRole = 'login') => {
          if (modeOrRole === 'owner' || modeOrRole === 'booker') {
            handleOpenAuthModal('login', null, modeOrRole);
          } else if (modeOrRole === 'signup' || modeOrRole === 'login') {
            handleOpenAuthModal(modeOrRole, null, 'booker');
          } else {
            handleOpenAuthModal('login', null, 'booker');
          }
        }}
        onOpenLogin={() => handleOpenAuthModal('login')}
        onOpenSignup={() => handleOpenAuthModal('signup')}
        onLogout={handleLogout}
        unreadCount={notifications.filter(n => !n.read).length}
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onNavigateNotification={handleNavigateNotification}
        onOpenNotifications={() => setCurrentView('notifications')}
        onOpenListVehicle={handleInitiateListVehicle}
      />

      {/* VIEW: Home Landing Page — Home-page UI only. Other views remain unchanged. */}
      {currentView === 'home' && (
        <main className="flex-1">
          {/* Requested Home actions */}
          <section className="pt-5 sm:pt-7">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row gap-3">
                {currentUser?.role === 'owner' ? (
                  <>
                    <button
                      type="button"
                      onClick={handleInitiateListVehicle}
                      className="flex-1 sm:flex-none bg-[#FF6400] hover:bg-[#e85a00] active:scale-[.99] text-white font-black text-sm px-6 py-3.5 rounded-xl shadow-md shadow-orange-500/20 transition-all"
                    >
                      List Vehicles
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentView('owner-dashboard')}
                      className="flex-1 sm:flex-none bg-white hover:bg-slate-50 active:scale-[.99] text-slate-900 font-black text-sm px-6 py-3.5 rounded-xl border border-slate-200 transition-all"
                    >
                      My Vehicles
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => document.getElementById('vehicles-near-you')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className="flex-1 sm:flex-none bg-[#FF6400] hover:bg-[#e85a00] active:scale-[.99] text-white font-black text-sm px-6 py-3.5 rounded-xl shadow-md shadow-orange-500/20 transition-all"
                    >
                      Explore Vehicles
                    </button>
                    <button
                      type="button"
                      onClick={() => currentUser ? setCurrentView('booker-dashboard') : handleInitiateListVehicle}
                      className="flex-1 sm:flex-none bg-white hover:bg-slate-50 active:scale-[.99] text-slate-900 font-black text-sm px-6 py-3.5 rounded-xl border border-slate-200 transition-all"
                    >
                      {currentUser ? 'My Bookings' : 'List Your Vehicle'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Requested hero — no image. */}
          <section className="pt-10 sm:pt-14 pb-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.04]">
                  <span className="text-[#1769D1]">FIND YOUR RIDE.</span>
                  <br />
                  <span className="text-[#0F172A]">GET MOVING.</span>
                </h1>
              </div>
            </div>
          </section>

          {/* Requested search */}
          <section className="pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SearchBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onSearch={() => {
                  const { pickupDate, pickupTime, returnDate, returnTime } = filters;
                  if (returnDate && !pickupDate) {
                    showToast('Please choose a pick-up date first.');
                    return;
                  }
                  if (pickupDate && returnDate) {
                    const start = new Date(`${pickupDate}T${pickupTime || '10:00'}`);
                    const end = new Date(`${returnDate}T${returnTime || '10:00'}`);
                    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
                      showToast('Return date and time must be after the pick-up date and time.');
                      return;
                    }
                  }
                  document.getElementById('vehicles-near-you')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                totalResultsCount={filteredVehicles.length}
              />
            </div>
          </section>

          {/* Requested Vehicle Near You section — no vehicle images and no shared VehicleCard changes. */}
<section id="vehicles-near-you" className="w-full py-8 sm:py-10">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

    <div className="flex items-center justify-between gap-4 mb-5">
      <h2 className="text-xl sm:text-2xl font-black text-[#111827]">
        Vehicles near you
      </h2>

      <button
        type="button"
        onClick={() => {
          setCurrentView('all-vehicles');
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }}
        className="text-xs sm:text-sm font-black text-[#1769D1] hover:underline"
      >
        View All
      </button>
    </div>

    {isLoadingVehicles ? (

      <div className="h-24 rounded-3xl border border-slate-200 bg-white flex items-center justify-center">
        <div className="w-7 h-7 border-3 border-[#FF6400] border-t-transparent rounded-full animate-spin" />
      </div>

    ) : vehicles.length === 0 || filteredVehicles.length === 0 ? (

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center">
        <h3 className="text-base sm:text-lg font-black text-slate-900">
          No vehicles listed yet
        </h3>

        <button
          type="button"
          onClick={() => setCurrentView('list-vehicle')}
          className="mt-4 inline-flex items-center justify-center bg-slate-900 text-white hover:bg-[#FF6400] px-5 py-3 rounded-xl text-xs font-black transition-colors"
        >
          List Your Vehicle
        </button>
      </div>

    ) : (

      <div
        id="vehicles-near-you-grid"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
      >
        {filteredVehicles.map((vehicle) => {

          const title =
            vehicle?.name ||
            [vehicle?.brand, vehicle?.model]
              .filter(Boolean)
              .join(' ') ||
            'Vehicle';

          const type =
            vehicle?.category ||
            vehicle?.type ||
            'Vehicle';

          const location =
            vehicle?.location ||
            vehicle?.pickupAddress ||
            '';

          const daily =
            vehicle?.dailyRentalEnabled !== false &&
            (vehicle?.dailyPrice ?? vehicle?.pricePerDay) != null
              ? Number(
                  vehicle.dailyPrice ??
                  vehicle.pricePerDay
                )
              : 0;

          const hourly =
            vehicle?.hourlyRentalEnabled &&
            vehicle?.hourlyPrice != null
              ? Number(vehicle.hourlyPrice)
              : 0;

          const unavailable =
            filters.pickupDate &&
            filters.returnDate &&
            unavailableVehicleIds.includes(
              String(vehicle.id)
            );

          const available =
            vehicle?.isAvailable !== false &&
            !unavailable;

          const price =
            hourly > 0
              ? `₹${hourly.toLocaleString('en-IN')} / hour`
              : daily > 0
                ? `₹${daily.toLocaleString('en-IN')} / day`
                : 'Price shown during booking';

          return (
            <article
              key={vehicle.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >

              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                  {title}
                </h3>

                <p className="mt-1 text-xs text-slate-500 font-medium truncate">
                  {type}
                </p>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-600">

                {location && (
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                    <span className="truncate">
                      {location}
                    </span>
                  </div>
                )}

                <div className="font-black text-slate-900">
                  {price}
                </div>

                <div
                  className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    available
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                      : 'text-rose-700 bg-rose-50 border-rose-100'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      available
                        ? 'bg-emerald-500'
                        : 'bg-rose-500'
                    }`}
                  />

                  {vehicle?.isAvailable === false
                    ? 'Unavailable'
                    : unavailable
                      ? 'Booked for selected time'
                      : 'Available'}
                </div>

              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">

                <button
                  type="button"
                  onClick={() => {

                    if (unavailable) {
                      handleInitiateBooking(vehicle, {
                        rentalType:
                          vehicle.hourlyRentalEnabled &&
                          vehicle.dailyRentalEnabled === false
                            ? 'hourly'
                            : 'daily',

                        pickupDate:
                          filters.pickupDate,

                        returnDate:
                          filters.returnDate,

                        pickupTime:
                          filters.pickupTime ||
                          '10:00',

                        returnTime:
                          filters.returnTime ||
                          '10:00'
                      });

                      return;
                    }

                    if (currentUser?.role === 'owner') {
                      handleSelectVehicle(vehicle);
                      return;
                    }

                    handleInitiateBooking(
                      vehicle,
                      filters.pickupDate,
                      filters.returnDate
                    );
                  }}
                  className="w-full bg-slate-900 text-white hover:bg-[#FF6400] px-4 py-3 rounded-xl text-xs font-black transition-colors"
                >
                  {unavailable
                    ? 'Join Waiting List'
                    : currentUser?.role === 'owner'
                      ? 'View Vehicle'
                      : 'Book'}
                </button>

              </div>

            </article>
          );
        })}
      </div>

    )}

  </div>
</section>

          {/* Requested line/component after Vehicle Near You. Exact requested text only. */}
          <section className="w-full py-6 sm:py-8" aria-label="One place to find and share vehicles">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-4 sm:gap-6">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="shrink-0 text-center text-base sm:text-lg font-black tracking-tight text-slate-900">
                  One place to find and share vehicles
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            </div>
          </section>

          {/* Requested owner CTA */}
          <section className="w-full py-8 sm:py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="rounded-[26px] border border-slate-200 bg-slate-50 px-6 py-8 sm:px-9 sm:py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">Have a vehicle you're not riding?</h2>
                  <p className="mt-2 text-sm sm:text-base text-slate-600">List it on MyRyedo and earn money</p>
                </div>
                <button
                  type="button"
                  onClick={handleInitiateListVehicle}
                  className="shrink-0 bg-[#FF6400] hover:bg-[#e85a00] text-white font-black text-sm px-6 py-3.5 rounded-xl shadow-md shadow-orange-500/20 transition-all"
                >
                  List Your Vehicle
                </button>
              </div>
            </div>
          </section>

          {/* Requested How It Works — exact requested content. */}
          <section className="w-full py-8 sm:py-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="rounded-[26px] border border-slate-200 bg-white px-5 py-7 sm:px-8 sm:py-9">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">How It Works</h2>
                <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {[
                    ['01', 'DISCOVER', 'Find the perfect ride near you'],
                    ['02', 'VERIFY', 'Get verified for a safer experience'],
                    ['03', 'BOOK', 'Choose dates & book securely'],
                    ['04', 'RIDE', 'Enjoy your ride with confidence'],
                    ['05', 'RETURN', 'Return the vehicle on time']
                  ].map(([number, title, copy]) => (
                    <div key={number} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                      <div className="text-xs font-black text-[#1769D1]">{number}</div>
                      <h3 className="mt-1 text-sm font-black text-slate-900">{title}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{copy}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Requested final CTA */}
          <section className="w-full pt-4 pb-12 sm:pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="rounded-[26px] bg-slate-950 px-6 py-9 sm:px-10 sm:py-10 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Ready to get moving?</h2>
                  <p className="mt-2 text-sm text-slate-300 max-w-xl">Find a vehicle for your next trip or list your own vehicle on MyRyedo.</p>
                </div>
                <div className="flex flex-wrap gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => document.getElementById('vehicles-near-you')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-[#FF6400] hover:bg-[#e85a00] text-white text-sm font-black transition-colors"
                  >
                    Explore Vehicles <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleInitiateListVehicle}
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-black transition-colors"
                  >
                    List Your Vehicle
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* VIEW: All Vehicles Page */}
      {currentView === 'all-vehicles' && (
        <main className="flex-1">
          <AllVehiclesPage
            vehicles={vehicles}
            isLoading={isLoadingVehicles}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onSelectVehicle={handleSelectVehicle}
            onBack={goBack}
          />
        </main>
      )}

      {/* VIEW: Vehicle Details Page */}
      {currentView === 'vehicle-details' && detailsVehicle && (
        <main className="flex-1">
          <VehicleDetailsPage
            vehicle={detailsVehicle}
            currentUser={currentUser}
            isFavorite={favorites.includes(detailsVehicle.id)}
            onToggleFavorite={handleToggleFavorite}
            onStartBooking={(vehicle, pickupDate, returnDate) => {
              handleInitiateBooking(vehicle, pickupDate || filters.pickupDate, returnDate || filters.returnDate);
            }}
            onOpenChat={(ownerId, vehicleId) => {
              handleInitiateChat(ownerId, vehicleId);
            }}
            onBack={goBack}
          />
        </main>
      )}

      {/* VIEW: Vehicle Waiting List */}
      {currentView === 'waitlist' && waitlistVehicle && (
        <main className="flex-1">
          <VehicleWaitlistPage
            vehicle={waitlistVehicle.vehicle}
            bookingDetails={waitlistVehicle}
            currentUser={currentUser}
            onBack={() => { setWaitlistVehicle(null); goBack(); }}
            onFindAnother={() => { setWaitlistVehicle(null); setCurrentView('home'); window.setTimeout(() => document.getElementById('vehicles-near-you')?.scrollIntoView({ behavior: 'smooth' }), 0); }}
            showToast={showToast}
          />
        </main>
      )}

      {/* VIEW: Multi-Step Booking Page */}
      {currentView === 'booking' && bookingVehicle && (
        <main className="flex-1">
          <BookingPage
            vehicle={bookingVehicle.vehicle}
            bookingDetails={bookingVehicle}
            currentUser={currentUser}
            existingBookings={bookings}
            onBack={() => {
              setBookingVehicle(null);
              goBack();
            }}
            onBookingConfirmed={handleBookingConfirmed}
            onOpenAuthModal={(mode) => handleOpenAuthModal(mode, 'Sign in to complete your booking')}
            onGoToOwnerDashboard={() => setCurrentView('owner-dashboard')}
            onOpenChat={(ownerId, vehicleId) => handleInitiateChat(ownerId, vehicleId)}
            showToast={showToast}
          />
        </main>
      )}

      {/* VIEW: Authentication Page (Full-Page Workflow) */}
      {currentView === 'auth' && (
        <main className="flex-1">
          <AuthPage
            initialMode={authDefaultMode}
            intendedRole={authRoleHint}
            intentMessage={authIntentMessage}
            onLogin={handleLogin}
            onSuccess={handleLogin}
            onBack={() => {
              setPendingAction(null);
              setAuthIntentMessage(null);
              goBack();
            }}
            showToast={showToast}
          />
        </main>
      )}

      {/* VIEW: Booking Cancellation Page */}
      {currentView === 'cancel-booking' && cancellingBooking && (
        <main className="flex-1">
          <CancellationPage
            booking={cancellingBooking}
            currentUser={currentUser}
            onBack={() => {
              setCancellingBooking(null);
              setCurrentView('booker-dashboard');
            }}
            onCancelled={(cancelledBooking) => handleCancellationCompleted(cancelledBooking?.id || cancellingBooking?.id, cancelledBooking?.cancellation || cancelledBooking)}
          />
        </main>
      )}

      {/* VIEW: Notifications Page */}
      {currentView === 'notifications' && (
        <main className="flex-1">
          <NotificationsPage
            notifications={notifications}
            unreadCount={notifications.filter(n => !n.read).length}
            onMarkAsRead={handleMarkNotificationAsRead}
            onMarkAllAsRead={handleMarkAllNotificationsAsRead}
            onNavigateNotification={handleNavigateNotification}
            onBack={goBack}
          />
        </main>
      )}

      {/* VIEW: User Profile & KYC & Settings Page */}
      {currentView === 'profile' && (
        <main className="flex-1">
          <ProfilePage
            currentUser={currentUser}
            bookings={bookings}
            onUpdateUser={(updated) => {
              setCurrentUser(updated);
              showToast('Profile information updated successfully!');
            }}
            onBack={goBack}
            onLogout={handleLogout}
            onOpenBookings={() => setCurrentView('booker-dashboard')}
            onGoToOwnerDashboard={() => setCurrentView('owner-dashboard')}
            onAddNewVehicle={() => setCurrentView('list-vehicle')}
            showToast={showToast}
          />
        </main>
      )}

      {/* VIEW: List Vehicle Page */}
      {currentView === 'list-vehicle' && currentUser?.role === 'owner' && (
        <main className="flex-1">
          <ListVehicleModal
            isPageMode={true}
            isOpen={true}
            currentUser={currentUser}
            onClose={() => setCurrentView('owner-dashboard')}
            onVehicleAdded={(newV) => {
              handleVehicleAdded(newV);
              setCurrentView('owner-dashboard');
            }}
          />
        </main>
      )}

      {/* VIEW: Edit Vehicle Page */}
      {currentView === 'edit-vehicle' && editingVehicle && (
        <main className="flex-1">
          <EditVehicleModal
            isPageMode={true}
            vehicle={editingVehicle}
            isOpen={true}
            currentUser={currentUser}
            onClose={() => {
              setEditingVehicle(null);
              setCurrentView('owner-dashboard');
            }}
            onUpdateVehicle={(updated) => {
              handleVehicleUpdated(updated);
              setEditingVehicle(null);
              setCurrentView('owner-dashboard');
            }}
            onDeleteVehicle={(id) => {
              handleVehicleDeleted(id);
              setEditingVehicle(null);
              setCurrentView('owner-dashboard');
            }}
          />
        </main>
      )}

      {/* VIEW: Booker Dashboard */}
      {(currentView === 'booker-dashboard' || currentView === 'renter-dashboard') && (
        <main className="flex-1">
          <BookerDashboard
            currentUser={currentUser}
            bookings={bookings}
            onOpenVehicleDetails={(v) => handleSelectVehicle(v)}
            onOpenChat={(b) => setChatTarget({ ownerId: b.vehicle.owner.id, vehicleId: b.vehicle.id })}
            onCancelBooking={handleInitiateCancelBooking}
            onExploreVehicles={() => setCurrentView('home')}
          />
        </main>
      )}

      {/* VIEW: Host / Owner Dashboard */}
      {currentView === 'owner-dashboard' && currentUser?.role === 'owner' && (
        <main className="flex-1">
          <OwnerDashboard
            currentUser={currentUser}
            vehicles={ownerVehicles}
            bookings={bookings}
            payouts={payouts}
            onOpenListVehicle={handleInitiateListVehicle}
            onOpenEditVehicle={(v) => {
              setEditingVehicle(v);
              setCurrentView('edit-vehicle');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onToggleVehicleAvailability={handleToggleAvailability}
            onOpenVehicleDetails={(v) => handleSelectVehicle(v)}
            onApproveBooking={handleApproveBooking}
            onRejectBooking={handleRejectBooking}
            onRequestPayout={handleRequestPayout}
          />
        </main>
      )}

      {/* VIEW: Platform Admin Dashboard */}
      {currentView === 'admin-dashboard' && (
        <main className="flex-1">
          <AdminDashboard
            users={allUsers}
            vehicles={vehicles}
            bookings={bookings}
            disputes={disputes}
            payouts={payouts}
            onApproveVehicle={handleAdminApproveVehicle}
            onToggleVehicleFeatured={handleToggleVehicleFeatured}
            onResolveDispute={handleAdminResolveDispute}
            onApprovePayout={handleAdminApprovePayout}
          />
        </main>
      )}

      {/* Global Modals */}

      {/* Direct page navigation is used for vehicle details and booking.
          No vehicle-details or booking popups are rendered here. */}

      {/* 2. Advanced Filter Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        onApplyFilters={(f) => {
          setFilters(f);
          showToast('Applied vehicle filters');
        }}
        totalVehiclesCount={filteredVehicles.length}
      />

      {/* 3. Authentication Modal (Login / Signup / Intent / Forgot) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingAction(null);
          setAuthIntentMessage(null);
        }}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onRoleSwitch={handleRoleChange}
        initialMode={authDefaultMode}
        intentMessage={authIntentMessage}
        intendedRole={authRoleHint}
      />

      {/* Booking is a full page; never open it in a modal. */}

      {/* 5. Real-time In-App Chat Modal */}
      {chatTarget && (
        <ChatModal
          isOpen={!!chatTarget}
          onClose={() => setChatTarget(null)}
          ownerId={chatTarget.ownerId}
          vehicleId={chatTarget.vehicleId}
          currentUserId={currentUser?.id}
          vehicles={vehicles}
          messages={messages}
          onSendMessage={handleSendMessage}
        />
      )}

      {/* 6. Host Listing Wizard Modal (Used when not in full-page mode) */}
      <ListVehicleModal
        isOpen={currentView !== 'list-vehicle' && isListVehicleOpen}
        currentUser={currentUser}
        onClose={() => setIsListVehicleOpen(false)}
        onVehicleAdded={handleVehicleAdded}
      />

      {/* 7. Edit Vehicle Pricing & Deposit Modal (Used when not in full-page mode) */}
      {editingVehicle && currentView !== 'edit-vehicle' && (
        <EditVehicleModal
          vehicle={editingVehicle}
          isOpen={!!editingVehicle}
          currentUser={currentUser}
          onClose={() => setEditingVehicle(null)}
          onUpdateVehicle={handleVehicleUpdated}
          onDeleteVehicle={handleVehicleDeleted}
        />
      )}

      {/* 8. Inspection Modal */}
      {inspectionTarget && (
        <InspectionModal
          isOpen={!!inspectionTarget}
          onClose={() => setInspectionTarget(null)}
          booking={inspectionTarget.booking}
          stage={inspectionTarget.stage}
          onSubmitInspection={handleSubmitInspection}
        />
      )}

      {/* 9. Review Modal */}
      {reviewBooking && (
        <ReviewModal
          isOpen={!!reviewBooking}
          onClose={() => setReviewBooking(null)}
          booking={reviewBooking}
          onSubmitReview={handleSubmitReview}
        />
      )}

      {/* 10. Expansion Waitlist Modal */}
      <WaitlistModal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
        defaultCity=""
        onJoined={() => showToast("You've been added to the priority launch waitlist!")}
      />

      {/* Fixed role-aware bottom navigation. Profile intentionally lives only in the top navbar. */}
      {currentView !== 'auth' && (
      <BottomNav
        currentUser={currentUser}
        currentView={currentView}
        setCurrentView={setCurrentView}
        unreadCount={notifications.filter(n => !n.read).length}
        onOpenAuth={(mode = 'login') => handleOpenAuthModal(mode)}
        onListVehicle={handleInitiateListVehicle}
      />
      )}

      {/* Footer — hidden only on Home because it was not requested there. Other views keep the existing footer unchanged. */}
      {currentView !== 'home' && (
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-[#1769D1]">My<span className="text-[#FF6400]">Ryedo</span></span>
              <span>© 2026 MyRyedo. All rights reserved.</span>
            </div>
            <span className="font-semibold">Find it. Understand it. Book it. Ride it.</span>
          </div>
        </div>
      </footer>
      )}

    </div>
  );
}
