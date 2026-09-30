import { NextResponse } from 'next/server';
import {
  normalizeEmail,
  normalizePhone,
  normalizeRollNo,
  validateRegistrationIdentity,
} from '@/lib/registrations/validation';

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
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedRollNo = normalizeRollNo(rollNo);
    const normalizedPhone = normalizePhone(phone);
    const validationError = validateRegistrationIdentity({
      name,
      rollNo: normalizedRollNo,
      email: normalizedEmail,
      phone: normalizedPhone,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    let uid: string | undefined;
    try {
      const adminModule = await import('@/lib/firebase/admin');
      const getAdminAuth = adminModule.getAdminAuth;
      const getAdminDb = adminModule.getAdminDb;
      const adminAuth = getAdminAuth();
      const adminDb = getAdminDb();

      const [normalizedRollMatch, normalizedPhoneMatch, legacyRollMatch, legacyPhoneMatch] =
        await Promise.all([
          adminDb.collection('users').where('normalizedRollNo', '==', normalizedRollNo).limit(1).get(),
          adminDb.collection('users').where('normalizedPhone', '==', normalizedPhone).limit(1).get(),
          adminDb.collection('users').where('rollNo', '==', normalizedRollNo).limit(1).get(),
          adminDb.collection('users').where('phone', '==', normalizedPhone).limit(1).get(),
        ]);

      if (!normalizedRollMatch.empty || !legacyRollMatch.empty) {
        return NextResponse.json({ error: 'This roll number is already registered.' }, { status: 409 });
      }
      if (!normalizedPhoneMatch.empty || !legacyPhoneMatch.empty) {
        return NextResponse.json({ error: 'This phone number is already registered.' }, { status: 409 });
      }

      // 1. Create Firebase Auth user
      const userRecord = await adminAuth.createUser({
        email: normalizedEmail,
        password,
        displayName: name.trim(),
      });
      uid = userRecord.uid;

      // 2. Set custom claim for RBAC
      await adminAuth.setCustomUserClaims(uid, { role: 'user' });

      // 3. Create user profile document in Firestore
      await adminDb.collection('users').doc(uid).set({
        uid,
        name: name.trim(),
        email: normalizedEmail,
        rollNo: normalizedRollNo,
        phone: normalizedPhone,
        normalizedRollNo,
        normalizedPhone,
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
      await adminDb.collection('email_otps').doc(normalizedEmail).set({
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
        to: normalizedEmail,
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

    } catch (firebaseError: unknown) {
      const errorCode = typeof firebaseError === "object" && firebaseError !== null && "code" in firebaseError
        ? firebaseError.code
        : undefined;
      if (errorCode === 'auth/email-already-exists') {
        return NextResponse.json(
          { error: 'An account with this email already exists.' },
          { status: 409 }
        );
      }
      if (uid) {
        try {
          const adminModule = await import('@/lib/firebase/admin');
          await adminModule.getAdminAuth().deleteUser(uid);
          await adminModule.getAdminDb().collection('users').doc(uid).delete();
          await adminModule.getAdminDb().collection('email_otps').doc(normalizedEmail).delete();
        } catch (cleanupError) {
          console.error('Registration cleanup failed:', cleanupError);
        }
      }
      throw firebaseError;
    }

    return NextResponse.json({ success: true, uid }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
