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
import { requireAdminRequest } from "@/lib/firebase/requestAuth";
import {
  normalizeEmail,
  normalizeRollNo,
  validateRegistrationIdentity,
} from "@/lib/registrations/validation";

export async function POST(request: Request) {
  try {
    await requireAdminRequest(request);
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

    const validationError = validateRegistrationIdentity({
      name: extData.name,
      rollNo: extData.rollNo,
      email: extData.email,
      phone: extData.phone,
    });
    if (validationError) {
      return NextResponse.json(
        { error: `Registration data needs correction before approval: ${validationError}` },
        { status: 422 }
      );
    }

    // 2. Find the Connect Club user by email, then fall back to roll number.
    let uid: string | null = null;
    try {
      const userRecord = await auth.getUserByEmail(normalizeEmail(extData.email));
      uid = userRecord.uid;
    } catch {
      const cleanRoll = normalizeRollNo(extData.rollNo);
      const strippedRoll = String(extData.rollNo || "").replace(/[\s\-.:]/g, "").toUpperCase();

      let users = await db.collection("users")
        .where("rollNo", "==", cleanRoll)
        .limit(2)
        .get();

      // Fallback: If not found with hyphens, query stripped format (or vice versa)
      if (users.empty && strippedRoll !== cleanRoll) {
        users = await db.collection("users")
          .where("rollNo", "==", strippedRoll)
          .limit(2)
          .get();
      }

      if (users.size === 1) uid = users.docs[0].id;
    }

    if (!uid) {
      return NextResponse.json(
        { error: "No unique Connect Club account matches this registration. Resolve the email/roll number before approval." },
        { status: 409 }
      );
    }

    // 3. Check for legacy tickets created before deterministic IDs were added.
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

    // 4. Use a deterministic registration document and transaction so
    // simultaneous approval requests cannot create duplicate tickets.
    const registrationRef = db.collection("event_registrations").doc(`${extData.eventId}_${uid}`);
    const result = await db.runTransaction(async (transaction) => {
      const [currentRegistration, currentExternal] = await Promise.all([
        transaction.get(registrationRef),
        transaction.get(extRef),
      ]);

      if (currentRegistration.exists) {
        const existingTicketId = currentRegistration.data()?.ticketId || null;
        transaction.update(extRef, {
          status: "approved",
          approvedAt: FieldValue.serverTimestamp(),
          userId: uid,
          ...(existingTicketId ? { ticketId: existingTicketId } : {}),
        });
        return { created: false, ticketId: existingTicketId };
      }

      if (currentExternal.data()?.status === "approved") {
        return { created: false, ticketId: currentExternal.data()?.ticketId || null };
      }

      const ticketId = `TX-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
      transaction.set(registrationRef, {
        userId: uid,
        eventId: extData.eventId,
        eventTitle: extData.eventTitle || extData.eventId,
        ticketId,
        registeredAt: FieldValue.serverTimestamp(),
        attended: false,
        certificateIssued: false,
      });

      const notificationRef = db.collection("notifications").doc();
      transaction.set(notificationRef, {
        userId: uid,
        type: "event",
        title: "Registration Confirmed!",
        message: `Your registration for ${extData.eventTitle || extData.eventId} has been confirmed. Your ticket ID is ${ticketId}.`,
        read: false,
        actionUrl: `/u/dashboard`,
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.update(extRef, {
        status: "approved",
        approvedAt: FieldValue.serverTimestamp(),
        userId: uid,
        ticketId,
      });
      return { created: true, ticketId };
    });

    return NextResponse.json({ success: true, synced: result.created, ticketId: result.ticketId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized: Admin authentication required." }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }
    console.error("Approve Registration Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
