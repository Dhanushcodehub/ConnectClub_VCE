import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
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

      // Check both the normalized fields and the legacy raw fields. Legacy
      // rows may store un-normalized values (lowercase, spaces, +91 prefix),
      // so we query the legacy fields with the RAW client values too, and
      // additionally scan a canonicalized comparison over a small candidate
      // set to catch formatting-only duplicates.
      const rawRoll = String(rollNo || '').trim();
      const rawPhone = String(phone || '').replace(/\D/g, '').slice(-10);

      const [normalizedRollMatch, normalizedPhoneMatch, legacyRollMatch, legacyPhoneMatch, rawRollMatch, rawPhoneMatch] =
        await Promise.all([
          adminDb.collection('users').where('normalizedRollNo', '==', normalizedRollNo).limit(1).get(),
          adminDb.collection('users').where('normalizedPhone', '==', normalizedPhone).limit(1).get(),
          adminDb.collection('users').where('rollNo', '==', normalizedRollNo).limit(5).get(),
          adminDb.collection('users').where('phone', '==', normalizedPhone).limit(5).get(),
          adminDb.collection('users').where('rollNo', '==', rawRoll).limit(5).get(),
          adminDb.collection('users').where('phone', '==', rawPhone).limit(5).get(),
        ]);

      // Canonicalize a legacy row so " 12345-a " vs "12345A" compare equal.
      const canon = (v: unknown) => String(v ?? '').replace(/[\s\-_.]/g, '').toUpperCase();
      const canonPhone = (v: unknown) => String(v ?? '').replace(/\D/g, '').slice(-10);

      const rollCandidates = [
        ...normalizedRollMatch.docs,
        ...legacyRollMatch.docs,
        ...rawRollMatch.docs,
      ];
      const isRollDup =
        rollCandidates.length > 0 &&
        rollCandidates.some((d) => canon(d.data().rollNo) === canon(normalizedRollNo));

      const phoneCandidates = [
        ...normalizedPhoneMatch.docs,
        ...legacyPhoneMatch.docs,
        ...rawPhoneMatch.docs,
      ];
      const isPhoneDup =
        phoneCandidates.length > 0 &&
        phoneCandidates.some((d) => canonPhone(d.data().phone) === canonPhone(normalizedPhone));

      if (isRollDup) {
        return NextResponse.json({ error: 'This roll number is already registered.' }, { status: 409 });
      }
      if (isPhoneDup) {
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

      // 4. Generate 6-digit OTP with the platform CSPRNG (Math.random is
      // predictable and unusable for security codes).
      const otp = String(randomInt(100000, 1000000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // 5. Store OTP in Firestore. lastSentAt feeds the resend-otp cooldown
      // so the very first resend is also throttled.
      await adminDb.collection('email_otps').doc(normalizedEmail).set({
        otp,
        expiresAt,
        lastSentAt: new Date(),
        attempts: 0,
        createdAt: new Date()
      });

      // 6. Send OTP Email using Resend (or fallback to Nodemailer)
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
          <h2 style="color: #2563eb;">Verify Your Email</h2>
          <p style="font-size: 16px; color: #4b5563;">Thank you for registering with Connect Club! Please use the verification code below to complete your registration:</p>
          <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827;">${otp}</span>
          </div>
          <p style="font-size: 14px; color: #6b7280;">This code will expire in 10 minutes.</p>
          <p style="font-size: 14px; color: #ef4444; margin-top: 20px;"><strong>Note:</strong> If you did not request this, please ignore this email.</p>
        </div>
      `;

      if (process.env.RESEND_API_KEY) {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY.trim());
        let fromEmail = (process.env.RESEND_FROM_EMAIL || 'Connect Club <noreply@connectclubvce.tech>').trim();
        // Remove enclosing quotes if added in Vercel UI
        fromEmail = fromEmail.replace(/^["']|["']$/g, '');
        if (!fromEmail.includes('<') && !fromEmail.includes('>')) {
          fromEmail = `Connect Club <${fromEmail}>`;
        }
        
        const { error: resendError } = await resend.emails.send({
          from: fromEmail,
          to: normalizedEmail,
          subject: 'Connect Club - Verification Code',
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
          subject: 'Connect Club - Verification Code',
          html: emailHtml,
        });
      }

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
