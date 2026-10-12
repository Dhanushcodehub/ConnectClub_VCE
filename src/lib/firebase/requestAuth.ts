import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

const STAFF_ROLES = new Set(["admin", "member"]);

export async function requireAdminRequest(request: Request) {
  const decodedToken = await verifyRequestToken(request);
  if (decodedToken.role !== "admin" && decodedToken.email !== "admin@connectclubvce.in") {
    throw new Error("FORBIDDEN");
  }
  return decodedToken;
}

export async function requireStaffRequest(request: Request) {
  const decodedToken = await verifyRequestToken(request);
  if (
    !STAFF_ROLES.has(decodedToken.role) &&
    decodedToken.email !== "admin@connectclubvce.in"
  ) {
    throw new Error("FORBIDDEN");
  }
  return decodedToken;
}

/**
 * Any signed-in user. Used by endpoints that may only ever act on the caller's
 * own data (profile completion, retroactive ticket sync, ...).
 */
export async function requireUserRequest(request: Request) {
  return verifyRequestToken(request);
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
  if (message === "FORBIDDEN") {
    return Response.json({ error: "Forbidden: insufficient permissions." }, { status: 403 });
  }
  if (message.startsWith("ADMIN_SDK_NOT_CONFIGURED")) {
    return Response.json(
      { error: "Server is missing Firebase Admin credentials (FIREBASE_* env vars)." },
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
    // Distinguish "server is not configured" from "bad token" so the caller
    // reports a missing-credentials 500 instead of a misleading 401.
    console.error("Admin SDK unavailable while verifying request token:", error);
    throw new Error(
      error instanceof Error
        ? `ADMIN_SDK_NOT_CONFIGURED: ${error.message}`
        : "ADMIN_SDK_NOT_CONFIGURED"
    );
  }

  let decodedToken;
  try {
    decodedToken = await auth.verifyIdToken(token);
  } catch {
    throw new Error("UNAUTHORIZED");
  }

  return withResolvedRole(decodedToken);
}

/**
 * The `role` custom claim is the only thing `requireStaffRequest` used to
 * look at, but it is only ever set by `/api/admin/create-member`. Members
 * provisioned through the Firebase console or a script have a token without
 * a `role` claim, so every staff endpoint rejected them with 403 even though
 * they are a legitimate club member.
 *
 * Resolve the role from the `users/{uid}` document as a fallback, then
 * lazily write the claim back so subsequent requests use the fast path again.
 */
async function withResolvedRole<T extends { uid: string; email?: string | null; role?: unknown }>(
  decodedToken: T
): Promise<T> {
  const existingRole = typeof decodedToken.role === "string" ? decodedToken.role : "";
  if (STAFF_ROLES.has(existingRole)) return decodedToken;

  const email = decodedToken.email || "";
  if (email === "admin@connectclubvce.in") {
    decodedToken.role = "admin";
    await backfillRole(decodedToken.uid, "admin");
    return decodedToken;
  }

  const fallbackRole = await lookupRoleFromUsers(decodedToken.uid);
  if (STAFF_ROLES.has(fallbackRole)) {
    decodedToken.role = fallbackRole;
    await backfillRole(decodedToken.uid, fallbackRole);
  }
  return decodedToken;
}

async function lookupRoleFromUsers(uid: string): Promise<string> {
  try {
    const snap = await getAdminDb().collection("users").doc(uid).get();
    const role = snap.exists ? snap.data()?.role : undefined;
    return typeof role === "string" ? role : "";
  } catch (error) {
    console.error("Unable to resolve user role from Firestore:", error);
    return "";
  }
}

async function backfillRole(uid: string, role: string): Promise<void> {
  try {
    const auth = getAdminAuth();
    const user = await auth.getUser(uid);
    await auth.setCustomUserClaims(uid, { ...(user.customClaims || {}), role });
  } catch (error) {
    // Claim backfill is a best-effort optimisation; the caller already has
    // the resolved role for this request, so a failure here must not 500.
    console.error("Unable to backfill custom role claim:", error);
  }
}
