import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";
import { generateTicketId } from "@/lib/tickets";
import { normalizeRollNo } from "@/lib/registrations/validation";

const TICKET_ID_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;
const DOC_ID_SAFE_PATTERN = /^[A-Za-z0-9_-]{2,80}$/;

function verifyBearerSecret(authHeader: string | null, expectedSecret: string): boolean {
  if (!authHeader || !expectedSecret) return false;
  const a = createHash("sha256").update(authHeader).digest();
  const b = createHash("sha256").update(`Bearer ${expectedSecret}`).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CONNECT_CLUB_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error("Webhook secret is not configured.");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (!verifyBearerSecret(authHeader, expectedSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { rollNo, eventId, eventTitle, ticketId } = body as {
      rollNo?: unknown;
      eventId?: unknown;
      eventTitle?: unknown;
      ticketId?: unknown;
    };

    if (
      typeof rollNo !== "string" ||
      typeof eventId !== "string" ||
      typeof eventTitle !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing required fields: rollNo, eventId, eventTitle" },
        { status: 400 }
      );
    }

    const cleanRollNo = normalizeRollNo(rollNo).slice(0, 30);
    const cleanEventId = eventId.trim();
    const cleanEventTitle = eventTitle.trim().slice(0, 200);

    if (
      !cleanRollNo ||
      !DOC_ID_SAFE_PATTERN.test(cleanEventId) ||
      !cleanEventTitle
    ) {
      return NextResponse.json(
        { error: "Invalid rollNo, eventId, or eventTitle format" },
        { status: 400 }
      );
    }

    if (ticketId !== undefined && (typeof ticketId !== "string" || !TICKET_ID_PATTERN.test(ticketId))) {
      return NextResponse.json({ error: "Invalid ticketId format" }, { status: 400 });
    }

    const db = getFirestore(getAdminApp());
    const usersSnapshot = await db
      .collection("users")
      .where("rollNo", "==", cleanRollNo)
      .limit(5)
      .get();

    if (usersSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "User is not a Connect Club member. Ignored.",
      });
    }

    let updatedCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const registrationRef = db.collection("event_registrations").doc(`${cleanEventId}_${userId}`);

      await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(registrationRef);
        if (existing.exists) {
          return;
        }

        const generatedTicketId = (typeof ticketId === "string" && ticketId) || generateTicketId();

        transaction.set(registrationRef, {
          userId,
          eventId: cleanEventId,
          eventTitle: cleanEventTitle,
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
          message: `You have successfully registered for ${cleanEventTitle}! It has been added to your My Events tab.`,
          read: false,
          actionUrl: `/u/dashboard`,
          createdAt: FieldValue.serverTimestamp(),
        });

        updatedCount++;
      });
    }

    return NextResponse.json({
      success: true,
      message: "Registration synced and notification sent.",
      updatedCount,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
