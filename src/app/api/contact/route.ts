import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, message } = body || {};
    const cleanFirstName = String(firstName || "").trim();
    const cleanLastName = String(lastName || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanMessage = String(message || "").trim();

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

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail) || cleanEmail.length > 254) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const docRef = await adminDb.collection("contact_messages").add({
      firstName: String(firstName).trim(),
      lastName: String(lastName || "").trim(),
      email: String(email).trim().toLowerCase(),
      message: String(message).trim(),
      status: "unread",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Message received successfully.",
      id: docRef.id,
    });
  } catch (error: any) {
    console.error("Error submitting contact message:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process message." },
      { status: 500 }
    );
  }
}
