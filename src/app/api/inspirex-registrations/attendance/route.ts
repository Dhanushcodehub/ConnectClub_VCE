import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";
import { requireStaffRequest, authErrorResponse } from "@/lib/firebase/requestAuth";
import { logAuditEvent } from "@/lib/firebase/auditLog";

export async function POST(req: Request) {
  let staffToken;
  try {
    staffToken = await requireStaffRequest(req);
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const { registrationId, session, status } = body as {
      registrationId?: unknown;
      session?: unknown;
      status?: unknown;
    };

    if (
      typeof registrationId !== "string" ||
      !registrationId.trim() ||
      registrationId.includes("/") ||
      typeof status !== "boolean"
    ) {
      return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
    }

    if (session !== "morning" && session !== "afternoon") {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    const cleanRegId = registrationId.trim();
    const primaryDb = getFirestore(getAdminApp());
    const primaryRef = primaryDb.collection("external_registrations").doc(cleanRegId);
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
      [`${fieldName}By`]: status ? staffToken.email || staffToken.uid : null,
    });

    await logAuditEvent(primaryDb, {
      actorUid: staffToken.uid,
      actorEmail: staffToken.email ?? null,
      action: "attendance_updated",
      targetType: "external_registration",
      targetId: cleanRegId,
      meta: { session, status },
    });

    const projectId = process.env.INSPIREX_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.INSPIREX_FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.INSPIREX_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      return NextResponse.json({ success: true, status, secondarySync: "pending" });
    }

    const appName = "inspirex-admin";
    let inspirexApp: admin.app.App;
    const existingApp = admin.apps.find((app) => app && app.name === appName);
    if (existingApp) {
      inspirexApp = existingApp;
    } else {
      inspirexApp = admin.initializeApp(
        {
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        },
        appName
      );
    }

    const db = getFirestore(inspirexApp);
    const sourceRegistrationId = primarySnapshot.data()?.sourceRegistrationId;
    if (typeof sourceRegistrationId === "string" && sourceRegistrationId && !sourceRegistrationId.includes("/")) {
      try {
        await db.collection("registrations").doc(sourceRegistrationId).update({
          [fieldName]: status,
          [`${fieldName}At`]: status ? admin.firestore.FieldValue.serverTimestamp() : null,
          [`${fieldName}By`]: status ? staffToken.email || staffToken.uid : null,
        });
      } catch (secondaryError) {
        console.error("Attendance saved locally but external sync failed:", secondaryError);
        return NextResponse.json({ success: true, status, secondarySync: "failed" });
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Error updating InspireX attendance:", error);
    return NextResponse.json({ error: "Failed to update attendance." }, { status: 500 });
  }
}
