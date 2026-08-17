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
