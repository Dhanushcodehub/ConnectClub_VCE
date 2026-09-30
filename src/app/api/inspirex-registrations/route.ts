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
    
    if (decodedToken.role !== 'admin' && decodedToken.role !== 'member' && decodedToken.email !== 'admin@connectclubvce.in') {
      return NextResponse.json({ error: `Forbidden: Admin or Member access required. Found role: ${decodedToken.role}` }, { status: 403 });
    }

    // 1. Fetch all Connect Club users to cross-reference and build internal registrations
    const ccUsersSnapshot = await primaryDb.collection("users").get();
    const ccUsersMap = new Map();
    const ccRollNumbers = new Set();
    
    ccUsersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      ccUsersMap.set(doc.id, data);
      if (data.rollNo) {
        ccRollNumbers.add(data.rollNo.toUpperCase().trim());
      }
    });

    // 2. Fetch external registrations
    const externalSnapshot = await primaryDb.collection("external_registrations")
      .where("eventId", "==", "inspirex-s2")
      .orderBy("registeredAt", "desc")
      .get();
    
    const externalRegistrations = externalSnapshot.docs.map(doc => {
      const data = doc.data();
      const rawRollNo = data.rollNo || "";
      const cleanRollNo = rawRollNo.toUpperCase().trim();
      
      return {
        id: doc.id,
        name: data.name || "Unknown",
        rollNo: rawRollNo || "Unknown",
        email: data.email || "",
        phone: data.phone || "",
        status: data.status || "pending",
        ticketId: data.ticketId || null,
        registeredAt: data.registeredAt ? data.registeredAt.toDate().toISOString() : null,
        approvedAt: data.approvedAt ? data.approvedAt.toDate().toISOString() : null,
        isConnectClubMember: ccRollNumbers.has(cleanRollNo),
        branch: data.branch || "",
        year: data.year || "",
        section: data.section || "",
        source: "external"
      };
    });

    // 3. Fetch internal event_registrations
    const internalSnapshot = await primaryDb.collection("event_registrations")
      .where("eventId", "==", "inspirex-s2")
      .orderBy("registeredAt", "desc")
      .get();

    const internalRegistrations = internalSnapshot.docs.map(doc => {
      const data = doc.data();
      const user = ccUsersMap.get(data.userId) || {};
      
      return {
        id: doc.id,
        name: user.name || "Unknown",
        rollNo: user.rollNo || "Unknown",
        email: user.email || "",
        phone: user.phone || "",
        status: "approved", // Internal members are auto-approved
        ticketId: data.ticketId || null,
        registeredAt: data.registeredAt ? data.registeredAt.toDate().toISOString() : null,
        approvedAt: data.registeredAt ? data.registeredAt.toDate().toISOString() : null,
        isConnectClubMember: true,
        branch: user.department || "",
        year: user.yearOfStudy || "",
        section: user.section || "", // Try to fetch section if exists
        source: "internal"
      };
    });

    // 4. Merge and return
    const allRegistrations = [...internalRegistrations, ...externalRegistrations];
    
    // Sort combined array by registeredAt descending
    allRegistrations.sort((a, b) => {
      const timeA = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
      const timeB = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({ success: true, count: allRegistrations.length, data: allRegistrations });
  } catch (error: any) {
    console.error("Error fetching external registrations:", error);
    return NextResponse.json(
      { error: `Failed to fetch registrations: ${error.message}`, details: error.stack },
      { status: 500 }
    );
  }
}
