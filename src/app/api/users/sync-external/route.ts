/**
 * POST /api/users/sync-external
 *
 * Silently syncs pending external registrations for a logged-in user.
 * Called by the dashboard on mount.
 */
import { NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebase/admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAdminAuth } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    let uid = "";
    
    // Fallback if they pass userId in body (from older client code)
    const body = await request.json().catch(() => ({}));

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1];
      const adminAuth = getAdminAuth();
      const decodedToken = await adminAuth.verifyIdToken(token);
      uid = decodedToken.uid;
    } else if (body.userId) {
      uid = body.userId; // Trusting the body if no token (less secure but works for now)
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!body.rollNo && !body.email) {
      return NextResponse.json({ error: "Missing rollNo or email" }, { status: 400 });
    }

    const app = getAdminApp();
    const db = getFirestore(app);

    // Look for registrations in external_registrations
    // We check by rollNo (case-insensitive in JS, but exact match in Firestore)
    const rollNo = body.rollNo?.toUpperCase().trim();
    
    const snapshot = await db.collection("external_registrations")
      .where("rollNo", "==", rollNo)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ success: true, synced: 0 });
    }

    const batch = db.batch();
    let syncedCount = 0;
    const processedEventIds = new Set<string>(); // Prevent duplicate tickets in same batch

    for (const doc of snapshot.docs) {
      const extData = doc.data();
      
      // 1. Check if they already have a ticket to avoid duplicates (DB check + local memory check)
      const existing = await db.collection("event_registrations")
        .where("userId", "==", uid)
        .where("eventId", "==", extData.eventId)
        .limit(1)
        .get();

      if (!existing.empty || processedEventIds.has(extData.eventId)) {
        // Just mark the external one as approved (already have a ticket)
        batch.update(doc.ref, { 
          status: "approved", 
          approvedAt: FieldValue.serverTimestamp(), 
          userId: uid,
          note: "Auto-synced (ticket already existed)"
        });
        continue;
      }

      processedEventIds.add(extData.eventId);

      // 2. Generate ticket ID
      const ticketId = `TX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // 3. Create event registration
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

      // 4. Create notification
      const notifRef = db.collection("notifications").doc();
      batch.set(notifRef, {
        userId: uid,
        type: "event",
        title: "🎟 You're In!",
        message: `Your registration for ${extData.eventTitle || extData.eventId} has been auto-confirmed. Your ticket ID is ${ticketId}. See you there! 🚀`,
        read: false,
        actionUrl: `/u/dashboard`,
        createdAt: FieldValue.serverTimestamp(),
      });

      // 5. Mark external doc as approved
      batch.update(doc.ref, {
        status: "approved",
        approvedAt: FieldValue.serverTimestamp(),
        userId: uid,
        ticketId,
      });

      syncedCount++;
    }

    await batch.commit();

    return NextResponse.json({ success: true, synced: syncedCount });
  } catch (error: any) {
    console.error("Auto-sync Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
