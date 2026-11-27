/**
 * POST /api/users/sync-external
 *
 * Syncs approved/pending external registrations for the authenticated user.
 * Security hardening:
 * - Always resolves uid via `requireUserRequest` (checkRevoked: true).
 * - Never allows a user to claim external registrations for a roll number that
 *   does not match their own Firestore profile (`users/{uid}.rollNo`), or when
 *   another account already owns that normalized roll number.
 * - Rejects rows with `status === "rejected"` or already bound to another `userId`.
 */
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireUserRequest, authErrorResponse } from "@/lib/firebase/requestAuth";
import { generateTicketId } from "@/lib/tickets";
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
    namespace: "users:sync-external",
    identifier: `${token.uid}:${getClientIp(request)}`,
    limit: 15,
    windowMs: 5 * 60 * 1000,
  });
  if (!rl.allowed) {
    return rateLimitExceededResponse(rl);
  }

  try {
    const uid = token.uid;
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const db = getAdminDb();

    // Trust only the caller's own server-side profile roll number (never arbitrary body.rollNo).
    const profileSnap = await db.collection("users").doc(uid).get();
    if (!profileSnap.exists) {
      return NextResponse.json({ success: true, synced: 0 });
    }

    const profileRoll = normalizeRollNo(profileSnap.data()?.rollNo);
    if (!profileRoll || profileRoll.length < 4 || profileRoll.length > 30) {
      return NextResponse.json({ success: true, synced: 0 });
    }

    // If the body passed a rollNo, ensure it matches the caller's own profile rollNo.
    if (typeof body.rollNo === "string" && body.rollNo.trim()) {
      const requestedClean = normalizeRollNo(body.rollNo).replace(/[^A-Z0-9]/g, "");
      const profileClean = profileRoll.replace(/[^A-Z0-9]/g, "");
      if (requestedClean !== profileClean) {
        return NextResponse.json(
          { error: "Forbidden: roll number does not match your profile." },
          { status: 403 }
        );
      }
    }

    // Refuse sync if multiple accounts share this normalized roll number (conflict protection).
    const duplicateOwners = await db
      .collection("users")
      .where("normalizedRollNo", "==", profileRoll)
      .limit(2)
      .get();
    if (duplicateOwners.docs.some((d) => d.id !== uid)) {
      return NextResponse.json({ success: true, synced: 0 });
    }

    const strippedRoll = profileRoll.replace(/[^A-Z0-9]/g, "");
    let snapshot = await db
      .collection("external_registrations")
      .where("rollNo", "==", profileRoll)
      .limit(10)
      .get();

    if (snapshot.empty && strippedRoll && strippedRoll !== profileRoll) {
      snapshot = await db
        .collection("external_registrations")
        .where("rollNo", "==", strippedRoll)
        .limit(10)
        .get();
    }

    if (snapshot.empty) {
      return NextResponse.json({ success: true, synced: 0 });
    }

    let syncedCount = 0;
    const processedEventIds = new Set<string>();

    for (const extDoc of snapshot.docs) {
      const extData = extDoc.data();
      const eventId = typeof extData.eventId === "string" ? extData.eventId.trim() : "";
      if (!eventId || eventId.includes("/")) continue;

      // Never auto-approve admin-rejected registrations or steal another user's claimed ticket
      if (extData.status === "rejected") continue;
      if (typeof extData.userId === "string" && extData.userId && extData.userId !== uid) continue;

      const registrationRef = db.collection("event_registrations").doc(`${eventId}_${uid}`);

      const created = await db.runTransaction(async (transaction) => {
        const [freshExt, existing] = await Promise.all([
          transaction.get(extDoc.ref),
          transaction.get(registrationRef),
        ]);
        const freshExtData = freshExt.data();
        if (!freshExt.exists || !freshExtData) return false;
        if (freshExtData.status === "rejected") return false;
        if (typeof freshExtData.userId === "string" && freshExtData.userId && freshExtData.userId !== uid) {
          return false;
        }

        if (existing.exists) {
          const existingTicketId = existing.data()?.ticketId || null;
          transaction.update(extDoc.ref, {
            status: "approved",
            approvedAt: FieldValue.serverTimestamp(),
            userId: uid,
            note: "Auto-synced (ticket already existed)",
            ...(existingTicketId ? { ticketId: existingTicketId } : {}),
          });
          return false;
        }

        if (processedEventIds.has(eventId)) {
          transaction.update(extDoc.ref, {
            status: "approved",
            approvedAt: FieldValue.serverTimestamp(),
            userId: uid,
            note: "Auto-synced (ticket already existed)",
          });
          return false;
        }

        const ticketId = generateTicketId();

        transaction.set(registrationRef, {
          userId: uid,
          eventId,
          eventTitle: freshExtData.eventTitle || eventId,
          ticketId,
          registeredAt: FieldValue.serverTimestamp(),
          attended: false,
          certificateIssued: false,
        });

        const notifRef = db.collection("notifications").doc();
        transaction.set(notifRef, {
          userId: uid,
          type: "event",
          title: "You're In!",
          message: `Your registration for ${freshExtData.eventTitle || eventId} has been auto-confirmed. Your ticket ID is ${ticketId}.`,
          read: false,
          actionUrl: `/u/dashboard`,
          createdAt: FieldValue.serverTimestamp(),
        });

        transaction.update(extDoc.ref, {
          status: "approved",
          approvedAt: FieldValue.serverTimestamp(),
          userId: uid,
          ticketId,
        });

        processedEventIds.add(eventId);
        return true;
      });

      if (created) syncedCount++;
    }

    return NextResponse.json({ success: true, synced: syncedCount });
  } catch (error) {
    console.error("Auto-sync Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
