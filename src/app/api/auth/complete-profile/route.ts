import { NextResponse } from "next/server";
import { requireUserRequest, authErrorResponse } from "@/lib/firebase/requestAuth";
import {
  normalizePhone,
  normalizeRollNo,
  validateRegistrationIdentity,
} from "@/lib/registrations/validation";
import { getSafeMediaUrl } from "@/lib/security/sanitizeUrl";
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  let token;
  try {
    token = await requireUserRequest(req);
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit({
    namespace: "auth:complete-profile",
    identifier: `${token.uid}:${getClientIp(req)}`,
    limit: 10,
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
    const payload = body as Record<string, unknown>;

    const uid = token.uid;
    const email = typeof token.email === "string" ? token.email.toLowerCase().trim() : "";
    const name = str(payload.name, 100);
    const rollNo = normalizeRollNo(payload.rollNo).slice(0, 30);
    const phone = normalizePhone(payload.phone);
    const department = str(payload.department, 60);
    const yearOfStudy = str(payload.yearOfStudy, 30);
    const rawPhoto = str(payload.photoURL, 2048);
    const photoURL = rawPhoto ? getSafeMediaUrl(rawPhoto, "") : "";

    if (!uid || !email) {
      return NextResponse.json({ error: "Authenticated email is required" }, { status: 400 });
    }

    const validationError = validateRegistrationIdentity({
      name,
      rollNo,
      email,
      phone,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { getAdminAuth, getAdminDb } = await import("@/lib/firebase/admin");
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // Prevent claiming another student's roll number or phone number.
    const [rollMatches, phoneMatches] = await Promise.all([
      adminDb.collection("users").where("normalizedRollNo", "==", rollNo).limit(2).get(),
      adminDb.collection("users").where("normalizedPhone", "==", phone).limit(2).get(),
    ]);

    if (rollMatches.docs.some((d) => d.id !== uid)) {
      return NextResponse.json(
        { error: "This roll number is already registered to another account." },
        { status: 409 }
      );
    }
    if (phoneMatches.docs.some((d) => d.id !== uid)) {
      return NextResponse.json(
        { error: "This phone number is already registered to another account." },
        { status: 409 }
      );
    }

    let existingClaims: Record<string, unknown> = {};
    let role = "user";
    try {
      const record = await adminAuth.getUser(uid);
      existingClaims = (record.customClaims as Record<string, unknown>) || {};
      const existingRole = existingClaims.role;
      if (typeof existingRole === "string" && existingRole.length > 0) {
        role = existingRole;
      }
    } catch (error) {
      console.warn("Could not read existing claims during profile completion:", error);
    }

    await adminAuth.setCustomUserClaims(uid, { ...existingClaims, role });

    const userRef = adminDb.collection("users").doc(uid);
    const existing = await userRef.get();
    const profile = {
      uid,
      name,
      email,
      rollNo,
      normalizedRollNo: rollNo,
      phone,
      normalizedPhone: phone,
      department,
      yearOfStudy,
      provider: "google",
      photoURL,
      updatedAt: new Date(),
      ...(existing.exists
        ? {}
        : {
            bio: "",
            linkedinUrl: "",
            githubUrl: "",
            projectsCount: 0,
            likesReceived: 0,
            commentsCount: 0,
            certificatesCount: 0,
            createdAt: new Date(),
          }),
    };

    await userRef.set(profile, { merge: true });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;

    console.error("Error completing profile:", error);
    return NextResponse.json({ error: "Failed to complete profile." }, { status: 500 });
  }
}
