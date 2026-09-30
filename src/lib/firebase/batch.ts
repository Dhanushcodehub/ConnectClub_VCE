import {
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { Firestore as AdminFirestore } from "firebase-admin/firestore";

/**
 * Firestore hard-caps a single batched write at 500 operations. Anything
 * larger throws on commit. These helpers chunk arbitrary write lists into
 * safe commits. A single logical unit that must be atomic should NOT use
 * these (use runTransaction); these are for fan-out writes where partial
 * progress is acceptable and better than a hard failure.
 */

/**
 * `ref` is `unknown` so the same op shape works for both the client SDK
 * (firebase/firestore) and the Admin SDK (firebase-admin/firestore), whose
 * DocumentReference types are structurally incompatible. The helpers cast
 * internally.
 */
export interface BatchOp {
  type: "set" | "update" | "delete";
  ref: unknown;
  data?: Record<string, unknown>;
}

export const FIRESTORE_BATCH_LIMIT = 500;
// Headroom below the hard cap so per-op overhead never tips us over.
export const SAFE_CHUNK_SIZE = 400;

function applyOps(batch: { set: Function; update: Function; delete: Function }, ops: BatchOp[]) {
  for (const op of ops) {
    if (op.type === "set") batch.set(op.ref, op.data ?? {});
    else if (op.type === "update") batch.update(op.ref, op.data ?? {});
    else batch.delete(op.ref);
  }
}

/** Client SDK (firebase/firestore) chunked commit. */
export async function commitInChunks(
  db: Firestore,
  ops: BatchOp[],
  chunkSize = SAFE_CHUNK_SIZE
): Promise<number> {
  let committed = 0;
  for (let i = 0; i < ops.length; i += chunkSize) {
    const batch = writeBatch(db);
    applyOps(batch as never, ops.slice(i, i + chunkSize));
    await batch.commit();
    committed += Math.min(chunkSize, ops.length - i);
  }
  return committed;
}

/** Admin SDK (firebase-admin/firestore) chunked commit. */
export async function commitInChunksAdmin(
  db: AdminFirestore,
  ops: BatchOp[],
  chunkSize = SAFE_CHUNK_SIZE
): Promise<number> {
  let committed = 0;
  for (let i = 0; i < ops.length; i += chunkSize) {
    const batch = db.batch();
    applyOps(batch, ops.slice(i, i + chunkSize));
    await batch.commit();
    committed += Math.min(chunkSize, ops.length - i);
  }
  return committed;
}
