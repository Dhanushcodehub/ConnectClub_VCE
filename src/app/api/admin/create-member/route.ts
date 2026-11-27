import { NextResponse } from "next/server";
import { requireAdminRequest, authErrorResponse } from "@/lib/firebase/requestAuth";
import { logAuditEvent } from "@/lib/firebase/auditLog";
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export async function POST(req: Request) {
  let adminToken;
  try {
    adminToken = await requireAdminRequest(req);
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit({
    namespace: "admin:create-member",
    identifier: `${adminToken.uid}:${getClientIp(req)}`,
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) {
    return rateLimitExceededResponse(rl);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const { email, password, displayName } = body as Record<string, unknown>;

    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail) || cleanEmail.length > 254) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json(
        { error: "Password must be between 8 and 128 characters." },
        { status: 400 }
      );
    }

    const cleanName = typeof displayName === "string" ? displayName.trim().slice(0, 100) : "";

    const { getAdminAuth, getAdminDb } = await import("@/lib/firebase/admin");
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    let uid: string;
    try {
      const userRecord = await adminAuth.createUser({
        email: cleanEmail,
        password,
        ...(cleanName ? { displayName: cleanName } : {}),
        emailVerified: true,
      });
      uid = userRecord.uid;
      await adminAuth.setCustomUserClaims(uid, { role: "member" });
    } catch (firebaseError: unknown) {
      const code = (firebaseError as { code?: string })?.code;
      if (code === "auth/email-already-exists") {
        return NextResponse.json(
          { error: "User with this email already exists in Firebase Auth." },
          { status: 409 }
        );
      }
      throw firebaseError;
    }

    await logAuditEvent(adminDb, {
      actorUid: adminToken.uid,
      actorEmail: adminToken.email ?? null,
      action: "create_member_auth",
      targetType: "user",
      targetId: uid,
      meta: { email: cleanEmail },
    });

    return NextResponse.json({ success: true, uid }, { status: 201 });
  } catch (error) {
    console.error("Error creating member auth:", error);
    return NextResponse.json({ error: "Failed to create member account." }, { status: 500 });
  }
}
