import { NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { getAdminApp } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, rollNo } = body;

    if (!userId || !rollNo) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cleanRollNo = rollNo.toUpperCase().trim();

    // 1. Initialize the secondary InspireX Admin SDK
    const projectId = process.env.INSPIREX_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.INSPIREX_FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.INSPIREX_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("InspireX database credentials missing. Skipping retroactive sync.");
      return NextResponse.json({ success: true, message: "Skipped (no creds)" });
    }

    let inspirexApp;
    const APP_NAME = "inspirex-admin";
    if (admin.apps.length > 0) {
      inspirexApp = admin.apps.find((app) => app?.name === APP_NAME);
    }
    if (!inspirexApp) {
      inspirexApp = admin.initializeApp(
        {
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        },
        APP_NAME
      );
    }

    const inspirexDb = getFirestore(inspirexApp);

    // 2. Query InspireX database to see if they registered
    const registrationsSnapshot = await inspirexDb.collection("registrations")
      .where("rollNo", "==", cleanRollNo)
      .limit(1)
      .get();

    if (registrationsSnapshot.empty) {
      return NextResponse.json({ success: true, message: "No InspireX registration found." });
    }

    // 3. They did register! Check if we already synced it in Connect Club
    const primaryApp = getAdminApp();
    const ccDb = getFirestore(primaryApp);
    
    const eventId = "inspirex-s2";
    const eventTitle = "InspireX Season 2";

    const existingRegistration = await ccDb.collection("event_registrations")
      .where("userId", "==", userId)
      .where("eventId", "==", eventId)
      .limit(1)
      .get();

    if (!existingRegistration.empty) {
      return NextResponse.json({ success: true, message: "Already synced." });
    }

    // 4. Create Event Registration Document
    const batch = ccDb.batch();

    const registrationRef = ccDb.collection("event_registrations").doc();
    batch.set(registrationRef, {
      userId,
      eventId,
      eventTitle,
      registeredAt: FieldValue.serverTimestamp(),
      attended: false,
      certificateIssued: false
    });

    // 5. Create Notification
    const notificationRef = ccDb.collection("notifications").doc();
    batch.set(notificationRef, {
      userId,
      type: "event",
      title: "Registration Confirmed!",
      message: `You have successfully registered for ${eventTitle}! It has been added to your My Events tab.`,
      read: false,
      actionUrl: `/u/dashboard`,
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return NextResponse.json({ success: true, message: "Retroactive sync complete." });
  } catch (error: any) {
    console.error("Retroactive sync error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
