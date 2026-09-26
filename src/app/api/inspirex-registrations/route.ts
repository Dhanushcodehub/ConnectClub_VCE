import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 0. Verify Authentication and Admin Role
    const primaryApp = getAdminApp();
    const primaryDb = getFirestore(primaryApp);
    const getAdminAuth = (await import('@/lib/firebase/admin')).getAdminAuth;
    const adminAuth = getAdminAuth();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    if (decodedToken.role !== 'admin' && decodedToken.email !== 'admin@connectclubvce.in') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 1. Fetch all Connect Club users' roll numbers to cross-reference
    const ccUsersSnapshot = await primaryDb.collection("users").select("rollNo").get();
    const ccRollNumbers = new Set(
      ccUsersSnapshot.docs
        .map(doc => doc.data().rollNo?.toUpperCase()?.trim())
        .filter(Boolean)
    );

    // 2. Fetch external registrations from the local inbox collection
    const snapshot = await primaryDb.collection("external_registrations")
      .where("eventId", "==", "inspirex-s2")
      .orderBy("registeredAt", "desc")
      .get();
    
    const registrations = snapshot.docs.map(doc => {
      const data = doc.data();
      const rawRollNo = data.rollNo || "";
      const cleanRollNo = rawRollNo.toUpperCase().trim();
      
      return {
        id: doc.id,
        name: data.name || "Unknown",
        rollNo: rawRollNo || "Unknown",
        email: data.email || "",
        phone: data.phone || "",
        status: data.status || "pending", // "pending" or "approved"
        ticketId: data.ticketId || null,
        registeredAt: data.registeredAt ? data.registeredAt.toDate().toISOString() : null,
        approvedAt: data.approvedAt ? data.approvedAt.toDate().toISOString() : null,
        isConnectClubMember: ccRollNumbers.has(cleanRollNo),
      };
    });

    return NextResponse.json({ success: true, count: registrations.length, data: registrations });
  } catch (error: any) {
    console.error("Error fetching external registrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch registrations.", details: error.message },
      { status: 500 }
    );
  }
}
