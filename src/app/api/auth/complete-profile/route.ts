import { NextResponse } from 'next/server';
import { requireUserRequest, authErrorResponse } from '@/lib/firebase/requestAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/**
 * POST /api/auth/complete-profile
 *
 * Finishes onboarding for a freshly signed-in Google user.
 *
 * Hardened: the request must carry a valid Firebase ID token, and both `uid`
 * and `email` are taken from that token — never from the body. Without this,
 * anyone could call the endpoint and create/overwrite another user's profile
 * document or assign them a role claim.
 */
export async function POST(req: Request) {
  let token;
  try {
    token = await requireUserRequest(req);
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    const uid = token.uid;
    const email = (token.email || str(body.email, 254)).toLowerCase();
    const name = str(body.name, 100);
    const rollNo = str(body.rollNo, 20);
    const phone = str(body.phone, 20);
    const department = str(body.department, 60);
    const yearOfStudy = str(body.yearOfStudy, 30);
    const photoURL = str(body.photoURL, 2048);

    if (!uid || !email) {
      return NextResponse.json({ error: 'Authenticated email is required' }, { status: 400 });
    }

    if (!name || !rollNo || !phone) {
      return NextResponse.json(
        { error: 'UID, name, email, roll number, and phone are required' },
        { status: 400 }
      );
    }

    if (name.length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
    }

    const adminModule = await import('@/lib/firebase/admin');
    const adminAuth = adminModule.getAdminAuth();
    const adminDb = adminModule.getAdminDb();

    // Preserve an existing staff/admin role instead of demoting the account.
    let role = 'user';
    try {
      const record = await adminAuth.getUser(uid);
      const existingRole = (record.customClaims as Record<string, unknown> | undefined)?.role;
      if (typeof existingRole === 'string' && existingRole.length > 0) {
        role = existingRole;
      }
    } catch (error) {
      console.warn('Could not read existing claims during profile completion:', error);
    }

    // 1. Set custom claim for the Google user (role preserved if already staff)
    await adminAuth.setCustomUserClaims(uid, { role });

    // 2. Create the user profile in Firestore. Re-running onboarding must not
    //    wipe fields the user has since edited (bio, socials, counters), so
    //    only the onboarding fields are written and `createdAt` is preserved.
    const userRef = adminDb.collection('users').doc(uid);
    const existing = await userRef.get();
    const profile = {
      uid,
      name,
      email,
      rollNo,
      phone,
      department,
      yearOfStudy,
      provider: 'google',
      photoURL,
      updatedAt: new Date(),
      ...(existing.exists
        ? {}
        : {
            bio: '',
            linkedinUrl: '',
            githubUrl: '',
            projectsCount: 0,
            likesReceived: 0,
            commentsCount: 0,
            certificatesCount: 0,
            createdAt: new Date(),
          }),
    };

    await userRef.set(profile, { merge: true });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    const authError = authErrorResponse(error);
    if (authError) return authError;

    console.error('Error completing profile:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
