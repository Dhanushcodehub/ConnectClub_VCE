/**
 * GET / POST /api/admin/2fa
 *
 * Server-enforced TOTP two-factor authentication management and verification.
 * Secrets are stored exclusively in `admin_secrets/{uid}` (`allow read, write:
 * if false` in Firestore rules) and verification issues an HMAC-signed HttpOnly
 * session cookie (`cc_admin_2fa`) bound to the admin's `uid`.
 */
import { NextResponse } from "next/server";
import { authenticator } from "otplib";
import { requireAdminRequest, authErrorResponse } from "@/lib/firebase/requestAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { logAuditEvent } from "@/lib/firebase/auditLog";
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/security/rateLimit";
import {
  ADMIN_2FA_COOKIE_NAME,
  createTwoFactorCookieValue,
  parseCookieHeader,
  verifyTwoFactorCookieValue,
} from "@/lib/security/admin2fa";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isProd = process.env.NODE_ENV === "production";

function attach2FACookie(response: NextResponse, uid: string) {
  const value = createTwoFactorCookieValue(uid);
  if (!value) {
    throw new Error("ADMIN_2FA_SIGNING_UNAVAILABLE");
  }
  response.cookies.set({
    name: ADMIN_2FA_COOKIE_NAME,
    value,
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
}

function clear2FACookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_2FA_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export async function GET(request: Request) {
  let adminToken;
  try {
    adminToken = await requireAdminRequest(request, { allowPending2FA: true });
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const adminSnap = await db.collection("admins").doc(adminToken.uid).get();
    const twoFactorEnabled = Boolean(adminSnap.exists && adminSnap.data()?.twoFactorEnabled);

    if (!twoFactorEnabled) {
      return NextResponse.json({ twoFactorEnabled: false, verified: true });
    }

    const cookieVal = parseCookieHeader(request.headers.get("cookie"), ADMIN_2FA_COOKIE_NAME);
    const verified = verifyTwoFactorCookieValue(cookieVal, adminToken.uid);
    return NextResponse.json({ twoFactorEnabled: true, verified });
  } catch (error) {
    console.error("Admin 2FA status error:", error);
    return NextResponse.json({ error: "Failed to check 2FA status." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const action = typeof body.action === "string" ? body.action : "";

  // Setup/enable/disable require either non-2FA admin or already verified 2FA session.
  // Only `verify` is allowed while 2FA verification is pending.
  const allowPending2FA = action === "verify";

  let adminToken;
  try {
    adminToken = await requireAdminRequest(request, { allowPending2FA });
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const uid = adminToken.uid;

  try {
    if (action === "setup") {
      const secret = authenticator.generateSecret();
      const label = adminToken.email || uid;
      const uri = authenticator.keyuri(label, "ConnectClub Admin", secret);

      await db.collection("admin_secrets").doc(uid).set(
        {
          pendingTwoFactorSecret: secret,
          pendingUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return NextResponse.json({ secret, uri });
    }

    if (action === "enable") {
      const token = typeof body.token === "string" ? body.token.trim() : "";
      if (!/^\d{6}$/.test(token)) {
        return NextResponse.json({ error: "Enter a valid 6-digit verification code." }, { status: 400 });
      }

      const rl = await checkRateLimit({
        namespace: "admin:2fa:verify",
        identifier: `${uid}:${getClientIp(request)}`,
        limit: 8,
        windowMs: 15 * 60 * 1000,
      });
      if (!rl.allowed) {
        return rateLimitExceededResponse(rl);
      }

      const secretSnap = await db.collection("admin_secrets").doc(uid).get();
      const pendingSecret = secretSnap.exists ? secretSnap.data()?.pendingTwoFactorSecret : null;
      if (typeof pendingSecret !== "string" || !pendingSecret) {
        return NextResponse.json({ error: "No pending 2FA setup found. Start setup again." }, { status: 400 });
      }

      if (!authenticator.verify({ token, secret: pendingSecret })) {
        return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
      }

      await Promise.all([
        db.collection("admin_secrets").doc(uid).set(
          {
            twoFactorSecret: pendingSecret,
            pendingTwoFactorSecret: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        ),
        db.collection("admins").doc(uid).set(
          {
            twoFactorEnabled: true,
            twoFactorSecret: FieldValue.delete(),
          },
          { merge: true }
        ),
      ]);

      await logAuditEvent(db, {
        actorUid: uid,
        actorEmail: adminToken.email ?? null,
        action: "admin_2fa_enabled",
        targetType: "admin",
        targetId: uid,
      });

      const response = NextResponse.json({ success: true, verified: true });
      attach2FACookie(response, uid);
      return response;
    }

    if (action === "verify") {
      const token = typeof body.token === "string" ? body.token.trim() : "";
      if (!/^\d{6}$/.test(token)) {
        return NextResponse.json({ error: "Enter a valid 6-digit code." }, { status: 400 });
      }

      const rl = await checkRateLimit({
        namespace: "admin:2fa:verify",
        identifier: `${uid}:${getClientIp(request)}`,
        limit: 8,
        windowMs: 15 * 60 * 1000,
      });
      if (!rl.allowed) {
        return rateLimitExceededResponse(rl);
      }

      const [secretSnap, adminSnap] = await Promise.all([
        db.collection("admin_secrets").doc(uid).get(),
        db.collection("admins").doc(uid).get(),
      ]);

      const storedSecret =
        (secretSnap.exists && typeof secretSnap.data()?.twoFactorSecret === "string"
          ? secretSnap.data()?.twoFactorSecret
          : null) ||
        (adminSnap.exists && typeof adminSnap.data()?.twoFactorSecret === "string"
          ? adminSnap.data()?.twoFactorSecret
          : null);

      if (!storedSecret) {
        return NextResponse.json({ error: "2FA is not enrolled for this account." }, { status: 400 });
      }

      if (!authenticator.verify({ token, secret: storedSecret })) {
        return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 401 });
      }

      // Migrate any legacy client-readable secret out of `admins/{uid}` transparently.
      if (adminSnap.exists && adminSnap.data()?.twoFactorSecret) {
        await Promise.all([
          db.collection("admin_secrets").doc(uid).set(
            { twoFactorSecret: storedSecret, updatedAt: FieldValue.serverTimestamp() },
            { merge: true }
          ),
          db.collection("admins").doc(uid).set(
            { twoFactorSecret: FieldValue.delete() },
            { merge: true }
          ),
        ]);
      }

      const response = NextResponse.json({ success: true, verified: true });
      attach2FACookie(response, uid);
      return response;
    }

    if (action === "disable" || body.twoFactorEnabled === false) {
      await Promise.all([
        db.collection("admin_secrets").doc(uid).delete().catch(() => {}),
        db.collection("admins").doc(uid).set(
          { twoFactorEnabled: false, twoFactorSecret: FieldValue.delete() },
          { merge: true }
        ),
      ]);

      await logAuditEvent(db, {
        actorUid: uid,
        actorEmail: adminToken.email ?? null,
        action: "admin_2fa_disabled",
        targetType: "admin",
        targetId: uid,
      });

      const response = NextResponse.json({ success: true, twoFactorEnabled: false });
      clear2FACookie(response);
      return response;
    }

    if (action === "logout") {
      const response = NextResponse.json({ success: true });
      clear2FACookie(response);
      return response;
    }

    return NextResponse.json({ error: "Invalid 2FA action." }, { status: 400 });
  } catch (error) {
    console.error("Admin 2FA update error:", error);
    return NextResponse.json({ error: "Failed to process 2FA request." }, { status: 500 });
  }
}
