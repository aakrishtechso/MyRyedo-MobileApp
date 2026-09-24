import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  Key, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  LogOut, 
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Check,
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';
import { backendService } from '../../backend/api.js';

export const AuthModal = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
  onRoleSwitch,
  initialMode = 'login',
  intentMessage = null,
  intendedRole = 'booker'
}) => {
  // Normalize string props
  const safeInitialMode = typeof initialMode === 'string' ? initialMode : 'login';
  const safeIntendedRole = (intendedRole === 'owner' || intendedRole === 'booker') ? intendedRole : 'booker';

  // Modal Modes: 'login' | 'signup' | 'otp' | 'forgot' | 'reset_password' | 'google_selector' | 'intent'
  const [mode, setMode] = useState(safeInitialMode);
  const [selectedRole, setSelectedRole] = useState(safeIntendedRole);
  
  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // UI / UX States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // OTP specific state
  const [otpType, setOtpType] = useState('email_verification'); // 'email_verification' | 'password_reset'
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(600); // 10 minutes
  const [oauthStatus, setOauthStatus] = useState(null);

  const emailInputRef = useRef(null);
  const otpInputRef = useRef(null);

  // Synchronize modal state whenever opened
  useEffect(() => {
    if (isOpen) {
      setMode(typeof initialMode === 'string' ? initialMode : 'login');
      setSelectedRole((intendedRole === 'owner' || intendedRole === 'booker') ? intendedRole : 'booker');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setName('');
      setPhone('');
      setOtpCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsLoading(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setResendCooldown(0);
      setOtpExpirySeconds(600);

      // Check server OAuth status
      backendService.getAuthStatus().then(status => {
        if (status) setOauthStatus(status);
      });

      const timer = setTimeout(() => {
        emailInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialMode, intendedRole]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // OTP Expiry & Resend countdown timers
  useEffect(() => {
    if (!isOpen || mode !== 'otp') return;

    const timer = setInterval(() => {
      setOtpExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, mode]);

  // Focus OTP input when transitioning to OTP mode
  useEffect(() => {
    if (mode === 'otp') {
      setTimeout(() => otpInputRef.current?.focus(), 150);
    }
  }, [mode]);

  const handleClose = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(false);
    onClose();
  };

  // Google OAuth Initiator (Real Popup Flow)
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const authData = await backendService.getGoogleAuthUrl(selectedRole);

      if (!authData.configured || !authData.url) {
        setIsLoading(false);
        setMode('google_config_info');
        return;
      }

      // Open Google's Official OAuth Consent Window directly
      const width = 540;
      const height = 660;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authData.url,
        'myryedo_google_oauth',
        `width=${width},height=${height},top=${top},left=${left},status=no,resizable=yes`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        setErrorMsg('Pop-up was blocked by your browser. Please allow pop-ups for this site to complete Google Sign-In.');
        setIsLoading(false);
        return;
      }

      // Listen for message from Google OAuth callback window and storage events
      let cleanupDone = false;
      const cleanupListeners = () => {
        if (cleanupDone) return;
        cleanupDone = true;
        window.removeEventListener('message', messageHandler);
        window.removeEventListener('storage', storageHandler);
        clearInterval(pollTimer);
      };

      const messageHandler = (event) => {
        if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
          cleanupListeners();
          setIsLoading(false);
          if (event.data.user) {
            onLogin(event.data.user, { token: event.data.token, user: event.data.user });
            handleClose();
          }
        } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
          cleanupListeners();
          setIsLoading(false);
          setErrorMsg(event.data.error || 'Google authentication could not be completed.');
        }
      };

      const storageHandler = (e) => {
        if ((e.key === 'myryedo_google_auth_event' || e.key === 'ridely_google_auth_event') && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            if (data.success && data.user) {
              cleanupListeners();
              localStorage.removeItem('myryedo_google_auth_event');
              localStorage.removeItem('ridely_google_auth_event');
              setIsLoading(false);
              onLogin(data.user, { token: data.token, user: data.user });
              handleClose();
            } else if (!data.success) {
              cleanupListeners();
              localStorage.removeItem('myryedo_google_auth_event');
              localStorage.removeItem('ridely_google_auth_event');
              setIsLoading(false);
              setErrorMsg(data.error || 'Google authentication could not be completed.');
            }
          } catch (err) {}
        }
      };

      window.addEventListener('message', messageHandler);
      window.addEventListener('storage', storageHandler);

      // Detect if user closed popup without authenticating or check fallback event
      const pollTimer = setInterval(() => {
        try {
          const stored = localStorage.getItem('myryedo_google_auth_event') || localStorage.getItem('ridely_google_auth_event');
          if (stored) {
            const data = JSON.parse(stored);
            if (data.success && data.user) {
              cleanupListeners();
              localStorage.removeItem('myryedo_google_auth_event');
              localStorage.removeItem('ridely_google_auth_event');
              setIsLoading(false);
              onLogin(data.user, { token: data.token, user: data.user });
              handleClose();
              return;
            }
          }
        } catch (e) {}

        if (popup.closed) {
          cleanupListeners();
          setIsLoading(false);
        }
      }, 500);

    } catch (err) {
      setIsLoading(false);
      setErrorMsg('Failed to initiate Google authentication. Please try again.');
    }
  };

  // Main Form Submission Router
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    // MODE: FORGOT PASSWORD
    if (mode === 'forgot') {
      if (!email.trim()) {
        setErrorMsg('Please enter your email address.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await backendService.forgotPassword(email.trim());
        setIsLoading(false);
        setOtpType('password_reset');
        setResendCooldown(60);
        setOtpExpirySeconds(600);
        setMode('otp');
        setSuccessMsg(res.message || 'Verification code sent to your email.');
      } catch (err) {
        setIsLoading(false);
        setErrorMsg('Failed to process password reset request.');
      }
      return;
    }

    // MODE: OTP VERIFICATION (Used for Password Reset)
    if (mode === 'otp') {
      if (!otpCode.trim() || otpCode.trim().length !== 6) {
        setErrorMsg('Please enter the complete 6-digit verification code.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await backendService.verifyOtp(email.trim(), otpCode.trim(), 'password_reset');
        setIsLoading(false);

        if (res.success) {
          setMode('reset_password');
          setSuccessMsg('Code verified. You can now set your new password.');
        } else {
          setErrorMsg(res.error || 'Invalid verification code.');
        }
      } catch (err) {
        setIsLoading(false);
        setErrorMsg('Network error verifying code.');
      }
      return;
    }

    // MODE: RESET PASSWORD
    if (mode === 'reset_password') {
      if (!newPassword || newPassword.length < 8) {
        setErrorMsg('New password must be at least 8 characters long.');
        return;
      }
      if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        setErrorMsg('New password must contain both letters and numbers.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await backendService.resetPassword({
          email: email.trim(),
          code: otpCode.trim(),
          newPassword,
          confirmPassword: confirmNewPassword
        });
        setIsLoading(false);

        if (res.success) {
          setMode('login');
          setPassword('');
          setSuccessMsg('Password updated successfully! Please sign in with your new credentials.');
        } else {
          setErrorMsg(res.error || 'Failed to update password.');
        }
      } catch (err) {
        setIsLoading(false);
        setErrorMsg('Failed to update password.');
      }
      return;
    }

    // COMMON VALIDATION (LOGIN & SIGNUP)
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    // MODE: SIGNUP (Direct account creation - no OTP required)
    if (mode === 'signup') {
      if (!name.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (password.length < 8) {
        setErrorMsg('Password must be at least 8 characters long.');
        return;
      }
      if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        setErrorMsg('Password must contain at least one letter and one number.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await backendService.register({
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
          role: selectedRole,
          phone: phone.trim()
        });
        setIsLoading(false);

        if (res.success && res.user) {
          onLogin(res.user, res.session || { token: res.token, user: res.user });
          handleClose();
        } else {
          setErrorMsg(res.error || 'Registration failed.');
        }
      } catch (err) {
        setIsLoading(false);
        setErrorMsg('An unexpected error occurred during account creation.');
      }
      return;
    }

    // MODE: LOGIN
    if (mode === 'login') {
      setIsLoading(true);
      try {
        const res = await backendService.login(email.trim(), password);
        setIsLoading(false);

        if (res.success) {
          onLogin(res.user, res.session);
          handleClose();
        } else {
          setErrorMsg(res.error || 'Invalid email or password.');
        }
      } catch (err) {
        setIsLoading(false);
        setErrorMsg('An unexpected error occurred during sign in.');
      }
    }
  };

  // Resend OTP Action (For Password Reset)
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await backendService.resendOtp(email.trim(), 'password_reset');
      setIsLoading(false);

      if (res.success) {
        setResendCooldown(60);
        setOtpExpirySeconds(600);
        setSuccessMsg(res.message || 'A new verification code has been dispatched.');
      } else {
        setErrorMsg(res.error || 'Could not resend code.');
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMsg('Failed to resend verification code.');
    }
  };

  if (!isOpen) return null;

  // Format seconds to MM:SS
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-3 sm:p-4 md:p-6 bg-black/65 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={handleClose}
      id="auth-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div 
        className="relative w-full max-w-md my-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[min(90vh,760px)] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        id="auth-modal-dialog"
      >
        {/* Modal Header - Fixed at top of dialog, never pushed outside viewport or clipped */}
        <div className="sticky top-0 z-30 shrink-0 flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50/95 backdrop-blur-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
              R
            </div>
            <div className="min-w-0">
              <h2 id="auth-modal-title" className="font-bold text-slate-900 text-base sm:text-lg leading-tight truncate">
                {mode === 'signup' ? 'Create Account' : mode === 'login' ? 'Sign In' : mode === 'forgot' ? 'Reset Password' : mode === 'otp' ? 'Password Reset Code' : mode === 'reset_password' ? 'Set New Password' : 'Account Security'}
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                {mode === 'signup' ? 'Create your MyRyedo account' : mode === 'otp' ? 'Enter 6-digit verification code' : 'MyRyedo Verified Access'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="shrink-0 w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 active:bg-slate-300 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer z-30"
            title="Close (Esc)"
            aria-label="Close"
            id="auth-modal-close-btn"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 overscroll-contain">
          {/* Intent Notification Banner */}
          {intentMessage && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-900 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Authentication Required</p>
                <p className="text-emerald-700 leading-relaxed">{intentMessage}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-900 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="font-medium text-emerald-800">{successMsg}</p>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-900 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="font-medium text-rose-700">{errorMsg}</p>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: GOOGLE OAUTH CONFIGURATION INFO (When credentials missing)           */}
          {/* ========================================================================= */}
          {mode === 'google_config_info' ? (
            <div className="space-y-4">
              <div className="text-center pb-2">
                <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-700 mb-2">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Google OAuth Setup</h3>
                <p className="text-xs text-slate-500 mt-1">Live Google authentication requires API credentials</p>
              </div>

              {/* Developer Configuration Instructions */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <span>Configure Google OAuth Client</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  To enable live Google Sign-In, add your Google Cloud credentials to environment variables via the Settings menu:
                </p>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="bg-white p-2 rounded border border-slate-200 text-slate-700">
                    <span className="font-semibold text-slate-900">GOOGLE_CLIENT_ID</span>=your_client_id.apps.googleusercontent.com
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200 text-slate-700">
                    <span className="font-semibold text-slate-900">GOOGLE_CLIENT_SECRET</span>=your_client_secret
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 space-y-1 text-[11px] text-slate-500">
                  <p className="font-semibold text-slate-700">In Google Cloud Console credentials:</p>
                  <div>• Authorized JavaScript Origin: <span className="font-mono text-slate-800">{oauthStatus?.authorizedOrigin || window.location.origin}</span></div>
                  <div>• Authorized Redirect URI: <span className="font-mono text-slate-800">{oauthStatus?.callbackUrl || `${window.location.origin}/auth/callback`}</span></div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-all shadow-sm"
                >
                  Sign Up with Email & Password
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full py-2.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors font-medium"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          ) : mode === 'otp' ? (
            /* ========================================================================= */
            /* VIEW: OTP 6-DIGIT VERIFICATION                                             */
            /* ========================================================================= */
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="text-center pb-2">
                <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-700 mb-2">
                  <Key className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Password Reset Code
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  We sent a 6-digit verification code to <span className="font-semibold text-slate-700">{email}</span>
                </p>
              </div>

              {/* Email Delivery Notice */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-start space-x-2.5 text-xs text-emerald-900">
                <Mail className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-950">Reset code dispatched</p>
                  <p className="text-emerald-800 text-[11px] leading-relaxed">
                    Check your email inbox or spam folder for the 6-digit code to reset your password.
                  </p>
                </div>
              </div>

              {/* 6-Digit Code Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Enter 6-Digit Code
                </label>
                <div className="relative">
                  <input
                    ref={otpInputRef}
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-4 py-3.5 text-center text-2xl font-mono tracking-[0.5em] rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all text-slate-900 font-bold placeholder:text-slate-300 placeholder:tracking-widest"
                    required
                    autoComplete="one-time-code"
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <span>Single-use code</span>
                  <span className={`font-mono ${otpExpirySeconds < 120 ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>
                    Expires in {formatTimer(otpExpirySeconds)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Resend Code Section */}
              <div className="pt-2 text-center text-xs text-slate-500 space-y-2">
                <div>
                  Didn't receive the email?{' '}
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isLoading}
                    className="text-emerald-700 hover:text-emerald-800 font-semibold disabled:text-slate-400 inline-flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${resendCooldown > 0 ? '' : 'hover:rotate-180 transition-transform'}`} />
                    <span>
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                    </span>
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </div>
            </form>
          ) : mode === 'reset_password' ? (
            /* ========================================================================= */
            /* VIEW: SET NEW PASSWORD                                                    */
            /* ========================================================================= */
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="text-center pb-2">
                <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-700 mb-2">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Set New Password</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Choose a strong, secure password for your account
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars with letters & numbers"
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all text-slate-900"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all text-slate-900"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : mode === 'forgot' ? (
            /* ========================================================================= */
            /* VIEW: FORGOT PASSWORD                                                     */
            /* ========================================================================= */
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="text-center pb-2">
                <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-700 mb-2">
                  <Key className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Reset Your Password</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Enter your registered email address and we'll send you a 6-digit verification code.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all text-slate-900"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            /* ========================================================================= */
            /* VIEW: LOGIN & SIGNUP FORMS                                                */
            /* ========================================================================= */
            <div>
              {/* Role Toggle for Signup */}
              {mode === 'signup' && (
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    I want to:
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('booker')}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                        selectedRole === 'booker'
                          ? 'bg-white text-emerald-800 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🚗 Rent a Ride
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('owner')}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                        selectedRole === 'owner'
                          ? 'bg-white text-emerald-800 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🔑 Host / List Car
                    </button>
                  </div>
                </div>
              )}

              {/* Header Title */}
              <div className="mb-5">
                <h3 className="text-xl font-bold text-slate-900">
                  {mode === 'signup' ? 'Create your MyRyedo account' : 'Welcome back'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {mode === 'signup' 
                    ? `Join thousands of verified ${selectedRole === 'owner' ? 'hosts' : 'renters'} today.`
                    : 'Sign in to access your bookings, favorites, and messages.'}
                </p>
              </div>

              {/* Main Credentials Form */}
              <form onSubmit={handleFormSubmit} className="space-y-3.5">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all text-slate-900"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      ref={emailInputRef}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all text-slate-900"
                      required
                    />
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98200 12345"
                        className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all text-slate-900"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'Min 8 chars with letters & numbers' : 'Enter password'}
                      className="w-full pl-10 pr-10 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all text-slate-900"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full pl-10 pr-10 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all text-slate-900"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{mode === 'signup' ? 'Creating Account...' : 'Signing In...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Mode Switch Link */}
              <div className="mt-4 text-center text-xs text-slate-600">
                {mode === 'signup' ? (
                  <p>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      Sign In
                    </button>
                  </p>
                ) : (
                  <p>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      Create Account
                    </button>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
