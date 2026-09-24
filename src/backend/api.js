/**
 * MyRyedo Backend API Service Module
 * Handles real HTTP authentication endpoints, session tokens, role-based access validation,
 * anti-double-booking locks, and image upload validation.
 *
 * Strictly enforces TWO roles: 'booker' and 'owner'.
 * NEVER TRUST THE CLIENT: All authorization and calculations are validated server-side.
 */

const API_BASE_URL = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

const apiUrl = (path) => `${API_BASE_URL}${path}`;

const parseApiResponse = async (res) => {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: 'The server returned an invalid response.' };
  }
};

export const backendService = {
  /**
   * Fetch all real vehicles from database
   */
  getVehicles: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`/api/vehicles${query ? '?' + query : ''}`);
      if (res.ok) {
        const data = await res.json();
        return data.vehicles || [];
      }
    } catch (e) {
      console.error('Failed to fetch vehicles', e);
    }
    return [];
  },

  /**
   * Check which vehicles conflict with a requested date/time window.
   * This is intentionally server-backed so the search does not rely only on
   * the current user's bookings.
   */
  getUnavailableVehicleIds: async ({ vehicleIds = [], startDateTime, endDateTime }) => {
    try {
      if (!startDateTime || !endDateTime) return [];
      const params = new URLSearchParams({
        vehicleIds: vehicleIds.join(','),
        startDateTime,
        endDateTime
      });
      const res = await fetch(`/api/vehicles/availability?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.unavailableVehicleIds) ? data.unavailableVehicleIds : [];
      }
    } catch (e) {
      console.error('Failed to check vehicle availability', e);
    }
    return [];
  },

  /**
   * Fetch single vehicle by ID
   */
  getVehicleById: async (id) => {
    try {
      const res = await fetch(`/api/vehicles/${id}`);
      if (res.ok) {
        const data = await res.json();
        return data.vehicle || null;
      }
    } catch (e) {
      console.error('Failed to fetch vehicle', e);
    }
    return null;
  },

  /**
   * Create vehicle listing (Owner Only - Authenticated)
   */
  createVehicle: async (vehicleData) => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(vehicleData)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Network error creating vehicle listing.' };
    }
  },

  /**
   * Fetch only the authenticated owner's private vehicle-management records.
   * Public discovery uses getVehicles(); owner dashboards must use this endpoint.
   */
  getMyVehicles: async () => {
    try {
      const token = backendService.getToken();
      if (!token) return [];
      const res = await fetch('/api/vehicles/mine', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.vehicles) ? data.vehicles : [];
      }
    } catch (e) {
      console.error('Failed to fetch owner vehicles', e);
    }
    return [];
  },

  /**
   * Update vehicle listing (Owner Only - Authenticated)
   */
  updateVehicle: async (id, updates) => {
    try {
      const token = backendService.getToken();
      const res = await fetch(`/api/vehicles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updates)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Network error updating vehicle listing.' };
    }
  },

  /**
   * Delete vehicle listing (Owner Only - Authenticated)
   */
  deleteVehicle: async (id) => {
    try {
      const token = backendService.getToken();
      const res = await fetch(`/api/vehicles/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Network error deleting vehicle listing.' };
    }
  },

  /**
   * Fetch authenticated user's real bookings
   */
  getBookings: async () => {
    try {
      const token = backendService.getToken();
      if (!token) return [];
      const res = await fetch('/api/bookings', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        return data.bookings || [];
      }
    } catch (e) {
      console.error('Failed to fetch bookings', e);
    }
    return [];
  },

  /**
   * Create new real booking (Authenticated)
   */
  createBooking: async (bookingPayload) => {
    try {
      const token = backendService.getToken();
      const payloadWithToken = {
        ...bookingPayload,
        token: token || bookingPayload.token
      };
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(payloadWithToken)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Network error creating booking.' };
    }
  },

  /**
   * Update booking status (cancel, approve, reject)
   */
  updateBookingStatus: async (bookingId, status) => {
    try {
      const token = backendService.getToken();
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status })
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Network error updating booking status.' };
    }
  },

  /**
   * Get active cancellation policy configuration
   */
  getCancellationPolicy: async () => {
    try {
      const res = await fetch('/api/cancellation-policy');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}
    return { success: false, policy: null };
  },

  /**
   * Get exact cancellation fee and refund calculation preview before user confirms cancellation
   */
  getCancelPreview: async (bookingId) => {
    try {
      const token = backendService.getToken();
      const res = await fetch(`/api/bookings/${bookingId}/cancel-preview`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Network error calculating cancellation preview.' };
    }
  },

  /**
   * Confirm cancellation with policy calculation and automatic waiting list notification
   */
  cancelBookingWithRefund: async (bookingId, reason) => {
    try {
      const token = backendService.getToken();
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reason })
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Network error executing booking cancellation.' };
    }
  },

  /**
   * Join vehicle waiting list for a requested date and time slot
   */
  joinVehicleWaitlist: async (vehicleId, payload) => {
    try {
      const token = backendService.getToken();
      const res = await fetch(`/api/vehicles/${vehicleId}/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Network error joining waiting list.' };
    }
  },

  /**
   * Get user's active vehicle waitlists
   */
  getMyVehicleWaitlists: async () => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/waitlist/my', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        return data.waitlists || [];
      }
    } catch (e) {
      console.error('Failed to fetch waitlists', e);
    }
    return [];
  },

  /**
   * Cancel vehicle waitlist entry
   */
  cancelVehicleWaitlist: async (waitlistId) => {
    try {
      const token = backendService.getToken();
      const res = await fetch(`/api/waitlist/${waitlistId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Network error leaving waiting list.' };
    }
  },

  /**
   * Fetch real verified reviews
   */
  getReviews: async (vehicleId) => {
    try {
      const res = await fetch(`/api/reviews?vehicleId=${encodeURIComponent(vehicleId)}`);
      if (res.ok) {
        const data = await res.json();
        return data.reviews || [];
      }
    } catch (e) {
      console.error('Failed to fetch reviews', e);
    }
    return [];
  },

  /**
   * Post real verified review
   */
  submitReview: async ({ vehicleId, bookingId, rating, comment }) => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ vehicleId, bookingId, rating, comment })
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Network error posting review.' };
    }
  },

  /**
   * Update user profile
   */
  updateProfile: async (updates) => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success && data.user) {
        const stored = localStorage.getItem('myryedo_auth_session') || localStorage.getItem('ridely_auth_session');
        if (stored) {
          const session = JSON.parse(stored);
          session.user = data.user;
          localStorage.setItem('myryedo_auth_session', JSON.stringify(session));
          localStorage.setItem('ridely_auth_session', JSON.stringify(session));
        }
      }
      return data;
    } catch (e) {
      return { success: false, error: 'Network error updating profile.' };
    }
  },

  getUsers: () => [],
  
  /**
   * Real-Time In-App Notifications
   */
  getNotifications: async () => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/notifications', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      return (data && data.success && Array.isArray(data.notifications)) ? data.notifications : [];
    } catch {
      return [];
    }
  },

  markNotificationAsRead: async (id) => {
    try {
      const token = backendService.getToken();
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return await res.json();
    } catch {
      return { success: false };
    }
  },

  markAllNotificationsAsRead: async () => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return await res.json();
    } catch {
      return { success: false };
    }
  },

  /**
   * Real-Time In-App Messaging
   */
  getMessages: async (params = {}) => {
    try {
      const token = backendService.getToken();
      if (!token) return [];
      const query = new URLSearchParams();
      if (params.partnerId) query.set('partnerId', params.partnerId);
      if (params.vehicleId) query.set('vehicleId', params.vehicleId);
      const url = `/api/messages${query.toString() ? `?${query.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return (data && data.success && Array.isArray(data.messages)) ? data.messages : [];
    } catch {
      return [];
    }
  },

  sendMessage: async ({ recipientId, vehicleId, text }) => {
    try {
      const token = backendService.getToken();
      if (!token) return { success: false, error: 'Please sign in to send messages.' };
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ recipientId, vehicleId, text })
      });
      return await res.json();
    } catch {
      return { success: false, error: 'Network error sending message.' };
    }
  },

  markMessagesAsRead: async (partnerId) => {
    try {
      const token = backendService.getToken();
      if (!token) return { success: false };
      const res = await fetch('/api/messages/read', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ partnerId })
      });
      return await res.json();
    } catch {
      return { success: false };
    }
  },

  getPayouts: () => [],

  /**
   * Helper to get stored JWT access token
   */
  getToken: () => {
    try {
      const directToken = localStorage.getItem('ridely_token') || localStorage.getItem('myryedo_token');
      if (directToken) return directToken;
      const stored = localStorage.getItem('myryedo_auth_session') || localStorage.getItem('ridely_auth_session');
      if (stored) {
        const session = JSON.parse(stored);
        return session?.token || null;
      }
    } catch (e) {
      // ignore
    }
    return null;
  },

  /**
   * Check Auth & Google OAuth configuration status on server
   */
  getAuthStatus: async () => {
    try {
      const res = await fetch(apiUrl('/api/auth/status'), { credentials: 'include' });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // ignore
    }
    return { status: 'ok', googleOAuthConfigured: false };
  },

  /**
   * Request Google OAuth authorization URL from backend
   */
  getGoogleAuthUrl: async (role = 'booker') => {
    try {
      const res = await fetch(apiUrl(`/api/auth/google/url?role=${encodeURIComponent(role)}`), { credentials: 'include' });
      return await res.json();
    } catch (err) {
      return { configured: false, error: 'Could not connect to authentication server.' };
    }
  },

  /**
   * Server-side Authenticated Login (Email & Password)
   */
  login: async (email, password) => {
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await parseApiResponse(res);

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to authenticate.'
        };
      }

      const session = {
        token: data.token,
        user: data.user,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
      };

      try {
        localStorage.setItem('myryedo_auth_session', JSON.stringify(session));
        localStorage.setItem('ridely_auth_session', JSON.stringify(session));
        localStorage.setItem('myryedo_token', data.token);
        localStorage.setItem('ridely_token', data.token);
      } catch (e) {}

      return { success: true, user: data.user, session };
    } catch (err) {
      return { success: false, error: 'Unable to connect to the authentication server. Please try again.' };
    }
  },

  /**
   * Server-side Registration (Direct Account Creation & Instant Session)
   */
  register: async ({ name, email, password, confirmPassword, role, phone }) => {
    try {
      const res = await fetch(apiUrl('/api/auth/register'), {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword, role, phone })
      });

      const data = await parseApiResponse(res);

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Registration failed.' };
      }

      let session = null;
      if (data.token && data.user) {
        session = {
          token: data.token,
          user: data.user,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
        };

        try {
          localStorage.setItem('myryedo_auth_session', JSON.stringify(session));
          localStorage.setItem('ridely_auth_session', JSON.stringify(session));
          localStorage.setItem('myryedo_token', data.token);
          localStorage.setItem('ridely_token', data.token);
        } catch (e) {}
      }

      return {
        success: true,
        user: data.user,
        token: data.token,
        session,
        message: data.message || 'Account created successfully!'
      };
    } catch (err) {
      return { success: false, error: 'Network error during registration. Please try again.' };
    }
  },

  /**
   * Verify 6-digit OTP for password reset
   */
  verifyOtp: async (email, code, type = 'password_reset') => {
    try {
      const res = await fetch(apiUrl('/api/auth/verify-otp'), {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, type })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Invalid verification code.',
          remainingAttempts: data.remainingAttempts
        };
      }

      // If verification resulted in an active session
      if (data.token && data.user) {
        const session = {
          token: data.token,
          user: data.user,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
        };
        try {
          localStorage.setItem('ridely_auth_session', JSON.stringify(session));
        } catch (e) {}
      }

      return { success: true, message: data.message, user: data.user, token: data.token };
    } catch (err) {
      return { success: false, error: 'Network error during code verification.' };
    }
  },

  /**
   * Resend OTP with cooldown verification
   */
  resendOtp: async (email, type = 'password_reset') => {
    try {
      const res = await fetch(apiUrl('/api/auth/resend-otp'), {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Could not resend code.' };
      }

      return {
        success: true,
        message: data.message,
        resendAvailableAt: data.resendAvailableAt
      };
    } catch (err) {
      return { success: false, error: 'Network error requesting new code.' };
    }
  },

  /**
   * Forgot Password request
   */
  forgotPassword: async (email) => {
    try {
      const res = await fetch(apiUrl('/api/auth/forgot-password'), {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await parseApiResponse(res);
      return {
        success: !!res.ok && !!data.success,
        message: data.message,
        error: data.error
      };
    } catch (err) {
      return { success: false, error: 'Network error processing password reset.' };
    }
  },

  /**
   * Reset Password with OTP
   */
  resetPassword: async ({ email, code, newPassword, confirmPassword }) => {
    try {
      const res = await fetch(apiUrl('/api/auth/reset-password'), {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword, confirmPassword })
      });

      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to reset password.' };
      }

      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: 'Network error resetting password.' };
    }
  },

  /**
   * Get a server-generated CAPTCHA challenge for password recovery.
   */
  getPasswordResetCaptcha: async () => {
    try {
      const res = await fetch(apiUrl('/api/auth/captcha'), {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
      });
      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Unable to load CAPTCHA.' };
      }
      return data;
    } catch {
      return { success: false, error: 'Unable to connect to the authentication server.' };
    }
  },

  /**
   * Verify email + CAPTCHA and receive a short-lived password reset token.
   */
  verifyPasswordResetCaptcha: async ({ email, captchaId, captchaCode }) => {
    try {
      const res = await fetch(apiUrl('/api/auth/forgot-password/verify'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, captchaId, captchaCode })
      });
      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Unable to verify password reset details.' };
      }
      return data;
    } catch {
      return { success: false, error: 'Unable to connect to the authentication server.' };
    }
  },

  /**
   * Reset password with the short-lived server-issued reset token. No OTP.
   */
  resetPasswordWithToken: async ({ email, resetToken, newPassword, confirmPassword }) => {
    try {
      const res = await fetch(apiUrl('/api/auth/reset-password'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, resetToken, newPassword, confirmPassword })
      });
      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to reset password.' };
      }
      return data;
    } catch {
      return { success: false, error: 'Unable to connect to the authentication server.' };
    }
  },

  /**
   * Change Password (Authenticated route)
   */
  changePassword: async ({ currentPassword, newPassword, confirmPassword }) => {
    try {
      const token = backendService.getToken();
      const res = await fetch(apiUrl('/api/auth/change-password'), {
        credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to change password.' };
      }

      if (data.token) {
        const stored = localStorage.getItem('myryedo_auth_session') || localStorage.getItem('ridely_auth_session');
        if (stored) {
          const session = JSON.parse(stored);
          session.token = data.token;
          localStorage.setItem('myryedo_auth_session', JSON.stringify(session));
          localStorage.setItem('myryedo_token', data.token);
        }
      }

      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: 'Network error changing password.' };
    }
  },

  /**
   * Check current session validity via /api/auth/me
   */
  getCurrentUser: async () => {
    try {
      const token = backendService.getToken();
      if (!token) return null;

      const res = await fetch(apiUrl('/api/auth/me'), {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        return data.user || null;
      } else {
        // Token invalid or expired
        backendService.logout();
        return null;
      }
    } catch (e) {
      return null;
    }
  },

  /**
   * Server-side Logout
   * Completely clears active session from backend and storage.
   */
  logout: async () => {
    try {
      const token = backendService.getToken();
      if (token) {
        await fetch(apiUrl('/api/auth/logout'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
      }
    } catch (e) {
      // ignore
    } finally {
      try {
        localStorage.removeItem('myryedo_auth_session');
        localStorage.removeItem('ridely_auth_session');
        localStorage.removeItem('ridely_token');
        localStorage.removeItem('myryedo_token');
      } catch (e) {}
    }
    return { success: true };
  },

  /**
   * Get Current Restored Session from LocalStorage
   */
  getRestoredSession: () => {
    try {
      const stored = localStorage.getItem('myryedo_auth_session') || localStorage.getItem('ridely_auth_session');
      if (stored) {
        const session = JSON.parse(stored);
        if (session && session.user && session.expiresAt > Date.now()) {
          return session.user;
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  },

  /**
   * Save an established authenticated session
   */
  saveSession: (user, token) => {
    const session = {
      token: token || `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      user,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
    try {
      localStorage.setItem('myryedo_auth_session', JSON.stringify(session));
      localStorage.setItem('ridely_auth_session', JSON.stringify(session));
    } catch (e) {}
    return session;
  },

  /**
   * Server-side Authorization Check
   * Never trusts client headers or roles blindly.
   */
  authorizeAction: (user, action, resource = null) => {
    if (!user) {
      return { authorized: false, error: 'You must log in to continue.' };
    }

    // Role validation (only 'booker' and 'owner' allowed)
    if (user.role !== 'booker' && user.role !== 'owner') {
      return { authorized: false, error: 'Invalid user role specified.' };
    }

    switch (action) {
      case 'create_vehicle':
        if (user.role !== 'owner') {
          return { authorized: false, error: 'Only vehicle owners can create listings.' };
        }
        return { authorized: true };

      case 'modify_vehicle':
      case 'delete_vehicle':
        if (user.role !== 'owner') {
          return { authorized: false, error: 'Only vehicle owners can modify listings.' };
        }
        if (resource && String(resource.ownerId || resource.owner?.id || '') !== String(user.id)) {
          return { authorized: false, error: 'You are not authorized to modify this vehicle.' };
        }
        return { authorized: true };

      case 'create_booking':
        if (user.role === 'owner') {
          return { authorized: false, error: 'Owner accounts cannot book vehicles.' };
        }
        return { authorized: true };

      case 'cancel_booking':
        if (resource && resource.bookerId !== user.id && resource.renterId !== user.id) {
          return { authorized: false, error: 'You can only cancel your own bookings.' };
        }
        return { authorized: true };

      case 'manage_incoming_booking':
        if (user.role !== 'owner') {
          return { authorized: false, error: 'Only owners can approve or decline booking requests.' };
        }
        return { authorized: true };

      default:
        return { authorized: true };
    }
  },

  /**
   * Anti-Double-Booking Protection (supports dates and datetimes)
   */
  checkDoubleBooking: (existingBookings, vehicleId, startDateTime, endDateTime, excludeBookingId = null) => {
    const reqStart = new Date(startDateTime).getTime();
    const reqEnd = new Date(endDateTime).getTime();

    if (isNaN(reqStart) || isNaN(reqEnd)) {
      return { hasConflict: true, error: 'Invalid pickup or return date/time provided.' };
    }

    if (reqEnd <= reqStart) {
      return { hasConflict: true, error: 'Return date/time must be strictly after pickup date/time.' };
    }

    const conflict = existingBookings.find((b) => {
      if (b.vehicleId !== vehicleId) return false;
      if (excludeBookingId && b.id === excludeBookingId) return false;
      if (!['confirmed', 'active', 'in_progress', 'in-progress'].includes(String(b.status || '').toLowerCase())) return false;

      // Handle both startDate / pickupDateTime and endDate / returnDateTime
      const bStartStr = b.pickupDateTime || (b.startDate ? (b.pickupTime ? `${b.startDate}T${b.pickupTime}` : b.startDate) : null);
      const bEndStr = b.returnDateTime || (b.endDate ? (b.returnTime ? `${b.endDate}T${b.returnTime}` : b.endDate) : null);

      if (!bStartStr || !bEndStr) return false;

      const bStart = new Date(bStartStr).getTime();
      const bEnd = new Date(bEndStr).getTime();

      if (isNaN(bStart) || isNaN(bEnd)) return false;

      return reqStart < bEnd && reqEnd > bStart;
    });

    if (conflict) {
      const conflictStart = conflict.startDate || (conflict.pickupDateTime ? new Date(conflict.pickupDateTime).toLocaleDateString() : 'selected dates');
      const conflictEnd = conflict.endDate || (conflict.returnDateTime ? new Date(conflict.returnDateTime).toLocaleDateString() : '');
      return {
        hasConflict: true,
        error: `Vehicle is already booked from ${conflictStart} to ${conflictEnd}. Please choose different times or dates.`
      };
    }

    return { hasConflict: false };
  },

  /**
   * Server-Authoritative Flexible Rental Pricing Calculator
   * Supports:
   *  - 'hourly' rental mode with owner min/max hour rules
   *  - 'daily' rental mode with owner min/max day rules
   * Automatically calculates duration and total price.
   */
  calculateRentalPricing: ({
    vehicle,
    rentalType = 'daily', // 'hourly' | 'daily'
    pickupDate,
    pickupTime = '10:00',
    returnDate,
    returnTime = '10:00',
    hoursCount = null,
    daysCount = null
  }) => {
    if (!vehicle) {
      return { valid: false, error: 'Vehicle not found.' };
    }

    const isHourly = rentalType === 'hourly';

    // Verify rental mode is enabled on the vehicle
    if (isHourly && !vehicle.hourlyRentalEnabled) {
      return { valid: false, error: 'Hourly rental is not available for this vehicle.' };
    }
    if (!isHourly && vehicle.dailyRentalEnabled === false) {
      return { valid: false, error: 'Daily rental is not available for this vehicle.' };
    }

    let duration = 0;
    let durationUnit = isHourly ? 'hours' : 'days';

    if (isHourly) {
      // Calculate hours
      if (hoursCount !== null && hoursCount !== undefined && Number(hoursCount) > 0) {
        duration = Math.round(Number(hoursCount));
      } else if (pickupDate && pickupTime && returnTime) {
        const retDate = returnDate || pickupDate;
        const startDt = new Date(`${pickupDate}T${pickupTime}`);
        const endDt = new Date(`${retDate}T${returnTime}`);
        const diffMs = endDt.getTime() - startDt.getTime();
        duration = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
      } else {
        duration = vehicle.minRentalHours || 2;
      }

      // Check owner min / max hourly limits
      const minHours = vehicle.minRentalHours || 1;
      const maxHours = vehicle.maxRentalHours || 24;

      if (duration < minHours) {
        return {
          valid: false,
          error: `Minimum rental duration for this vehicle is ${minHours} ${minHours === 1 ? 'hour' : 'hours'}.`,
          duration,
          durationUnit,
          minLimit: minHours,
          maxLimit: maxHours
        };
      }
      if (duration > maxHours) {
        return {
          valid: false,
          error: `Maximum rental duration for this vehicle is ${maxHours} ${maxHours === 1 ? 'hour' : 'hours'}.`,
          duration,
          durationUnit,
          minLimit: minHours,
          maxLimit: maxHours
        };
      }

      const ratePerUnit = Number(vehicle.hourlyPrice) || 0;
      const rawBase = duration * ratePerUnit;
      const discountPercent = 0;
      const discountAmount = 0;
      const discountedBase = rawBase;
      const platformFee = Math.round(discountedBase * 0.08); // 8% platform fee
      const taxes = Math.round((discountedBase + platformFee) * 0.12); // 12% GST
      const deposit = Number(vehicle.securityDeposit) || 0;
      const totalPayable = discountedBase + platformFee + taxes + deposit;

      return {
        valid: true,
        rentalType: 'hourly',
        duration,
        durationUnit: 'hours',
        ratePerUnit,
        rawBase,
        discountPercent,
        discountAmount,
        discountedBase,
        platformFee,
        taxes,
        deposit,
        totalPayable
      };
    } else {
      // Daily Rental
      if (daysCount !== null && daysCount !== undefined && Number(daysCount) > 0) {
        duration = Math.round(Number(daysCount));
      } else if (pickupDate && returnDate) {
        const pTime = pickupTime && pickupTime.includes(':') ? pickupTime : '10:00';
        const rTime = returnTime && returnTime.includes(':') ? returnTime : '10:00';
        const startDt = new Date(`${pickupDate}T${pTime}`);
        const endDt = new Date(`${returnDate}T${rTime}`);
        const diffMs = endDt.getTime() - startDt.getTime();
        // If times match or end is on next day(s), calculate day duration
        duration = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      } else {
        duration = vehicle.minRentalDays ? Number(vehicle.minRentalDays) : 1;
      }

      // Check owner min / max daily limits
      const minDays = vehicle.minRentalDays ? Number(vehicle.minRentalDays) : 1;
      // maxRentalDays is optional. null/undefined/0/empty string represents NO MAXIMUM / UNLIMITED!
      const maxDays = (vehicle.maxRentalDays !== null && vehicle.maxRentalDays !== undefined && vehicle.maxRentalDays !== '' && Number(vehicle.maxRentalDays) > 0)
        ? Number(vehicle.maxRentalDays)
        : null;

      if (duration < minDays) {
        return {
          valid: false,
          error: `Minimum rental duration for this vehicle is ${minDays} ${minDays === 1 ? 'day' : 'days'}.`,
          duration,
          durationUnit,
          minLimit: minDays,
          maxLimit: maxDays
        };
      }
      if (maxDays !== null && duration > maxDays) {
        return {
          valid: false,
          error: `Maximum rental duration for this vehicle is ${maxDays} ${maxDays === 1 ? 'day' : 'days'}.`,
          duration,
          durationUnit,
          minLimit: minDays,
          maxLimit: maxDays
        };
      }

      const ratePerUnit = Number(vehicle.dailyPrice || vehicle.pricePerDay) || 0;
      const rawBase = duration * ratePerUnit;

      let discountPercent = 0;
      if (duration >= 30 && (vehicle.monthlyDiscountPercent || 0) > 0) {
        discountPercent = vehicle.monthlyDiscountPercent;
      } else if (duration >= 7 && (vehicle.weeklyDiscountPercent || 0) > 0) {
        discountPercent = vehicle.weeklyDiscountPercent;
      }

      const discountAmount = Math.round((rawBase * discountPercent) / 100);
      const discountedBase = rawBase - discountAmount;
      const platformFee = Math.round(discountedBase * 0.08); // 8% platform fee
      const taxes = Math.round((discountedBase + platformFee) * 0.12); // 12% GST
      const deposit = Number(vehicle.securityDeposit) || 0;
      const totalPayable = discountedBase + platformFee + taxes + deposit;

      return {
        valid: true,
        rentalType: 'daily',
        duration,
        durationUnit: 'days',
        ratePerUnit,
        rawBase,
        discountPercent,
        discountAmount,
        discountedBase,
        platformFee,
        taxes,
        deposit,
        totalPayable
      };
    }
  },

  /** Vehicle images are display-only. MyRyedo does not implement vehicle image uploads. */
  validateImageFiles: () => ({ valid: false, error: 'Vehicle image uploads are not supported.' }),

  /**
   * Server-Authoritative Price Calculation
   */
  calculatePricing: (pricePerDay, days, weeklyDiscountPercent = 0, monthlyDiscountPercent = 0, securityDeposit = 0) => {
    const safeDays = Math.max(1, Math.ceil(days));
    let discountPercent = 0;

    if (safeDays >= 30 && monthlyDiscountPercent > 0) {
      discountPercent = monthlyDiscountPercent;
    } else if (safeDays >= 7 && weeklyDiscountPercent > 0) {
      discountPercent = weeklyDiscountPercent;
    }

    const rawBase = pricePerDay * safeDays;
    const discountAmount = Math.round((rawBase * discountPercent) / 100);
    const discountedBase = rawBase - discountAmount;
    const platformFee = Math.round(discountedBase * 0.08); // 8% platform fee
    const taxes = Math.round((discountedBase + platformFee) * 0.12); // 12% GST
    const deposit = Number(securityDeposit) || 0;
    const totalPayable = discountedBase + platformFee + taxes + deposit;

    return {
      safeDays,
      rawBase,
      discountPercent,
      discountAmount,
      discountedBase,
      platformFee,
      taxes,
      deposit,
      totalPayable
    };
  },

  /**
   * Account Deletion
   */
  deleteAccount: async () => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/users/account', {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        backendService.removeToken();
      }
      return data;
    } catch (e) {
      return { success: false, error: 'Network error deleting account.' };
    }
  },

  /**
   * Service Areas
   */
  getServiceAreas: async () => {
    try {
      const res = await fetch('/api/service-areas');
      if (res.ok) {
        const data = await res.json();
        return data.serviceAreas || [];
      }
    } catch (e) {
      console.error('Failed to get service areas', e);
    }
    return [];
  },

  checkServiceArea: async (location) => {
    try {
      const res = await fetch(`/api/service-areas/check?location=${encodeURIComponent(location || '')}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('Failed to check service area', e);
    }
    return { success: true, inServiceArea: true };
  },

  createServiceArea: async (areaData) => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/service-areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(areaData)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Failed to create service area.' };
    }
  },

  updateServiceArea: async (id, areaData) => {
    try {
      const token = backendService.getToken();
      const res = await fetch(`/api/service-areas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(areaData)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Failed to update service area.' };
    }
  },

  deleteServiceArea: async (id) => {
    try {
      const token = backendService.getToken();
      const res = await fetch(`/api/service-areas/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Failed to delete service area.' };
    }
  },

  /**
   * Waitlist
   */
  joinWaitlist: async (waitlistData) => {
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waitlistData)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Failed to join waitlist.' };
    }
  },

  getWaitlist: async () => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/waitlist', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        return data.waitlist || [];
      }
    } catch (e) {
      console.error('Failed to get waitlist', e);
    }
    return [];
  },

  /**
   * Marketing & Campaign Tracking
   */
  trackCampaign: async (campaignData) => {
    try {
      const res = await fetch('/api/campaigns/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      });
      return await res.json();
    } catch (e) {
      return { success: false };
    }
  },

  convertCampaign: async (convertData) => {
    try {
      const res = await fetch('/api/campaigns/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(convertData)
      });
      return await res.json();
    } catch (e) {
      return { success: false };
    }
  },

  getCampaigns: async () => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/campaigns', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        return data.campaigns || [];
      }
    } catch (e) {
      console.error('Failed to get campaigns', e);
    }
    return [];
  },

  /**
   * Dynamic Offers
   */
  getOffers: async () => {
    try {
      const res = await fetch('/api/offers');
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      console.error('Failed to get offers', e);
    }
    return { offers: [], platformPromoCodes: [] };
  },

  createOffer: async (offerData) => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(offerData)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Failed to create offer.' };
    }
  },

  /**
   * Real Payments
   */
  initiatePayment: async (paymentData) => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(paymentData)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Payment gateway initialization failed.' };
    }
  },

  confirmPayment: async (confirmData) => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(confirmData)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Payment confirmation failed.' };
    }
  },

  getPaymentHistory: async () => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/payments/history', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        return data.transactions || [];
      }
    } catch (e) {
      console.error('Failed to get payment history', e);
    }
    return [];
  },

  /**
   * Host Payouts
   */
  getPayouts: async () => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/payouts', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        return data.payouts || [];
      }
    } catch (e) {
      console.error('Failed to get payouts', e);
    }
    return [];
  },

  requestPayout: async (payoutData) => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payoutData)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Payout request failed.' };
    }
  },

  settlePayout: async (id) => {
    try {
      const token = backendService.getToken();
      const res = await fetch(`/api/payouts/${id}/settle`, {
        method: 'PATCH',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Failed to settle payout.' };
    }
  },

  /**
   * Disputes
   */
  getDisputes: async () => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/disputes', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        return data.disputes || [];
      }
    } catch (e) {
      console.error('Failed to get disputes', e);
    }
    return [];
  },

  createDispute: async (disputeData) => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(disputeData)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Failed to create dispute.' };
    }
  },

  resolveDispute: async (id, resolveData) => {
    try {
      const token = backendService.getToken();
      const res = await fetch(`/api/disputes/${id}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(resolveData)
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Failed to resolve dispute.' };
    }
  },

  /**
   * Admin Vehicle Moderation & RC Verification
   */
  verifyVehicleRc: async (id, verificationStatus, reason = '') => {
    try {
      const token = backendService.getToken();
      const res = await fetch(`/api/admin/vehicles/${id}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ verificationStatus, reason })
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: 'Failed to update vehicle verification status.' };
    }
  },

  /**
   * Admin Analytics
   */
  getAdminAnalytics: async () => {
    try {
      const token = backendService.getToken();
      const res = await fetch('/api/admin/analytics', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        return data.analytics || null;
      }
    } catch (e) {
      console.error('Failed to fetch admin analytics', e);
    }
    return null;
  }
};
