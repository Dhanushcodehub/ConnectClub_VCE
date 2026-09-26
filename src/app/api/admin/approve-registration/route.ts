/**
 * POST /api/admin/approve-registration
 *
 * Called by the admin dashboard to approve a pending external registration.
 * Looks up the user by rollNo/email, creates the event_registrations document,
 * and sends a notification to the user.
 *
 * Body: { externalDocId: string }
 */
import { NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebase/admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

export async function POST(request: Request) {
  try {
    const app = getAdminApp();
    const db = getFirestore(app);
    const auth = getAuth(app);

    const { externalDocId } = await request.json();

    if (!externalDocId) {
      return NextResponse.json({ error: "Missing externalDocId" }, { status: 400 });
    }

    // 1. Fetch the pending registration
    const extRef = db.collection("external_registrations").doc(externalDocId);
    const extSnap = await extRef.get();

    if (!extSnap.exists) {
      return NextResponse.json({ error: "External registration not found" }, { status: 404 });
    }

    const extData = extSnap.data()!;

    if (extData.status === "approved") {
      return NextResponse.json({ error: "Already approved" }, { status: 409 });
    }

    // 2. Find the Connect Club user by email
    let uid: string | null = null;
    try {
      const userRecord = await auth.getUserByEmail(extData.email);
      uid = userRecord.uid;
    } catch {
      // User hasn't signed up to Connect Club yet — mark as approved but no ticket yet
      await extRef.update({ status: "approved", approvedAt: FieldValue.serverTimestamp(), note: "User not found in Connect Club" });
      return NextResponse.json({ success: true, synced: false, message: "Approved but user not on Connect Club yet" });
    }

    // 3. Check for duplicate ticket
    const existing = await db.collection("event_registrations")
      .where("userId", "==", uid)
      .where("eventId", "==", extData.eventId)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Already has a ticket — just mark approved
      await extRef.update({ status: "approved", approvedAt: FieldValue.serverTimestamp(), userId: uid });
      return NextResponse.json({ success: true, synced: false, message: "User already has a ticket" });
    }

    // 4. Generate ticket ID
    const ticketId = `TX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 5. Batch write: event_registrations + notification + mark approved
    const batch = db.batch();

    const regRef = db.collection("event_registrations").doc();
    batch.set(regRef, {
      userId: uid,
      eventId: extData.eventId,
      eventTitle: extData.eventTitle || extData.eventId,
      ticketId,
      registeredAt: FieldValue.serverTimestamp(),
      attended: false,
      certificateIssued: false,
    });

    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      userId: uid,
      type: "event",
      title: "🎟 You're In!",
      message: `Your registration for ${extData.eventTitle || extData.eventId} has been confirmed. Your ticket ID is ${ticketId}. See you there! 🚀`,
      read: false,
      actionUrl: `/u/dashboard`,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Mark external doc as approved
    batch.update(extRef, {
      status: "approved",
      approvedAt: FieldValue.serverTimestamp(),
      userId: uid,
      ticketId,
    });

    await batch.commit();

    return NextResponse.json({ success: true, synced: true, ticketId });
  } catch (error: any) {
    console.error("Approve Registration Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
