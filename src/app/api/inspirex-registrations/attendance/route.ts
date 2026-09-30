import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { requireStaffRequest } from "@/lib/firebase/requestAuth";

export async function POST(req: Request) {
  try {
    const staffToken = await requireStaffRequest(req);
    const body = await req.json();
    const { registrationId, session, status } = body;

    if (!registrationId || !session || typeof status !== "boolean") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (session !== "morning" && session !== "afternoon") {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    // Keep the admin list and attendance records consistent by updating the
    // primary inbox record first. The external source is updated when its
    // sourceRegistrationId is available.
    const primaryDb = getFirestore((await import("@/lib/firebase/admin")).getAdminApp());
    const primaryRef = primaryDb.collection("external_registrations").doc(registrationId);
    const primarySnapshot = await primaryRef.get();
    if (!primarySnapshot.exists) {
      return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    }

    const fieldName = session === "morning" ? "morningAttendance" : "afternoonAttendance";
    const current = primarySnapshot.data()?.[fieldName] === true;
    if (current === status) {
      return NextResponse.json({ success: true, alreadyApplied: true, status });
    }
    await primaryRef.update({
      [fieldName]: status,
      [`${fieldName}At`]: status ? admin.firestore.FieldValue.serverTimestamp() : null,
      [`${fieldName}By`]: status ? (staffToken.email || staffToken.uid) : null,
    });

    // Initialize the secondary InspireX Admin SDK when configured.
    const projectId = process.env.INSPIREX_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.INSPIREX_FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.INSPIREX_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("InspireX Firebase credentials are unavailable; attendance was saved to the Connect Club inbox only.");
      return NextResponse.json({ success: true, status, secondarySync: "pending" });
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
    
    const sourceRegistrationId = primarySnapshot.data()?.sourceRegistrationId;
    if (sourceRegistrationId) {
      try {
        await db.collection("registrations").doc(sourceRegistrationId).update({
          [fieldName]: status,
          [`${fieldName}At`]: status ? admin.firestore.FieldValue.serverTimestamp() : null,
          [`${fieldName}By`]: status ? (staffToken.email || staffToken.uid) : null,
        });
      } catch (secondaryError) {
        console.error("Attendance saved locally but external sync failed:", secondaryError);
        return NextResponse.json({ success: true, status, secondarySync: "failed" });
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized: Admin authentication required." }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }
    console.error("Error updating InspireX attendance:", error);
    return NextResponse.json(
      { error: "Failed to update attendance.", details: message },
      { status: 500 }
    );
  }
}
