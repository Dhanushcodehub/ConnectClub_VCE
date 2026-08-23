import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Initialize the primary Connect Club Admin SDK to cross-reference users
    const primaryApp = getAdminApp();
    const primaryDb = getFirestore(primaryApp);
    
    // Fetch all Connect Club users' roll numbers to cross-reference
    const ccUsersSnapshot = await primaryDb.collection("users").select("rollNo").get();
    const ccRollNumbers = new Set(
      ccUsersSnapshot.docs
        .map(doc => doc.data().rollNo?.toUpperCase()?.trim())
        .filter(Boolean)
    );

    // 2. Initialize the secondary InspireX Admin SDK
    const projectId = process.env.INSPIREX_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.INSPIREX_FIREBASE_CLIENT_EMAIL;
    // Handle escaped newlines in the private key string
    const privateKey = process.env.INSPIREX_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      console.error("Missing InspireX Firebase credentials in environment variables.");
      return NextResponse.json(
        { error: "Server configuration error: Missing InspireX credentials. Make sure INSPIREX_FIREBASE_PROJECT_ID, INSPIREX_FIREBASE_CLIENT_EMAIL, and INSPIREX_FIREBASE_PRIVATE_KEY are set." },
        { status: 500 }
      );
    }

    const appName = "inspirex-admin";
    let inspirexApp: admin.app.App;
    
    // Check if we already initialized the InspireX admin app
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

    const db = getFirestore(inspirexApp);
    
    // Fetch registrations
    const snapshot = await db.collection("registrations").orderBy("registeredAt", "desc").get();
    
    const registrations = snapshot.docs.map(doc => {
      const data = doc.data();
      const rawRollNo = data.rollNo || "";
      const cleanRollNo = rawRollNo.toUpperCase().trim();
      
      return {
        id: doc.id,
        name: data.name || data.fullName || "Unknown",
        branch: data.branch || "Unknown",
        rollNo: rawRollNo || "Unknown",
        year: data.year || "Unknown",
        email: data.email || "",
        registeredAt: data.registeredAt ? data.registeredAt.toDate().toISOString() : null,
        isConnectClubMember: ccRollNumbers.has(cleanRollNo),
        morningAttendance: data.morningAttendance || false,
        afternoonAttendance: data.afternoonAttendance || false,
      };
    });

    return NextResponse.json({ success: true, count: registrations.length, data: registrations });
  } catch (error: any) {
    console.error("Error fetching InspireX registrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch registrations.", details: error.message },
      { status: 500 }
    );
  }
}
