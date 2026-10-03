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

    const normalizedEmail = String(email).toLowerCase().trim();

    const adminModule = await import('@/lib/firebase/admin');
    const getAdminDb = adminModule.getAdminDb;
    const adminDb = getAdminDb();

    // 1. Check if user exists (optional, but good for security)
    const getAdminAuth = adminModule.getAdminAuth;
    const adminAuth = getAdminAuth();
    try {
      await adminAuth.getUserByEmail(normalizedEmail);
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
    const otpDocRef = adminDb.collection('email_otps').doc(normalizedEmail);
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

    // 3. Preserve the pending registration fields and reset only the OTP state.
    // Using set() here would overwrite the existing document and wipe out
    // pendingProfile / uid / previous OTP metadata.
    const existingData = existingOtp.exists ? existingOtp.data() : null;
    const nextOtpData = {
      otp,
      expiresAt,
      lastSentAt: new Date(),
      createdAt: existingData?.createdAt ?? new Date(),
      attempts: 0,
      lockedUntil: null,
      uid: existingData?.uid ?? null,
      pendingProfile: existingData?.pendingProfile ?? null,
    };

    if (existingOtp.exists) {
      await otpDocRef.update(nextOtpData);
    } else {
      await otpDocRef.set(nextOtpData);
    }

    // 4. Send OTP Email using Resend (or fallback to Nodemailer)
    const { getOtpEmailHtml } = await import('@/lib/email/otpTemplate');
    const emailHtml = getOtpEmailHtml(otp);

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY.trim());
      let fromEmail = (process.env.RESEND_FROM_EMAIL || 'Connect Club <noreply@connectclubvce.tech>').trim();
      // Remove enclosing quotes if added in Vercel UI
      fromEmail = fromEmail.replace(/^['"]|['"]$/g, '');
      if (!fromEmail.includes('<') && !fromEmail.includes('>')) {
        fromEmail = `Connect Club <${fromEmail}>`;
      }

      const { error: resendError } = await resend.emails.send({
        from: fromEmail,
        to: normalizedEmail,
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
        to: normalizedEmail,
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
