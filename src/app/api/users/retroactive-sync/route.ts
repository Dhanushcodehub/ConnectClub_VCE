import { NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { generateTicketId } from "@/lib/tickets";
import * as admin from "firebase-admin";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireUserRequest, authErrorResponse } from "@/lib/firebase/requestAuth";
import { normalizeRollNo } from "@/lib/registrations/validation";
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let token;
  try {
    token = await requireUserRequest(request);
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit({
    namespace: "users:retroactive-sync",
    identifier: `${token.uid}:${getClientIp(request)}`,
    limit: 15,
    windowMs: 5 * 60 * 1000,
  });
  if (!rl.allowed) {
    return rateLimitExceededResponse(rl);
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const { userId, rollNo } = body as { userId?: unknown; rollNo?: unknown };

    if (!rollNo || typeof rollNo !== "string") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const isAdmin =
      token.role === "admin" ||
      token.role === "superadmin" ||
      (token.email === "admin@connectclubvce.in" && token.email_verified === true);
    const requestedUserId = typeof userId === "string" && userId ? userId : token.uid;
    if (requestedUserId !== token.uid && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: cannot sync another account" }, { status: 403 });
    }

    const targetUserId = requestedUserId;
    const cleanRollNo = normalizeRollNo(rollNo).slice(0, 30);
    if (!/^[A-Z0-9][A-Z0-9-]{3,29}$/.test(cleanRollNo)) {
      return NextResponse.json({ error: "Invalid roll number format" }, { status: 400 });
    }

    const projectId = process.env.INSPIREX_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.INSPIREX_FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.INSPIREX_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
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
    const registrationsSnapshot = await inspirexDb
      .collection("registrations")
      .where("rollNo", "==", cleanRollNo)
      .limit(1)
      .get();

    if (registrationsSnapshot.empty) {
      return NextResponse.json({ success: true, message: "No InspireX registration found." });
    }

    const ccDb = getAdminDb();
    const profileSnap = await ccDb.collection("users").doc(targetUserId).get();
    const profileRollNo = profileSnap.exists ? normalizeRollNo(profileSnap.data()?.rollNo) : "";

    if (!profileRollNo) {
      return NextResponse.json({
        success: true,
        message: "Skipped: complete your profile (roll number) first.",
      });
    }
    if (profileRollNo.replace(/[^A-Z0-9]/g, "") !== cleanRollNo.replace(/[^A-Z0-9]/g, "")) {
      return NextResponse.json({
        success: true,
        message: "Skipped: roll number does not match your profile.",
      });
    }

    // Refuse if another user already owns this normalized roll number.
    const dupUsers = await ccDb
      .collection("users")
      .where("normalizedRollNo", "==", profileRollNo)
      .limit(2)
      .get();
    if (dupUsers.docs.some((d) => d.id !== targetUserId)) {
      return NextResponse.json({
        success: true,
        message: "Skipped: conflicting roll number ownership.",
      });
    }

    const eventId = "inspirex-s2";
    const eventTitle = "InspireX Season 2";
    const registrationRef = ccDb.collection("event_registrations").doc(`${eventId}_${targetUserId}`);

    const outcome = await ccDb.runTransaction(async (tx) => {
      const existingById = await tx.get(registrationRef);
      if (existingById.exists) return "already";

      const legacyQuery = await tx.get(
        ccDb
          .collection("event_registrations")
          .where("userId", "==", targetUserId)
          .where("eventId", "==", eventId)
          .limit(1)
      );
      if (!legacyQuery.empty) return "already";

      const generatedTicketId = generateTicketId();
      tx.set(registrationRef, {
        userId: targetUserId,
        eventId,
        eventTitle,
        ticketId: generatedTicketId,
        registeredAt: FieldValue.serverTimestamp(),
        attended: false,
        certificateIssued: false,
      });

      const notificationRef = ccDb.collection("notifications").doc();
      tx.set(notificationRef, {
        userId: targetUserId,
        type: "event",
        title: "Registration Confirmed!",
        message: `You have successfully registered for ${eventTitle}! It has been added to your My Events tab.`,
        read: false,
        actionUrl: `/u/dashboard`,
        createdAt: FieldValue.serverTimestamp(),
      });

      return "created";
    });

    if (outcome === "already") {
      return NextResponse.json({ success: true, message: "Already synced." });
    }
    return NextResponse.json({ success: true, message: "Retroactive sync complete." });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Retroactive sync error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
