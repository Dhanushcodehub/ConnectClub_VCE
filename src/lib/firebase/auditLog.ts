import type { Firestore } from "firebase-admin/firestore";

export interface AuditEvent {
  actorUid: string;
  actorEmail?: string | null;
  action: string;
  targetType?: string;
  targetId?: string | null;
  meta?: Record<string, unknown>;
}

/**
 * Append a row to `audit_logs`.
 *
 * The collection is `allow write: if false` in Firestore rules, so only the
 * Admin SDK can write here — that is intentional: the trail must not be
 * forgeable by clients. Logging must never break the action being audited,
 * so failures are swallowed after a console error.
 */
export async function logAuditEvent(db: Firestore, event: AuditEvent): Promise<void> {
  try {
    await db.collection("audit_logs").add({
      ...event,
      actorEmail: event.actorEmail ?? null,
      targetType: event.targetType ?? "",
      targetId: event.targetId ?? null,
      meta: event.meta ?? {},
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
