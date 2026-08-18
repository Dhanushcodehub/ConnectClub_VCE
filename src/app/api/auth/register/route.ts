import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password, name, rollNo, phone, department, yearOfStudy } = await req.json();

    if (!email || !password || !name || !rollNo || !phone) {
      return NextResponse.json(
        { error: 'Name, email, password, roll number, and phone are required' },
        { status: 400 }
      );
    }

    let uid;
    try {
      const adminModule = await import('@/lib/firebase/admin');
      const getAdminAuth = adminModule.getAdminAuth;
      const getAdminDb = adminModule.getAdminDb;
      const adminAuth = getAdminAuth();
      const adminDb = getAdminDb();

      // 1. Create Firebase Auth user
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name,
      });
      uid = userRecord.uid;

      // 2. Set custom claim for RBAC
      await adminAuth.setCustomUserClaims(uid, { role: 'user' });

      // 3. Create user profile document in Firestore
      await adminDb.collection('users').doc(uid).set({
        uid,
        name,
        email,
        rollNo,
        phone,
        department: department || '',
        yearOfStudy: yearOfStudy || '',
        provider: 'email',
        photoURL: '',
        bio: '',
        linkedinUrl: '',
        githubUrl: '',
        projectsCount: 0,
        likesReceived: 0,
        commentsCount: 0,
        certificatesCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 4. Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // 5. Store OTP in Firestore
      await adminDb.collection('email_otps').doc(email.toLowerCase()).set({
        otp,
        expiresAt,
        createdAt: new Date()
      });

      // 6. Send OTP Email using Nodemailer
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
        subject: 'Connect Club - Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
            <h2 style="color: #2563eb;">Verify Your Email</h2>
            <p style="font-size: 16px; color: #4b5563;">Thank you for registering with Connect Club! Please use the verification code below to complete your registration:</p>
            <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827;">${otp}</span>
            </div>
            <p style="font-size: 14px; color: #6b7280;">This code will expire in 10 minutes.</p>
            <p style="font-size: 14px; color: #ef4444; margin-top: 20px;"><strong>Note:</strong> If you did not request this, please ignore this email.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);

    } catch (firebaseError: any) {
      if (firebaseError.code === 'auth/email-already-exists') {
        return NextResponse.json(
          { error: 'An account with this email already exists.' },
          { status: 409 }
        );
      }
      throw firebaseError;
    }

    return NextResponse.json({ success: true, uid }, { status: 201 });
  } catch (error: any) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
