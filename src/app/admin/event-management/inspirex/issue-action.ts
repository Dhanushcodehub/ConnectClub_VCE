"use server";

import { getAdminDb } from "@/lib/firebase/admin";
import { verifyStaffTokenString } from "@/lib/firebase/requestAuth";
import { logAuditEvent } from "@/lib/firebase/auditLog";
import { FieldValue } from "firebase-admin/firestore";
import { commitInChunksAdmin, type BatchOp } from "@/lib/firebase/batch";

export async function issueEventCertificates(
  eventId: string,
  eventTitle: string,
  idToken?: string
) {
  try {
    const caller = await verifyStaffTokenString(idToken, "inspirex_certificates");

    const cleanEventId = typeof eventId === "string" ? eventId.trim() : "";
    const cleanTitle = typeof eventTitle === "string" ? eventTitle.trim().slice(0, 200) : "";
    if (!cleanEventId || cleanEventId.includes("/") || !cleanTitle) {
      return { success: false, message: "Invalid event parameters." };
    }

    const db = getAdminDb();

    const templateDoc = await db.collection("event_templates").doc(cleanEventId).get();
    if (!templateDoc.exists || !templateDoc.data()?.imageUrl) {
      return {
        success: false,
        message: "Please configure a certificate template for this event before issuing certificates.",
      };
    }

    const [registrationsSnap, existingCertsSnap] = await Promise.all([
      db.collection("event_registrations").where("eventId", "==", cleanEventId).get(),
      db.collection("certificates").where("eventId", "==", cleanEventId).select("userId").get(),
    ]);

    if (registrationsSnap.empty) {
      return { success: false, message: "No registered participants found for this event." };
    }

    const existingUserIds = new Set(
      existingCertsSnap.docs.map((d) => String(d.data()?.userId || "")).filter(Boolean)
    );

    const eligibleRegDocs = registrationsSnap.docs.filter((d) => {
      const uid = String(d.data()?.userId || "");
      return uid && !existingUserIds.has(uid);
    });

    if (eligibleRegDocs.length === 0) {
      return {
        success: false,
        message: "No eligible new certificates were generated for this event.",
      };
    }

    // Batch-fetch user profiles needed for fallback name/branch instead of N+1 reads
    const uniqueUserIds = Array.from(
      new Set(eligibleRegDocs.map((d) => String(d.data()?.userId || "")))
    );
    const userDataMap = new Map<string, Record<string, unknown>>();
    const USER_CHUNK = 100;
    for (let i = 0; i < uniqueUserIds.length; i += USER_CHUNK) {
      const refs = uniqueUserIds.slice(i, i + USER_CHUNK).map((uid) => db.collection("users").doc(uid));
      const snaps = await db.getAll(...refs);
      for (const snap of snaps) {
        if (snap.exists) {
          userDataMap.set(snap.id, snap.data() || {});
        }
      }
    }

    const ops: BatchOp[] = [];
    let issuedCount = 0;

    for (const regDoc of eligibleRegDocs) {
      const reg = regDoc.data();
      const userId = String(reg.userId);
      if (existingUserIds.has(userId)) continue;
      existingUserIds.add(userId);

      const userData = userDataMap.get(userId);
      const participantName =
        (typeof reg.participantName === "string" && reg.participantName) ||
        (typeof userData?.name === "string" && userData.name) ||
        "Participant";
      const participantBranch =
        (typeof reg.participantBranch === "string" && reg.participantBranch) ||
        (typeof userData?.branch === "string" && userData.branch) ||
        (typeof userData?.department === "string" && userData.department) ||
        "N/A";

      const certRef = db.collection("certificates").doc();

      ops.push({
        type: "set",
        ref: certRef,
        data: {
          userId,
          eventId: cleanEventId,
          eventTitle: cleanTitle,
          issuedAt: FieldValue.serverTimestamp(),
          type: "participation",
          participantName,
          participantBranch,
        },
      });

      ops.push({
        type: "update",
        ref: regDoc.ref,
        data: {
          certificateIssued: true,
          certificateId: certRef.id,
        },
      });

      ops.push({
        type: "set",
        ref: db.collection("notifications").doc(),
        data: {
          userId,
          type: "certificate",
          title: `${cleanTitle} Certificate Ready!`,
          message: `Your certificate for ${cleanTitle} is now available.`,
          actionUrl: `/certificate/${certRef.id}`,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        },
      });

      issuedCount++;
    }

    if (issuedCount === 0) {
      return {
        success: false,
        message: "No eligible new certificates were generated for this event.",
      };
    }

    await commitInChunksAdmin(db, ops);
    await logAuditEvent(db, {
      actorUid: caller.uid,
      actorEmail: caller.email ?? null,
      action: "issue_certificates",
      targetType: "event",
      targetId: cleanEventId,
      meta: { issuedCount },
    });

    return {
      success: true,
      message: `Successfully issued ${issuedCount} certificates for ${cleanTitle}.`,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return { success: false, message: "Forbidden: insufficient permissions." };
    }
    console.error("Error issuing event certificates:", error);
    return {
      success: false,
      message: "Failed to issue certificates.",
    };
  }
}

export async function issueInspirexCertificates(idToken?: string) {
  return issueEventCertificates("inspirex-s2", "InspireX Season 2", idToken);
}
