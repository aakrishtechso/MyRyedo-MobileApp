/**
 * MyRyedo Real Email Delivery Service
 * Uses nodemailer with real SMTP configuration (e.g., Sendgrid, Mailgun, Amazon SES, Brevo, Gmail SMTP).
 * When SMTP credentials are provided, delivers actual verification emails and OTPs to real inboxes.
 * Never leaks codes or tokens to frontend or API responses.
 */

import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = null;
    this.configured = false;
    this.fromAddress = 'MyRyedo <no-reply@myryedo.in>';
    this.initTransporter();
  }

  initTransporter() {
    const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
    const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
    const user = process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
    const secure = process.env.SMTP_SECURE !== undefined 
      ? String(process.env.SMTP_SECURE).toLowerCase() === 'true' 
      : port === 465;

    this.fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'MyRyedo <no-reply@myryedo.in>';

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass }
        });
        this.configured = true;
        console.log(`[EmailService] SMTP transporter initialized successfully (${host}:${port})`);
      } catch (err) {
        console.error('[EmailService] Failed to initialize SMTP transporter:', err);
        this.transporter = null;
        this.configured = false;
      }
    } else {
      this.transporter = null;
      this.configured = false;
      console.log('[EmailService] SMTP credentials not provided in environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS). Running in development fallback mode.');
    }
  }

  isConfigured() {
    if (!this.configured) {
      this.initTransporter();
    }
    return this.configured;
  }

  async sendMail(options) {
    if (!this.configured || !this.transporter) {
      this.initTransporter();
    }

    if (!this.configured || !this.transporter) {
      console.log(`[EmailService] (SMTP optional in development) Simulated email dispatched to: ${options.to}`);
      console.log(`[EmailService] Subject: ${options.subject}`);
      if (options.text) {
        console.log(`[EmailService] Content:\n${options.text}`);
      }
      return {
        success: true,
        delivered: false,
        simulated: true,
        message: 'SMTP not configured; simulated email delivery in development mode.'
      };
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      });
      return { success: true, delivered: true };
    } catch (err) {
      console.error(`[EmailService] Failed to deliver email to ${options.to}:`, err);
      return { success: false, error: err.message || 'Failed to deliver email.' };
    }
  }

  /**
   * Send Email Verification (includes both 6-digit OTP and one-click verification link)
   */
  async sendVerificationEmail(to, name, code, verifyUrl) {
    const subject = `Verify your MyRyedo account - Code: ${code}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px; color: #1e293b; background-color: #ffffff;">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 22px; font-weight: 800; color: #FF6400; letter-spacing: -0.5px;">MyRyedo</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #0f172a;">Verify your email address</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
          Hi ${name || 'there'},<br>
          Thank you for registering with MyRyedo. Please verify your email address to complete your account setup.
        </p>
        
        <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #9a3412; letter-spacing: 0.05em; margin-bottom: 8px;">Your 6-Digit Verification Code</span>
          <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 0.3em; color: #c2410c;">${code}</span>
          <p style="font-size: 12px; color: #ea580c; margin: 8px 0 0 0;">Valid for 10 minutes. Do not share this code with anyone.</p>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <p style="font-size: 13px; color: #64748b; margin-bottom: 12px;">Or click the secure verification button below:</p>
          <a href="${verifyUrl}" style="display: inline-block; background-color: #FF6400; color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none;">Verify Email Address</a>
        </div>

        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          If you did not request this email, you can safely ignore it.
        </p>
      </div>
    `;

    const text = `Hi ${name || 'there'},\n\nYour MyRyedo verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nOr verify directly by visiting:\n${verifyUrl}\n\n- The MyRyedo Team`;

    return this.sendMail({ to, subject, html, text });
  }

  /**
   * Send Password Reset Code
   */
  async sendPasswordResetEmail(to, code) {
    const subject = `MyRyedo Password Reset Code - ${code}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px; color: #1e293b; background-color: #ffffff;">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 22px; font-weight: 800; color: #FF6400; letter-spacing: -0.5px;">MyRyedo</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #0f172a;">Password Reset Request</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
          We received a request to reset the password for your MyRyedo account. Use the verification code below to proceed:
        </p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; margin-bottom: 8px;">Reset Code</span>
          <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 0.3em; color: #0f172a;">${code}</span>
          <p style="font-size: 12px; color: #64748b; margin: 8px 0 0 0;">Valid for 10 minutes. Never share this code.</p>
        </div>

        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          If you did not request a password reset, please secure your account immediately or ignore this message.
        </p>
      </div>
    `;

    const text = `Your MyRyedo password reset code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\n- The MyRyedo Team`;

    return this.sendMail({ to, subject, html, text });
  }
}

export const emailService = new EmailService();
