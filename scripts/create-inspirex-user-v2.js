const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

async function createInspireXUser() {
  try {
    // 1. Connect Club Admin Auth
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Missing CC Admin Credentials");
    }
    privateKey = privateKey.replace(/\\n/g, "\n");

    const ccApp = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    }, "connect-club-admin-v2");

    const ccAuth = ccApp.auth();
    const ccDb = ccApp.firestore();

    // 2. InspireX Admin Auth
    const inspirexProjectId = process.env.INSPIREX_FIREBASE_PROJECT_ID;
    const inspirexClientEmail = process.env.INSPIREX_FIREBASE_CLIENT_EMAIL;
    let inspirexPrivateKey = process.env.INSPIREX_FIREBASE_PRIVATE_KEY;

    if (!inspirexProjectId || !inspirexClientEmail || !inspirexPrivateKey) {
      throw new Error("Missing InspireX Admin Credentials");
    }
    inspirexPrivateKey = inspirexPrivateKey.replace(/\\n/g, "\n");

    const inspirexApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: inspirexProjectId,
        clientEmail: inspirexClientEmail,
        privateKey: inspirexPrivateKey
      })
    }, "inspirex-admin-v2");

    const inspirexDb = inspirexApp.firestore();

    // Random user data
    const timestamp = Date.now();
    const email = `test.inspirex.${timestamp}@example.com`;
    const password = `InspireX123!`;
    const name = `Test InspireX User ${timestamp}`;
    const rollNo = `230R1A05${Math.floor(10 + Math.random() * 89)}`;

    console.log(`Creating user in Connect Club Firebase Auth...`);
    const userRecord = await ccAuth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true // IMPORTANT: Mark as verified so they can login directly
    });

    console.log(`Adding user document in Connect Club Firestore...`);
    await ccDb.collection("users").doc(userRecord.uid).set({
      email,
      name,
      rollNo,
      department: "CSE",
      yearOfStudy: "2nd Year",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      role: "student",
      onboarded: true,
      provider: "email"
    });

    console.log(`Adding user registration in InspireX Firestore...`);
    await inspirexDb.collection("registrations").add({
      name,
      branch: "CSE",
      rollNo,
      year: "2nd Year",
      section: "A",
      email,
      registeredAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Performing retroactive sync...`);
    const eventId = "inspirex-s2";
    const eventTitle = "InspireX Season 2";
    const generatedTicketId = `TKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const batch = ccDb.batch();
    const registrationRef = ccDb.collection("event_registrations").doc();
    batch.set(registrationRef, {
      userId: userRecord.uid,
      eventId,
      eventTitle,
      ticketId: generatedTicketId,
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      attended: false,
      certificateIssued: false
    });

    const notificationRef = ccDb.collection("notifications").doc();
    batch.set(notificationRef, {
      userId: userRecord.uid,
      type: "event",
      title: "Registration Confirmed!",
      message: `You have successfully registered for ${eventTitle}! It has been added to your My Events tab.`,
      read: false,
      actionUrl: `/u/dashboard`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    console.log(`\n\n=== SUCCESS ===`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Roll Number: ${rollNo}`);
    console.log(`UID: ${userRecord.uid}`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error creating user:", error);
    process.exit(1);
  }
}

createInspireXUser();
