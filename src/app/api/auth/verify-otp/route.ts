import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { normalizeEmail } from "@/lib/registrations/validation";
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_OTP_ATTEMPTS = 5;
const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

function otpMatches(provided: string, stored: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(stored).digest();
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit({
    namespace: "auth:verify-otp:ip",
    identifier: ip,
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!ipLimit.allowed) {
    return rateLimitExceededResponse(ipLimit);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { email, otp } = body as { email?: unknown; otp?: unknown };
    if (typeof email !== "string" || typeof otp !== "string") {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    const trimmedOtp = otp.trim();
    if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 254 || !/^\d{6}$/.test(trimmedOtp)) {
      return NextResponse.json({ error: "Invalid email or 6-digit OTP format." }, { status: 400 });
    }

    const { getAdminAuth, getAdminDb } = await import("@/lib/firebase/admin");
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    const otpRef = adminDb.collection("email_otps").doc(normalizedEmail);

    // Transactional verification guarantees concurrent brute-force requests
    // cannot race past MAX_OTP_ATTEMPTS.
    const txResult = await adminDb.runTransaction(async (tx) => {
      const otpDoc = await tx.get(otpRef);
      if (!otpDoc.exists) {
        return { ok: false as const, status: 400, error: "Invalid or expired OTP." };
      }

      const data = otpDoc.data() || {};
      const expiresAtDate = data.expiresAt?.toDate?.();
      if (!(expiresAtDate instanceof Date) || expiresAtDate < new Date()) {
        tx.delete(otpRef);
        return {
          ok: false as const,
          status: 400,
          error: "OTP has expired. Please register again or request a new code.",
        };
      }

      const attempts = Number(data.attempts || 0);
      if (!otpMatches(trimmedOtp, String(data.otp || ""))) {
        const newAttempts = attempts + 1;
        if (newAttempts >= MAX_OTP_ATTEMPTS) {
          tx.delete(otpRef);
          return {
            ok: false as const,
            status: 429,
            error: "Too many incorrect attempts. Please request a new code.",
          };
        }
        tx.update(otpRef, { attempts: newAttempts });
        const remaining = MAX_OTP_ATTEMPTS - newAttempts;
        return {
          ok: false as const,
          status: 400,
          error: `Incorrect OTP. Please try again (${remaining} ${remaining === 1 ? "attempt" : "attempts"} remaining).`,
        };
      }

      tx.delete(otpRef);
      return {
        ok: true as const,
        pendingProfile: (data.pendingProfile as Record<string, unknown> | undefined) || null,
      };
    });

    if (!txResult.ok) {
      return NextResponse.json({ error: txResult.error }, { status: txResult.status });
    }

    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(normalizedEmail);
      await adminAuth.updateUser(userRecord.uid, {
        emailVerified: true,
      });
    } catch {
      return NextResponse.json(
        { error: "User not found in authentication system." },
        { status: 404 }
      );
    }

    if (txResult.pendingProfile) {
      const profileData = {
        ...txResult.pendingProfile,
        uid: userRecord.uid,
        email: normalizedEmail,
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await adminDb.collection("users").doc(userRecord.uid).set(profileData, { merge: true });
    }

    return NextResponse.json({ success: true, uid: userRecord.uid });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json({ error: "Failed to verify OTP." }, { status: 500 });
  }
}
