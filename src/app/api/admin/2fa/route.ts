/**
 * POST /api/admin/2fa
 *
 * Persists the admin 2FA enrollment flag to `admins/{uid}` on behalf of the
 * signed-in admin.
 *
 * Client-side Firestore rules deny writes to `admins/*` (`allow write: if
 * false`) so the secret/toggle can only be mutated through the Admin SDK,
 * keeping the collection forgery-proof. Reads remain client-side (the admin
 * can read their own document).
 *
 * NOTE: This is a cosmetic 2FA gate. The TOTP secret is stored in a document
 * the admin themselves can read, and verification happens client-side during
 * login. It is not real MFA — genuine server-enforced 2FA requires Firebase's
 * multi-factor authentication (Blaze plan only).
 *
 * Body: { twoFactorEnabled: boolean, twoFactorSecret?: string | null }
 */
import { NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/firebase/requestAuth";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const adminToken = await requireAdminRequest(request);

    const body = await request.json().catch(() => ({}));
    const twoFactorEnabled = Boolean(body.twoFactorEnabled);
    const twoFactorSecret =
      typeof body.twoFactorSecret === "string" ? body.twoFactorSecret : null;

    if (twoFactorEnabled && !twoFactorSecret) {
      return NextResponse.json(
        { error: "A TOTP secret is required when enabling 2FA." },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    await db.collection("admins").doc(adminToken.uid).set(
      { twoFactorEnabled, twoFactorSecret },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized: Admin authentication required." }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }
    if (message.startsWith("ADMIN_SDK_NOT_CONFIGURED")) {
      return NextResponse.json(
        { error: "Server is missing Firebase Admin credentials (FIREBASE_* env vars)." },
        { status: 500 }
      );
    }
    console.error("Admin 2FA update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}