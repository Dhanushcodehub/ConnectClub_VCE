import { NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";
import { generateTicketId } from "@/lib/tickets";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// The external ticket ID must match TX-XXXXXX.. (alphanumeric, bounded length)
// so a malicious payload can't smuggle arbitrary strings into ticket documents.
const TICKET_ID_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    // 1. Verify Authorization
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CONNECT_CLUB_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error(
        "Webhook secret is not configured — rejecting request instead of falling back to an insecure default."
      );
      return NextResponse.json({ error: "Server configuration error" }, { status: 500, headers: corsHeaders });
    }

    // Timing-safe comparison so request timing can't leak the secret.
    if (!authHeader || authHeader.length !== `Bearer ${expectedSecret}`.length) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }
    if (!timingSafeEqual(authHeader, `Bearer ${expectedSecret}`)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    // 2. Parse Payload
    let body: {
      rollNo?: unknown;
      eventId?: unknown;
      eventTitle?: unknown;
      ticketId?: unknown;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders });
    }

    const { rollNo, eventId, eventTitle, ticketId } = body;

    if (typeof rollNo !== "string" || !rollNo.trim() || typeof eventId !== "string" || !eventId.trim() || typeof eventTitle !== "string" || !eventTitle.trim()) {
      return NextResponse.json({ error: "Missing required fields: rollNo, eventId, eventTitle" }, { status: 400, headers: corsHeaders });
    }
    if (ticketId !== undefined && (typeof ticketId !== "string" || !TICKET_ID_PATTERN.test(ticketId))) {
      return NextResponse.json({ error: "Invalid ticketId format" }, { status: 400, headers: corsHeaders });
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

    let updatedCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      // Deterministic registration ID makes concurrent webhook deliveries
      // idempotent: whoever writes second sees the doc exist and skips.
      const registrationRef = db.collection("event_registrations").doc(`${eventId}_${userId}`);

      // 5-7. Create registration + notification transactionally
      await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(registrationRef);
        if (existing.exists) {
          return; // Already registered (or a concurrent delivery won the race)
        }

        const generatedTicketId = ticketId || generateTicketId();

        transaction.set(registrationRef, {
          userId,
          eventId,
          eventTitle,
          ticketId: generatedTicketId,
          registeredAt: FieldValue.serverTimestamp(),
          attended: false,
          certificateIssued: false,
        });

        const notificationRef = db.collection("notifications").doc();
        transaction.set(notificationRef, {
          userId,
          type: "event",
          title: "Registration Confirmed!",
          message: `You have successfully registered for ${eventTitle}! It has been added to your My Events tab.`,
          read: false,
          actionUrl: `/u/dashboard`,
          createdAt: FieldValue.serverTimestamp(),
        });

        updatedCount++;
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Registration synced and notification sent.",
        updatedCount,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}

/** Constant-time string comparison (avoids leaking the secret via timing). */
function timingSafeEqual(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length);
  let mismatch = 0;
  for (let i = 0; i < maxLength; i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}
