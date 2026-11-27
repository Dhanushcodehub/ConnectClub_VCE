import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { normalizeEmail } from "@/lib/registrations/validation";
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit({
    namespace: "auth:resend-otp:ip",
    identifier: ip,
    limit: 8,
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

    const { email } = body as { email?: unknown };
    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 254) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const { getAdminDb, getAdminAuth } = await import("@/lib/firebase/admin");
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();

    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(normalizedEmail);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === "auth/user-not-found") {
        return NextResponse.json(
          { error: "Unable to resend verification code for this address." },
          { status: 400 }
        );
      }
      throw error;
    }

    // Do not send registration OTPs to already-verified accounts (prevents targeting admins/members).
    if (userRecord.emailVerified) {
      return NextResponse.json(
        { error: "Account is already verified. Please sign in." },
        { status: 400 }
      );
    }

    const otpDocRef = adminDb.collection("email_otps").doc(normalizedEmail);
    const otp = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Enforce cooldown & rotate OTP atomically in a transaction so concurrent bursts cannot bypass 60s window.
    const txOutcome = await adminDb.runTransaction(async (tx) => {
      const existingOtp = await tx.get(otpDocRef);
      const existingData = existingOtp.exists ? existingOtp.data() : null;
      const lastSentAt = existingData?.lastSentAt?.toDate?.() ?? null;

      if (lastSentAt instanceof Date && Date.now() - lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
        const waitSeconds = Math.ceil(
          (RESEND_COOLDOWN_MS - (Date.now() - lastSentAt.getTime())) / 1000
        );
        return { ok: false as const, waitSeconds };
      }

      const nextOtpData = {
        otp,
        expiresAt,
        lastSentAt: new Date(),
        createdAt: existingData?.createdAt ?? new Date(),
        attempts: 0,
        lockedUntil: null,
        uid: existingData?.uid ?? userRecord.uid,
        pendingProfile: existingData?.pendingProfile ?? null,
      };

      if (existingOtp.exists) {
        tx.update(otpDocRef, nextOtpData);
      } else {
        tx.set(otpDocRef, nextOtpData);
      }
      return { ok: true as const };
    });

    if (!txOutcome.ok) {
      return NextResponse.json(
        { error: `Please wait ${txOutcome.waitSeconds}s before requesting another code.` },
        { status: 429 }
      );
    }

    const { getOtpEmailHtml } = await import("@/lib/email/otpTemplate");
    const emailHtml = getOtpEmailHtml(otp);

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY.trim());
      let fromEmail = (
        process.env.RESEND_FROM_EMAIL || "Connect Club <noreply@connectclubvce.tech>"
      ).trim();
      fromEmail = fromEmail.replace(/^['"]|['"]$/g, "");
      if (!fromEmail.includes("<") && !fromEmail.includes(">")) {
        fromEmail = `Connect Club <${fromEmail}>`;
      }

      const { error: resendError } = await resend.emails.send({
        from: fromEmail,
        to: normalizedEmail,
        subject: "Connect Club - New Verification Code",
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
        subject: "Connect Club - New Verification Code",
        html: emailHtml,
      });
    }

    return NextResponse.json({ success: true, message: "OTP resent successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error resending OTP:", error);
    return NextResponse.json({ error: "Failed to resend verification code." }, { status: 500 });
  }
}
