import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/admin";
import { requireStaffRequest } from "@/lib/firebase/requestAuth";
import {
  normalizeEmail,
  normalizePhone,
  normalizeRollNo,
  serializeTimestamp,
} from "@/lib/registrations/validation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireStaffRequest(req);

    const primaryApp = getAdminApp();
    const primaryDb = getFirestore(primaryApp);

    // 1. Fetch all Connect Club users' roll numbers to cross-reference
    const ccUsersSnapshot = await primaryDb.collection("users").select("rollNo").get();
    const ccRollNumbers = new Set(
      ccUsersSnapshot.docs
        .map(doc => normalizeRollNo(doc.data().rollNo))
        .filter(Boolean)
    );

    // 2. Fetch external registrations
    const externalSnapshot = await primaryDb.collection("external_registrations")
      .where("eventId", "==", "inspirex-s2")
      .orderBy("registeredAt", "desc")
      .get();
    
    const externalRegistrations = externalSnapshot.docs.map(doc => {
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
        status: data.status || "pending", // "pending" or "approved"
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
        source: "external"
      };
    });

    const duplicateIndexes = new Set<number>();
    const seen = new Map<string, number>();
    externalRegistrations.forEach((registration, index) => {
      const keys = [
        registration.normalizedEmail && `email:${registration.normalizedEmail}`,
        registration.normalizedPhone && `phone:${registration.normalizedPhone}`,
        registration.rollNo !== "Unknown" && `roll:${cleanRegistrationRollNo(registration.rollNo)}`,
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
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized: Admin authentication required." }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }
    console.error("Error fetching external registrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch registrations.", details: message },
      { status: 500 }
    );
  }
}

function cleanRegistrationRollNo(value: string): string {
  return normalizeRollNo(value);
}
