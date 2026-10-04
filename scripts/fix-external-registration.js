const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

async function fixUser() {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    privateKey = privateKey.replace(/\\n/g, "\n");

    const app = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    }, "fix-user-app");

    const db = app.firestore();
    
    // Using the user I created in v2 script
    const email = "test.inspirex.1791020807313@example.com";
    const name = "Test InspireX User 1791020807313";
    const rollNo = "230R1A0548";
    
    console.log("Adding to external_registrations...");
    await db.collection("external_registrations").add({
      eventId: "inspirex-s2",
      name: name,
      email: email,
      rollNo: rollNo,
      branch: "CSE",
      year: "2nd Year",
      section: "A",
      phone: "9876543210",
      status: "approved",
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("Done!");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
fixUser();
