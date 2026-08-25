import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { getAdminApp } from "@/lib/firebase/admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
  try {
    const { userId, rollNo } = await request.json();

    if (!userId || !rollNo) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cleanRollNo = rollNo.toUpperCase().trim();

    // 1. Initialize Connect Club Admin SDK
    const primaryApp = getAdminApp();
    const primaryDb = getFirestore(primaryApp);

    // 2. Initialize InspireX Admin SDK
    const projectId = process.env.INSPIREX_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.INSPIREX_FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.INSPIREX_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      // If InspireX credentials are not configured, silently skip to avoid crashing dashboard
      return NextResponse.json({ success: true, message: "InspireX not configured" });
    }

    const appName = "inspirex-admin";
    let inspirexApp: admin.app.App;
    
    const existingApp = admin.apps.find(app => app && app.name === appName);
    if (existingApp) {
      inspirexApp = existingApp;
    } else {
      inspirexApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      }, appName);
    }

    const inspirexDb = getFirestore(inspirexApp);

    // 3. Check if they already have an InspireX ticket in Connect Club
    const existingRegistration = await primaryDb.collection("event_registrations")
      .where("userId", "==", userId)
      .where("eventId", "==", "inspirex-s2")
      .limit(1)
      .get();

    // If they already have a ticketId in Connect Club, we don't need to sync
    if (!existingRegistration.empty && existingRegistration.docs[0].data().ticketId) {
      return NextResponse.json({ success: true, synced: false, message: "Already synced" });
    }

    // 4. Query InspireX database for this roll number
    const inspirexRegSnapshot = await inspirexDb.collection("registrations")
      .where("rollNo", "==", cleanRollNo)
      .limit(1)
      .get();

    if (inspirexRegSnapshot.empty) {
      return NextResponse.json({ success: true, synced: false, message: "Not registered in InspireX" });
    }

    const inspirexDoc = inspirexRegSnapshot.docs[0];
    const ticketId = inspirexDoc.id; // InspireX document ID is the ticket ID
    const data = inspirexDoc.data();

    // 5. Sync to Connect Club
    const batch = primaryDb.batch();

    if (!existingRegistration.empty) {
      // Update existing registration that was missing a ticketId
      batch.update(existingRegistration.docs[0].ref, {
        ticketId: ticketId
      });
    } else {
      // Create new registration
      const regRef = primaryDb.collection("event_registrations").doc();
      batch.set(regRef, {
        userId,
        eventId: "inspirex-s2",
        eventTitle: "InspireX Season 2",
        ticketId: ticketId,
        registeredAt: FieldValue.serverTimestamp(),
        attended: false,
        certificateIssued: false
      });

      // Create Notification
      const notificationRef = primaryDb.collection("notifications").doc();
      batch.set(notificationRef, {
        userId,
        type: "event_registration",
        title: "📢 Ticket Synced! 🎟️",
        message: "Boom! 💥 Your InspireX Season 2 ticket has been successfully synchronized to your Connect Club account. Get ready for an epic experience! 🚀",
        read: false,
        actionUrl: `/u/dashboard`,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true, synced: true, message: "Successfully synced InspireX ticket" });
  } catch (error: any) {
    console.error("InspireX Sync Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
