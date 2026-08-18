import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    const normalizedEmail = email.toLowerCase();

    // 1. Fetch the OTP record
    const otpDoc = await adminDb.collection('email_otps').doc(normalizedEmail).get();
    
    if (!otpDoc.exists) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP.' },
        { status: 400 }
      );
    }

    const data = otpDoc.data()!;
    
    // 2. Check expiration
    if (data.expiresAt.toDate() < new Date()) {
      await adminDb.collection('email_otps').doc(normalizedEmail).delete();
      return NextResponse.json(
        { error: 'OTP has expired. Please register again or request a new code.' },
        { status: 400 }
      );
    }

    // 3. Verify OTP
    if (data.otp !== otp.toString()) {
      return NextResponse.json(
        { error: 'Incorrect OTP. Please try again.' },
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

    // 5. Delete OTP record after successful verification
    await adminDb.collection('email_otps').doc(normalizedEmail).delete();

    return NextResponse.json({ success: true, uid: userRecord.uid });

  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
