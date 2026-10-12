import { NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { generateTicketId } from "@/lib/tickets";
import * as admin from "firebase-admin";
import { getAdminApp } from "@/lib/firebase/admin";
import { requireUserRequest, authErrorResponse } from "@/lib/firebase/requestAuth";
import { normalizeRollNo } from "@/lib/registrations/validation";

/**
 * POST /api/users/retroactive-sync
 *
 * Hardened: requires a valid ID token and always syncs tickets into the
 * caller's own account. A body `userId` is only honoured for admins, so an
 * anonymous caller can no longer inject registrations (and notifications)
 * into someone else's event list.
 */
export async function POST(request: Request) {
  let token;
  try {
    token = await requireUserRequest(request);
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, rollNo } = body;

    if (!rollNo || typeof rollNo !== "string") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const isAdmin = token.role === "admin" || token.email === "admin@connectclubvce.in";
    const requestedUserId = typeof userId === "string" && userId ? userId : token.uid;
    if (requestedUserId !== token.uid && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: cannot sync another account" }, { status: 403 });
    }

    const targetUserId = requestedUserId;
    const cleanRollNo = rollNo.toUpperCase().trim().slice(0, 20);

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

    // The roll number must belong to the account being synced — otherwise a
    // signed-in user could attach someone else's InspireX registration to
    // their ticket list.
    const profileSnap = await ccDb.collection("users").doc(targetUserId).get();
    const profileRollNo = profileSnap.exists
      ? normalizeRollNo(profileSnap.data()?.rollNo)
      : "";

    if (!profileRollNo) {
      return NextResponse.json({
        success: true,
        message: "Skipped: complete your profile (roll number) first.",
      });
    }
    if (profileRollNo !== cleanRollNo.replace(/[\s]/g, "").toUpperCase()) {
      return NextResponse.json({
        success: true,
        message: "Skipped: roll number does not match your profile.",
      });
    }

    const eventId = "inspirex-s2";
    const eventTitle = "InspireX Season 2";

    const existingRegistration = await ccDb.collection("event_registrations")
      .where("userId", "==", targetUserId)
      .where("eventId", "==", eventId)
      .limit(1)
      .get();

    if (!existingRegistration.empty) {
      return NextResponse.json({ success: true, message: "Already synced." });
    }

    // 4. Create Event Registration Document (deterministic id so concurrent
    //    calls cannot create duplicate tickets for the same user/event).
    const batch = ccDb.batch();

    const registrationRef = ccDb.collection("event_registrations").doc(`${eventId}_${targetUserId}`);
    const generatedTicketId = generateTicketId();

    batch.set(registrationRef, {
      userId: targetUserId,
      eventId,
      eventTitle,
      ticketId: generatedTicketId,
      registeredAt: FieldValue.serverTimestamp(),
      attended: false,
      certificateIssued: false
    });

    // 5. Create Notification
    const notificationRef = ccDb.collection("notifications").doc();
    batch.set(notificationRef, {
      userId: targetUserId,
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
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Retroactive sync error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
