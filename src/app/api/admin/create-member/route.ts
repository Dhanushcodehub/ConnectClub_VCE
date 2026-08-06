import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password, displayName } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    let uid;
    try {
      // DYNAMICALLY import firebase admin to bypass Vercel module load errors
      const adminModule = await import('@/lib/firebase/admin');
      const getAdminAuth = adminModule.getAdminAuth;
      const adminAuth = getAdminAuth();
      
      // 1. Create the user
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName,
      });
      uid = userRecord.uid;

      // 2. Set Custom Claim for RBAC
      await adminAuth.setCustomUserClaims(uid, { role: 'member' });

    } catch (firebaseError: any) {
      if (firebaseError.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'User with this email already exists in Firebase Auth.' }, { status: 409 });
      }
      throw firebaseError;
    }

    return NextResponse.json({ success: true, uid }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating member auth:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
