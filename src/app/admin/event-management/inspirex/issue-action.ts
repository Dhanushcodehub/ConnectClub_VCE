"use server";

import * as admin from "firebase-admin";
import { getAdminApp } from "@/lib/firebase/admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export async function issueInspirexCertificates() {
  try {
    // 1. Initialize Connect Club Admin SDK
    const primaryApp = getAdminApp();
    const primaryDb = getFirestore(primaryApp);

    // 2. Initialize InspireX Admin SDK
    const projectId = process.env.INSPIREX_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.INSPIREX_FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.INSPIREX_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Missing InspireX Firebase credentials in environment variables.");
    }

    const appName = "inspirex-admin";
    let inspirexApp: admin.app.App;
    
    const existingApp = admin.apps.find(app => app && app.name === appName);
    if (existingApp) {
      inspirexApp = existingApp;
    } else {
      inspirexApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      }, appName);
    }

    const inspirexDb = getFirestore(inspirexApp);

    // 3. Ensure Certificate Template Exists
    const templateDoc = await primaryDb.collection("event_templates").doc("inspirex-s2").get();
    if (!templateDoc.exists || !templateDoc.data()?.imageUrl) {
      return { success: false, message: "Please configure a certificate template in the Certificate Studio before issuing certificates." };
    }

    // 4. Get all raw registrations from InspireX
    const inspirexSnapshot = await inspirexDb.collection("registrations").get();
    
    if (inspirexSnapshot.empty) {
      return { success: false, message: "No registrations found in InspireX database." };
    }

    const batch = primaryDb.batch();
    let issuedCount = 0;
    
    // We will do batched queries to find users
    for (const doc of inspirexSnapshot.docs) {
      const data = doc.data();
      const rawRollNo = data.rollNo || "";
      const cleanRollNo = rawRollNo.toUpperCase().trim();
      
      if (!cleanRollNo) continue;

      // Find if this roll number belongs to a Connect Club member
      const userSnap = await primaryDb.collection("users").where("rollNo", "==", cleanRollNo).limit(1).get();
      if (userSnap.empty) continue; // Not a CC member
      
      const userId = userSnap.docs[0].id;

      // Check if they already got this certificate
      const certCheck = await primaryDb.collection("certificates")
        .where("userId", "==", userId)
        .where("eventId", "==", "inspirex-s2")
        .limit(1)
        .get();

      if (!certCheck.empty) continue; // Already issued

      // 4. Generate Certificate
      const certRef = primaryDb.collection("certificates").doc();
      batch.set(certRef, {
        userId: userId,
        eventId: "inspirex-s2",
        eventTitle: "InspireX Season 2",
        issuedAt: FieldValue.serverTimestamp(),
        type: "participation",
        participantName: data.name || data.fullName || "Participant",
        participantBranch: data.branch || "Unknown"
      });

      // 5. Check if they have an event_registration. If so, mark it issued. 
      // If not (e.g. registered before webhook), create it.
      const regCheck = await primaryDb.collection("event_registrations")
        .where("userId", "==", userId)
        .where("eventId", "==", "inspirex-s2")
        .limit(1)
        .get();

      if (!regCheck.empty) {
        batch.update(regCheck.docs[0].ref, {
          certificateIssued: true,
          certificateId: certRef.id,
          ticketId: doc.id // sync ticket ID just in case
        });
      } else {
        const regRef = primaryDb.collection("event_registrations").doc();
        batch.set(regRef, {
          userId,
          eventId: "inspirex-s2",
          eventTitle: "InspireX Season 2",
          ticketId: doc.id,
          registeredAt: data.registeredAt || FieldValue.serverTimestamp(),
          attended: true, // Assuming if we issue a cert, they attended
          certificateIssued: true,
          certificateId: certRef.id
        });
      }

      // 6. Send Notification
      const notifRef = primaryDb.collection("notifications").doc();
      batch.set(notifRef, {
        userId: userId,
        type: "certificate",
        title: "InspireX Certificate Ready!",
        message: "Your certificate of participation for InspireX Season 2 is now available.",
        actionUrl: `/certificate/${certRef.id}`,
        read: false,
        createdAt: FieldValue.serverTimestamp()
      });

      issuedCount++;
    }

    if (issuedCount === 0) {
      return { success: false, message: "No eligible new registrations found. All members already have their certificates." };
    }

    await batch.commit();

    return { success: true, message: `Successfully synced and issued ${issuedCount} certificates!` };
  } catch (error: any) {
    console.error("Error issuing certificates:", error);
    return { success: false, message: error.message || "Failed to issue certificates." };
  }
}
