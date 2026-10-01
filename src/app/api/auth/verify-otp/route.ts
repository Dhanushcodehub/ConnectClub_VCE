import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Brute-force resistance: an attacker has 10 minutes (OTP TTL) per code, so
// cap the guesses well below the 1,000,000 possible 6-digit codes.
const MAX_OTP_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

/** Constant-time comparison of two OTP strings of equal padded length. */
function otpMatches(provided: string, stored: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(stored).digest();
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    const adminModule = await import('@/lib/firebase/admin');
    const getAdminAuth = adminModule.getAdminAuth;
    const getAdminDb = adminModule.getAdminDb;
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    const normalizedEmail = String(email).toLowerCase().trim();

    // 1. Fetch the OTP record
    const otpRef = adminDb.collection('email_otps').doc(normalizedEmail);
    const otpDoc = await otpRef.get();

    if (!otpDoc.exists) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP.' },
        { status: 400 }
      );
    }

    const data = otpDoc.data()!;

    // 2. Check expiration
    if (data.expiresAt.toDate() < new Date()) {
      await otpRef.delete();
      return NextResponse.json(
        { error: 'OTP has expired. Please register again or request a new code.' },
        { status: 400 }
      );
    }

    // 2b. Enforce attempt limit. The counter resets on success.
    const attempts = Number(data.attempts || 0);
    const lockedUntil = data.lockedUntil ? data.lockedUntil.toDate() : null;
    if (lockedUntil && lockedUntil > new Date()) {
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    // 3. Verify OTP (constant-time; never reveal whether it was close)
    if (typeof otp !== 'string' || !otpMatches(otp, String(data.otp))) {
      const newAttempts = attempts + 1;
      if (newAttempts >= MAX_OTP_ATTEMPTS) {
        // Invalidate immediately and require a fresh code.
        await otpRef.delete();
        return NextResponse.json(
          { error: 'Too many incorrect attempts. Please request a new code.' },
          { status: 429 }
        );
      }
      await otpRef.update({
        attempts: newAttempts,
      });
      const remaining = MAX_OTP_ATTEMPTS - newAttempts;
      return NextResponse.json(
        { error: `Incorrect OTP. Please try again (${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining).` },
        { status: 400 }
      );
    }

    // 4. Update user's emailVerified status in Firebase Auth
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(normalizedEmail);
      await adminAuth.updateUser(userRecord.uid, {
        emailVerified: true
      });
    } catch (e: any) {
      return NextResponse.json(
        { error: 'User not found in authentication system.' },
        { status: 404 }
      );
    }

    // 5. Persist user document in Firestore 'users' collection ONLY NOW after OTP is confirmed
    if (data.pendingProfile) {
      const profileData = {
        ...data.pendingProfile,
        uid: userRecord.uid,
        email: normalizedEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await adminDb.collection('users').doc(userRecord.uid).set(profileData, { merge: true });
    }

    // 6. Delete OTP record after successful verification
    await otpRef.delete();

    return NextResponse.json({ success: true, uid: userRecord.uid });

  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
