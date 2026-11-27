import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/admin";
import { requireUserRequest, authErrorResponse } from "@/lib/firebase/requestAuth";
import { logAuditEvent } from "@/lib/firebase/auditLog";
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 200;

async function deleteOwnedByUid(db: ReturnType<typeof getFirestore>, uid: string) {
  const deleted: Record<string, number> = { user_projects: 0, notifications: 0 };

  for (const collectionName of ["user_projects", "notifications"] as const) {
    while (true) {
      const snap = await db
        .collection(collectionName)
        .where("userId", "==", uid)
        .limit(BATCH_SIZE)
        .get();
      if (snap.empty) break;

      if (collectionName === "user_projects") {
        for (const projDoc of snap.docs) {
          const commentsSnap = await projDoc.ref.collection("comments").limit(500).get();
          if (!commentsSnap.empty) {
            const commentBatch = db.batch();
            commentsSnap.docs.forEach((c) => commentBatch.delete(c.ref));
            await commentBatch.commit();
          }
        }
      }

      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deleted[collectionName] += snap.size;

      if (snap.size < BATCH_SIZE) break;
    }
  }

  return deleted;
}

export async function POST(request: Request) {
  let token;
  try {
    token = await requireUserRequest(request);
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit({
    namespace: "account:delete",
    identifier: `${token.uid}:${getClientIp(request)}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.allowed) {
    return rateLimitExceededResponse(rl);
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

    // Enforce recent sign-in (<= 30 minutes) before destructive account deletion.
    const authTime = typeof token.auth_time === "number" ? token.auth_time * 1000 : 0;
    if (!authTime || Date.now() - authTime > 30 * 60 * 1000) {
      return NextResponse.json(
        { error: "Please sign out and sign back in recently before deleting your account." },
        { status: 403 }
      );
    }

    const app = getAdminApp();
    const db = getFirestore(app);
    const auth = getAuth(app);

    // Determine staff status strictly from trusted token/collections (never users/{uid}.role).
    const isStaff =
      token.role === "admin" ||
      token.role === "superadmin" ||
      token.role === "member" ||
      (token.email === "admin@connectclubvce.in" && token.email_verified === true);
    if (isStaff) {
      return NextResponse.json(
        { error: "Staff accounts cannot self-delete. Ask an administrator." },
        { status: 403 }
      );
    }

    const profileSnap = await db.collection("users").doc(token.uid).get();
    const profileData = profileSnap.exists ? profileSnap.data()! : {};

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
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Account deletion failed:", error);
    return NextResponse.json({ error: "Account deletion failed." }, { status: 500 });
  }
}
