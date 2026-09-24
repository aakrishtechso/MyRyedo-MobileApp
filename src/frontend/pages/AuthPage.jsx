import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck,
  Car,
  Key,
  RefreshCw
} from 'lucide-react';
import { backendService } from '../../backend/api.js';

export const AuthPage = ({
  initialMode = 'login',
  intendedRole = 'booker',
  intentMessage = null,
  onLogin,
  onSuccess,
  onBack,
  showToast
}) => {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'forgot'
  const [selectedRole, setSelectedRole] = useState(intendedRole === 'owner' ? 'owner' : 'booker');

  // Unified auth callback dispatcher
  const handleAuthSuccess = (user, session) => {
    const callback = onLogin || onSuccess;
    if (typeof callback === 'function') {
      callback(user, session);
    }
  };

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Forgot password fields. Recovery uses a server-validated CAPTCHA, never OTP.
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: email + CAPTCHA, 2: new password

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    setMode(initialMode);
    setSelectedRole(intendedRole === 'owner' ? 'owner' : 'booker');
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [initialMode, intendedRole]);

  const loadCaptcha = async () => {
    setErrorMsg(null);
    setCaptchaCode('');
    const res = await backendService.getPasswordResetCaptcha();
    if (res?.success) {
      setCaptchaId(res.challengeId);
      setCaptchaImage(res.image);
    } else {
      setCaptchaId('');
      setCaptchaImage('');
      setErrorMsg(res?.error || 'Unable to load CAPTCHA. Please try again.');
    }
  };

  useEffect(() => {
    if (mode === 'forgot' && forgotStep === 1 && !captchaImage && !isLoading) {
      loadCaptcha();
    }
  }, [mode, forgotStep]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await backendService.login(trimmedEmail, password);
      if (res && res.success && res.user) {
        setSuccessMsg('Login successful!');
        if (showToast) showToast(`Welcome back, ${res.user.name || 'Driver'}!`);
        // Immediately notify parent and navigate to Home view
        handleAuthSuccess(res.user, res.session);
      } else {
        setErrorMsg(res?.error || 'Invalid email or password. Please try again.');
      }
    } catch (err) {
      setErrorMsg('Network error while signing in. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setErrorMsg('Please enter your full legal name.');
      return;
    }
    if (!trimmedEmail) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address (e.g. name@example.com).');
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMsg('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await backendService.register({
        name: trimmedName,
        email: trimmedEmail,
        password,
        confirmPassword,
        role: selectedRole,
        phone: trimmedPhone
      });

      if (res && res.success && res.user) {
        setSuccessMsg('Account created successfully!');
        if (showToast) showToast(`Welcome to MyRyedo, ${res.user.name}!`);
        // Immediately notify parent and navigate to Home view
        handleAuthSuccess(res.user, res.session || { token: res.token, user: res.user });
      } else {
        setErrorMsg(res?.error || 'Registration failed. Please verify your details.');
      }
    } catch (err) {
      setErrorMsg('Network error while registering. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim().toLowerCase();

    if (forgotStep === 1) {
      if (!trimmedEmail) {
        setErrorMsg('Please enter your registered email address.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
      if (!captchaId || !captchaCode.trim()) {
        setErrorMsg('Please enter the CAPTCHA shown above.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await backendService.verifyPasswordResetCaptcha({
          email: trimmedEmail,
          captchaId,
          captchaCode: captchaCode.trim()
        });

        if (res?.success && res.resetToken) {
          setResetToken(res.resetToken);
          setForgotStep(2);
          setCaptchaCode('');
          setSuccessMsg(res.message || 'Email verified. Create your new password.');
        } else {
          setErrorMsg(res?.error || 'Unable to verify your email and CAPTCHA.');
          await loadCaptcha();
        }
      } catch {
        setErrorMsg('Unable to connect to the authentication server. Please try again.');
        await loadCaptcha();
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!newPassword || newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setErrorMsg('New password must be at least 8 characters and contain both letters and numbers.');
      return;
    }
    if (!confirmNewPassword) {
      setErrorMsg('Please confirm your new password.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (!resetToken) {
      setErrorMsg('Password reset verification is missing. Please start again.');
      setForgotStep(1);
      await loadCaptcha();
      return;
    }

    setIsLoading(true);
    try {
      const res = await backendService.resetPasswordWithToken({
        email: trimmedEmail,
        resetToken,
        newPassword,
        confirmPassword: confirmNewPassword
      });

      if (res?.success) {
        setSuccessMsg(res.message || 'Password reset successful. You can now log in.');
        setResetToken('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => {
          setMode('login');
          setForgotStep(1);
          setCaptchaId('');
          setCaptchaImage('');
          setCaptchaCode('');
          setErrorMsg(null);
        }, 900);
      } else {
        setErrorMsg(res?.error || 'Failed to reset password.');
      }
    } catch {
      setErrorMsg('Unable to connect to the authentication server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
      
      {/* Top Bar with Back Button and Logo */}
      <div className="max-w-md w-full mx-auto mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#111827] bg-white px-3.5 py-2 rounded-xl border border-gray-200 shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 relative flex items-center justify-center">
            <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7">
              <path
                d="M6 5C6 3.89543 6.89543 3 8 3H18C22.4183 3 26 6.58172 26 11C26 14.5 23.6 17.5 20.3 18.5L26.5 28.5C26.9 29.2 26.4 30 25.5 30H20.8C20.2 30 19.6 29.6 19.3 29.1L14.2 19H11.5V28C11.5 29.1046 10.6046 30 9.5 30H8C6.89543 30 6 29.1046 6 28V5Z"
                fill="#FF6400"
              />
              <path
                d="M11.5 8.5H17.5C19.1569 8.5 20.5 9.84315 20.5 11.5C20.5 13.1569 19.1569 14.5 17.5 14.5H11.5V8.5Z"
                fill="white"
              />
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight text-[#1769D1]">
            My<span className="text-[#FF6400]">Ryedo</span>
          </span>
        </div>
      </div>

      <div className="max-w-md w-full mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-xl space-y-6">
        
        {/* Intent message banner if triggered from an action */}
        {intentMessage && (
          <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-2xl flex items-start gap-2.5 text-xs text-orange-900">
            <ShieldCheck className="w-4 h-4 text-[#FF6400] shrink-0 mt-0.5" />
            <p className="font-semibold">{intentMessage}</p>
          </div>
        )}

        {/* Tab Switcher: Sign In vs Sign Up */}
        {mode !== 'forgot' && (
          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Heading */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-[#111827]">
            {mode === 'login' && 'Sign in to MyRyedo'}
            {mode === 'signup' && 'Create your MyRyedo account'}
            {mode === 'forgot' && 'Reset your password'}
          </h1>
          <p className="text-xs text-gray-500">
            {mode === 'login' && 'Access verified vehicles or manage your fleet.'}
            {mode === 'signup' && 'Join India’s trusted peer-to-peer vehicle sharing community.'}
            {mode === 'forgot' && 'Verify your email with a CAPTCHA, then create a new password.'}
          </p>
        </div>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODE: SIGN IN FORM */}
        {/* ======================================================== */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-gray-200 focus:border-[#1769D1] focus:ring-2 focus:ring-blue-100 font-semibold text-gray-900 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-[11px] font-bold text-[#1769D1] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-[#1769D1] focus:ring-2 focus:ring-blue-100 font-semibold text-gray-900 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#FF6400] hover:bg-[#e05800] text-white text-xs font-black rounded-xl shadow-md shadow-orange-500/20 cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* MODE: SIGN UP FORM */}
        {/* ======================================================== */}
        {mode === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-4 text-xs">
            
            {/* Role Selection */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-2">
                I want to join MyRyedo as:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('booker')}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    selectedRole === 'booker'
                      ? 'border-[#1769D1] bg-blue-50/50 shadow-2xs'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Car className={`w-5 h-5 mb-1 ${selectedRole === 'booker' ? 'text-[#1769D1]' : 'text-gray-400'}`} />
                  <span className="block font-black text-gray-900 text-xs">Vehicle Renter</span>
                  <span className="text-[10px] text-gray-500 block leading-tight mt-0.5">Book cars, bikes & EVs</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('owner')}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    selectedRole === 'owner'
                      ? 'border-[#FF6400] bg-orange-50/50 shadow-2xs'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Key className={`w-5 h-5 mb-1 ${selectedRole === 'owner' ? 'text-[#FF6400]' : 'text-gray-400'}`} />
                  <span className="block font-black text-gray-900 text-xs">Vehicle Owner</span>
                  <span className="text-[10px] text-gray-500 block leading-tight mt-0.5">List & earn daily income</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                Full Legal Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-gray-200 focus:border-[#1769D1] focus:ring-2 focus:ring-blue-100 font-semibold text-gray-900 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-gray-200 focus:border-[#1769D1] focus:ring-2 focus:ring-blue-100 font-semibold text-gray-900 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-gray-200 focus:border-[#1769D1] focus:ring-2 focus:ring-blue-100 font-semibold text-gray-900 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                Create Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 chars with letters & numbers"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-[#1769D1] focus:ring-2 focus:ring-blue-100 font-semibold text-gray-900 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-[#1769D1] focus:ring-2 focus:ring-blue-100 font-semibold text-gray-900 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#FF6400] hover:bg-[#e05800] text-white text-xs font-black rounded-xl shadow-md shadow-orange-500/20 cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Register as {selectedRole === 'owner' ? 'Vehicle Owner' : 'Renter'}</span>
              )}
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* MODE: FORGOT PASSWORD */}
        {/* ======================================================== */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs">
            {forgotStep === 1 ? (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                    Your Registered Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoComplete="email"
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-gray-200 font-semibold text-gray-900 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-gray-700">
                      CAPTCHA Verification
                    </label>
                    <button
                      type="button"
                      onClick={loadCaptcha}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1769D1] hover:text-blue-700 disabled:opacity-50"
                      title="Refresh CAPTCHA"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Refresh
                    </button>
                  </div>

                  {captchaImage ? (
                    <div className="flex items-center gap-3">
                      <div className="h-14 flex-1 rounded-xl border border-gray-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                        <img
                          src={captchaImage}
                          alt="CAPTCHA challenge"
                          className="w-[190px] h-14 select-none"
                          draggable="false"
                        />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={captchaCode}
                        onChange={(e) => setCaptchaCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                        placeholder="Enter code"
                        autoComplete="off"
                        className="w-32 p-3 rounded-xl border border-gray-200 font-mono text-center text-sm font-bold tracking-widest text-gray-900 outline-none"
                        aria-label="Enter CAPTCHA"
                      />
                    </div>
                  ) : (
                    <div className="h-14 rounded-xl border border-gray-200 bg-slate-50 flex items-center justify-center text-gray-500">
                      Loading CAPTCHA…
                    </div>
                  )}
                  <p className="mt-1.5 text-[10px] text-gray-500">
                    Enter the 5-character code shown in the image. No OTP is required.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !captchaImage}
                  className="w-full py-3.5 bg-[#1769D1] hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify & Continue</span>}
                </button>
              </>
            ) : (
              <>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800">
                  <p className="font-bold">Email verified</p>
                  <p className="text-[10px] mt-0.5">Create a new password for your MyRyedo account.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters with letters & numbers"
                    autoComplete="new-password"
                    className="w-full p-3 rounded-xl border border-gray-200 font-semibold text-gray-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    className="w-full p-3 rounded-xl border border-gray-200 font-semibold text-gray-900 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-[#FF6400] hover:bg-[#e05800] text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Reset Password</span>}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setForgotStep(1);
                setCaptchaId('');
                setCaptchaImage('');
                setCaptchaCode('');
                setResetToken('');
                setNewPassword('');
                setConfirmNewPassword('');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-800 text-center cursor-pointer"
            >
              Back to Sign In
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
export default AuthPage;
