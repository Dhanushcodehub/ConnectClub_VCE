import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, message } = body;

    if (!firstName || !email || !message) {
      return NextResponse.json(
        { error: "First name, email, and message are required." },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
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
