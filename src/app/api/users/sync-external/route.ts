/**
 * POST /api/users/sync-external
 *
 * Silently syncs pending external registrations for a logged-in user.
 * Called by the dashboard on mount.
 *
 * Requires a valid Firebase ID token — the uid always comes from the token,
 * never from the request body (trusting a body userId would let anyone
 * sync tickets into someone else's account).
 */
import { NextResponse } from "next/server";
import { getAdminApp, getAdminAuth } from "@/lib/firebase/admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { generateTicketId } from "@/lib/tickets";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice("Bearer ".length).trim();
    let uid: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      uid = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    if (!body.rollNo && !body.email) {
      return NextResponse.json({ error: "Missing rollNo or email" }, { status: 400 });
    }

    const app = getAdminApp();
    const db = getFirestore(app);

    // Look for registrations in external_registrations.
    // Checked by rollNo (case-insensitive in JS, but exact match in Firestore).
    const rollNo = String(body.rollNo || "").toUpperCase().trim();

    if (!rollNo) {
      return NextResponse.json({ error: "Missing rollNo or email" }, { status: 400 });
    }

    let snapshot = await db
      .collection("external_registrations")
      .where("rollNo", "==", rollNo)
      .get();

    // Fallback: If no match found and rollNo has hyphens or spaces, query with stripped punctuation
    if (snapshot.empty) {
      const stripped = rollNo.replace(/[^A-Za-z0-9]/g, "");
      if (stripped && stripped !== rollNo) {
        snapshot = await db
          .collection("external_registrations")
          .where("rollNo", "==", stripped)
          .get();
      }
    }

    if (snapshot.empty) {
      return NextResponse.json({ success: true, synced: 0 });
    }

    let syncedCount = 0;
    const processedEventIds = new Set<string>(); // Prevent duplicate tickets in same run

    for (const doc of snapshot.docs) {
      const extData = doc.data();

      // Deterministic registration ID makes concurrent syncs idempotent —
      // two tabs or a double-fire cannot create duplicate tickets.
      const registrationRef = db
        .collection("event_registrations")
        .doc(`${extData.eventId}_${uid}`);

      const created = await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(registrationRef);

        if (existing.exists) {
          // Already has a ticket — just mark the external row approved and
          // copy the existing ticket ID back onto it.
          const existingTicketId = existing.data()?.ticketId || null;
          transaction.update(doc.ref, {
            status: "approved",
            approvedAt: FieldValue.serverTimestamp(),
            userId: uid,
            note: "Auto-synced (ticket already existed)",
            ...(existingTicketId ? { ticketId: existingTicketId } : {}),
          });
          return false;
        }

        // Another external row for the same event already created a ticket
        // in this run — don't double-ticket, just mark this row approved.
        if (processedEventIds.has(extData.eventId)) {
          transaction.update(doc.ref, {
            status: "approved",
            approvedAt: FieldValue.serverTimestamp(),
            userId: uid,
            note: "Auto-synced (ticket already existed)",
          });
          return false;
        }

        const ticketId = generateTicketId();

        transaction.set(registrationRef, {
          userId: uid,
          eventId: extData.eventId,
          eventTitle: extData.eventTitle || extData.eventId,
          ticketId,
          registeredAt: FieldValue.serverTimestamp(),
          attended: false,
          certificateIssued: false,
        });

        const notifRef = db.collection("notifications").doc();
        transaction.set(notifRef, {
          userId: uid,
          type: "event",
          title: "🎟 You're In!",
          message: `Your registration for ${extData.eventTitle || extData.eventId} has been auto-confirmed. Your ticket ID is ${ticketId}. See you there! 🚀`,
          read: false,
          actionUrl: `/u/dashboard`,
          createdAt: FieldValue.serverTimestamp(),
        });

        transaction.update(doc.ref, {
          status: "approved",
          approvedAt: FieldValue.serverTimestamp(),
          userId: uid,
          ticketId,
        });

        processedEventIds.add(extData.eventId);
        return true;
      });

      if (created) syncedCount++;
    }

    return NextResponse.json({ success: true, synced: syncedCount });
  } catch (error: any) {
    console.error("Auto-sync Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
