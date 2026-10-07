import { NextResponse } from "next/server";
import { getBattlegroundAdminDb } from "@/lib/firebase/admin";
import { requireStaffRequest } from "@/lib/firebase/requestAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Verify that the user making the request is an Admin or Core Team
    await requireStaffRequest(req);

    // 2. Connect securely to the SECONDARY Battleground Database
    const bgDb = getBattlegroundAdminDb();

    // 3. READ-ONLY: Fetch the registrations
    const COLLECTION_NAME = "registrations"; 

    const snapshot = await bgDb.collection(COLLECTION_NAME).orderBy("timestamp", "desc").get();
    
    const registrations = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        teamName: data.teamName || "Unknown",
        teamSize: data.teamSize || 1,
        leadName: data.lead?.name || "Unknown",
        leadRollNo: data.lead?.roll || "Unknown",
        leadPhone: data.lead?.phone || "",
        leadBranch: data.lead?.branch || "",
        leadYear: data.lead?.year || "",
        leadSection: data.lead?.section || "",
        bgId: data.bgId || "",
        status: data.status || data.paymentStatus || "pending",
        timestamp: data.timestamp || new Date().toISOString(),
        members: (data.members || []).map((m: any) => ({
          ...m,
          rollNo: m.roll || m.rollNo || ""
        })),
        morningAttendance: data.morningAttendance || false,
        afternoonAttendance: data.afternoonAttendance || false,
        morningPresent: data.morningPresent || (data.morningAttendance ? [data.lead?.roll, ...(data.members || []).map((m: any) => m.roll || m.rollNo)].filter(Boolean) : []),
        afternoonPresent: data.afternoonPresent || (data.afternoonAttendance ? [data.lead?.roll, ...(data.members || []).map((m: any) => m.roll || m.rollNo)].filter(Boolean) : []),
      };
    });

    return NextResponse.json({ success: true, count: registrations.length, data: registrations });
    
  } catch (error: any) {
    console.error("Error fetching Battleground registrations:", error);
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
