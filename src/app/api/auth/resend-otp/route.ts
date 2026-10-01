import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Cooldown between resend requests to prevent email bombing.
  const RESEND_COOLDOWN_MS = 60 * 1000;
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const adminModule = await import('@/lib/firebase/admin');
    const getAdminDb = adminModule.getAdminDb;
    const adminDb = getAdminDb();

    // 1. Check if user exists (optional, but good for security)
    const getAdminAuth = adminModule.getAdminAuth;
    const adminAuth = getAdminAuth();
    try {
      await adminAuth.getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: 'No user found with this email' },
          { status: 404 }
        );
      }
      throw error;
    }

    // 1b. Rate limit: without this the endpoint is an email-bombing vector
    // (it triggers a real email per call) and lets attackers burn through
    // codes to reset the verify-attempt counter.
    const otpDocRef = adminDb.collection('email_otps').doc(email.toLowerCase());
    const existingOtp = await otpDocRef.get();
    if (existingOtp.exists) {
      const lastSentAt = existingOtp.data()?.lastSentAt?.toDate?.() ?? null;
      if (lastSentAt && Date.now() - lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
        const waitSeconds = Math.ceil(
          (RESEND_COOLDOWN_MS - (Date.now() - lastSentAt.getTime())) / 1000
        );
        return NextResponse.json(
          { error: `Please wait ${waitSeconds}s before requesting another code.` },
          { status: 429 }
        );
      }
    }

    // 2. Generate 6-digit OTP with the platform CSPRNG (Math.random is
    // predictable and unusable for security codes).
    const otp = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 3. Store OTP in Firestore
    await otpDocRef.set({
      otp,
      expiresAt,
      lastSentAt: new Date(),
      createdAt: new Date()
    });

    // 4. Send OTP Email using Resend (or fallback to Nodemailer)
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
        <h2 style="color: #2563eb;">Verify Your Email</h2>
        <p style="font-size: 16px; color: #4b5563;">You requested a new verification code. Please use the code below to verify your email:</p>
        <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #6b7280;">This code will expire in 10 minutes.</p>
        <p style="font-size: 14px; color: #ef4444; margin-top: 20px;"><strong>Note:</strong> If you did not request this, please ignore this email.</p>
      </div>
    `;

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'Connect Club <noreply@connectclubvce.tech>';
      
      const { error: resendError } = await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: 'Connect Club - New Verification Code',
        html: emailHtml,
      });

      if (resendError) {
        throw new Error(resendError.message || 'Failed to send verification email via Resend');
      }
    } else {
      const nodemailer = await import('nodemailer');
      const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
      const smtpPort = Number(process.env.SMTP_PORT) || 465;
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"Connect Club" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Connect Club - New Verification Code',
        html: emailHtml,
      });
    }

    return NextResponse.json({ success: true, message: "OTP resent successfully" }, { status: 200 });
  } catch (error: any) {
    console.error('Error resending OTP:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
