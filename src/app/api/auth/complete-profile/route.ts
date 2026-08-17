import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { uid, name, email, rollNo, phone, department, yearOfStudy, photoURL } = await req.json();

    if (!uid || !name || !email || !rollNo || !phone) {
      return NextResponse.json(
        { error: 'UID, name, email, roll number, and phone are required' },
        { status: 400 }
      );
    }

    try {
      const adminModule = await import('@/lib/firebase/admin');
      const getAdminAuth = adminModule.getAdminAuth;
      const getAdminDb = adminModule.getAdminDb;
      const adminAuth = getAdminAuth();
      const adminDb = getAdminDb();

      // 1. Set custom claim for the Google user
      await adminAuth.setCustomUserClaims(uid, { role: 'user' });

      // 2. Create user profile in Firestore
      await adminDb.collection('users').doc(uid).set({
        uid,
        name,
        email,
        rollNo,
        phone,
        department: department || '',
        yearOfStudy: yearOfStudy || '',
        provider: 'google',
        photoURL: photoURL || '',
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
      throw firebaseError;
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Error completing profile:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
