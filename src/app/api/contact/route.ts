import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export async function POST(req: Request) {
  const rl = await checkRateLimit({
    namespace: "public:contact",
    identifier: getClientIp(req),
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.allowed) {
    return rateLimitExceededResponse(rl);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const { firstName, lastName, email, message } = body as Record<string, unknown>;

    if (typeof firstName !== "string" || typeof email !== "string" || typeof message !== "string") {
      return NextResponse.json(
        { error: "First name, email, and message are required." },
        { status: 400 }
      );
    }

    const cleanFirstName = firstName.trim();
    const cleanLastName = typeof lastName === "string" ? lastName.trim() : "";
    const cleanEmail = email.trim().toLowerCase();
    const cleanMessage = message.trim();

    if (!cleanFirstName || !cleanEmail || !cleanMessage) {
      return NextResponse.json(
        { error: "First name, email, and message are required." },
        { status: 400 }
      );
    }

    if (cleanFirstName.length > 80 || cleanLastName.length > 80) {
      return NextResponse.json(
        { error: "Name must be less than 80 characters." },
        { status: 400 }
      );
    }

    if (cleanMessage.length < 5 || cleanMessage.length > 3000) {
      return NextResponse.json(
        { error: "Message must be between 5 and 3000 characters." },
        { status: 400 }
      );
    }

    if (!EMAIL_PATTERN.test(cleanEmail) || cleanEmail.length > 254) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const docRef = await adminDb.collection("contact_messages").add({
      firstName: cleanFirstName,
      lastName: cleanLastName,
      email: cleanEmail,
      message: cleanMessage,
      status: "unread",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Message received successfully.",
      id: docRef.id,
    });
  } catch (error) {
    console.error("Error submitting contact message:", error);
    return NextResponse.json(
      { error: "Failed to process message." },
      { status: 500 }
    );
  }
}
