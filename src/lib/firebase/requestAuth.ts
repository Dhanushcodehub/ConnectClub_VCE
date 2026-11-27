import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import {
  ADMIN_2FA_COOKIE_NAME,
  parseCookieHeader,
  verifyTwoFactorCookieValue,
} from "@/lib/security/admin2fa";

const STAFF_ROLES = new Set(["admin", "member"]);
const PRIMARY_ADMIN_EMAIL = "admin@connectclubvce.in";

export interface RequireAdminOptions {
  /** Set true on `/api/admin/2fa` so a signed-in admin can complete the 2FA challenge before the cookie is issued. */
  allowPending2FA?: boolean;
}

export async function requireAdminRequest(
  request: Request,
  options: RequireAdminOptions = {}
) {
  const decodedToken = await verifyRequestToken(request);
  const isVerifiedPrimaryAdmin =
    decodedToken.email === PRIMARY_ADMIN_EMAIL && decodedToken.email_verified === true;

  if (
    decodedToken.role !== "admin" &&
    decodedToken.role !== "superadmin" &&
    !isVerifiedPrimaryAdmin
  ) {
    throw new Error("FORBIDDEN");
  }

  if (!options.allowPending2FA) {
    await enforceAdminTwoFactorIfEnabled(request, decodedToken.uid);
  }

  return decodedToken;
}

export async function requireStaffRequest(request: Request) {
  const decodedToken = await verifyRequestToken(request);
  const isVerifiedPrimaryAdmin =
    decodedToken.email === PRIMARY_ADMIN_EMAIL && decodedToken.email_verified === true;

  if (
    !STAFF_ROLES.has(String(decodedToken.role || "")) &&
    decodedToken.role !== "superadmin" &&
    !isVerifiedPrimaryAdmin
  ) {
    throw new Error("FORBIDDEN");
  }
  return decodedToken;
}

/**
 * Any signed-in user. Used by endpoints that act on the caller's own data.
 */
export async function requireUserRequest(request: Request) {
  return verifyRequestToken(request);
}

/**
 * Verifies a raw Firebase ID token string (for Next.js Server Actions).
 */
export async function verifyStaffTokenString(idToken: unknown, requiredPermission?: string) {
  if (typeof idToken !== "string" || !idToken.trim()) {
    throw new Error("UNAUTHORIZED");
  }
  const fakeRequest = new Request("https://internal.local", {
    headers: { Authorization: `Bearer ${idToken.trim()}` },
  });
  const decoded = await requireStaffRequest(fakeRequest);

  if (
    requiredPermission &&
    decoded.role !== "admin" &&
    decoded.role !== "superadmin" &&
    decoded.email !== PRIMARY_ADMIN_EMAIL
  ) {
    const email = (decoded.email || "").toLowerCase().trim();
    if (!email || decoded.email_verified !== true) {
      throw new Error("FORBIDDEN");
    }
    const snap = await getAdminDb()
      .collection("members")
      .where("email", "==", email)
      .limit(1)
      .get();
    const perms = snap.docs[0]?.data()?.permissions;
    if (!Array.isArray(perms) || !perms.includes(requiredPermission)) {
      throw new Error("FORBIDDEN");
    }
  }

  return decoded;
}

/** Standard catch-all for route handlers using the helpers above. */
export function authErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (message === "UNAUTHORIZED") {
    return Response.json(
      { error: "Unauthorized: a valid sign-in token is required." },
      { status: 401 }
    );
  }
  if (message === "TWO_FACTOR_REQUIRED") {
    return Response.json(
      { error: "Two-factor authentication verification is required." },
      { status: 403 }
    );
  }
  if (message === "FORBIDDEN") {
    return Response.json({ error: "Forbidden: insufficient permissions." }, { status: 403 });
  }
  if (message.startsWith("ADMIN_SDK_NOT_CONFIGURED")) {
    return Response.json(
      { error: "Server authentication service is not configured." },
      { status: 500 }
    );
  }
  return null;
}

async function verifyRequestToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) throw new Error("UNAUTHORIZED");

  let auth;
  try {
    auth = getAdminAuth();
  } catch (error) {
    console.error("Admin SDK unavailable while verifying request token:", error);
    throw new Error("ADMIN_SDK_NOT_CONFIGURED");
  }

  let decodedToken;
  try {
    // checkRevoked = true ensures revoked/disabled admin or user tokens are rejected immediately.
    decodedToken = await auth.verifyIdToken(token, true);
  } catch {
    throw new Error("UNAUTHORIZED");
  }

  return withResolvedRole(decodedToken);
}

async function enforceAdminTwoFactorIfEnabled(request: Request, uid: string) {
  try {
    const adminSnap = await getAdminDb().collection("admins").doc(uid).get();
    if (!adminSnap.exists || !adminSnap.data()?.twoFactorEnabled) {
      return;
    }
    const cookieHeader = request.headers.get("cookie");
    const cookieValue = parseCookieHeader(cookieHeader, ADMIN_2FA_COOKIE_NAME);
    if (!verifyTwoFactorCookieValue(cookieValue, uid)) {
      throw new Error("TWO_FACTOR_REQUIRED");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "TWO_FACTOR_REQUIRED") {
      throw error;
    }
    console.error("Failed checking admin 2FA state:", error);
    throw new Error("TWO_FACTOR_REQUIRED");
  }
}

/**
 * Resolves staff/admin roles strictly from server-controlled sources:
 * 1. Signed Firebase custom claims (`role`)
 * 2. Verified primary admin email
 * 3. Server-only `admins/{uid}` document (`allow write: if false`)
 * 4. Admin-managed `members` collection (`allow write: if isAdmin()`) for verified emails
 *
 * SECURITY: NEVER falls back to `users/{uid}.role` because users can edit their profile doc.
 */
async function withResolvedRole<
  T extends { uid: string; email?: string | null; email_verified?: boolean; role?: unknown }
>(decodedToken: T): Promise<T> {
  const existingRole = typeof decodedToken.role === "string" ? decodedToken.role : "";
  if (STAFF_ROLES.has(existingRole) || existingRole === "superadmin") {
    return decodedToken;
  }

  const email = (decodedToken.email || "").toLowerCase().trim();
  if (email === PRIMARY_ADMIN_EMAIL && decodedToken.email_verified === true) {
    decodedToken.role = "admin";
    await backfillRole(decodedToken.uid, "admin");
    return decodedToken;
  }

  const trustedRole = await lookupRoleFromTrustedCollections(
    decodedToken.uid,
    email,
    decodedToken.email_verified === true
  );
  if (STAFF_ROLES.has(trustedRole)) {
    decodedToken.role = trustedRole;
    await backfillRole(decodedToken.uid, trustedRole);
  }
  return decodedToken;
}

async function lookupRoleFromTrustedCollections(
  uid: string,
  email: string,
  emailVerified: boolean
): Promise<string> {
  try {
    const db = getAdminDb();
    const adminSnap = await db.collection("admins").doc(uid).get();
    if (adminSnap.exists) {
      return "admin";
    }

    if (email && emailVerified) {
      const memberSnap = await db
        .collection("members")
        .where("email", "==", email)
        .limit(1)
        .get();
      if (!memberSnap.empty) {
        return "member";
      }
    }
    return "";
  } catch (error) {
    console.error("Unable to resolve role from trusted collections:", error);
    return "";
  }
}

async function backfillRole(uid: string, role: string): Promise<void> {
  try {
    const auth = getAdminAuth();
    const user = await auth.getUser(uid);
    await auth.setCustomUserClaims(uid, { ...(user.customClaims || {}), role });
  } catch (error) {
    console.error("Unable to backfill custom role claim:", error);
  }
}
