import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
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

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 3. Store OTP in Firestore
    await adminDb.collection('email_otps').doc(email.toLowerCase()).set({
      otp,
      expiresAt,
      createdAt: new Date()
    });

    // 4. Send OTP Email using Nodemailer
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"Connect Club" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Connect Club - New Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
          <h2 style="color: #2563eb;">Verify Your Email</h2>
          <p style="font-size: 16px; color: #4b5563;">You requested a new verification code. Please use the code below to verify your email:</p>
          <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827;">${otp}</span>
          </div>
          <p style="font-size: 14px; color: #6b7280;">This code will expire in 10 minutes.</p>
          <p style="font-size: 14px; color: #ef4444; margin-top: 20px;"><strong>Note:</strong> If you did not request this, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "OTP resent successfully" }, { status: 200 });
  } catch (error: any) {
    console.error('Error resending OTP:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
