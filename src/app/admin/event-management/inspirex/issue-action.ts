"use server";

import { getAdminApp } from "@/lib/firebase/admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { commitInChunksAdmin, type BatchOp } from "@/lib/firebase/batch";

export async function issueEventCertificates(eventId: string, eventTitle: string) {
  try {
    const app = getAdminApp();
    const db = getFirestore(app);

    const templateDoc = await db.collection("event_templates").doc(eventId).get();
    if (!templateDoc.exists || !templateDoc.data()?.imageUrl) {
      return {
        success: false,
        message: "Please configure a certificate template for this event before issuing certificates.",
      };
    }

    const registrationsSnap = await db
      .collection("event_registrations")
      .where("eventId", "==", eventId)
      .get();

    if (registrationsSnap.empty) {
      return { success: false, message: "No registered participants found for this event." };
    }

    const ops: BatchOp[] = [];
    let issuedCount = 0;

    for (const regDoc of registrationsSnap.docs) {
      const reg = regDoc.data();
      const userId = reg.userId;

      if (!userId) continue;

      const userSnap = await db.collection("users").doc(userId).get();
      const userData = userSnap.data();

      const participantName = reg.participantName || userData?.name || "Participant";
      const participantBranch = reg.participantBranch || userData?.branch || "N/A";

      const certCheck = await db
        .collection("certificates")
        .where("userId", "==", userId)
        .where("eventId", "==", eventId)
        .limit(1)
        .get();

      if (!certCheck.empty) continue;

      const certRef = db.collection("certificates").doc();

      ops.push({
        type: "set",
        ref: certRef,
        data: {
          userId,
          eventId,
          eventTitle,
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
          title: `${eventTitle} Certificate Ready!`,
          message: `Your certificate for ${eventTitle} is now available.`,
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

    return {
      success: true,
      message: `Successfully issued ${issuedCount} certificates for ${eventTitle}.`,
    };
  } catch (error: any) {
    console.error("Error issuing event certificates:", error);
    return {
      success: false,
      message: error.message || "Failed to issue certificates.",
    };
  }
}

export async function issueInspirexCertificates() {
  return issueEventCertificates("inspirex-s2", "InspireX Season 2");
}
