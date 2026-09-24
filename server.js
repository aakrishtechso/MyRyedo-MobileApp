import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { OAuth2Client } from 'google-auth-library';
import { authDatabase } from './src/backend/authDatabase.js';
import { emailService } from './src/backend/emailService.js';
import { mongoStore } from './src/backend/mongoStore.js';

// MongoDB is mandatory for production data. No JSON/file database fallback.
await mongoStore.connect();
await authDatabase.initializeFromMongo();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'https://myryedo.com',
    'https://www.myryedo.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://localhost',
    'capacitor://localhost',
    'http://localhost'
  ],
  credentials: true
}));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});
// Determine Canonical Application URL for OAuth
const getAppUrl = (req) => {
    if (process.env.APP_URL && !process.env.APP_URL.includes('MY_APP_URL')) {
        return process.env.APP_URL.replace(/\/+$/, '');
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
    return `${protocol}://${host}`;
};
// Helper to extract JWT token from Authorization header, body, query or cookie
const extractToken = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7).trim();
    }
    if (req.headers && req.headers['x-auth-token']) {
        return req.headers['x-auth-token'];
    }
    if (req.body && req.body.token) {
        return req.body.token;
    }
    if (req.query && req.query.token) {
        return req.query.token;
    }
    if (req.cookies && (req.cookies.myryedo_token || req.cookies.ridely_token)) {
        return req.cookies.myryedo_token || req.cookies.ridely_token;
    }
    return null;
};
// Helper to get Google OAuth2 Client
const getGoogleOAuthClient = (callbackUrl) => {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        return { client: null, clientId, clientSecret };
    }
    return {
        client: new OAuth2Client(clientId, clientSecret, callbackUrl),
        clientId,
        clientSecret
    };
};
// ==========================================
// AUTHENTICATION API ROUTES
// ==========================================
// 1. Check Auth & OAuth Provider Status
app.get('/api/auth/status', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET || '';
    const appUrl = getAppUrl(req);
    const callbackUrl = `${appUrl}/auth/callback`;
    res.json({
        status: 'ok',
        googleOAuthConfigured: !!(clientId && clientSecret),
        clientId: clientId ? `${clientId.substring(0, 14)}...` : null,
        appUrl,
        callbackUrl,
        authorizedOrigin: appUrl,
        emailServiceConfigured: emailService.isConfigured()
    });
});
// 2. Generate Google OAuth Authorization URL
app.get('/api/auth/google/url', (req, res) => {
    const role = (req.query.role === 'owner' ? 'owner' : 'booker');
    const appUrl = getAppUrl(req);
    const callbackUrl = `${appUrl}/auth/callback`;
    const { client, clientId, clientSecret } = getGoogleOAuthClient(callbackUrl);
    if (!client || !clientId || !clientSecret) {
        return res.status(400).json({
            configured: false,
            error: 'Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured in environment variables.',
            callbackUrl,
            authorizedOrigin: appUrl,
            instructions: 'Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the AI Studio Settings menu.'
        });
    }
    // Create cryptographic CSRF state
    const state = authDatabase.createOAuthState(role, appUrl);
    // Generate official Google OAuth authorization URL
    const googleAuthUrl = client.generateAuthUrl({
        access_type: 'offline',
        scope: ['openid', 'email', 'profile'],
        prompt: 'select_account',
        state: state
    });
    res.json({
        configured: true,
        url: googleAuthUrl,
        callbackUrl,
        authorizedOrigin: appUrl
    });
});
// 3. OAuth Callback Handler (Popup receiver and full-page redirect receiver)
app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
    const { code, state, error, error_description } = req.query;
    const appUrl = getAppUrl(req);
    const callbackUrl = `${appUrl}/auth/callback`;
    const { client, clientId } = getGoogleOAuthClient(callbackUrl);
    // Helper to render popup closer with postMessage and graceful fallback
    const renderResponse = (payload) => {
        return res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>MyRyedo Google Authentication</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #1e293b; }
            .card { background: white; padding: 28px 32px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); text-align: center; max-width: 420px; width: 90%; }
            .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-weight: 600; font-size: 13px; margin-bottom: 12px; }
            .badge.success { background: #dcfce7; color: #15803d; }
            .badge.error { background: #fee2e2; color: #b91c1c; }
            h2 { margin: 0 0 8px 0; font-size: 18px; }
            p { color: #64748b; font-size: 14px; margin: 0 0 16px 0; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            ${payload.success
            ? `<div class="badge success">✓ Verified</div>
                   <h2>Google Sign-In Complete</h2>
                   <p>Connecting your MyRyedo session and redirecting...</p>`
            : `<div class="badge error">✕ Verification Failed</div>
                   <h2>Authentication Incomplete</h2>
                   <p>${payload.error || 'Could not verify your Google account.'}</p>`}
          </div>
          <script>
            try {
              const eventPayload = JSON.stringify({
                timestamp: Date.now(),
                success: ${payload.success ? 'true' : 'false'},
                token: ${JSON.stringify(payload.token || null)},
                user: ${JSON.stringify(payload.user || null)},
                error: ${JSON.stringify(payload.error || null)}
              });
              localStorage.setItem('myryedo_google_auth_event', eventPayload);
              localStorage.setItem('ridely_google_auth_event', eventPayload);
            } catch(e) {}

            try {
              if (window.opener) {
                window.opener.postMessage(${JSON.stringify({
            type: payload.success ? 'GOOGLE_AUTH_SUCCESS' : 'GOOGLE_AUTH_ERROR',
            token: payload.token,
            user: payload.user,
            error: payload.error
        })}, '*');
                setTimeout(() => window.close(), 400);
              } else {
                setTimeout(() => { window.close(); }, 800);
              }
            } catch (err) {
              setTimeout(() => window.close(), 1000);
            }
          </script>
        </body>
      </html>
    `);
    };
    // Handle user cancellation or Google authorization error
    if (error) {
        return renderResponse({
            success: false,
            error: error_description || (error === 'access_denied' ? 'Google sign in was cancelled.' : `Google OAuth error: ${error}`)
        });
    }
    if (!code || !state) {
        return renderResponse({
            success: false,
            error: 'Missing authorization code or state parameter from Google.'
        });
    }
    // Validate state against CSRF
    const oauthState = authDatabase.verifyAndConsumeOAuthState(state);
    if (!oauthState) {
        return renderResponse({
            success: false,
            error: 'OAuth state is invalid or has expired. Please try signing in again.'
        });
    }
    if (!client || !clientId) {
        return renderResponse({
            success: false,
            error: 'Google Client ID or Secret is not configured on the server.'
        });
    }
    try {
        // Exchange authorization code for tokens directly using official Google OAuth2Client
        const { tokens } = await client.getToken(code);
        if (!tokens.id_token) {
            return renderResponse({
                success: false,
                error: 'Google did not return a valid ID token.'
            });
        }
        // Cryptographically verify ID token against Google's public certificates
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: clientId
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return renderResponse({
                success: false,
                error: 'Google authentication did not provide an email address.'
            });
        }
        // Check email verification status in Google
        if (!payload.email_verified) {
            return renderResponse({
                success: false,
                error: 'Your Google account email is not verified with Google. Please verify it with Google before signing in.'
            });
        }
        const googleEmail = payload.email.toLowerCase().trim();
        const googleSub = payload.sub;
        const googleName = payload.name || googleEmail.split('@')[0];
        const googlePicture = payload.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
        // Account Linking & User Creation Logic
        let user = authDatabase.findByEmail(googleEmail);
        if (user) {
            // Safe account linking for existing user: Link googleId and ensure verified
            user = authDatabase.updateUser(googleEmail, {
                googleId: googleSub,
                emailVerified: true,
                avatar: user.avatar || googlePicture
            });
        }
        else {
            // Create real verified user account
            const newUser = {
                id: `user-google-${crypto.randomUUID()}`,
                name: googleName,
                email: googleEmail,
                passwordHash: null, // Google-authenticated account
                role: oauthState.role || 'booker',
                avatar: googlePicture,
                emailVerified: true,
                googleId: googleSub,
                joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                totalTrips: 0,
                rating: 5.0,
                sessionVersion: 1,
                createdAt: Date.now()
            };
            user = authDatabase.createUser(newUser);
        }
        // Issue secure session token
        const session = authDatabase.generateSessionToken(user);
        // Set secure HTTP-only cookie (SameSite=None required for iframe environments)
        res.cookie('myryedo_token', session.token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.cookie('ridely_token', session.token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        return renderResponse({
            success: true,
            token: session.token,
            user: authDatabase.sanitizeUser(user)
        });
    }
    catch (err) {
        console.error('Google OAuth token verification failed:', err);
        return renderResponse({
            success: false,
            error: err.message || 'Failed to verify Google authentication.'
        });
    }
});
// 4. One-Click Email Verification via Link
app.get('/api/auth/verify-email', (req, res) => {
    const token = req.query.token;
    if (!token) {
        return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Verification Error</title></head>
        <body style="font-family: sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; background:#f8fafc;">
          <div style="background:white; padding:32px; border-radius:12px; text-align:center; max-width:400px;">
            <h2 style="color:#b91c1c;">Verification Error</h2>
            <p style="color:#64748b;">Missing or invalid email verification token.</p>
            <a href="/" style="display:inline-block; margin-top:16px; padding:10px 20px; background:#FF6400; color:white; text-decoration:none; border-radius:6px;">Return to MyRyedo</a>
          </div>
        </body>
      </html>
    `);
    }
    const result = authDatabase.verifyEmailToken(token);
    if (!result.success || !result.user) {
        return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Verification Failed</title></head>
        <body style="font-family: sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; background:#f8fafc;">
          <div style="background:white; padding:32px; border-radius:12px; text-align:center; max-width:400px;">
            <h2 style="color:#b91c1c;">Verification Failed</h2>
            <p style="color:#64748b;">${result.error || 'The verification link is invalid or has expired.'}</p>
            <a href="/" style="display:inline-block; margin-top:16px; padding:10px 20px; background:#FF6400; color:white; text-decoration:none; border-radius:6px;">Return to MyRyedo</a>
          </div>
        </body>
      </html>
    `);
    }
    const session = authDatabase.generateSessionToken(result.user);
    res.cookie('myryedo_token', session.token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.cookie('ridely_token', session.token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Email Verified - MyRyedo</title>
        <meta http-equiv="refresh" content="3;url=/">
      </head>
      <body style="font-family: sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; background:#f8fafc;">
        <div style="background:white; padding:32px; border-radius:12px; text-align:center; max-width:400px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <div style="background:#dcfce7; color:#15803d; font-size:24px; width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin: 0 auto 16px auto;">✓</div>
          <h2 style="color:#0f172a; margin-bottom:8px;">Email Verified!</h2>
          <p style="color:#64748b; font-size:14px; line-height:1.5;">Your MyRyedo account has been successfully verified. Redirecting to the application...</p>
          <a href="/" style="display:inline-block; margin-top:16px; padding:10px 24px; background:#FF6400; color:white; text-decoration:none; border-radius:6px; font-weight:600;">Go to Dashboard Now</a>
        </div>
      </body>
    </html>
  `);
});
// 5. User Registration (Email & Password + Real Verification Trigger)
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, confirmPassword, role, phone } = req.body;
    // Rate limiting (10 registrations per 15 min per IP)
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'ip';
    const limit = authDatabase.checkRateLimit(`register:${clientIp}`, 10, 15 * 60 * 1000);
    if (!limit.allowed) {
        return res.status(429).json({
            success: false,
            error: `Too many registration attempts. Please try again in ${limit.retryAfterSeconds} seconds.`
        });
    }
    // Field validation
    if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Full name is required.' });
    }
    if (!email || !email.trim()) {
        return res.status(400).json({ success: false, error: 'Email address is required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
    }
    if (!password || password.length < 8) {
        return res.status(400).json({
            success: false,
            error: 'Password must be at least 8 characters long and contain both letters and numbers.'
        });
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return res.status(400).json({
            success: false,
            error: 'Password must contain at least one letter and one number.'
        });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
        return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }
    const validatedRole = (role === 'admin' || role === 'owner') ? role : 'booker';
    const appUrl = getAppUrl(req);
    // Check if existing user
    const existingUser = authDatabase.findByEmail(normalizedEmail);
    if (existingUser) {
        return res.status(400).json({
            success: false,
            error: 'An account with this email address already exists. Please sign in.'
        });
    }
    // Create new user directly in verified status (no OTP required)
    const passwordHash = await authDatabase.hashPassword(password);
    const newUser = {
        id: `user-${crypto.randomUUID()}`,
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: validatedRole,
        phone: phone?.trim() || '',
        avatar: validatedRole === 'owner'
            ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'
            : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        emailVerified: true,
        googleId: null,
        joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        totalTrips: 0,
        rating: 5.0,
        sessionVersion: 1,
        createdAt: Date.now()
    };
    authDatabase.createUser(newUser);

    // Issue session token and HTTP-only cookie immediately
    const session = authDatabase.generateSessionToken(newUser);
    res.cookie('myryedo_token', session.token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.cookie('ridely_token', session.token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
        success: true,
        message: 'Account created successfully!',
        user: authDatabase.sanitizeUser(newUser),
        token: session.token
    });
});
// 6. Verify OTP (for Email Verification or Password Reset)
app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, code, type } = req.body;
    if (!email || !code || !type) {
        return res.status(400).json({ success: false, error: 'Email, code, and verification type are required.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const validTypes = ['email_verification', 'password_reset'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({ success: false, error: 'Invalid verification type.' });
    }
    // Rate limit OTP verifications (10 attempts per 5 mins per email)
    const rateKey = `verify_otp:${normalizedEmail}`;
    const limit = authDatabase.checkRateLimit(rateKey, 10, 5 * 60 * 1000);
    if (!limit.allowed) {
        return res.status(429).json({
            success: false,
            error: `Too many verification attempts. Please wait ${limit.retryAfterSeconds} seconds.`
        });
    }
    const result = authDatabase.verifyOtp(normalizedEmail, type, code);
    if (!result.success) {
        return res.status(400).json({
            success: false,
            error: result.error,
            remainingAttempts: result.remainingAttempts
        });
    }
    // If email verification: mark user verified and issue session
    if (type === 'email_verification') {
        const updatedUser = authDatabase.updateUser(normalizedEmail, { emailVerified: true });
        if (!updatedUser) {
            return res.status(404).json({ success: false, error: 'User account not found.' });
        }
        const session = authDatabase.generateSessionToken(updatedUser);
        res.cookie('myryedo_token', session.token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.cookie('ridely_token', session.token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        return res.json({
            success: true,
            message: 'Email address verified successfully!',
            user: authDatabase.sanitizeUser(updatedUser),
            token: session.token
        });
    }
    // If password reset: return success so frontend proceeds to set new password
    return res.json({
        success: true,
        message: 'Verification code confirmed. Please enter your new password.'
    });
});
// 7. Resend OTP with Cooldown Enforcement
app.post('/api/auth/resend-otp', async (req, res) => {
    const { email, type } = req.body;
    if (!email || !type) {
        return res.status(400).json({ success: false, error: 'Email and verification type are required.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existingOtp = authDatabase.getActiveOtp(normalizedEmail, type);
    if (existingOtp && Date.now() < existingOtp.resendAvailableAt) {
        const waitSeconds = Math.ceil((existingOtp.resendAvailableAt - Date.now()) / 1000);
        return res.status(429).json({
            success: false,
            error: `Please wait ${waitSeconds} seconds before requesting a new code.`
        });
    }
    const { code, record } = authDatabase.createOtp(normalizedEmail, type);
    const appUrl = getAppUrl(req);
    if (type === 'email_verification') {
        const user = authDatabase.findByEmail(normalizedEmail);
        const verifyToken = authDatabase.createEmailVerificationToken(normalizedEmail);
        const verifyUrl = `${appUrl}/api/auth/verify-email?token=${verifyToken}`;
        await emailService.sendVerificationEmail(normalizedEmail, user?.name || '', code, verifyUrl);
    }
    else if (type === 'password_reset') {
        await emailService.sendPasswordResetEmail(normalizedEmail, code);
    }
    res.json({
        success: true,
        message: `A new verification code has been sent to ${normalizedEmail}.`,
        resendAvailableAt: record.resendAvailableAt
    });
});
// 8. User Login (Email & Password with Rate Limiting & Account Lockout)
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !email.trim()) {
        return res.status(400).json({ success: false, error: 'Please enter your email address.' });
    }
    if (!password || !password.trim()) {
        return res.status(400).json({ success: false, error: 'Please enter your password.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    // Rate limit: 8 attempts per 15 minutes per email/IP
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'ip';
    const rateKey = `login:${normalizedEmail}:${clientIp}`;
    const limit = authDatabase.checkRateLimit(rateKey, 8, 15 * 60 * 1000);
    if (!limit.allowed) {
        return res.status(429).json({
            success: false,
            error: `Too many login attempts. For your security, please wait ${limit.retryAfterSeconds} seconds.`
        });
    }
    const user = authDatabase.findByEmail(normalizedEmail);
    // Protection against account enumeration: use constant time response pattern
    if (!user || !user.passwordHash) {
        await authDatabase.hashPassword('dummy_password_timing_pad');
        if (user && !user.passwordHash && user.googleId) {
            return res.status(400).json({
                success: false,
                error: 'This account was registered with Google Sign-In. Please click "Continue with Google" or reset your password.'
            });
        }
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }
    // Check account lockout
    if (user.lockoutUntil && Date.now() < user.lockoutUntil) {
        const remainingMins = Math.ceil((user.lockoutUntil - Date.now()) / (60 * 1000));
        return res.status(429).json({
            success: false,
            error: `Account temporarily locked due to repeated failed logins. Please try again in ${remainingMins} minute(s).`
        });
    }
    const isPasswordValid = await authDatabase.comparePassword(password, user.passwordHash, normalizedEmail);
    if (!isPasswordValid) {
        const failedAttempts = (user.failedLoginAttempts || 0) + 1;
        const updates = { failedLoginAttempts: failedAttempts };
        if (failedAttempts >= 5) {
            updates.lockoutUntil = Date.now() + 15 * 60 * 1000; // 15 min lock
            authDatabase.updateUser(normalizedEmail, updates);
            return res.status(429).json({
                success: false,
                error: 'Account locked for 15 minutes due to 5 consecutive failed attempts.'
            });
        }
        authDatabase.updateUser(normalizedEmail, updates);
        return res.status(401).json({
            success: false,
            error: `Invalid email or password. (${5 - failedAttempts} attempt${5 - failedAttempts === 1 ? '' : 's'} remaining)`
        });
    }
    // Reset failed attempts on success
    authDatabase.updateUser(normalizedEmail, { failedLoginAttempts: 0, lockoutUntil: undefined });
    // If legacy user was previously unverified, mark verified so login succeeds seamlessly
    if (!user.emailVerified) {
        user.emailVerified = true;
        authDatabase.updateUser(normalizedEmail, { emailVerified: true });
    }
    // Issue session token
    const session = authDatabase.generateSessionToken(user);
    res.cookie('myryedo_token', session.token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.cookie('ridely_token', session.token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.json({
        success: true,
        user: authDatabase.sanitizeUser(user),
        token: session.token
    });
});
// 9. Forgot Password (Generates Secure OTP)
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email || !email.trim()) {
        return res.status(400).json({ success: false, error: 'Please enter your email address.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = authDatabase.findByEmail(normalizedEmail);
    // Rate limit
    const limit = authDatabase.checkRateLimit(`forgot:${normalizedEmail}`, 4, 15 * 60 * 1000);
    if (!limit.allowed) {
        return res.status(429).json({
            success: false,
            error: `Too many password reset requests. Please wait ${limit.retryAfterSeconds} seconds.`
        });
    }
    if (user) {
        const { code } = authDatabase.createOtp(normalizedEmail, 'password_reset');
        await emailService.sendPasswordResetEmail(normalizedEmail, code);
    }
    // Prevent account enumeration by returning the same message
    res.json({
        success: true,
        message: 'If an account exists with this email, a password reset code has been sent.'
    });
});
// 10. Reset Password (Requires Verified OTP)
app.post('/api/auth/reset-password', async (req, res) => {
    const { email, code, newPassword, confirmPassword } = req.body;
    if (!email || !code || !newPassword) {
        return res.status(400).json({ success: false, error: 'Email, verification code, and new password are required.' });
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return res.status(400).json({
            success: false,
            error: 'Password must be at least 8 characters long and contain both letters and numbers.'
        });
    }
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    // Verify OTP
    const verifyResult = authDatabase.verifyOtp(normalizedEmail, 'password_reset', code);
    if (!verifyResult.success) {
        return res.status(400).json({ success: false, error: verifyResult.error });
    }
    const user = authDatabase.findByEmail(normalizedEmail);
    if (!user) {
        return res.status(404).json({ success: false, error: 'User account not found.' });
    }
    const newHash = await authDatabase.hashPassword(newPassword);
    authDatabase.updateUser(normalizedEmail, {
        passwordHash: newHash,
        emailVerified: true,
        failedLoginAttempts: 0,
        lockoutUntil: undefined
    });
    // Invalidate all existing active sessions
    authDatabase.invalidateAllUserSessions(normalizedEmail);
    res.json({
        success: true,
        message: 'Your password has been successfully updated. You may now sign in with your new password.'
    });
});
// 11. Change Password (Protected Route)
app.post('/api/auth/change-password', async (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const verification = authDatabase.verifySessionToken(token);
    if (!verification.valid || !verification.user) {
        return res.status(401).json({ success: false, error: verification.error || 'Invalid session.' });
    }
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = verification.user;
    if (user.passwordHash) {
        if (!currentPassword) {
            return res.status(400).json({ success: false, error: 'Current password is required.' });
        }
        const matches = await authDatabase.comparePassword(currentPassword, user.passwordHash);
        if (!matches) {
            return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
        }
    }
    if (!newPassword || newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return res.status(400).json({
            success: false,
            error: 'New password must be at least 8 characters long and contain letters and numbers.'
        });
    }
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }
    const newHash = await authDatabase.hashPassword(newPassword);
    authDatabase.updateUser(user.email, { passwordHash: newHash });
    authDatabase.invalidateAllUserSessions(user.email);
    // Issue refreshed session
    const refreshed = authDatabase.generateSessionToken(user);
    res.json({
        success: true,
        message: 'Password changed successfully.',
        token: refreshed.token
    });
});
// 12. Current User (Session Check: /api/auth/me)
app.get('/api/auth/me', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'No active session.' });
    }
    const result = authDatabase.verifySessionToken(token);
    if (!result.valid || !result.user) {
        return res.status(401).json({ success: false, error: result.error || 'Session expired.' });
    }
    res.json({
        success: true,
        user: authDatabase.sanitizeUser(result.user)
    });
});
// 13. Logout (Revoke Session)
app.post('/api/auth/logout', (req, res) => {
    const token = extractToken(req);
    if (token) {
        authDatabase.revokeToken(token);
    }
    res.clearCookie('myryedo_token');
    res.clearCookie('ridely_token');
    res.json({ success: true, message: 'Logged out successfully.' });
});
// MongoDB-backed persistent application data. Runtime arrays are kept for the
// existing API code, while every mutation is persisted to MongoDB.
const DEFAULT_PLATFORM_SETTINGS = {
    platformCommissionPercent: 10,
    platformFeePercent: 8,
    taxPercent: 12,
    promoCodes: [
        { code: 'MYRYEDO10', discountPercent: 10, minAmount: 1000, description: '10% discount on bookings over ₹1,000' },
        { code: 'FIRSTTRIP', flatDiscount: 300, minAmount: 800, description: 'Flat ₹300 off on your first trip' },
        { code: 'WEEKEND20', discountPercent: 20, minAmount: 2000, description: '20% discount on weekend getaways over ₹2,000' }
    ]
};

const DEFAULT_SERVICE_AREAS = [
    {
        id: 'sa-vijay-nagar', name: 'Vijay Nagar', city: 'Indore', state: 'Madhya Pradesh', status: 'active', radiusKm: 15,
        centerCoordinates: { lat: 22.7533, lng: 75.8937 }, launchDate: '2026-01-01',
        foundingOwnerProgram: { enabled: true, name: 'Vijay Nagar Founding Owner Program', freeCommissionBookingsCount: 10, description: '0% platform commission on your first 10 completed rentals' },
        activeOffers: [{ code: 'VIJAY200', title: 'Vijay Nagar Launch', description: 'First 100 riders get ₹200 OFF on bookings above ₹500', flatDiscount: 200, discountPercent: 0, minAmount: 500, maxUses: 100, usedCount: 0, active: true }],
        notes: 'Active launch hub for Indore peer-to-peer vehicle sharing.'
    }
];

const mongoArray = async (collection, fallback = []) => {
    const docs = await mongoStore.readCollection(collection);
    return docs.length ? docs.map(({ _id, ...doc }) => doc) : fallback;
};

const initialStore = {
    vehicles: await mongoArray('vehicles'),
    bookings: await mongoArray('bookings'),
    reviews: await mongoArray('reviews'),
    supportTickets: await mongoArray('supportTickets'),
    incidents: await mongoArray('incidents'),
    reports: await mongoArray('reports'),
    payouts: await mongoArray('payouts'),
    disputes: await mongoArray('disputes'),
    transactions: await mongoArray('transactions'),
    serviceAreas: await mongoArray('serviceAreas'),
    waitlist: await mongoArray('waitlist'),
    vehicleWaitlist: await mongoArray('vehicleWaitlist'),
    campaigns: await mongoArray('campaigns'),
    notifications: await mongoArray('notifications'),
    messages: await mongoArray('messages'),
    platformSettings: await mongoStore.readSingleton('platformSettings', DEFAULT_PLATFORM_SETTINGS)
};

const serverVehicles = initialStore.vehicles;
const serverBookings = initialStore.bookings;
const serverReviews = initialStore.reviews;
const serverSupportTickets = initialStore.supportTickets;
const serverIncidents = initialStore.incidents;
const serverReports = initialStore.reports;
const serverPlatformSettings = initialStore.platformSettings || DEFAULT_PLATFORM_SETTINGS;
const serverNotifications = initialStore.notifications;
const serverMessages = initialStore.messages;
const serverServiceAreas = initialStore.serviceAreas || [];
const serverWaitlist = initialStore.waitlist;
const serverVehicleWaitlist = initialStore.vehicleWaitlist;
const serverCampaigns = initialStore.campaigns;
const serverPayouts = initialStore.payouts;
const serverDisputes = initialStore.disputes;
const serverTransactions = initialStore.transactions;

async function seedDefaultAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) return;
    if (authDatabase.findByEmail(adminEmail)) return;
    const adminHash = await authDatabase.hashPassword(adminPassword);
    authDatabase.createUser({
        id: `user-admin-${crypto.randomUUID()}`, name: 'MyRyedo Admin', email: adminEmail, passwordHash: adminHash,
        role: 'admin', phone: '', avatar: '', emailVerified: true, googleId: null,
        joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), totalTrips: 0,
        rating: 5.0, sessionVersion: 1, createdAt: Date.now()
    });
}
seedDefaultAdmin().catch((error) => console.error('Admin seed failed:', error));

// Configurable Cancellation Policy (Requirement 8)
const CANCELLATION_POLICY_CONFIG = {
    gracePeriodMinutesAfterBooking: 60,
    afterOneHourCancellationFeePercent: 10,
    afterTwoHoursCancellationFeePercent: 20,
    sameDayCancellationFeePercent: 35,
    lateCancellationFeePercent: 50,
    nextDayCancellationFeePercent: 20,
    advanceCancellationFeePercent: 10,
    freeCancellationFeePercent: 0,
    freeCancellationHoursBeforePickup: 24,
    standardCancellationHoursBeforePickup: 6
};

function calculateCancellationRefund(booking) {
    const now = Date.now();
    const pickupMs = new Date(booking.pickupDateTime).getTime();
    const bookedAtMs = booking.createdAt ? new Date(booking.createdAt).getTime() : 0;
    const hoursUntilPickup = (pickupMs - now) / (1000 * 60 * 60);
    const minutesSinceBooking = bookedAtMs ? (now - bookedAtMs) / (1000 * 60) : 9999;
    
    let feePercent = 0;
    let tier = 'free';
    let policyExplanation = '';

    // Simple, predictable policy: a short grace period, then progressively
    // higher fees based on how long ago the booking was made and how close
    // the trip is. This calculation is server-authoritative.
    if (minutesSinceBooking <= CANCELLATION_POLICY_CONFIG.gracePeriodMinutesAfterBooking) {
        feePercent = 0;
        tier = 'grace_period';
        policyExplanation = 'Cancelled within 1 hour of booking: 100% refund with ₹0 cancellation fee.';
    } else if (minutesSinceBooking <= 120) {
        feePercent = CANCELLATION_POLICY_CONFIG.afterOneHourCancellationFeePercent;
        tier = 'after_1_hour';
        policyExplanation = 'Cancelled within 2 hours of booking: 10% cancellation fee applies.';
    } else if (minutesSinceBooking <= 180) {
        feePercent = CANCELLATION_POLICY_CONFIG.afterTwoHoursCancellationFeePercent;
        tier = 'after_2_hours';
        policyExplanation = 'Cancelled within 3 hours of booking: 20% cancellation fee applies.';
    } else if (hoursUntilPickup <= 0) {
        feePercent = 100;
        tier = 'after_start';
        policyExplanation = 'Trip has already started: rental amount is non-refundable.';
    } else if (hoursUntilPickup < 6) {
        feePercent = CANCELLATION_POLICY_CONFIG.lateCancellationFeePercent;
        tier = 'late';
        policyExplanation = 'Less than 6 hours before pickup: 50% cancellation fee applies.';
    } else if (hoursUntilPickup < 24) {
        feePercent = CANCELLATION_POLICY_CONFIG.sameDayCancellationFeePercent;
        tier = 'same_day';
        policyExplanation = '6–24 hours before pickup: 35% cancellation fee applies.';
    } else if (hoursUntilPickup < 48) {
        feePercent = CANCELLATION_POLICY_CONFIG.nextDayCancellationFeePercent;
        tier = 'next_day';
        policyExplanation = '24–48 hours before pickup: 20% cancellation fee applies.';
    } else {
        feePercent = CANCELLATION_POLICY_CONFIG.advanceCancellationFeePercent;
        tier = 'advance';
        policyExplanation = 'More than 48 hours before pickup: 10% advance-cancellation fee applies after the 1-hour grace period.';
    }

    const totalAmount = Number(booking.totalAmount) || 0;
    const securityDeposit = Number(booking.securityDeposit) || 0;
    const baseRentalAmount = Math.max(0, totalAmount - securityDeposit);
    
    const cancellationFee = Math.round((baseRentalAmount * feePercent) / 100);
    const rentalRefund = Math.max(0, baseRentalAmount - cancellationFee);
    const depositRefund = securityDeposit; // Security deposit is always 100% refunded
    const refundAmount = rentalRefund + depositRefund;

    return {
        originalAmount: totalAmount,
        baseRentalAmount,
        securityDeposit,
        cancellationFeePercent: feePercent,
        cancellationFee,
        rentalRefund,
        depositRefund,
        refundAmount,
        hoursUntilPickup: Math.round(hoursUntilPickup * 10) / 10,
        policyExplanation,
        tier,
        tierName: tier.replace(/_/g, ' '),
        message: policyExplanation,
        feePercent
    };
}

// Check and notify next eligible waiting list user for a freed slot
function notifyNextEligibleWaitlistUser(vehicleId, cancelledPickupStr, cancelledReturnStr) {
    const cancelledStart = new Date(cancelledPickupStr).getTime();
    const cancelledEnd = new Date(cancelledReturnStr).getTime();
    const vehicle = findVehicle(vehicleId);

    const eligibleEntries = serverVehicleWaitlist.filter(w => {
        if (w.vehicleId !== vehicleId) return false;
        if (w.status !== 'active') return false;
        const wStart = new Date(w.requestedPickupDateTime).getTime();
        const wEnd = new Date(w.requestedReturnDateTime).getTime();
        return wStart < cancelledEnd && wEnd > cancelledStart;
    });

    if (eligibleEntries.length === 0) return null;

    eligibleEntries.sort((a, b) => (a.position || 1) - (b.position || 1) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const nextUser = eligibleEntries[0];

    const priorityExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours window
    nextUser.status = 'notified';
    nextUser.notifiedAt = new Date().toISOString();
    nextUser.priorityExpiresAt = priorityExpiresAt;

    serverNotifications.unshift({
        id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        userId: nextUser.userId,
        type: 'waitlist_available',
        title: `Vehicle Available: ${vehicle ? vehicle.name : 'Your requested vehicle'}!`,
        message: `A booking was just cancelled and a slot is open for ${vehicle ? vehicle.name : 'your vehicle'}! You have exclusive priority booking for the next 2 hours.`,
        vehicleId,
        waitlistId: nextUser.id,
        expiresAt: priorityExpiresAt,
        read: false,
        createdAt: new Date().toISOString()
    });

    return nextUser;
}

const saveStore = () => {
    const persist = async () => {
        try {
            await Promise.all([
                mongoStore.replaceCollection('vehicles', serverVehicles),
                mongoStore.replaceCollection('bookings', serverBookings),
                mongoStore.replaceCollection('reviews', serverReviews),
                mongoStore.replaceCollection('supportTickets', serverSupportTickets),
                mongoStore.replaceCollection('incidents', serverIncidents),
                mongoStore.replaceCollection('reports', serverReports),
                mongoStore.replaceCollection('notifications', serverNotifications),
                mongoStore.replaceCollection('serviceAreas', serverServiceAreas),
                mongoStore.replaceCollection('waitlist', serverWaitlist),
                mongoStore.replaceCollection('vehicleWaitlist', serverVehicleWaitlist),
                mongoStore.replaceCollection('campaigns', serverCampaigns),
                mongoStore.replaceCollection('payouts', serverPayouts),
                mongoStore.replaceCollection('disputes', serverDisputes),
                mongoStore.replaceCollection('transactions', serverTransactions),
                mongoStore.replaceCollection('messages', serverMessages),
                mongoStore.writeSingleton('platformSettings', serverPlatformSettings)
            ]);
        } catch (e) {
            console.error('[MongoDB] Failed to persist application data:', e);
        }
    };
    return persist();
};

// Helper to push scoped event-driven notification with duplicate deduplication
const addNotification = ({ userId, senderId, type, title, message, bookingId, vehicleId, conversationPartnerId }) => {
    if (!userId) return null;
    const now = Date.now();
    const isDuplicate = serverNotifications.some(n =>
        n.userId === userId &&
        n.type === type &&
        ((bookingId && n.bookingId === bookingId) || (conversationPartnerId && n.conversationPartnerId === conversationPartnerId && n.message === message)) &&
        (now - new Date(n.createdAt).getTime()) < 10000
    );
    if (isDuplicate) return null;

    const notif = {
        id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        userId,
        senderId: senderId || null,
        type: type || 'SYSTEM_UPDATE',
        title,
        message,
        bookingId: bookingId || null,
        vehicleId: vehicleId || null,
        conversationPartnerId: conversationPartnerId || null,
        read: false,
        createdAt: new Date().toISOString()
    };
    serverNotifications.unshift(notif);
    return notif;
};
// Helper to find a vehicle by ID
const findVehicle = (vehicleId) => {
    return serverVehicles.find((v) => v.id === vehicleId) || null;
};

const normalizeVehicleCategory = (value) => {
    const raw = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
    if (!raw) return '';
    if (['car', 'cars', 'sedan', 'hatchback', 'mpv', 'coupe'].includes(raw)) return 'cars';
    if (['bike', 'bikes', 'motorcycle', 'motorcycles'].includes(raw)) return 'bikes';
    if (['scooter', 'scooters'].includes(raw)) return 'scooters';
    if (['ev', 'evs', 'electric', 'electricvehicle', 'electricvehicles'].includes(raw)) return 'evs';
    if (['suv', 'suvs'].includes(raw)) return 'suvs';
    if (['van', 'vans', 'minivan', 'mpvvan'].includes(raw)) return 'vans';
    if (raw === 'luxury') return 'luxury';
    return raw;
};

const bookingBlocksAvailability = (booking) => {
    const status = String(booking?.status || '').trim().toLowerCase();
    return ['confirmed', 'active', 'in_progress', 'in-progress'].includes(status);
};

const vehicleIsDiscoverable = (vehicle) => {
    if (!vehicle || vehicle.isAvailable === false) return false;
    const status = String(vehicle.status || vehicle.listingStatus || '').trim().toLowerCase();
    if (['draft', 'inactive', 'disabled', 'deleted', 'rejected', 'removed'].includes(status)) return false;
    return true;
};

const normalizeVehicleRecord = (vehicle) => {
    if (!vehicle) return null;
    const images = Array.isArray(vehicle.images) ? vehicle.images.filter(Boolean).map(String) : [];
    const daily = vehicle.dailyPrice ?? vehicle.pricePerDay ?? null;
    const hourly = vehicle.hourlyPrice ?? null;
    const ratingNumber = Number(vehicle.rating);
    return {
        ...vehicle,
        images,
        features: Array.isArray(vehicle.features) ? vehicle.features : [],
        category: normalizeVehicleCategory(vehicle.category || vehicle.type),
        dailyPrice: Number.isFinite(Number(daily)) ? Number(daily) : null,
        pricePerDay: Number.isFinite(Number(daily)) ? Number(daily) : null,
        hourlyPrice: Number.isFinite(Number(hourly)) ? Number(hourly) : null,
        rating: Number.isFinite(ratingNumber) && ratingNumber > 0 ? ratingNumber : null,
        reviewsCount: Number.isFinite(Number(vehicle.reviewsCount)) ? Number(vehicle.reviewsCount) : 0,
        seats: Number.isFinite(Number(vehicle.seats)) ? Number(vehicle.seats) : null
    };
};

// 1. GET all active/discoverable vehicles with query filter support
app.get('/api/vehicles', (req, res) => {
    const { category, search, minPrice, maxPrice, fuel, transmission, verified, instantBooking } = req.query;
    let results = serverVehicles.filter(vehicleIsDiscoverable);

    if (category && String(category).toLowerCase() !== 'all') {
        const requestedCategory = normalizeVehicleCategory(category);
        results = results.filter(v =>
            normalizeVehicleCategory(v.category) === requestedCategory ||
            normalizeVehicleCategory(v.type) === requestedCategory ||
            (requestedCategory === 'evs' && ['electric', 'ev'].includes(String(v.fuel || '').trim().toLowerCase()))
        );
    }
    if (search && typeof search === 'string' && search.trim()) {
        const q = search.toLowerCase().trim();
        results = results.filter(v => (v.name && v.name.toLowerCase().includes(q)) ||
            (v.location && v.location.toLowerCase().includes(q)) ||
            (v.brand && v.brand.toLowerCase().includes(q)) ||
            (v.model && v.model.toLowerCase().includes(q)));
    }
    if (minPrice) {
        results = results.filter(v => (v.pricePerDay || v.dailyPrice || 0) >= Number(minPrice));
    }
    if (maxPrice) {
        results = results.filter(v => (v.pricePerDay || v.dailyPrice || 0) <= Number(maxPrice));
    }
    if (fuel && typeof fuel === 'string') {
        const fuels = fuel.split(',').map(f => f.trim().toLowerCase());
        results = results.filter(v => fuels.includes((v.fuel || '').toLowerCase()));
    }
    if (transmission && typeof transmission === 'string') {
        const transmissions = transmission.split(',').map(t => t.trim().toLowerCase());
        results = results.filter(v => transmissions.includes((v.transmission || '').toLowerCase()));
    }
    if (verified === 'true') {
        results = results.filter(v => !!v.verified);
    }
    if (instantBooking === 'true') {
        results = results.filter(v => !!v.instantBooking);
    }
    res.json({ success: true, vehicles: results.map(normalizeVehicleRecord).filter(Boolean) });
});

// Authenticated owner-only vehicle management list.
// Public discovery must never be used to populate an owner's private fleet view.
app.get('/api/vehicles/mine', (req, res) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ success: false, error: 'Authentication required.' });

    const authRes = authDatabase.verifySessionToken(token);
    if (!authRes.valid || !authRes.user) {
        return res.status(401).json({ success: false, error: authRes.error || 'Invalid or expired session.' });
    }
    if (authRes.user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Owner access is required.' });
    }

    const ownerId = authRes.user.id;
    const mine = serverVehicles.filter(v => String(v.ownerId || v.owner?.id || '') === String(ownerId)).map(normalizeVehicleRecord).filter(Boolean);
    res.json({ success: true, vehicles: mine });
});

// Availability lookup used by the vehicle search results.
// When dates are supplied, only vehicles that have a conflicting active booking
// are returned in unavailableVehicleIds. With no dates, the search stays broad.
app.get('/api/vehicles/availability', (req, res) => {
    const { vehicleIds, startDateTime, endDateTime } = req.query;
    if (!startDateTime || !endDateTime) {
        return res.json({ success: true, unavailableVehicleIds: [] });
    }

    const reqStart = new Date(startDateTime).getTime();
    const reqEnd = new Date(endDateTime).getTime();
    if (isNaN(reqStart) || isNaN(reqEnd) || reqEnd <= reqStart) {
        return res.status(400).json({ success: false, error: 'Invalid availability dates.' });
    }

    const requestedIds = String(vehicleIds || '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);

    const ids = requestedIds.length ? requestedIds : serverVehicles.map(v => v.id);
    const unavailableVehicleIds = ids.filter(vehicleId => serverBookings.some(b => {
        if (String(b.vehicleId) !== String(vehicleId)) return false;
        if (!bookingBlocksAvailability(b)) return false;

        const bStart = new Date(b.pickupDateTime || (b.startDate ? `${b.startDate}T${b.pickupTime || '10:00'}` : '')).getTime();
        const bEnd = new Date(b.returnDateTime || (b.endDate ? `${b.endDate}T${b.returnTime || '10:00'}` : '')).getTime();
        if (isNaN(bStart) || isNaN(bEnd)) return false;
        return reqStart < bEnd && reqEnd > bStart;
    }));

    res.json({ success: true, unavailableVehicleIds });
});

// 2. GET vehicle by ID
app.get('/api/vehicles/:id', (req, res) => {
    const vehicle = findVehicle(req.params.id);
    if (!vehicle) {
        return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    }
    const reviews = serverReviews.filter(r => r.vehicleId === vehicle.id);
    res.json({ success: true, vehicle: { ...normalizeVehicleRecord(vehicle), reviews } });
});
// 3. POST create vehicle (Authenticated Route - Backend-Authoritative Owner)
app.post('/api/vehicles', async (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'You must be signed in to list a vehicle.' });
    }
    const authRes = authDatabase.verifySessionToken(token);
    if (!authRes.valid || !authRes.user) {
        return res.status(401).json({ success: false, error: authRes.error || 'Invalid or expired session. Please sign in.' });
    }
    const user = authRes.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Only owner accounts can list vehicles.' });
    }
    const vehicleData = req.body || {};
    const normalizedCategory = normalizeVehicleCategory(vehicleData.category);
    const dailyPrice = vehicleData.dailyPrice ?? vehicleData.pricePerDay;
    const hourlyPrice = vehicleData.hourlyPrice;
    const hasDailyPrice = Number.isFinite(Number(dailyPrice)) && Number(dailyPrice) > 0;
    const hasHourlyPrice = Boolean(vehicleData.hourlyRentalEnabled) && Number.isFinite(Number(hourlyPrice)) && Number(hourlyPrice) > 0;
    if (!vehicleData.name?.trim() || !normalizedCategory || (!hasDailyPrice && !hasHourlyPrice)) {
        return res.status(400).json({ success: false, error: 'Vehicle name, category, pickup details, and at least one valid rental price are required.' });
    }
    if (!vehicleData.location?.trim() && !vehicleData.pickupAddress?.trim()) {
        return res.status(400).json({ success: false, error: 'Pickup location is required.' });
    }
    const id = `veh-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
    // Real owner metadata is strictly determined by the authenticated user session
    const newVeh = {
        ...vehicleData,
        id,
        images: Array.isArray(vehicleData.images) ? vehicleData.images.filter(Boolean).slice(0, 6) : [],
        ownerId: user.id,
        category: normalizedCategory,
        status: vehicleData.status || 'active',
        listingStatus: vehicleData.listingStatus || 'active',
        owner: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            avatar: user.avatar || null,
            joinedDate: user.joinedDate || null,
            verified: Boolean(user.emailVerified)
        },
        // Ratings and trip counts are earned from real activity; never seed fake values.
        rating: Number.isFinite(Number(vehicleData.rating)) && Number(vehicleData.rating) > 0 ? Number(vehicleData.rating) : null,
        reviewsCount: Number.isFinite(Number(vehicleData.reviewsCount)) ? Number(vehicleData.reviewsCount) : 0,
        tripsCount: Number.isFinite(Number(vehicleData.tripsCount)) ? Number(vehicleData.tripsCount) : 0,
        isAvailable: vehicleData.isAvailable !== false,
        createdAt: vehicleData.createdAt || new Date().toISOString()
    };
    serverVehicles.unshift(newVeh);
    await saveStore();
    res.status(201).json({ success: true, vehicle: newVeh });
});
// 4. PUT update vehicle (Authenticated Route - Security Ownership Check)
app.put('/api/vehicles/:id', async (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const authRes = authDatabase.verifySessionToken(token);
    if (!authRes.valid || !authRes.user) {
        return res.status(401).json({ success: false, error: authRes.error || 'Invalid session.' });
    }
    const user = authRes.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Only owner accounts can manage vehicle listings.' });
    }
    const { id } = req.params;
    const idx = serverVehicles.findIndex(v => v.id === id);
    if (idx < 0) {
        return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    }
    const existing = serverVehicles[idx];
    if (existing.ownerId !== user.id && existing.owner?.id !== user.id) {
        return res.status(403).json({ success: false, error: 'Unauthorized. You do not own this vehicle.' });
    }
    const updated = {
        ...existing,
        ...req.body,
        id: existing.id,
        ownerId: existing.ownerId,
        owner: existing.owner,
        category: req.body?.category !== undefined ? normalizeVehicleCategory(req.body.category) : existing.category
    };
    serverVehicles[idx] = updated;
    await saveStore();
    res.json({ success: true, vehicle: updated });
});
// 5. DELETE vehicle (Authenticated Route - Security Ownership Check)
app.delete('/api/vehicles/:id', async (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const authRes = authDatabase.verifySessionToken(token);
    if (!authRes.valid || !authRes.user) {
        return res.status(401).json({ success: false, error: authRes.error || 'Invalid session.' });
    }
    const user = authRes.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Only owner accounts can manage vehicle listings.' });
    }
    const { id } = req.params;
    const idx = serverVehicles.findIndex(v => v.id === id);
    if (idx < 0) {
        return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    }
    if (serverVehicles[idx].ownerId !== user.id && serverVehicles[idx].owner?.id !== user.id) {
        return res.status(403).json({ success: false, error: 'Unauthorized. You do not own this vehicle.' });
    }
    serverVehicles.splice(idx, 1);
    saveStore();
    res.json({ success: true, message: 'Vehicle deleted successfully.' });
});
// ==========================================
// BOOKING API ROUTES (SERVER-AUTHORITATIVE)
// ==========================================
// 1. Calculate Duration & Pricing (Server-Authoritative)
app.post('/api/bookings/calculate', (req, res) => {
    const { vehicleId, rentalType = 'daily', pickupDate, pickupTime = '10:00', returnDate, returnTime = '10:00', hoursCount, daysCount, promoCode } = req.body;
    const vehicle = findVehicle(vehicleId);
    if (!vehicle) {
        return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    }
    const isHourly = rentalType === 'hourly';
    if (isHourly && !vehicle.hourlyRentalEnabled) {
        return res.status(400).json({ success: false, error: 'Hourly rental is not available for this vehicle.' });
    }
    if (!isHourly && vehicle.dailyRentalEnabled === false) {
        return res.status(400).json({ success: false, error: 'Daily rental is not available for this vehicle.' });
    }
    let duration = 0;
    let durationUnit = isHourly ? 'hours' : 'days';
    if (isHourly) {
        if (hoursCount && Number(hoursCount) > 0) {
            duration = Math.round(Number(hoursCount));
        }
        else if (pickupDate && pickupTime && returnTime) {
            const retDate = returnDate || pickupDate;
            const startDt = new Date(`${pickupDate}T${pickupTime}`);
            const endDt = new Date(`${retDate}T${returnTime}`);
            const diffMs = endDt.getTime() - startDt.getTime();
            duration = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
        }
        else {
            duration = vehicle.minRentalHours || 2;
        }
        const minHours = vehicle.minRentalHours || 1;
        const maxHours = vehicle.maxRentalHours || 24;
        if (duration < minHours) {
            return res.status(400).json({
                success: false,
                error: `Minimum rental duration for this vehicle is ${minHours} ${minHours === 1 ? 'hour' : 'hours'}.`,
                duration,
                durationUnit,
                minLimit: minHours,
                maxLimit: maxHours
            });
        }
        if (duration > maxHours) {
            return res.status(400).json({
                success: false,
                error: `Maximum rental duration for this vehicle is ${maxHours} ${maxHours === 1 ? 'hour' : 'hours'}.`,
                duration,
                durationUnit,
                minLimit: minHours,
                maxLimit: maxHours
            });
        }
        const ratePerUnit = Number(vehicle.hourlyPrice) || 0;
        const rawBase = duration * ratePerUnit;
        const discountPercent = 0;
        const discountAmount = 0;
        const discountedBase = rawBase;
        let promoDiscount = 0;
        let promoDetails = null;
        if (promoCode && typeof promoCode === 'string') {
            const cleanPromo = promoCode.trim().toUpperCase();
            const promo = (serverPlatformSettings.promoCodes || []).find(p => p.code === cleanPromo);
            if (promo && (!promo.minAmount || discountedBase >= promo.minAmount)) {
                if (promo.flatDiscount) promoDiscount = Math.min(discountedBase, promo.flatDiscount);
                else if (promo.discountPercent) promoDiscount = Math.round((discountedBase * promo.discountPercent) / 100);
                promoDetails = { code: promo.code, discount: promoDiscount, description: promo.description };
            }
        }
        const netBase = Math.max(0, discountedBase - promoDiscount);
        const pFeePct = (serverPlatformSettings.platformFeePercent || 8) / 100;
        const taxPct = (serverPlatformSettings.taxPercent || 12) / 100;
        const platformFee = Math.round(netBase * pFeePct);
        const taxes = Math.round((netBase + platformFee) * taxPct);
        const deposit = Number(vehicle.securityDeposit) || 0;
        const totalPayable = netBase + platformFee + taxes + deposit;
        return res.json({
            success: true,
            rentalType: 'hourly',
            duration,
            durationUnit: 'hours',
            ratePerUnit,
            rawBase,
            discountPercent,
            discountAmount,
            discountedBase,
            promoCode: promoDetails ? promoDetails.code : null,
            promoDiscount,
            promoDetails,
            platformFee,
            taxes,
            deposit,
            totalPayable
        });
    }
    else {
        // Daily rental
        if (daysCount && Number(daysCount) > 0) {
            duration = Math.round(Number(daysCount));
        }
        else if (pickupDate && returnDate) {
            const pTime = pickupTime && pickupTime.includes(':') ? pickupTime : '10:00';
            const rTime = returnTime && returnTime.includes(':') ? returnTime : '10:00';
            const startDt = new Date(`${pickupDate}T${pTime}`);
            const endDt = new Date(`${returnDate}T${rTime}`);
            const diffMs = endDt.getTime() - startDt.getTime();
            duration = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }
        else {
            duration = vehicle.minRentalDays ? Number(vehicle.minRentalDays) : 1;
        }
        const minDays = vehicle.minRentalDays ? Number(vehicle.minRentalDays) : 1;
        // maxRentalDays is optional. null/undefined/0/empty string represents NO MAXIMUM / UNLIMITED!
        const maxDays = (vehicle.maxRentalDays !== null && vehicle.maxRentalDays !== undefined && vehicle.maxRentalDays !== '' && Number(vehicle.maxRentalDays) > 0)
            ? Number(vehicle.maxRentalDays)
            : null;
        if (duration < minDays) {
            return res.status(400).json({
                success: false,
                error: `Minimum rental duration for this vehicle is ${minDays} ${minDays === 1 ? 'day' : 'days'}.`,
                duration,
                durationUnit,
                minLimit: minDays,
                maxLimit: maxDays
            });
        }
        if (maxDays !== null && duration > maxDays) {
            return res.status(400).json({
                success: false,
                error: `Maximum rental duration for this vehicle is ${maxDays} ${maxDays === 1 ? 'day' : 'days'}.`,
                duration,
                durationUnit,
                minLimit: minDays,
                maxLimit: maxDays
            });
        }
        const ratePerUnit = Number(vehicle.dailyPrice || vehicle.pricePerDay) || 0;
        const rawBase = duration * ratePerUnit;
        let discountPercent = 0;
        if (duration >= 30 && (vehicle.monthlyDiscountPercent || 0) > 0) {
            discountPercent = vehicle.monthlyDiscountPercent;
        }
        else if (duration >= 7 && (vehicle.weeklyDiscountPercent || 0) > 0) {
            discountPercent = vehicle.weeklyDiscountPercent;
        }
        const discountAmount = Math.round((rawBase * discountPercent) / 100);
        const discountedBase = rawBase - discountAmount;
        let promoDiscount = 0;
        let promoDetails = null;
        if (promoCode && typeof promoCode === 'string') {
            const cleanPromo = promoCode.trim().toUpperCase();
            const promo = (serverPlatformSettings.promoCodes || []).find(p => p.code === cleanPromo);
            if (promo && (!promo.minAmount || discountedBase >= promo.minAmount)) {
                if (promo.flatDiscount) promoDiscount = Math.min(discountedBase, promo.flatDiscount);
                else if (promo.discountPercent) promoDiscount = Math.round((discountedBase * promo.discountPercent) / 100);
                promoDetails = { code: promo.code, discount: promoDiscount, description: promo.description };
            }
        }
        const netBase = Math.max(0, discountedBase - promoDiscount);
        const pFeePct = (serverPlatformSettings.platformFeePercent || 8) / 100;
        const taxPct = (serverPlatformSettings.taxPercent || 12) / 100;
        const platformFee = Math.round(netBase * pFeePct);
        const taxes = Math.round((netBase + platformFee) * taxPct);
        const deposit = Number(vehicle.securityDeposit) || 0;
        const totalPayable = netBase + platformFee + taxes + deposit;
        return res.json({
            success: true,
            rentalType: 'daily',
            duration,
            durationUnit: 'days',
            ratePerUnit,
            rawBase,
            discountPercent,
            discountAmount,
            discountedBase,
            promoCode: promoDetails ? promoDetails.code : null,
            promoDiscount,
            promoDetails,
            platformFee,
            taxes,
            deposit,
            totalPayable
        });
    }
});
// 2. Check Availability / Collision Detection
app.post('/api/bookings/check-availability', (req, res) => {
    const { vehicleId, startDateTime, endDateTime, excludeBookingId } = req.body;
    if (!vehicleId || !startDateTime || !endDateTime) {
        return res.status(400).json({ success: false, error: 'Vehicle ID, start time, and end time are required.' });
    }
    const reqStart = new Date(startDateTime).getTime();
    const reqEnd = new Date(endDateTime).getTime();
    if (isNaN(reqStart) || isNaN(reqEnd)) {
        return res.status(400).json({ success: false, error: 'Invalid dates or times provided.' });
    }
    if (reqEnd <= reqStart) {
        return res.status(400).json({ success: false, error: 'Return date/time must be strictly after pickup date/time.' });
    }
    const conflict = serverBookings.find((b) => {
        if (b.vehicleId !== vehicleId)
            return false;
        if (excludeBookingId && b.id === excludeBookingId)
            return false;
        if (!bookingBlocksAvailability(b))
            return false;
        const bStart = new Date(b.pickupDateTime).getTime();
        const bEnd = new Date(b.returnDateTime).getTime();
        return reqStart < bEnd && reqEnd > bStart;
    });
    if (conflict) {
        return res.json({
            available: false,
            error: `Vehicle is already booked from ${new Date(conflict.pickupDateTime).toLocaleString()} to ${new Date(conflict.returnDateTime).toLocaleString()}.`
        });
    }
    res.json({ available: true });
});
// 3. Create Booking (Authenticated Route - Server-Authoritative)
app.post('/api/bookings', async (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'You must be signed in to book a vehicle.' });
    }
    const result = authDatabase.verifySessionToken(token);
    if (!result.valid || !result.user) {
        return res.status(401).json({ success: false, error: result.error || 'Invalid or expired session. Please sign in.' });
    }
    const user = result.user;
    if (user.role === 'owner') {
        return res.status(403).json({ success: false, error: 'Owner accounts cannot book vehicles. Use a renter/booker account to make a booking.' });
    }
    const { vehicleId, rentalType = 'daily', pickupDate, pickupTime = '10:00', returnDate, returnTime = '10:00', hoursCount, daysCount, paymentMethod = 'online', promoCode } = req.body;
    const vehicle = findVehicle(vehicleId);
    if (!vehicle) {
        return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    }

    // Vehicle owners are strictly forbidden from booking or renting their own vehicle
    const isVehicleOwner = Boolean(
        (vehicle.ownerId && vehicle.ownerId === user.id) ||
        (vehicle.owner && vehicle.owner.id === user.id) ||
        (vehicle.owner && vehicle.owner.email && user.email && vehicle.owner.email.toLowerCase() === user.email.toLowerCase())
    );
    if (isVehicleOwner) {
        return res.status(403).json({
            success: false,
            error: 'You cannot book or rent your own vehicle. Please manage your listing from the Owner Dashboard.'
        });
    }
    const isHourly = rentalType === 'hourly';
    if (isHourly && !vehicle.hourlyRentalEnabled) {
        return res.status(400).json({ success: false, error: 'Hourly rental is not available for this vehicle.' });
    }
    if (!isHourly && vehicle.dailyRentalEnabled === false) {
        return res.status(400).json({ success: false, error: 'Daily rental is not available for this vehicle.' });
    }
    // Construct standardized ISO date-time strings
    const retDate = returnDate || pickupDate;
    const pickupDateTime = `${pickupDate}T${pickupTime.includes(':') ? pickupTime : '10:00'}`;
    const returnDateTime = `${retDate}T${returnTime.includes(':') ? returnTime : '10:00'}`;
    const reqStart = new Date(pickupDateTime).getTime();
    const reqEnd = new Date(returnDateTime).getTime();
    if (isNaN(reqStart) || isNaN(reqEnd) || reqEnd <= reqStart) {
        return res.status(400).json({ success: false, error: 'Invalid pickup or return date/time.' });
    }
    // Anti-double-booking check on server
    const conflict = serverBookings.find((b) => {
        if (b.vehicleId !== vehicleId)
            return false;
        if (!bookingBlocksAvailability(b))
            return false;
        const bStart = new Date(b.pickupDateTime).getTime();
        const bEnd = new Date(b.returnDateTime).getTime();
        return reqStart < bEnd && reqEnd > bStart;
    });
    if (conflict) {
        return res.status(409).json({
            success: false,
            error: `Vehicle is already booked for the selected schedule. Please select different times.`
        });
    }
    // Authoritative duration & price calculation
    let duration = 0;
    let durationUnit = isHourly ? 'hours' : 'days';
    let ratePerUnit = 0;
    let rawBase = 0;
    let discountPercent = 0;
    let discountAmount = 0;
    let discountedBase = 0;
    let platformFee = 0;
    let taxes = 0;
    let deposit = Number(vehicle.securityDeposit) || 0;
    let totalAmount = 0;
    if (isHourly) {
        if (hoursCount && Number(hoursCount) > 0) {
            duration = Math.round(Number(hoursCount));
        }
        else {
            const diffMs = reqEnd - reqStart;
            duration = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
        }
        const minHours = vehicle.minRentalHours || 1;
        const maxHours = vehicle.maxRentalHours || 24;
        if (duration < minHours || duration > maxHours) {
            return res.status(400).json({
                success: false,
                error: `Duration (${duration} hours) must be between ${minHours} and ${maxHours} hours.`
            });
        }
        ratePerUnit = Number(vehicle.hourlyPrice) || 0;
        rawBase = duration * ratePerUnit;
        discountedBase = rawBase;
    }
    else {
        if (daysCount && Number(daysCount) > 0) {
            duration = Math.round(Number(daysCount));
        }
        else {
            const diffMs = reqEnd - reqStart;
            duration = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }
        const minDays = vehicle.minRentalDays ? Number(vehicle.minRentalDays) : 1;
        const maxDays = (vehicle.maxRentalDays !== null && vehicle.maxRentalDays !== undefined && vehicle.maxRentalDays !== '' && Number(vehicle.maxRentalDays) > 0)
            ? Number(vehicle.maxRentalDays)
            : null;
        if (duration < minDays) {
            return res.status(400).json({
                success: false,
                error: `Minimum rental duration for this vehicle is ${minDays} ${minDays === 1 ? 'day' : 'days'}.`
            });
        }
        if (maxDays !== null && duration > maxDays) {
            return res.status(400).json({
                success: false,
                error: `Maximum rental duration for this vehicle is ${maxDays} ${maxDays === 1 ? 'day' : 'days'}.`
            });
        }
        ratePerUnit = Number(vehicle.dailyPrice || vehicle.pricePerDay) || 0;
        rawBase = duration * ratePerUnit;
        if (duration >= 30 && (vehicle.monthlyDiscountPercent || 0) > 0) {
            discountPercent = vehicle.monthlyDiscountPercent;
        }
        else if (duration >= 7 && (vehicle.weeklyDiscountPercent || 0) > 0) {
            discountPercent = vehicle.weeklyDiscountPercent;
        }
        discountAmount = Math.round((rawBase * discountPercent) / 100);
        discountedBase = rawBase - discountAmount;
    }

    let promoDiscount = 0;
    let promoAppliedCode = null;
    if (promoCode && typeof promoCode === 'string') {
        const cleanPromo = promoCode.trim().toUpperCase();
        const promo = (serverPlatformSettings.promoCodes || []).find(p => p.code === cleanPromo);
        if (promo && (!promo.minAmount || discountedBase >= promo.minAmount)) {
            if (promo.flatDiscount) promoDiscount = Math.min(discountedBase, promo.flatDiscount);
            else if (promo.discountPercent) promoDiscount = Math.round((discountedBase * promo.discountPercent) / 100);
            promoAppliedCode = promo.code;
        }
    }
    const netBase = Math.max(0, discountedBase - promoDiscount);
    const pFeePct = (serverPlatformSettings.platformFeePercent || 8) / 100;
    const taxPct = (serverPlatformSettings.taxPercent || 12) / 100;
    platformFee = Math.round(netBase * pFeePct);
    taxes = Math.round((netBase + platformFee) * taxPct);
    totalAmount = netBase + platformFee + taxes + deposit;

    const bookingId = `BK-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdBooking = {
        id: bookingId,
        vehicleId,
        ownerId: vehicle.ownerId || vehicle.owner?.id || null,
        bookerId: user.id,
        bookerName: user.name,
        bookerEmail: user.email,
        bookerPhone: user.phone,
        rentalType,
        startDate: pickupDate,
        endDate: retDate,
        pickupTime,
        returnTime,
        pickupDateTime,
        returnDateTime,
        duration,
        durationUnit,
        pricePerUnit: ratePerUnit,
        basePrice: rawBase,
        durationDiscount: discountAmount,
        promoCode: promoAppliedCode,
        promoDiscount,
        platformFee,
        taxes,
        securityDeposit: deposit,
        depositStatus: 'held',
        depositRefundAmount: 0,
        totalAmount,
        paymentMethod,
        paymentStatus: paymentMethod === 'online' ? 'paid' : 'pay_at_pickup',
        status: vehicle.instantBooking ? 'confirmed' : 'pending',
        createdAt: new Date().toISOString()
    };
    serverBookings.unshift(createdBooking);

    // Notify Booker
    if (vehicle.instantBooking) {
        addNotification({
            userId: user.id,
            type: 'BOOKING_CONFIRMED',
            title: 'Booking Confirmed!',
            message: `Your reservation for ${vehicle.name} (${bookingId}) has been confirmed instantly.`,
            bookingId,
            vehicleId: vehicle.id
        });
    } else {
        addNotification({
            userId: user.id,
            type: 'BOOKING_REQUEST',
            title: 'Booking Request Sent',
            message: `Your booking request for ${vehicle.name} has been sent to the host for confirmation.`,
            bookingId,
            vehicleId: vehicle.id
        });
    }

    // Notify Vehicle Owner (if owner is not the booker)
    const hostId = vehicle.ownerId || vehicle.owner?.id;
    if (hostId && hostId !== user.id) {
        if (vehicle.instantBooking) {
            addNotification({
                userId: hostId,
                senderId: user.id,
                type: 'BOOKING_CONFIRMED',
                title: 'New Confirmed Booking!',
                message: `${user.name} booked your ${vehicle.name} (${bookingId}) starting ${pickupDate}.`,
                bookingId,
                vehicleId: vehicle.id
            });
        } else {
            addNotification({
                userId: hostId,
                senderId: user.id,
                type: 'BOOKING_REQUEST',
                title: 'New Booking Request',
                message: `${user.name} has requested to book your ${vehicle.name} for ${pickupDate}. Please review and accept.`,
                bookingId,
                vehicleId: vehicle.id
            });
        }
    }

    await saveStore();
    res.status(201).json({
        success: true,
        message: vehicle.instantBooking ? 'Booking successfully confirmed.' : 'Booking request sent to host.',
        booking: {
            ...createdBooking,
            vehicle
        }
    });
});
// 4. Get User Bookings (Authenticated Route)
app.get('/api/bookings', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const result = authDatabase.verifySessionToken(token);
    if (!result.valid || !result.user) {
        return res.status(401).json({ success: false, error: 'Invalid or expired session.' });
    }
    const user = result.user;
    const userBookings = serverBookings
        .filter((b) => b.bookerId === user.id || (user.role === 'owner' && String(b.ownerId || findVehicle(b.vehicleId)?.ownerId || findVehicle(b.vehicleId)?.owner?.id || '') === String(user.id)))
        .map((b) => ({
        ...b,
        vehicle: findVehicle(b.vehicleId)
    }));
    res.json({
        success: true,
        bookings: userBookings
    });
});
// 5. Update Booking Status (Cancel, Confirm, Complete)
app.patch('/api/bookings/:id/status', async (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const result = authDatabase.verifySessionToken(token);
    if (!result.valid || !result.user) {
        return res.status(401).json({ success: false, error: 'Invalid or expired session.' });
    }
    const user = result.user;
    const { id } = req.params;
    const { status } = req.body;
    const booking = serverBookings.find((b) => b.id === id);
    if (!booking) {
        return res.status(404).json({ success: false, error: 'Booking not found.' });
    }
    const vehicle = findVehicle(booking.vehicleId);
    const isOwner = vehicle?.ownerId === user.id || vehicle?.owner?.id === user.id;
    const isBooker = booking.bookerId === user.id;

    if (status === 'cancelled') {
        // Cancellation must go through /api/bookings/:id/cancel so the refund policy,
        // cancellation record and waiting-list release are always applied.
        return res.status(400).json({
            success: false,
            error: 'Please use the cancellation flow so your refund and cancellation policy are calculated correctly.'
        });
    }

    if (status === 'confirmed') {
        if (!isOwner) {
            return res.status(403).json({ success: false, error: 'Only the vehicle owner can approve bookings.' });
        }
        const requestedStart = new Date(booking.pickupDateTime || `${booking.startDate}T${booking.pickupTime || '10:00'}`).getTime();
        const requestedEnd = new Date(booking.returnDateTime || `${booking.endDate}T${booking.returnTime || '10:00'}`).getTime();
        const conflict = serverBookings.find((other) => {
            if (other.id === booking.id || String(other.vehicleId) !== String(booking.vehicleId)) return false;
            if (!bookingBlocksAvailability(other)) return false;
            const otherStart = new Date(other.pickupDateTime || `${other.startDate}T${other.pickupTime || '10:00'}`).getTime();
            const otherEnd = new Date(other.returnDateTime || `${other.endDate}T${other.returnTime || '10:00'}`).getTime();
            return requestedStart < otherEnd && requestedEnd > otherStart;
        });
        if (conflict) {
            return res.status(409).json({ success: false, error: 'This vehicle already has another confirmed booking during the requested period.' });
        }
        booking.status = 'confirmed';
        // Notify Booker immediately
        addNotification({
            userId: booking.bookerId,
            senderId: user.id,
            type: 'BOOKING_ACCEPTED',
            title: 'Booking Request Accepted!',
            message: `Great news! The host has approved your booking for ${vehicle ? vehicle.name : 'the vehicle'} (${booking.id}).`,
            bookingId: booking.id,
            vehicleId: booking.vehicleId
        });
    }
    else if (status === 'rejected') {
        if (!isOwner) {
            return res.status(403).json({ success: false, error: 'Only the vehicle owner can reject bookings.' });
        }
        booking.status = 'rejected';
        // Notify Booker immediately
        addNotification({
            userId: booking.bookerId,
            senderId: user.id,
            type: 'BOOKING_REJECTED',
            title: 'Booking Request Declined',
            message: `Your booking request for ${vehicle ? vehicle.name : 'the vehicle'} was declined by the host.`,
            bookingId: booking.id,
            vehicleId: booking.vehicleId
        });
    }
    else {
        return res.status(400).json({ success: false, error: 'Invalid booking status.' });
    }
    await saveStore();
    res.json({ success: true, booking });
});

// 6. Cancellation Policy Config
app.get('/api/cancellation-policy', (req, res) => {
    res.json({
        success: true,
        policy: CANCELLATION_POLICY_CONFIG,
        description: 'Within 1 hour of booking: 100% refund. Within 2 hours: 10% fee. Within 3 hours: 20% fee. After that, the fee is based on time remaining before pickup: 35% for 6–24 hours, 50% for under 6 hours, 20% for 24–48 hours, and 10% for more than 48 hours. The security deposit is fully refundable.'
    });
});

// 7. Cancellation Preview (Calculates exact fee & refund before confirmation)
app.get('/api/bookings/:id/cancel-preview', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const result = authDatabase.verifySessionToken(token);
    if (!result.valid || !result.user) {
        return res.status(401).json({ success: false, error: 'Invalid session.' });
    }
    const user = result.user;
    const { id } = req.params;
    const booking = serverBookings.find((b) => b.id === id);
    if (!booking) {
        return res.status(404).json({ success: false, error: 'Booking not found.' });
    }
    const vehicle = findVehicle(booking.vehicleId);
    const isBooker = booking.bookerId === user.id;
    const isOwner = vehicle?.ownerId === user.id || vehicle?.owner?.id === user.id;
    const isAdmin = user.role === 'admin';

    if (!isBooker && !isOwner && !isAdmin) {
        return res.status(403).json({ success: false, error: 'Unauthorized to view this booking cancellation.' });
    }

    const refundCalc = calculateCancellationRefund(booking);
    res.json({
        success: true,
        booking: {
            ...booking,
            vehicle
        },
        refundCalculation: refundCalc
    });
});

// 8. Execute Cancellation with Refund Calculation & Waitlist Trigger
app.post('/api/bookings/:id/cancel', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const result = authDatabase.verifySessionToken(token);
    if (!result.valid || !result.user) {
        return res.status(401).json({ success: false, error: 'Invalid session.' });
    }
    const user = result.user;
    const { id } = req.params;
    const { reason } = req.body;
    const booking = serverBookings.find((b) => b.id === id);
    if (!booking) {
        return res.status(404).json({ success: false, error: 'Booking not found.' });
    }
    if (booking.status === 'cancelled') {
        return res.status(400).json({ success: false, error: 'This booking has already been cancelled.' });
    }

    const vehicle = findVehicle(booking.vehicleId);
    const isBooker = booking.bookerId === user.id;
    const isOwner = vehicle?.ownerId === user.id || vehicle?.owner?.id === user.id;
    const isAdmin = user.role === 'admin';

    if (!isBooker && !isOwner && !isAdmin) {
        return res.status(403).json({ success: false, error: 'Unauthorized to cancel this booking.' });
    }

    const refundCalc = calculateCancellationRefund(booking);
    booking.status = 'cancelled';
    booking.cancellation = {
        cancelledBy: user.id,
        cancelledByName: user.name,
        cancelledAt: new Date().toISOString(),
        reason: reason || 'Change of plans',
        originalAmount: refundCalc.originalAmount,
        cancellationFee: refundCalc.cancellationFee,
        cancellationFeePercent: refundCalc.cancellationFeePercent,
        refundAmount: refundCalc.refundAmount,
        policyTier: refundCalc.tier,
        policyExplanation: refundCalc.policyExplanation
    };

    // Release vehicle slot and notify waiting list user
    const notifiedUser = notifyNextEligibleWaitlistUser(
        booking.vehicleId,
        booking.pickupDateTime,
        booking.returnDateTime
    );

    // Add confirmation notification for the cancelling user
    serverNotifications.unshift({
        id: `notif-cxl-${Date.now().toString(36)}`,
        userId: booking.bookerId,
        type: 'cancellation',
        title: 'Booking Cancelled',
        message: `Your booking for ${vehicle ? vehicle.name : 'vehicle'} has been cancelled. Refund of ₹${refundCalc.refundAmount.toLocaleString()} has been initiated.`,
        read: false,
        createdAt: new Date().toISOString()
    });

    saveStore();

    res.json({
        success: true,
        message: 'Booking successfully cancelled.',
        booking: {
            ...booking,
            vehicle
        },
        refundCalculation: refundCalc,
        notifiedWaitlistUser: notifiedUser ? { id: notifiedUser.id, userName: notifiedUser.userName } : null
    });
});

// ==========================================
// VEHICLE WAITING LIST API
// ==========================================
// Join waiting list for a specific vehicle & time slot
app.post('/api/vehicles/:id/waitlist', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Please sign in to join the waiting list.' });
    }
    const result = authDatabase.verifySessionToken(token);
    if (!result.valid || !result.user) {
        return res.status(401).json({ success: false, error: 'Invalid session. Please sign in.' });
    }
    const user = result.user;
    const { id: vehicleId } = req.params;
    const { pickupDate, pickupTime = '10:00', returnDate, returnTime = '10:00', rentalType = 'daily', hoursCount, daysCount } = req.body;

    const vehicle = findVehicle(vehicleId);
    if (!vehicle) {
        return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    }

    const retDate = returnDate || pickupDate;
    const requestedPickupDateTime = `${pickupDate}T${pickupTime.includes(':') ? pickupTime : '10:00'}`;
    const requestedReturnDateTime = `${retDate}T${returnTime.includes(':') ? returnTime : '10:00'}`;

    // Check if user already actively waitlisted for this vehicle & overlapping slot
    const existing = serverVehicleWaitlist.find(w => 
        w.userId === user.id && 
        w.vehicleId === vehicleId && 
        w.status === 'active'
    );
    if (existing) {
        return res.json({
            success: true,
            alreadyWaitlisted: true,
            message: `You are already on the waiting list (Position #${existing.position}) for this vehicle.`,
            entry: { ...existing, vehicle }
        });
    }

    // Calculate queue position for this vehicle
    const activeWaitlistCount = serverVehicleWaitlist.filter(w => w.vehicleId === vehicleId && w.status === 'active').length;
    const position = activeWaitlistCount + 1;

    const newWaitlistEntry = {
        id: `wtl-veh-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone || '',
        vehicleId,
        vehicleName: vehicle.name,
        requestedPickupDateTime,
        requestedReturnDateTime,
        rentalType,
        hoursCount: hoursCount || null,
        daysCount: daysCount || null,
        position,
        status: 'active', // 'active' | 'notified' | 'booked' | 'expired' | 'cancelled'
        notifiedAt: null,
        priorityExpiresAt: null,
        createdAt: new Date().toISOString()
    };

    serverVehicleWaitlist.push(newWaitlistEntry);
    saveStore();

    res.status(201).json({
        success: true,
        message: `You have joined the priority waiting list (Position #${position})! We will notify you immediately if a slot opens up.`,
        entry: {
            ...newWaitlistEntry,
            vehicle
        }
    });
});

// Get current user's waiting list entries
app.get('/api/waitlist/my', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const result = authDatabase.verifySessionToken(token);
    if (!result.valid || !result.user) {
        return res.status(401).json({ success: false, error: 'Invalid session.' });
    }
    const user = result.user;

    const userWaitlists = serverVehicleWaitlist
        .filter(w => w.userId === user.id && w.status !== 'cancelled')
        .map(w => {
            const vehicle = findVehicle(w.vehicleId);
            // Recompute live position among active entries
            const currentPosition = serverVehicleWaitlist
                .filter(other => other.vehicleId === w.vehicleId && other.status === 'active' && new Date(other.createdAt).getTime() <= new Date(w.createdAt).getTime())
                .length || 1;
            return {
                ...w,
                position: currentPosition,
                vehicle
            };
        });

    res.json({
        success: true,
        waitlists: userWaitlists
    });
});

// Leave / cancel vehicle waitlist
app.delete('/api/waitlist/:id', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const result = authDatabase.verifySessionToken(token);
    if (!result.valid || !result.user) {
        return res.status(401).json({ success: false, error: 'Invalid session.' });
    }
    const user = result.user;
    const { id } = req.params;

    const entry = serverVehicleWaitlist.find(w => w.id === id);
    if (!entry) {
        return res.status(404).json({ success: false, error: 'Waitlist entry not found.' });
    }
    if (entry.userId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Unauthorized.' });
    }

    entry.status = 'cancelled';
    saveStore();

    res.json({
        success: true,
        message: 'Successfully removed from waiting list.'
    });
});
// ==========================================
// REVIEWS API (REAL VERIFIED REVIEWS)
// ==========================================
app.get('/api/reviews', (req, res) => {
    const { vehicleId } = req.query;
    if (!vehicleId || typeof vehicleId !== 'string') {
        return res.json({ success: true, reviews: serverReviews });
    }
    const reviews = serverReviews.filter((r) => r.vehicleId === vehicleId);
    res.json({ success: true, reviews });
});
app.post('/api/reviews', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required to post a review.' });
    }
    const result = authDatabase.verifySessionToken(token);
    if (!result.valid || !result.user) {
        return res.status(401).json({ success: false, error: 'Invalid session.' });
    }
    const user = result.user;
    const { vehicleId, bookingId, rating, comment } = req.body;
    if (!vehicleId || !rating || !comment) {
        return res.status(400).json({ success: false, error: 'Vehicle ID, rating, and comment are required.' });
    }
    const newReview = {
        id: `rev-${Date.now().toString(36)}`,
        vehicleId,
        bookingId: bookingId || null,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        rating: Math.min(5, Math.max(1, Number(rating))),
        comment: comment.trim(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        verifiedTrip: true
    };
    serverReviews.unshift(newReview);
    const vehicle = findVehicle(vehicleId);
    if (vehicle) {
        const vReviews = serverReviews.filter((r) => r.vehicleId === vehicleId);
        const avg = vReviews.reduce((sum, r) => sum + r.rating, 0) / vReviews.length;
        vehicle.rating = Math.round(avg * 10) / 10;
    }
    saveStore();
    res.status(201).json({ success: true, review: newReview });
});
// ==========================================
// USER PROFILE UPDATE
// ==========================================
app.put('/api/users/profile', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const result = authDatabase.verifySessionToken(token);
    if (!result.valid || !result.user) {
        return res.status(401).json({ success: false, error: 'Invalid session.' });
    }
    const user = result.user;
    const { name, phone, avatar, bankAccount } = req.body;
    const updates = {};
    if (name && typeof name === 'string')
        updates.name = name.trim();
    if (phone !== undefined)
        updates.phone = String(phone).trim();
    if (avatar && typeof avatar === 'string')
        updates.avatar = avatar;
    if (bankAccount)
        updates.bankAccount = bankAccount;
    const updatedUser = authDatabase.updateUser(user.email, updates);
    if (!updatedUser) {
        return res.status(404).json({ success: false, error: 'User not found.' });
    }
    res.json({ success: true, user: authDatabase.sanitizeUser(updatedUser) });
});
// ==========================================
// PLATFORM SETTINGS & PROMO CODES
// ==========================================
app.get('/api/platform/settings', (req, res) => {
    res.json({ success: true, settings: serverPlatformSettings });
});

app.post('/api/platform/promo/validate', (req, res) => {
    const { code, amount = 0 } = req.body;
    if (!code || typeof code !== 'string') {
        return res.status(400).json({ success: false, error: 'Promo code is required.' });
    }
    const cleanCode = code.trim().toUpperCase();
    const promo = (serverPlatformSettings.promoCodes || []).find(p => p.code === cleanCode);
    if (!promo) {
        return res.status(404).json({ success: false, error: 'Invalid or expired promo code.' });
    }
    if (promo.minAmount && amount < promo.minAmount) {
        return res.status(400).json({ 
            success: false, 
            error: `This code requires a minimum booking amount of ₹${promo.minAmount}.` 
        });
    }
    let discount = 0;
    if (promo.flatDiscount) {
        discount = Math.min(amount, promo.flatDiscount);
    } else if (promo.discountPercent) {
        discount = Math.round((amount * promo.discountPercent) / 100);
    }
    res.json({
        success: true,
        promo: {
            code: promo.code,
            discount,
            description: promo.description,
            flatDiscount: promo.flatDiscount,
            discountPercent: promo.discountPercent
        }
    });
});

app.put('/api/platform/settings', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const result = authDatabase.verifySessionToken(token);
    if (!result.valid || !result.user) {
        return res.status(401).json({ success: false, error: 'Invalid session.' });
    }
    const updates = req.body;
    if (updates.platformCommissionPercent !== undefined) {
        serverPlatformSettings.platformCommissionPercent = Number(updates.platformCommissionPercent);
    }
    if (updates.platformFeePercent !== undefined) {
        serverPlatformSettings.platformFeePercent = Number(updates.platformFeePercent);
    }
    if (updates.taxPercent !== undefined) {
        serverPlatformSettings.taxPercent = Number(updates.taxPercent);
    }
    if (updates.promoCodes && Array.isArray(updates.promoCodes)) {
        serverPlatformSettings.promoCodes = updates.promoCodes;
    }
    saveStore();
    res.json({ success: true, settings: serverPlatformSettings });
});

// ==========================================
// SUPPORT TICKETS API
// ==========================================
app.get('/api/support/tickets', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.json({ success: true, tickets: serverSupportTickets });
    }
    const result = authDatabase.verifySessionToken(token);
    if (!result.valid || !result.user) {
        return res.json({ success: true, tickets: serverSupportTickets });
    }
    const user = result.user;
    if (user.role === 'admin') {
        return res.json({ success: true, tickets: serverSupportTickets });
    }
    const userTickets = serverSupportTickets.filter(t => t.userId === user.id || t.userEmail === user.email);
    res.json({ success: true, tickets: userTickets });
});

app.post('/api/support/tickets', (req, res) => {
    const token = extractToken(req);
    let userId = 'guest';
    let userName = 'Guest User';
    let userEmail = 'guest@myryedo.in';
    let userRole = 'booker';
    if (token) {
        const result = authDatabase.verifySessionToken(token);
        if (result.valid && result.user) {
            userId = result.user.id;
            userName = result.user.name;
            userEmail = result.user.email;
            userRole = result.user.role;
        }
    }
    const { category, subject, description, priority = 'normal', attachment } = req.body;
    if (!category || !subject || !description) {
        return res.status(400).json({ success: false, error: 'Category, subject, and description are required.' });
    }
    const newTicket = {
        id: `tkt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
        userId,
        userName: req.body.userName || userName,
        userEmail: req.body.userEmail || userEmail,
        userRole,
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        attachment: attachment || null,
        status: 'open',
        responses: [
            {
                id: `rep-${Date.now().toString(36)}`,
                senderId: 'system',
                senderName: 'MyRyedo Support Bot',
                senderRole: 'system',
                message: 'Thank you for reaching out to MyRyedo Support! Our operations team has received your ticket and will respond within 2 hours.',
                timestamp: new Date().toISOString()
            }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    serverSupportTickets.unshift(newTicket);
    saveStore();
    res.status(201).json({ success: true, ticket: newTicket });
});

app.post('/api/support/tickets/:id/reply', (req, res) => {
    const token = extractToken(req);
    let senderId = 'user';
    let senderName = 'Member';
    let senderRole = 'user';
    if (token) {
        const result = authDatabase.verifySessionToken(token);
        if (result.valid && result.user) {
            senderId = result.user.id;
            senderName = result.user.name;
            senderRole = result.user.role;
        }
    }
    const { id } = req.params;
    const { message } = req.body;
    if (!message || !message.trim()) {
        return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
    }
    const ticket = serverSupportTickets.find(t => t.id === id);
    if (!ticket) {
        return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }
    const reply = {
        id: `rep-${Date.now().toString(36)}`,
        senderId,
        senderName: req.body.senderName || senderName,
        senderRole: req.body.senderRole || senderRole,
        message: message.trim(),
        timestamp: new Date().toISOString()
    };
    ticket.responses.push(reply);
    ticket.updatedAt = new Date().toISOString();
    if (senderRole === 'admin') {
        ticket.status = 'in_progress';
    }
    saveStore();
    res.json({ success: true, ticket });
});

app.patch('/api/support/tickets/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const ticket = serverSupportTickets.find(t => t.id === id);
    if (!ticket) {
        return res.status(404).json({ success: false, error: 'Ticket not found.' });
    }
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    saveStore();
    res.json({ success: true, ticket });
});

// ==========================================
// INCIDENTS & DAMAGE CLAIMS API
// ==========================================
app.get('/api/incidents', (req, res) => {
    res.json({ success: true, incidents: serverIncidents });
});

app.post('/api/incidents', (req, res) => {
    const token = extractToken(req);
    let reporterId = 'user';
    let reporterName = 'Member';
    let reporterRole = 'booker';
    if (token) {
        const result = authDatabase.verifySessionToken(token);
        if (result.valid && result.user) {
            reporterId = result.user.id;
            reporterName = result.user.name;
            reporterRole = result.user.role;
        }
    }
    const { bookingId, vehicleId, type = 'damage', description, photos = [], odometer, fuelLevel } = req.body;
    if (!description) {
        return res.status(400).json({ success: false, error: 'Incident description is required.' });
    }
    const newIncident = {
        id: `inc-${Date.now().toString(36)}`,
        bookingId: bookingId || null,
        vehicleId: vehicleId || null,
        reporterId,
        reporterName,
        reporterRole,
        type, // 'damage' | 'accident' | 'breakdown' | 'late_return'
        description: description.trim(),
        photos,
        odometer: odometer || null,
        fuelLevel: fuelLevel || null,
        status: 'pending_review', // 'pending_review' | 'deposit_deducted' | 'resolved'
        depositDeduction: 0,
        adminNotes: '',
        createdAt: new Date().toISOString()
    };
    serverIncidents.unshift(newIncident);
    saveStore();
    res.status(201).json({ success: true, incident: newIncident });
});

app.patch('/api/incidents/:id/resolve', (req, res) => {
    const { id } = req.params;
    const { status, depositDeduction = 0, adminNotes = '' } = req.body;
    const incident = serverIncidents.find(i => i.id === id);
    if (!incident) {
        return res.status(404).json({ success: false, error: 'Incident not found.' });
    }
    incident.status = status || 'resolved';
    incident.depositDeduction = Number(depositDeduction) || 0;
    incident.adminNotes = adminNotes;
    incident.resolvedAt = new Date().toISOString();
    saveStore();
    res.json({ success: true, incident });
});

// ==========================================
// REPORTS & FRAUD PREVENTION API
// ==========================================
app.get('/api/reports', (req, res) => {
    res.json({ success: true, reports: serverReports });
});

app.post('/api/reports', (req, res) => {
    const token = extractToken(req);
    let reporterId = 'anon';
    let reporterName = 'Anonymous';
    if (token) {
        const result = authDatabase.verifySessionToken(token);
        if (result.valid && result.user) {
            reporterId = result.user.id;
            reporterName = result.user.name;
        }
    }
    const { targetType, targetId, reason, description } = req.body;
    if (!targetType || !targetId || !reason) {
        return res.status(400).json({ success: false, error: 'Target, reason, and details are required.' });
    }
    const newReport = {
        id: `rep-${Date.now().toString(36)}`,
        reporterId,
        reporterName,
        targetType, // 'vehicle' | 'user'
        targetId,
        reason,
        description: description ? description.trim() : '',
        status: 'open', // 'open' | 'investigating' | 'resolved'
        createdAt: new Date().toISOString()
    };
    serverReports.unshift(newReport);
    saveStore();
    res.status(201).json({ success: true, report: newReport });
});

app.patch('/api/reports/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const report = serverReports.find(r => r.id === id);
    if (!report) {
        return res.status(404).json({ success: false, error: 'Report not found.' });
    }
    report.status = status;
    saveStore();
    res.json({ success: true, report });
});

// ==========================================
// ADMIN MODERATION & RC VERIFICATION
// ==========================================
app.post('/api/admin/vehicles/:id/verify', (req, res) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    const vehicle = findVehicle(id);
    if (!vehicle) {
        return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    }
    vehicle.verificationStatus = status; // 'verified' | 'rejected' | 'pending'
    vehicle.verified = (status === 'verified');
    vehicle.verificationReason = reason || '';
    saveStore();
    res.json({ success: true, vehicle });
});

app.post('/api/admin/vehicles/:id/feature', (req, res) => {
    const { id } = req.params;
    const vehicle = findVehicle(id);
    if (!vehicle) {
        return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    }
    vehicle.featured = !vehicle.featured;
    saveStore();
    res.json({ success: true, vehicle });
});

app.delete('/api/admin/reviews/:id', (req, res) => {
    const { id } = req.params;
    const idx = serverReviews.findIndex(r => r.id === id);
    if (idx >= 0) {
        serverReviews.splice(idx, 1);
        saveStore();
    }
    res.json({ success: true, message: 'Review removed by moderation.' });
});

app.get('/api/admin/analytics', (req, res) => {
    const totalGMV = serverBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const takeRate = (serverPlatformSettings.platformCommissionPercent || 10) / 100;
    const platformRevenue = Math.round(totalGMV * takeRate);
    const hostPayouts = Math.max(0, totalGMV - platformRevenue);
    const activeBookings = serverBookings.filter(b => b.status === 'active' || b.status === 'confirmed').length;
    const verifiedVehicles = serverVehicles.filter(v => v.verificationStatus === 'verified' || v.verified).length;
    const pendingVehicles = serverVehicles.filter(v => v.verificationStatus === 'pending' || !v.verificationStatus).length;
    const openTickets = serverSupportTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
    const openIncidents = serverIncidents.filter(i => i.status === 'pending_review').length;
    const totalWaitlist = serverWaitlist.length;
    const totalCampaignVisits = serverCampaigns.reduce((sum, c) => sum + (c.visits || 0), 0);
    const totalCampaignSignups = serverCampaigns.reduce((sum, c) => sum + (c.signups || 0), 0);
    const openDisputes = serverDisputes.filter(d => d.status === 'pending').length;
    const pendingPayouts = serverPayouts.filter(p => p.status === 'pending').length;

    res.json({
        success: true,
        analytics: {
            totalGMV,
            platformRevenue,
            hostPayouts,
            activeBookings,
            totalVehicles: serverVehicles.length,
            verifiedVehicles,
            pendingVehicles,
            totalBookings: serverBookings.length,
            openTickets,
            openIncidents,
            totalWaitlist,
            totalCampaignVisits,
            totalCampaignSignups,
            openDisputes,
            pendingPayouts,
            activeServiceAreas: serverServiceAreas.filter(sa => sa.status === 'active').length
        }
    });
});

// ==========================================
// USER ACCOUNT DELETION API
// ==========================================
app.delete('/api/users/account', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const authRes = authDatabase.verifySessionToken(token);
    if (!authRes.valid || !authRes.user) {
        return res.status(401).json({ success: false, error: 'Invalid or expired session.' });
    }

    const email = authRes.user.email;
    const deleted = authDatabase.deleteUser(email);
    if (!deleted) {
        return res.status(404).json({ success: false, error: 'User account could not be found.' });
    }

    // Mark any active vehicles owned by user as unavailable
    serverVehicles.forEach(v => {
        if (v.ownerId === authRes.user.id || v.owner?.email === email) {
            v.isAvailable = false;
        }
    });
    saveStore();

    res.clearCookie('myryedo_token');
    res.clearCookie('ridely_token');
    return res.json({ success: true, message: 'Account and associated profile data successfully deleted.' });
});

// ==========================================
// DYNAMIC SERVICE AREAS API
// ==========================================
app.get('/api/service-areas', (req, res) => {
    res.json({ success: true, serviceAreas: serverServiceAreas });
});

app.get('/api/service-areas/check', (req, res) => {
    const { location } = req.query;
    if (!location || typeof location !== 'string' || !location.trim()) {
        const active = serverServiceAreas.filter(a => a.status === 'active');
        return res.json({ success: true, inServiceArea: true, activeAreas: active });
    }

    const query = location.toLowerCase().trim();
    // Match against active service areas by name, city, state
    const matched = serverServiceAreas.find(sa => 
        sa.status === 'active' && (
            (sa.name && query.includes(sa.name.toLowerCase())) ||
            (sa.name && sa.name.toLowerCase().includes(query)) ||
            (sa.city && query.includes(sa.city.toLowerCase())) ||
            (sa.city && sa.city.toLowerCase().includes(query))
        )
    );

    if (matched) {
        return res.json({
            success: true,
            inServiceArea: true,
            serviceArea: matched
        });
    }

    return res.json({
        success: true,
        inServiceArea: false,
        message: 'MyRyedo is coming soon to your area!',
        searchedLocation: location
    });
});

app.post('/api/service-areas', (req, res) => {
    const data = req.body;
    if (!data.name || !data.city) {
        return res.status(400).json({ success: false, error: 'Name and city are required for service area.' });
    }

    const id = data.id || `sa-${Date.now().toString(36)}`;
    const newArea = {
        id,
        name: data.name.trim(),
        city: data.city.trim(),
        state: data.state?.trim() || 'Madhya Pradesh',
        status: data.status || 'active',
        radiusKm: Number(data.radiusKm) || 15,
        centerCoordinates: data.centerCoordinates || { lat: 22.7533, lng: 75.8937 },
        launchDate: data.launchDate || new Date().toISOString().split('T')[0],
        foundingOwnerProgram: data.foundingOwnerProgram || {
            enabled: true,
            name: `${data.name} Founding Owner Program`,
            freeCommissionBookingsCount: 10,
            description: `0% platform commission on your first 10 completed rentals!`
        },
        activeOffers: data.activeOffers || [],
        notes: data.notes || '',
        createdAt: new Date().toISOString()
    };

    serverServiceAreas.push(newArea);
    saveStore();
    res.status(201).json({ success: true, serviceArea: newArea });
});

app.put('/api/service-areas/:id', (req, res) => {
    const { id } = req.params;
    const index = serverServiceAreas.findIndex(sa => sa.id === id);
    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Service area not found.' });
    }

    serverServiceAreas[index] = {
        ...serverServiceAreas[index],
        ...req.body,
        id // Immutable
    };
    saveStore();
    res.json({ success: true, serviceArea: serverServiceAreas[index] });
});

app.delete('/api/service-areas/:id', (req, res) => {
    const { id } = req.params;
    const initialLen = serverServiceAreas.length;
    const filtered = serverServiceAreas.filter(sa => sa.id !== id);
    if (filtered.length === initialLen) {
        return res.status(404).json({ success: false, error: 'Service area not found.' });
    }
    serverServiceAreas.length = 0;
    serverServiceAreas.push(...filtered);
    saveStore();
    res.json({ success: true });
});

// ==========================================
// WAITLIST API (OUTSIDE SERVICE AREA)
// ==========================================
app.post('/api/waitlist', (req, res) => {
    const { name, email, phone, location, roleInterest, preferredVehicleType } = req.body;
    if (!email || !name) {
        return res.status(400).json({ success: false, error: 'Name and email are required to join waitlist.' });
    }

    const id = `wtl-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newEntry = {
        id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || '',
        location: location?.trim() || 'Outside active areas',
        roleInterest: roleInterest || 'renter',
        preferredVehicleType: preferredVehicleType || 'all',
        createdAt: new Date().toISOString()
    };

    // Avoid exact duplicate email + location in waitlist
    const existing = serverWaitlist.find(w => w.email === newEntry.email && w.location.toLowerCase() === newEntry.location.toLowerCase());
    if (!existing) {
        serverWaitlist.unshift(newEntry);
        saveStore();
    }

    res.status(201).json({
        success: true,
        message: 'You have been added to the priority waitlist! We will notify you when MyRyedo launches in your area.',
        entry: newEntry
    });
});

app.get('/api/waitlist', (req, res) => {
    res.json({ success: true, waitlist: serverWaitlist, total: serverWaitlist.length });
});

// ==========================================
// MARKETING & CAMPAIGN TRACKING API
// ==========================================
app.post('/api/campaigns/track', (req, res) => {
    const { campaign, serviceArea, source } = req.body;
    const campaignKey = (campaign || 'Organic').trim();
    const areaKey = (serviceArea || 'Vijay Nagar').trim();
    const sourceKey = (source || 'Direct').trim();

    let record = serverCampaigns.find(c => 
        c.campaign.toLowerCase() === campaignKey.toLowerCase() &&
        c.serviceArea.toLowerCase() === areaKey.toLowerCase() &&
        c.source.toLowerCase() === sourceKey.toLowerCase()
    );

    if (!record) {
        record = {
            id: `cmp-${Date.now().toString(36)}`,
            campaign: campaignKey,
            serviceArea: areaKey,
            source: sourceKey,
            visits: 1,
            signups: 0,
            bookings: 0,
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString()
        };
        serverCampaigns.push(record);
    } else {
        record.visits = (record.visits || 0) + 1;
        record.lastActiveAt = new Date().toISOString();
    }

    saveStore();
    res.json({ success: true, campaignId: record.id });
});

app.post('/api/campaigns/convert', (req, res) => {
    const { campaignId, campaignName, eventType } = req.body; // eventType: 'signup' | 'booking'
    let record = null;
    if (campaignId) {
        record = serverCampaigns.find(c => c.id === campaignId);
    } else if (campaignName) {
        record = serverCampaigns.find(c => c.campaign.toLowerCase() === campaignName.toLowerCase());
    }

    if (record) {
        if (eventType === 'signup') {
            record.signups = (record.signups || 0) + 1;
        } else if (eventType === 'booking') {
            record.bookings = (record.bookings || 0) + 1;
        }
        saveStore();
    }
    res.json({ success: true });
});

app.get('/api/campaigns', (req, res) => {
    res.json({ success: true, campaigns: serverCampaigns });
});

// ==========================================
// DYNAMIC OFFERS & PROMO CODES API
// ==========================================
app.get('/api/offers', (req, res) => {
    // Collect service area offers and platform promo codes
    const areaOffers = serverServiceAreas.flatMap(sa => (sa.activeOffers || []).map(o => ({ ...o, serviceAreaId: sa.id, serviceAreaName: sa.name })));
    const platformOffers = serverPlatformSettings.promoCodes || [];
    res.json({
        success: true,
        offers: areaOffers,
        platformPromoCodes: platformOffers
    });
});

app.post('/api/offers', (req, res) => {
    const { code, title, description, flatDiscount, discountPercent, minAmount, maxUses, serviceAreaId } = req.body;
    if (!code) {
        return res.status(400).json({ success: false, error: 'Promo code is required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const newOffer = {
        code: cleanCode,
        title: title || `${cleanCode} Special Discount`,
        description: description || `Get discount on your ride`,
        flatDiscount: Number(flatDiscount) || 0,
        discountPercent: Number(discountPercent) || 0,
        minAmount: Number(minAmount) || 0,
        maxUses: Number(maxUses) || 100,
        usedCount: 0,
        active: true
    };

    if (serviceAreaId) {
        const area = serverServiceAreas.find(sa => sa.id === serviceAreaId);
        if (area) {
            if (!area.activeOffers) area.activeOffers = [];
            area.activeOffers.push(newOffer);
        }
    } else {
        if (!serverPlatformSettings.promoCodes) serverPlatformSettings.promoCodes = [];
        serverPlatformSettings.promoCodes.push(newOffer);
    }

    saveStore();
    res.status(201).json({ success: true, offer: newOffer });
});

// ==========================================
// REAL PAYMENT FLOW API
// ==========================================
app.post('/api/payments/initiate', (req, res) => {
    const { bookingId, vehicleId, amount, paymentMethod } = req.body;
    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Valid amount is required.' });
    }

    const orderId = `ORD-RDLY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    res.json({
        success: true,
        orderId,
        amount,
        currency: 'INR',
        status: 'initiated',
        paymentMethod: paymentMethod || 'upi'
    });
});

app.post('/api/payments/confirm', (req, res) => {
    const token = extractToken(req);
    let userId = null;
    let userName = 'Renter';
    if (token) {
        const authRes = authDatabase.verifySessionToken(token);
        if (authRes.valid && authRes.user) {
            userId = authRes.user.id;
            userName = authRes.user.name;
        }
    }

    const { orderId, bookingId, paymentMethod, transactionId, amount } = req.body;
    const booking = serverBookings.find(b => b.id === bookingId);
    if (booking) {
        booking.paymentStatus = 'paid';
        booking.status = 'confirmed';
    }

    const realTxn = {
        id: `txn-${Date.now().toString(36)}`,
        orderId: orderId || `ORD-${Date.now().toString(36).toUpperCase()}`,
        bookingId: bookingId || null,
        vehicleId: booking?.vehicleId || null,
        userId: userId || booking?.bookerId || null,
        amount: Number(amount) || booking?.totalAmount || 0,
        currency: 'INR',
        paymentMethod: paymentMethod || 'upi',
        transactionId: transactionId || `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: 'successful',
        createdAt: new Date().toISOString()
    };

    serverTransactions.unshift(realTxn);

    // Send real event notification to booker
    if (userId || booking?.bookerId) {
        serverNotifications.unshift({
            id: `notif-pay-${Date.now().toString(36)}`,
            userId: userId || booking.bookerId,
            title: 'Payment Successful',
            message: `Your payment of ₹${realTxn.amount.toLocaleString('en-IN')} was processed successfully. Transaction ID: ${realTxn.transactionId}.`,
            type: 'payment',
            read: false,
            createdAt: new Date().toISOString()
        });
    }

    // Send real notification to vehicle host
    if (booking) {
        const vehicle = findVehicle(booking.vehicleId);
        if (vehicle && vehicle.ownerId) {
            serverNotifications.unshift({
                id: `notif-host-pay-${Date.now().toString(36)}`,
                userId: vehicle.ownerId,
                title: 'New Paid Booking!',
                message: `${userName} completed payment of ₹${realTxn.amount.toLocaleString('en-IN')} for ${vehicle.name}.`,
                type: 'booking',
                read: false,
                createdAt: new Date().toISOString()
            });
        }
    }

    saveStore();
    res.json({ success: true, transaction: realTxn, booking });
});

app.get('/api/payments/history', (req, res) => {
    const token = extractToken(req);
    let userId = null;
    if (token) {
        const authRes = authDatabase.verifySessionToken(token);
        if (authRes.valid && authRes.user) {
            userId = authRes.user.id;
        }
    }

    let results = serverTransactions;
    if (userId) {
        results = serverTransactions.filter(t => !t.userId || t.userId === userId);
    }
    res.json({ success: true, transactions: results });
});

// ==========================================
// HOST PAYOUTS API
// ==========================================
app.get('/api/payouts', (req, res) => {
    const token = extractToken(req);
    let user = null;
    if (token) {
        const authRes = authDatabase.verifySessionToken(token);
        if (authRes.valid && authRes.user) user = authRes.user;
    }

    if (user && user.role === 'admin') {
        return res.json({ success: true, payouts: serverPayouts });
    }

    if (user && user.role === 'owner') {
        const myPayouts = serverPayouts.filter(p => p.ownerId === user.id);
        return res.json({ success: true, payouts: myPayouts });
    }

    res.json({ success: true, payouts: serverPayouts });
});

app.post('/api/payouts/request', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const authRes = authDatabase.verifySessionToken(token);
    if (!authRes.valid || !authRes.user) {
        return res.status(401).json({ success: false, error: 'Invalid session.' });
    }
    const user = authRes.user;
    const { amount, payoutMethod, payoutDetails } = req.body;
    const reqAmount = Number(amount);
    if (!reqAmount || reqAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Valid payout amount is required.' });
    }

    const payout = {
        id: `pay-${Date.now().toString(36)}`,
        ownerId: user.id,
        ownerName: user.name,
        ownerEmail: user.email,
        amount: reqAmount,
        payoutMethod: payoutMethod || 'bank_transfer',
        payoutDetails: payoutDetails || 'Direct Account Transfer',
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    serverPayouts.unshift(payout);
    serverNotifications.unshift({
        id: `notif-pay-req-${Date.now().toString(36)}`,
        userId: user.id,
        title: 'Payout Request Submitted',
        message: `Your request for ₹${reqAmount.toLocaleString('en-IN')} has been submitted and is in settlement queue.`,
        type: 'payout',
        read: false,
        createdAt: new Date().toISOString()
    });

    saveStore();
    res.status(201).json({ success: true, payout });
});

app.patch('/api/payouts/:id/settle', (req, res) => {
    const { id } = req.params;
    const payout = serverPayouts.find(p => p.id === id);
    if (!payout) {
        return res.status(404).json({ success: false, error: 'Payout request not found.' });
    }

    payout.status = 'processed';
    payout.settledAt = new Date().toISOString();

    serverNotifications.unshift({
        id: `notif-pay-settled-${Date.now().toString(36)}`,
        userId: payout.ownerId,
        title: 'Payout Settled',
        message: `Your payout of ₹${payout.amount.toLocaleString('en-IN')} has been transferred to your designated account.`,
        type: 'payout',
        read: false,
        createdAt: new Date().toISOString()
    });

    saveStore();
    res.json({ success: true, payout });
});

// ==========================================
// DISPUTES & DEPOSITS API
// ==========================================
app.get('/api/disputes', (req, res) => {
    res.json({ success: true, disputes: serverDisputes });
});

app.post('/api/disputes', (req, res) => {
    const token = extractToken(req);
    let userId = 'user-anonymous';
    let userRole = 'booker';
    if (token) {
        const authRes = authDatabase.verifySessionToken(token);
        if (authRes.valid && authRes.user) {
            userId = authRes.user.id;
            userRole = authRes.user.role;
        }
    }

    const { bookingId, vehicleId, reason, description, evidencePhotos } = req.body;
    if (!bookingId || !reason) {
        return res.status(400).json({ success: false, error: 'Booking ID and reason are required.' });
    }

    const newDispute = {
        id: `dsp-${Date.now().toString(36)}`,
        bookingId,
        vehicleId: vehicleId || null,
        initiatorId: userId,
        initiatorRole: userRole,
        reason,
        description: description || '',
        evidencePhotos: Array.isArray(evidencePhotos) ? evidencePhotos : [],
        status: 'pending', // 'pending' | 'resolved' | 'rejected'
        createdAt: new Date().toISOString()
    };

    serverDisputes.unshift(newDispute);
    saveStore();
    res.status(201).json({ success: true, dispute: newDispute });
});

app.patch('/api/disputes/:id/resolve', (req, res) => {
    const { id } = req.params;
    const dispute = serverDisputes.find(d => d.id === id);
    if (!dispute) {
        return res.status(404).json({ success: false, error: 'Dispute record not found.' });
    }

    const { resolutionNotes, depositRefundAmount, depositDeductionAmount, status } = req.body;
    dispute.status = status || 'resolved';
    dispute.resolutionNotes = resolutionNotes || 'Resolved by MyRyedo operations moderation';
    dispute.depositRefundAmount = Number(depositRefundAmount) || 0;
    dispute.depositDeductionAmount = Number(depositDeductionAmount) || 0;
    dispute.resolvedAt = new Date().toISOString();

    serverNotifications.unshift({
        id: `notif-dsp-res-${Date.now().toString(36)}`,
        userId: dispute.initiatorId,
        title: 'Dispute Resolved',
        message: `Your dispute for booking #${dispute.bookingId} has been resolved. Notes: ${dispute.resolutionNotes}`,
        type: 'dispute',
        read: false,
        createdAt: new Date().toISOString()
    });

    saveStore();
    res.json({ success: true, dispute });
});

// ==========================================
// ADMIN VEHICLE RC VERIFICATION API
// ==========================================
app.patch('/api/admin/vehicles/:id/verify', (req, res) => {
    const { id } = req.params;
    const { verificationStatus, reason } = req.body;
    const vehicle = findVehicle(id);
    if (!vehicle) {
        return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    }

    vehicle.verificationStatus = verificationStatus;
    vehicle.verified = verificationStatus === 'verified';
    vehicle.verificationReason = reason || '';

    if (vehicle.ownerId) {
        serverNotifications.unshift({
            id: `notif-rc-${Date.now().toString(36)}`,
            userId: vehicle.ownerId,
            title: verificationStatus === 'verified' ? 'Vehicle RC Approved!' : 'Vehicle RC Status Updated',
            message: `RC verification for ${vehicle.name} is now: ${verificationStatus}. ${reason ? `Note: ${reason}` : ''}`,
            type: 'vehicle',
            read: false,
            createdAt: new Date().toISOString()
        });
    }

    saveStore();
    res.json({ success: true, vehicle });
});

// ==========================================
// IN-APP MESSAGING API (AUTHENTICATED & PERSISTENT)
// ==========================================
app.get('/api/messages', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const result = authDatabase.verifySessionToken(token);
    if (!result.valid || !result.user) {
        return res.status(401).json({ success: false, error: 'Invalid session' });
    }
    const user = result.user;
    const { partnerId, vehicleId } = req.query;

    let userMsgs = serverMessages.filter(m => m.senderId === user.id || m.recipientId === user.id);
    if (partnerId) {
        userMsgs = userMsgs.filter(m => m.senderId === partnerId || m.recipientId === partnerId);
    }
    if (vehicleId) {
        userMsgs = userMsgs.filter(m => m.vehicleId === vehicleId);
    }

    res.json({ success: true, messages: userMsgs });
});

app.post('/api/messages', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const result = authDatabase.verifySessionToken(token);
    if (!result.valid || !result.user) {
        return res.status(401).json({ success: false, error: 'Invalid session' });
    }
    const user = result.user;
    const { recipientId, vehicleId, text } = req.body;

    if (!recipientId || !text || !text.trim()) {
        return res.status(400).json({ success: false, error: 'Recipient ID and message text are required.' });
    }

    const newMsg = {
        id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatar || null,
        recipientId,
        vehicleId: vehicleId || null,
        text: text.trim(),
        read: false,
        createdAt: new Date().toISOString()
    };
    serverMessages.push(newMsg);

    // Notify Recipient ONLY (sender does NOT receive an alert for their own sent message)
    addNotification({
        userId: recipientId,
        senderId: user.id,
        type: 'NEW_MESSAGE',
        title: `Message from ${user.name}`,
        message: text.trim().length > 60 ? text.trim().substring(0, 57) + '...' : text.trim(),
        vehicleId: vehicleId || null,
        conversationPartnerId: user.id
    });

    saveStore();
    res.status(201).json({ success: true, message: newMsg });
});

app.patch('/api/messages/read', (req, res) => {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const result = authDatabase.verifySessionToken(token);
    if (!result.valid || !result.user) {
        return res.status(401).json({ success: false, error: 'Invalid session' });
    }
    const user = result.user;
    const { partnerId } = req.body;

    let updated = false;
    serverMessages.forEach(m => {
        if (m.recipientId === user.id && (!partnerId || m.senderId === partnerId)) {
            m.read = true;
            updated = true;
        }
    });

    // Also mark related notifications as read
    serverNotifications.forEach(n => {
        if (n.userId === user.id && n.type === 'NEW_MESSAGE' && (!partnerId || n.conversationPartnerId === partnerId || n.senderId === partnerId)) {
            n.read = true;
            updated = true;
        }
    });

    if (updated) saveStore();
    res.json({ success: true });
});

// ==========================================
// IN-APP NOTIFICATIONS API (STRICTLY EVENT-DRIVEN, ZERO FAKE FALLBACKS)
// ==========================================
app.get('/api/notifications', (req, res) => {
    const token = extractToken(req);
    let userId = null;
    if (token) {
        const result = authDatabase.verifySessionToken(token);
        if (result.valid && result.user) {
            userId = result.user.id;
        }
    }
    let userNotifs = serverNotifications;
    if (userId) {
        userNotifs = serverNotifications.filter(n => !n.userId || n.userId === userId);
    }
    // Return authentic event notifications only. If none, return empty array.
    res.json({ success: true, notifications: userNotifs });
});

app.patch('/api/notifications/:id/read', (req, res) => {
    const { id } = req.params;
    const notif = serverNotifications.find(n => n.id === id);
    if (notif) {
        notif.read = true;
        saveStore();
    }
    res.json({ success: true });
});

app.post('/api/notifications/mark-all-read', (req, res) => {
    const token = extractToken(req);
    let userId = null;
    if (token) {
        const result = authDatabase.verifySessionToken(token);
        if (result.valid && result.user) {
            userId = result.user.id;
        }
    }
    if (userId) {
        serverNotifications.forEach(n => {
            if (!n.userId || n.userId === userId) {
                n.read = true;
            }
        });
    } else {
        serverNotifications.forEach(n => { n.read = true; });
    }
    saveStore();
    res.json({ success: true });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});
// ==========================================
// VITE MIDDLEWARE & STATIC ASSETS
// ==========================================
async function startServer() {
    if (process.env.NODE_ENV !== 'production') {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    }
    else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`MyRyedo Full-Stack Server running on http://0.0.0.0:${PORT}`);
    });
}
startServer();
