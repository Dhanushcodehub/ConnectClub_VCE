import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { registrationId, session, status } = body;

    if (!registrationId || !session || typeof status !== "boolean") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (session !== "morning" && session !== "afternoon") {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    // Initialize the secondary InspireX Admin SDK
    const projectId = process.env.INSPIREX_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.INSPIREX_FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.INSPIREX_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      console.error("Missing InspireX Firebase credentials in environment variables.");
      return NextResponse.json(
        { error: "Server configuration error: Missing InspireX credentials." },
        { status: 500 }
      );
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

    const db = getFirestore(inspirexApp);
    
    const fieldName = session === "morning" ? "morningAttendance" : "afternoonAttendance";
    
    await db.collection("registrations").doc(registrationId).update({
      [fieldName]: status,
      [`${fieldName}At`]: status ? admin.firestore.FieldValue.serverTimestamp() : null
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating InspireX attendance:", error);
    return NextResponse.json(
      { error: "Failed to update attendance.", details: error.message },
      { status: 500 }
    );
  }
}
