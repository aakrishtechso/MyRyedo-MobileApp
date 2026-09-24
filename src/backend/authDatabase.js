import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { mongoStore } from './mongoStore.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is required.');

class AuthDatabase {
  constructor() {
    this.users = new Map();
    this.otps = new Map(); // retained only for legacy email verification
    this.captchaChallenges = new Map();
    this.passwordResetTokens = new Map();
    this.emailVerificationTokens = new Map();
    this.oauthStates = new Map();
    this.revokedTokens = new Set();
    this.rateLimitMap = new Map();
  }

  async initializeFromMongo() {
    const users = await mongoStore.readCollection('users');
    for (const user of users) {
      delete user._id;
      this.users.set(String(user.email).trim().toLowerCase(), user);
    }
    console.log(`[MongoDB] Loaded ${this.users.size} users.`);
  }

  persistUsers() {
    // Persist the authoritative in-memory auth cache to MongoDB.
    void mongoStore.replaceCollection('users', Array.from(this.users.values()));
  }

  findByEmail(email) {
    if (!email) return null;
    return this.users.get(email.trim().toLowerCase()) || null;
  }

  findById(id) {
    if (!id) return null;
    for (const user of this.users.values()) if (user.id === id) return user;
    return null;
  }

  findByGoogleId(googleId) {
    if (!googleId) return null;
    for (const user of this.users.values()) if (user.googleId === googleId) return user;
    return null;
  }

  createUser(user) {
    const normalized = user.email.trim().toLowerCase();
    this.users.set(normalized, user);
    this.persistUsers();
    return user;
  }

  updateUser(email, updates) {
    const normalized = email.trim().toLowerCase();
    const existing = this.users.get(normalized);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.users.set(normalized, updated);
    this.persistUsers();
    return updated;
  }

  deleteUser(email) {
    if (!email) return false;
    const normalized = email.trim().toLowerCase();
    if (!this.users.has(normalized)) return false;
    this.invalidateAllUserSessions(normalized);
    const deleted = this.users.delete(normalized);
    this.persistUsers();
    return deleted;
  }

  getAllUsers() { return Array.from(this.users.values()); }

  sanitizeUser(user) {
    const { passwordHash, failedLoginAttempts, lockoutUntil, ...safeUser } = user;
    return safeUser;
  }

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async comparePassword(password, hash) {
    if (!password || !hash) return false;
    return bcrypt.compare(password, hash);
  }

  generateSessionToken(user) {
    const expiresInSeconds = 7 * 24 * 60 * 60;
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const payload = { userId: user.id, email: user.email, role: user.role, sessionVersion: user.sessionVersion || 1 };
    return { token: jwt.sign(payload, JWT_SECRET, { expiresIn: expiresInSeconds }), expiresAt };
  }

  verifySessionToken(token) {
    if (!token) return { valid: false, error: 'No token provided' };
    if (this.revokedTokens.has(token)) return { valid: false, error: 'Token has been revoked' };
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = this.findById(decoded.userId);
      if (!user) return { valid: false, error: 'User not found' };
      if (decoded.sessionVersion !== user.sessionVersion) return { valid: false, error: 'Session version outdated. Please log in again.' };
      return { valid: true, user };
    } catch (err) {
      return { valid: false, error: err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid authentication token' };
    }
  }

  revokeToken(token) { if (token) this.revokedTokens.add(token); }

  invalidateAllUserSessions(email) {
    const normalized = email.trim().toLowerCase();
    const user = this.users.get(normalized);
    if (user) {
      user.sessionVersion = (user.sessionVersion || 1) + 1;
      this.users.set(normalized, user);
      this.persistUsers();
    }
  }

  generateCaptchaCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i += 1) {
      code += alphabet[crypto.randomInt(0, alphabet.length)];
    }
    return code;
  }

  hashCaptcha(code, salt) {
    return crypto.createHash('sha256')
      .update(`${String(code).trim().toUpperCase()}:${salt}:${JWT_SECRET}`)
      .digest('hex');
  }

  createCaptchaChallenge() {
    // CAPTCHA answers are stored only as salted hashes; the frontend receives
    // an image challenge rather than the answer as plain JSON.
    const code = this.generateCaptchaCode();
    const salt = crypto.randomBytes(16).toString('hex');
    const id = `captcha-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const expiresAt = Date.now() + 5 * 60 * 1000;

    const svgLines = Array.from({ length: 7 }, (_, index) => {
      const x1 = crypto.randomInt(5, 190);
      const y1 = crypto.randomInt(8, 48);
      const x2 = crypto.randomInt(5, 190);
      const y2 = crypto.randomInt(8, 48);
      const opacity = (0.15 + (index % 4) * 0.08).toFixed(2);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64748b" stroke-width="1.4" opacity="${opacity}"/>`;
    }).join('');

    const chars = [...code].map((char, index) => {
      const x = 28 + index * 32;
      const y = 34 + crypto.randomInt(-4, 5);
      const rotate = crypto.randomInt(-12, 13);
      return `<text x="${x}" y="${y}" transform="rotate(${rotate} ${x} ${y})" font-family="monospace" font-size="24" font-weight="800" fill="#0f172a">${char}</text>`;
    }).join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="190" height="56" viewBox="0 0 190 56"><rect width="190" height="56" rx="10" fill="#f8fafc"/><rect x="1" y="1" width="188" height="54" rx="9" fill="none" stroke="#cbd5e1"/>${svgLines}${chars}</svg>`;
    const image = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    this.captchaChallenges.set(id, {
      id,
      answerHash: this.hashCaptcha(code, salt),
      salt,
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
      used: false
    });

    // Opportunistic cleanup of expired challenges.
    const cutoff = Date.now();
    for (const [key, value] of this.captchaChallenges.entries()) {
      if (value.expiresAt < cutoff || value.used) this.captchaChallenges.delete(key);
    }

    return { id, image, expiresAt };
  }

  verifyCaptchaChallenge(id, providedCode) {
    const record = this.captchaChallenges.get(id);
    if (!record || record.used) {
      return { success: false, error: 'CAPTCHA has expired. Please refresh it and try again.' };
    }
    if (Date.now() > record.expiresAt) {
      this.captchaChallenges.delete(id);
      return { success: false, error: 'CAPTCHA has expired. Please refresh it and try again.' };
    }
    if (record.attempts >= record.maxAttempts) {
      this.captchaChallenges.delete(id);
      return { success: false, error: 'Too many incorrect CAPTCHA attempts. Please refresh it.' };
    }

    const expectedHash = this.hashCaptcha(providedCode, record.salt);
    const expected = Buffer.from(expectedHash);
    const provided = Buffer.from(record.answerHash);
    const matches = expected.length === provided.length && crypto.timingSafeEqual(expected, provided);

    if (!matches) {
      record.attempts += 1;
      if (record.attempts >= record.maxAttempts) this.captchaChallenges.delete(id);
      return {
        success: false,
        error: record.attempts >= record.maxAttempts
          ? 'Too many incorrect CAPTCHA attempts. Please refresh it.'
          : 'CAPTCHA is incorrect. Please try again.'
      };
    }

    record.used = true;
    this.captchaChallenges.delete(id);
    return { success: true };
  }

  createPasswordResetToken(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(`${token}:${JWT_SECRET}`).digest('hex');
    const expiresAt = Date.now() + 10 * 60 * 1000;

    // Only one active reset token per account.
    for (const [key, record] of this.passwordResetTokens.entries()) {
      if (record.email === normalizedEmail) this.passwordResetTokens.delete(key);
    }

    this.passwordResetTokens.set(tokenHash, {
      email: normalizedEmail,
      expiresAt,
      used: false
    });

    return { token, expiresAt };
  }

  verifyPasswordResetToken(email, token) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!token) return { success: false, error: 'Password reset verification is required.' };

    const tokenHash = crypto.createHash('sha256').update(`${token}:${JWT_SECRET}`).digest('hex');
    const record = this.passwordResetTokens.get(tokenHash);

    if (!record || record.used || record.email !== normalizedEmail) {
      return { success: false, error: 'Password reset verification is invalid or has expired. Please start again.' };
    }

    if (Date.now() > record.expiresAt) {
      this.passwordResetTokens.delete(tokenHash);
      return { success: false, error: 'Password reset verification has expired. Please start again.' };
    }

    record.used = true;
    this.passwordResetTokens.delete(tokenHash);
    return { success: true };
  }

  generateOtpCode() { return crypto.randomInt(100000, 1000000).toString(); }
  hashOtpWithSalt(otp, salt) { return crypto.createHash('sha256').update(`${otp}:${salt}:${JWT_SECRET}`).digest('hex'); }

  createOtp(email, type) {
    const normalizedEmail = email.trim().toLowerCase();
    const code = this.generateOtpCode();
    const salt = crypto.randomBytes(16).toString('hex');
    const record = { id: `otp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`, email: normalizedEmail, type, otpHash: this.hashOtpWithSalt(code, salt), salt, expiresAt: Date.now() + 600000, attempts: 0, maxAttempts: 5, resendAvailableAt: Date.now() + 60000, used: false, createdAt: Date.now() };
    this.otps.set(`${normalizedEmail}:${type}`, record);
    return { record, code };
  }

  createEmailVerificationToken(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 86400000;
    this.emailVerificationTokens.set(token, { email: normalizedEmail, expiresAt });
    const user = this.findByEmail(normalizedEmail);
    if (user) {
      user.verificationToken = token;
      user.verificationTokenExpiresAt = expiresAt;
      this.users.set(normalizedEmail, user);
      this.persistUsers();
    }
    return token;
  }

  verifyEmailToken(token) {
    const record = this.emailVerificationTokens.get(token);
    if (!record) return { success: false, error: 'Verification token is invalid or has already been used.' };
    if (Date.now() > record.expiresAt) { this.emailVerificationTokens.delete(token); return { success: false, error: 'Verification token has expired. Please request a new verification code.' }; }
    const user = this.findByEmail(record.email);
    if (!user) return { success: false, error: 'User account not found.' };
    user.emailVerified = true; user.verificationToken = null; user.verificationTokenExpiresAt = null;
    this.users.set(record.email, user); this.emailVerificationTokens.delete(token); this.persistUsers();
    return { success: true, user };
  }

  verifyOtp(email, type, providedCode) {
    const key = `${email.trim().toLowerCase()}:${type}`;
    const record = this.otps.get(key);
    if (!record || record.used) return { success: false, error: 'No active OTP found. Please request a new code.' };
    if (Date.now() > record.expiresAt) { this.otps.delete(key); return { success: false, error: 'This verification code has expired. Please request a new one.' }; }
    if (record.attempts >= record.maxAttempts) { record.used = true; return { success: false, error: 'Too many incorrect attempts. Please request a new code.' }; }
    const expectedHash = this.hashOtpWithSalt(providedCode.trim(), record.salt);
    if (crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(record.otpHash))) { record.used = true; this.otps.delete(key); return { success: true }; }
    record.attempts += 1;
    const remaining = record.maxAttempts - record.attempts;
    if (remaining <= 0) { record.used = true; return { success: false, error: 'Too many incorrect attempts. Code has been invalidated. Please request a new code.', remainingAttempts: 0 }; }
    return { success: false, error: `Incorrect verification code. ${remaining} attempts remaining.`, remainingAttempts: remaining };
  }

  getActiveOtp(email, type) { return this.otps.get(`${email.trim().toLowerCase()}:${type}`) || null; }

  createOAuthState(role, redirectOrigin) {
    const state = crypto.randomBytes(32).toString('hex');
    this.oauthStates.set(state, { state, role, redirectOrigin, createdAt: Date.now() });
    const cutoff = Date.now() - 900000;
    for (const [key, val] of this.oauthStates.entries()) if (val.createdAt < cutoff) this.oauthStates.delete(key);
    return state;
  }

  verifyAndConsumeOAuthState(state) {
    const record = this.oauthStates.get(state);
    if (!record || Date.now() - record.createdAt > 900000) { this.oauthStates.delete(state); return null; }
    this.oauthStates.delete(state); return record;
  }

  checkRateLimit(key, maxRequests, windowMs) {
    const now = Date.now(); const current = this.rateLimitMap.get(key);
    if (!current || now > current.resetAt) { this.rateLimitMap.set(key, { count: 1, resetAt: now + windowMs }); return { allowed: true }; }
    if (current.count >= maxRequests) return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
    current.count += 1; return { allowed: true };
  }
}

export const authDatabase = new AuthDatabase();
