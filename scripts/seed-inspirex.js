const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

async function seed() {
  const projectId = process.env.INSPIREX_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.INSPIREX_FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.INSPIREX_FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing InspireX Firebase credentials in .env.local");
    process.exit(1);
  }

  privateKey = privateKey.replace(/\\n/g, "\n");

  const app = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  const db = app.firestore();
  
  const branches = ["CSE", "CSE", "CSE", "IT", "ECE", "EEE"];
  const sections = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const years = ["1st Year", "2nd Year", "3rd Year"];
  const names = ["Dhanush", "Rahul", "Aditya", "Sneha", "Priya", "Vikram", "Neha", "Rohit", "Anjali", "Karan"];
  const surnames = ["Kumar", "Reddy", "Sharma", "Singh", "Patil", "Deshmukh"];

  console.log("Seeding 30 fake registrations...");

  for (let i = 0; i < 30; i++) {
    const branch = branches[Math.floor(Math.random() * branches.length)];
    const section = branch === "CSE" ? sections[Math.floor(Math.random() * sections.length)] : "A";
    const year = years[Math.floor(Math.random() * years.length)];
    const fname = names[Math.floor(Math.random() * names.length)];
    const lname = surnames[Math.floor(Math.random() * surnames.length)];
    const rollNo = `230R1A${branch === "CSE" ? "05" : branch === "IT" ? "12" : "04"}${Math.floor(10 + Math.random() * 89)}`;

    await db.collection("registrations").add({
      name: `${fname} ${lname}`,
      branch: branch,
      rollNo: rollNo,
      year: year,
      section: section,
      email: `${fname.toLowerCase()}.${lname.toLowerCase()}@example.com`,
      registeredAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Added ${rollNo} - ${branch} Sec ${section}`);
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed();
