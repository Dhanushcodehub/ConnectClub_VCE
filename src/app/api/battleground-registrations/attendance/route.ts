import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getBattlegroundAdminDb } from "@/lib/firebase/admin";
import { requireStaffRequest } from "@/lib/firebase/requestAuth";

export async function POST(req: Request) {
  try {
    const staffToken = await requireStaffRequest(req);
    const body = await req.json();
    const { registrationId, status, session, rollNo, markAll } = body;

    if (!registrationId || typeof status !== "boolean" || !session) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const bgDb = getBattlegroundAdminDb();
    const docRef = bgDb.collection("registrations").doc(registrationId);

    const docSnapshot = await docRef.get();
    if (!docSnapshot.exists) {
      return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    }
    
    const data = docSnapshot.data();

    const updateData: any = {};
    const timestampField = session === "morning" ? "morningAttendanceAt" : "afternoonAttendanceAt";
    const userField = session === "morning" ? "morningAttendanceBy" : "afternoonAttendanceBy";
    const arrayField = session === "morning" ? "morningPresent" : "afternoonPresent";

    if (markAll) {
      // Mark or unmark ALL members
      if (status) {
        const allRolls = [data?.lead?.roll, ...(data?.members || []).map((m: any) => m.roll || m.rollNo)].filter(Boolean);
        updateData[arrayField] = allRolls;
      } else {
        updateData[arrayField] = [];
      }
      // Also update the legacy boolean for backwards compatibility
      if (session === "morning") updateData.morningAttendance = status;
      if (session === "afternoon") updateData.afternoonAttendance = status;
    } else if (rollNo) {
      // Mark or unmark a specific member
      updateData[arrayField] = status ? FieldValue.arrayUnion(rollNo) : FieldValue.arrayRemove(rollNo);
    } else {
      return NextResponse.json({ error: "Must provide either rollNo or markAll" }, { status: 400 });
    }

    // Always update metadata
    updateData[timestampField] = FieldValue.serverTimestamp();
    updateData[userField] = staffToken.email || staffToken.uid;

    await docRef.update(updateData);

    return NextResponse.json({ success: true, status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized: Admin authentication required." }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }
    console.error("Error updating Battleground attendance:", error);
    return NextResponse.json(
      { error: "Failed to update attendance.", details: message },
      { status: 500 }
    );
  }
}
