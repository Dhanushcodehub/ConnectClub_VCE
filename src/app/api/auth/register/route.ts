import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import {
  normalizeEmail,
  normalizePhone,
  normalizeRollNo,
  validateRegistrationIdentity,
} from "@/lib/registrations/validation";
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit({
    namespace: "auth:register:ip",
    identifier: ip,
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (!ipLimit.allowed) {
    return rateLimitExceededResponse(ipLimit);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { email, password, name, rollNo, phone, department, yearOfStudy } = body;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof name !== "string" ||
    typeof rollNo !== "string" ||
    typeof phone !== "string"
  ) {
    return NextResponse.json(
      { error: "Name, email, password, roll number, and phone are required." },
      { status: 400 }
    );
  }

  if (password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { error: "Password must be between 8 and 128 characters." },
      { status: 400 }
    );
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedRollNo = normalizeRollNo(rollNo);
  const normalizedPhone = normalizePhone(phone);
  const cleanDepartment = typeof department === "string" ? department.trim().slice(0, 60) : "";
  const cleanYear = typeof yearOfStudy === "string" ? yearOfStudy.trim().slice(0, 30) : "";

  const validationError = validateRegistrationIdentity({
    name,
    rollNo: normalizedRollNo,
    email: normalizedEmail,
    phone: normalizedPhone,
  });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const emailLimit = await checkRateLimit({
    namespace: "auth:register:email",
    identifier: normalizedEmail,
    limit: 4,
    windowMs: 15 * 60 * 1000,
  });
  if (!emailLimit.allowed) {
    return rateLimitExceededResponse(emailLimit);
  }

  let uid: string | undefined;
  try {
    const { getAdminAuth, getAdminDb } = await import("@/lib/firebase/admin");
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    const rawRoll = rollNo.trim();
    const rawPhone = phone.replace(/\D/g, "").slice(-10);

    const [
      normalizedRollMatch,
      normalizedPhoneMatch,
      legacyRollMatch,
      legacyPhoneMatch,
      rawRollMatch,
      rawPhoneMatch,
    ] = await Promise.all([
      adminDb.collection("users").where("normalizedRollNo", "==", normalizedRollNo).limit(1).get(),
      adminDb.collection("users").where("normalizedPhone", "==", normalizedPhone).limit(1).get(),
      adminDb.collection("users").where("rollNo", "==", normalizedRollNo).limit(5).get(),
      adminDb.collection("users").where("phone", "==", normalizedPhone).limit(5).get(),
      adminDb.collection("users").where("rollNo", "==", rawRoll).limit(5).get(),
      adminDb.collection("users").where("phone", "==", rawPhone).limit(5).get(),
    ]);

    const canon = (v: unknown) => String(v ?? "").replace(/[\s\-_.]/g, "").toUpperCase();
    const canonPhone = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(-10);

    const rollCandidates = [
      ...normalizedRollMatch.docs,
      ...legacyRollMatch.docs,
      ...rawRollMatch.docs,
    ];
    if (rollCandidates.some((d) => canon(d.data().rollNo) === canon(normalizedRollNo))) {
      return NextResponse.json(
        { error: "This roll number is already registered." },
        { status: 409 }
      );
    }

    const phoneCandidates = [
      ...normalizedPhoneMatch.docs,
      ...legacyPhoneMatch.docs,
      ...rawPhoneMatch.docs,
    ];
    if (phoneCandidates.some((d) => canonPhone(d.data().phone) === canonPhone(normalizedPhone))) {
      return NextResponse.json(
        { error: "This phone number is already registered." },
        { status: 409 }
      );
    }

    const userRecord = await adminAuth.createUser({
      email: normalizedEmail,
      password,
      displayName: name.trim(),
      emailVerified: false,
    });
    uid = userRecord.uid;

    await adminAuth.setCustomUserClaims(uid, { role: "user" });

    const otp = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await adminDb.collection("email_otps").doc(normalizedEmail).set({
      otp,
      uid,
      pendingProfile: {
        uid,
        name: name.trim(),
        email: normalizedEmail,
        rollNo: normalizedRollNo,
        phone: normalizedPhone,
        normalizedRollNo,
        normalizedPhone,
        department: cleanDepartment,
        yearOfStudy: cleanYear,
        provider: "email",
        photoURL: "",
        bio: "",
        linkedinUrl: "",
        githubUrl: "",
        projectsCount: 0,
        likesReceived: 0,
        commentsCount: 0,
        certificatesCount: 0,
      },
      expiresAt,
      lastSentAt: new Date(),
      attempts: 0,
      createdAt: new Date(),
    });

    const { getOtpEmailHtml } = await import("@/lib/email/otpTemplate");
    const emailHtml = getOtpEmailHtml(otp);

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY.trim());
      let fromEmail = (
        process.env.RESEND_FROM_EMAIL || "Connect Club <noreply@connectclubvce.tech>"
      ).trim();
      fromEmail = fromEmail.replace(/^["']|["']$/g, "");
      if (!fromEmail.includes("<") && !fromEmail.includes(">")) {
        fromEmail = `Connect Club <${fromEmail}>`;
      }

      const { error: resendError } = await resend.emails.send({
        from: fromEmail,
        to: normalizedEmail,
        subject: "Connect Club - Verification Code",
        html: emailHtml,
      });

      if (resendError) {
        throw new Error("Resend delivery failed");
      }
    } else {
      const nodemailer = await import("nodemailer");
      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = Number(process.env.SMTP_PORT) || 465;
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        connectionTimeout: 10000,
        socketTimeout: 10000,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"Connect Club" <${process.env.EMAIL_USER}>`,
        to: normalizedEmail,
        subject: "Connect Club - Verification Code",
        html: emailHtml,
      });
    }

    return NextResponse.json({ success: true, uid }, { status: 201 });
  } catch (error: unknown) {
    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
    if (errorCode === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    if (uid) {
      try {
        const adminModule = await import("@/lib/firebase/admin");
        await adminModule.getAdminAuth().deleteUser(uid);
        await adminModule.getAdminDb().collection("users").doc(uid).delete();
        await adminModule.getAdminDb().collection("email_otps").doc(normalizedEmail).delete();
      } catch (cleanupError) {
        console.error("Registration cleanup failed:", cleanupError);
      }
    }

    console.error("Error registering user:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
