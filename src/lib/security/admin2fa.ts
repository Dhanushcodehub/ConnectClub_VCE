import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_2FA_COOKIE_NAME = "cc_admin_2fa";
const TWO_FA_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function getSigningSecret(): string | null {
  const explicit = process.env.ADMIN_2FA_COOKIE_SECRET?.trim();
  if (explicit) return explicit;

  const pk = process.env.FIREBASE_PRIVATE_KEY?.trim();
  const ce = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const pid = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!pk || !ce || !pid) return null;

  return createHmac("sha256", pk).update(`cc-admin-2fa:${pid}:${ce}`).digest("hex");
}

function signPayload(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

/**
 * Issues a signed, time-bounded cookie value binding 2FA completion to a
 * specific admin Firebase `uid`. Stored in an HttpOnly cookie so client JS
 * (`sessionStorage`) can no longer forge 2FA verification.
 */
export function createTwoFactorCookieValue(uid: string): string | null {
  const secret = getSigningSecret();
  if (!secret || !uid) return null;

  const now = Date.now();
  const payload = JSON.stringify({
    uid,
    iat: now,
    exp: now + TWO_FA_SESSION_TTL_MS,
  });
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  const sig = signPayload(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export function verifyTwoFactorCookieValue(
  cookieVal: string | undefined,
  expectedUid: string
): boolean {
  if (!cookieVal || !expectedUid) return false;
  const secret = getSigningSecret();
  if (!secret) return false;

  const dotIdx = cookieVal.indexOf(".");
  if (dotIdx <= 0) return false;

  const payloadB64 = cookieVal.slice(0, dotIdx);
  const sig = cookieVal.slice(dotIdx + 1);
  if (!payloadB64 || !sig) return false;

  const expectedSig = signPayload(payloadB64, secret);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
      uid?: unknown;
      exp?: unknown;
    };
    if (parsed.uid !== expectedUid) return false;
    if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function parseCookieHeader(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(eqIdx + 1).trim());
    }
  }
  return undefined;
}
