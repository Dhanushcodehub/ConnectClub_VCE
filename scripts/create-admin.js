const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

async function createAdmin() {
  const serviceAccountPath = path.join(__dirname, "../connect-club-service-account.json");
  
  // Try to init with GOOGLE_APPLICATION_CREDENTIALS or the file
  if (fs.existsSync(serviceAccountPath)) {
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath))
    });
  } else if (process.env.FIREBASE_PROJECT_ID) {
    // Alternatively, use env vars if available for the primary project
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      })
    });
  } else {
    // Default fallback
    admin.initializeApp();
  }

  const email = "admin@connectclubvce.in";
  const password = "password123";

  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log(`User ${email} already exists. Updating password.`);
      userRecord = await admin.auth().updateUser(userRecord.uid, { password });
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: "System Administrator",
        });
        console.log(`Created user ${email}.`);
      } else {
        throw e;
      }
    }

    const db = admin.firestore();
    await db.collection("admins").doc(userRecord.uid).set({
      email: userRecord.email,
      name: "System Administrator",
      role: "superadmin",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      twoFactorEnabled: false
    });

    console.log(`Admin user setup complete. You can login with:\nEmail: ${email}\nPassword: ${password}`);
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

createAdmin();
