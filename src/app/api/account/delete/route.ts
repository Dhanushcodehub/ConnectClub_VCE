import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/admin";
import { requireUserRequest, authErrorResponse } from "@/lib/firebase/requestAuth";
import { logAuditEvent } from "@/lib/firebase/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CASCADE = 500;

async function deleteOwnedByUid(db: ReturnType<typeof getFirestore>, uid: string) {
  const deleted: Record<string, number> = {};

  for (const collectionName of ["user_projects", "notifications"]) {
    const snap = await db
      .collection(collectionName)
      .where("userId", "==", uid)
      .limit(MAX_CASCADE)
      .get();

    if (!snap.empty) {
      const batch = db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
    deleted[collectionName] = snap.size;
  }

  return deleted;
}

/**
 * POST /api/account/delete
 *
 * Self-service hard delete for a regular user account.
 *
 * Removes the Firestore profile, the user's notifications and their projects,
 * then deletes the Firebase Auth record. Certificate and ticket records are
 * deliberately kept — they are club-issued proof of attendance, not personal
 * profile data.
 *
 * Body: { confirm: "<the account email>" }
 */
export async function POST(request: Request) {
  let token;
  try {
    token = await requireUserRequest(request);
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const confirm = typeof body.confirm === "string" ? body.confirm.trim().toLowerCase() : "";

    if (!token.email || confirm !== token.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Confirmation must exactly match your account email." },
        { status: 400 }
      );
    }

    const app = getAdminApp();
    const db = getFirestore(app);
    const auth = getAuth(app);

    const profileSnap = await db.collection("users").doc(token.uid).get();
    if (!profileSnap.exists) {
      // Already removed — still drop the auth record below.
      console.warn(`account/delete: no profile for ${token.uid}`);
    }

    const profileData = profileSnap.exists ? profileSnap.data()! : {};
    const role = String(profileData.role || token.role || "user");

    // Staff accounts must be removed through the admin panel so the club does
    // not silently lose its own operators.
    if (role === "admin" || role === "member") {
      return NextResponse.json(
        { error: "Staff accounts cannot self-delete. Ask an administrator." },
        { status: 403 }
      );
    }

    const deleted = await deleteOwnedByUid(db, token.uid);
    await db.collection("users").doc(token.uid).delete();

    try {
      await auth.deleteUser(token.uid);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code !== "auth/user-not-found") throw error;
    }

    await logAuditEvent(db, {
      actorUid: token.uid,
      actorEmail: token.email,
      action: "account.deleted",
      targetType: "user",
      targetId: token.uid,
      meta: {
        name: profileData.name ?? "",
        rollNo: profileData.rollNo ?? "",
        deleted,
      },
    });

    return NextResponse.json({ success: true, deleted });
  } catch (error: unknown) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Account deletion failed:", error);
    return NextResponse.json({ error: "Account deletion failed." }, { status: 500 });
  }
}
