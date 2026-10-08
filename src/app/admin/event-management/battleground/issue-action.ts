"use server";

import { getAdminApp, getBattlegroundAdminDb } from "@/lib/firebase/admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { commitInChunksAdmin, type BatchOp } from "@/lib/firebase/batch";

export async function issueBattlegroundCertificates() {
  const eventId = "battlegrounds";
  const eventTitle = "Battlegrounds";
  
  try {
    const mainApp = getAdminApp();
    const mainDb = getFirestore(mainApp);
    const bgDb = getBattlegroundAdminDb();

    const templateDoc = await mainDb.collection("event_templates").doc(eventId).get();
    if (!templateDoc.exists || !templateDoc.data()?.imageUrl) {
      return {
        success: false,
        message: "Please configure a certificate template for Battlegrounds before issuing certificates.",
      };
    }

    const registrationsSnap = await bgDb.collection("registrations").get();

    if (registrationsSnap.empty) {
      return { success: false, message: "No registered participants found for this event." };
    }

    const ops: BatchOp[] = [];
    let issuedCount = 0;

    for (const regDoc of registrationsSnap.docs) {
      const reg = regDoc.data();
      
      // Only process verified teams that attended
      if (reg.status !== "verified") continue;
      // Define attendance condition based on both morning and afternoon if required, or either.
      if (!reg.morningAttendance && !reg.afternoonAttendance) continue;

      const teamName = reg.teamName || "Unknown Team";

      const processParticipant = async (name: string, rollNo: string, isLead: boolean) => {
        if (!name || !rollNo) return;
        
        // Use rollNo to uniquely identify the user in certificates to avoid duplicates for the same event
        // But since we don't necessarily have a standard userId in the BG database, we might use rollNo as an identifier.
        // Let's see if we can find them in the main users DB based on rollNo.
        const usersRef = await mainDb.collection("users").where("rollNo", "==", rollNo).limit(1).get();
        let userId = rollNo; // Fallback to rollNo if not found in main users table
        
        if (!usersRef.empty) {
          userId = usersRef.docs[0].id;
        }

        const certCheck = await mainDb
          .collection("certificates")
          .where("userId", "==", userId)
          .where("eventId", "==", eventId)
          .limit(1)
          .get();

        if (!certCheck.empty) return; // Already issued

        const certRef = mainDb.collection("certificates").doc();

        ops.push({
          type: "set",
          ref: certRef,
          data: {
            userId,
            eventId,
            eventTitle,
            issuedAt: FieldValue.serverTimestamp(),
            type: "participation",
            participantName: name,
            participantBranch: teamName, // Team Name stored here for BG
            rollNo,
            role: isLead ? "Lead" : "Member",
          },
        });

        if (!usersRef.empty) {
          ops.push({
            type: "set",
            ref: mainDb.collection("notifications").doc(),
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
        }
        issuedCount++;
      };

      // Process Lead
      if (reg.lead?.name) {
        await processParticipant(reg.lead.name, reg.lead.roll || reg.lead.rollNo, true);
      }
      
      // Process Members
      if (reg.members && Array.isArray(reg.members)) {
        for (const member of reg.members) {
          if (member.name) {
             await processParticipant(member.name, member.roll || member.rollNo, false);
          }
        }
      }
      
      // Optionally mark the registration doc in the bgDb as certificate issued.
      // Assuming we can update bgDb directly here, we will just use standard update.
      await regDoc.ref.update({
        certificateIssued: true
      });
    }

    if (issuedCount === 0) {
      return {
        success: false,
        message: "No eligible new certificates were generated for this event.",
      };
    }

    await commitInChunksAdmin(mainDb, ops);

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
