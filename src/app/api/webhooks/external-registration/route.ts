import { NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    // 1. Verify Authorization
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CONNECT_CLUB_WEBHOOK_SECRET || "local_dev_secret_12345";

    if (!expectedSecret) {
      console.error("Webhook secret is not configured in Connect Club.");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500, headers: corsHeaders });
    }

    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    // 2. Parse Payload
    const body = await request.json();
    const { rollNo, eventId, eventTitle, ticketId } = body;

    if (!rollNo || !eventId || !eventTitle) {
      return NextResponse.json({ error: "Missing required fields: rollNo, eventId, eventTitle" }, { status: 400, headers: corsHeaders });
    }

    const cleanRollNo = rollNo.toUpperCase().trim();

    // 3. Initialize Admin SDK
    const app = getAdminApp();
    const db = getFirestore(app);

    // 4. Find the Connect Club User(s)
    // Since some users might have duplicate accounts with the same roll number during testing,
    // we should apply the registration to all matching accounts so they see it.
    const usersSnapshot = await db.collection("users").where("rollNo", "==", cleanRollNo).get();
    
    if (usersSnapshot.empty) {
      // User is not a Connect Club member, nothing to do on our side
      return NextResponse.json({ success: true, message: "User is not a Connect Club member. Ignored." }, { headers: corsHeaders });
    }

    const batch = db.batch();
    let updatedCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      // 5. Check if they are already registered for this event in Connect Club
      const existingRegistration = await db.collection("event_registrations")
        .where("userId", "==", userId)
        .where("eventId", "==", eventId)
        .limit(1)
        .get();

      if (!existingRegistration.empty) {
        continue; // Skip if already registered
      }

      // 6. Create Event Registration Document
      const registrationRef = db.collection("event_registrations").doc();
      const generatedTicketId = ticketId || `TX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      batch.set(registrationRef, {
        userId,
        eventId,
        eventTitle,
        ticketId: generatedTicketId,
        registeredAt: FieldValue.serverTimestamp(),
        attended: false,
        certificateIssued: false
      });

      // 7. Create Notification
      const notificationRef = db.collection("notifications").doc();
      batch.set(notificationRef, {
        userId,
        type: "event",
        title: "Registration Confirmed!",
        message: `You have successfully registered for ${eventTitle}! It has been added to your My Events tab.`,
        read: false,
        actionUrl: `/u/dashboard`,
        createdAt: FieldValue.serverTimestamp(),
      });
      
      updatedCount++;
    }

    if (updatedCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, message: "Registration synced and notification sent." }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}
