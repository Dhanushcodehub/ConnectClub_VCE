import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";
import { requireStaffRequest, authErrorResponse } from "@/lib/firebase/requestAuth";
import {
  normalizeEmail,
  normalizePhone,
  normalizeRollNo,
  serializeTimestamp,
} from "@/lib/registrations/validation";

export const dynamic = "force-dynamic";

const MAX_REGISTRATIONS = 2000;
const MAX_USER_ROLLS = 5000;

export async function GET(req: Request) {
  try {
    await requireStaffRequest(req);

    const primaryApp = getAdminApp();
    const primaryDb = getFirestore(primaryApp);

    const [ccUsersSnapshot, externalSnapshot] = await Promise.all([
      primaryDb.collection("users").select("rollNo").limit(MAX_USER_ROLLS).get(),
      primaryDb
        .collection("external_registrations")
        .where("eventId", "==", "inspirex-s2")
        .orderBy("registeredAt", "desc")
        .limit(MAX_REGISTRATIONS)
        .get(),
    ]);

    const ccRollNumbers = new Set(
      ccUsersSnapshot.docs
        .map((doc) => normalizeRollNo(doc.data().rollNo))
        .filter(Boolean)
    );

    const externalRegistrations = externalSnapshot.docs.map((doc) => {
      const data = doc.data();
      const rawRollNo = data.rollNo || "";
      const cleanRollNo = normalizeRollNo(rawRollNo);

      return {
        id: doc.id,
        name: data.name || "Unknown",
        rollNo: rawRollNo || "Unknown",
        email: data.email || "",
        phone: data.phone || "",
        branch: data.branch || "",
        year: data.year || "",
        section: data.section || "",
        status: data.status || "pending",
        ticketId: data.ticketId || null,
        registeredAt: serializeTimestamp(data.registeredAt),
        approvedAt: serializeTimestamp(data.approvedAt),
        morningAttendance: data.morningAttendance === true,
        afternoonAttendance: data.afternoonAttendance === true,
        morningAttendanceAt: serializeTimestamp(data.morningAttendanceAt),
        afternoonAttendanceAt: serializeTimestamp(data.afternoonAttendanceAt),
        normalizedEmail: normalizeEmail(data.email),
        normalizedPhone: normalizePhone(data.phone),
        duplicateKey: `${cleanRollNo}:${normalizeEmail(data.email)}:${normalizePhone(data.phone)}`,
        isConnectClubMember: ccRollNumbers.has(cleanRollNo),
        source: "external",
      };
    });

    const duplicateIndexes = new Set<number>();
    const seen = new Map<string, number>();
    externalRegistrations.forEach((registration, index) => {
      const keys = [
        registration.normalizedEmail && `email:${registration.normalizedEmail}`,
        registration.normalizedPhone && `phone:${registration.normalizedPhone}`,
        registration.rollNo !== "Unknown" && `roll:${normalizeRollNo(registration.rollNo)}`,
      ].filter(Boolean) as string[];
      keys.forEach((key) => {
        if (seen.has(key)) {
          duplicateIndexes.add(index);
          duplicateIndexes.add(seen.get(key)!);
        } else {
          seen.set(key, index);
        }
      });
    });

    const data = externalRegistrations.map((registration, index) => ({
      ...registration,
      possibleDuplicate: duplicateIndexes.has(index),
    }));

    return NextResponse.json({ success: true, count: data.length, data });
  } catch (error: unknown) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Error fetching external registrations:", error);
    return NextResponse.json({ error: "Failed to fetch registrations." }, { status: 500 });
  }
}
