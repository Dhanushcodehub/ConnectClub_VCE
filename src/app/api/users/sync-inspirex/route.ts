/**
 * DEPRECATED — This webhook endpoint has been removed.
 *
 * External registration data is now written directly to the
 * `external_registrations` Firestore collection by the external site.
 * Approvals are handled by the admin via:
 *   POST /api/admin/approve-registration
 */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. See /api/admin/approve-registration" },
    { status: 410 } // 410 Gone
  );
}
