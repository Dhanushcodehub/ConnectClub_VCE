import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

export interface RateLimitOptions {
  /** Logical bucket namespace, e.g. "auth:register:ip" */
  namespace: string;
  /** Caller identifier (IP, email, uid). Hashed before storing in Firestore. */
  identifier: string;
  /** Maximum requests allowed within `windowMs`. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const RATE_LIMIT_COLLECTION = "_rate_limits";

/**
 * Extracts a best-effort client IP from Vercel / reverse-proxy headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function buildBucketDocId(namespace: string, identifier: string): string {
  const digest = createHash("sha256")
    .update(`${namespace}:${identifier.toLowerCase().trim()}`)
    .digest("hex")
    .slice(0, 40);
  return `${namespace.replace(/[^a-zA-Z0-9_-]/g, "_")}_${digest}`;
}

/**
 * Distributed fixed-window rate limiter backed by a Firestore Admin SDK
 * transaction so limits hold consistently across serverless instances.
 */
export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStartBoundary = Math.floor(now / opts.windowMs) * opts.windowMs;
  const resetAt = windowStartBoundary + opts.windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

  let db;
  try {
    db = getAdminDb();
  } catch {
    // Allow local dev/test environments without Admin SDK credentials to degrade gracefully.
    return { allowed: true, remaining: opts.limit, retryAfterSeconds: 0 };
  }

  const docId = buildBucketDocId(opts.namespace, opts.identifier);
  const ref = db.collection(RATE_LIMIT_COLLECTION).doc(docId);

  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : null;

      let count = 0;
      if (data && data.windowStart === windowStartBoundary) {
        count = Number(data.count || 0);
      }

      if (count >= opts.limit) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds,
        };
      }

      const nextCount = count + 1;
      tx.set(ref, {
        namespace: opts.namespace,
        windowStart: windowStartBoundary,
        count: nextCount,
        expiresAt: new Date(resetAt + 60_000),
      });

      return {
        allowed: true,
        remaining: Math.max(0, opts.limit - nextCount),
        retryAfterSeconds: 0,
      };
    });
  } catch (error) {
    console.error(`[rateLimit:${opts.namespace}] Transaction failed:`, error);
    // Avoid taking down student signups on transient Firestore contention
    return { allowed: true, remaining: 1, retryAfterSeconds: 0 };
  }
}

export function rateLimitExceededResponse(
  result: RateLimitResult,
  message = "Too many requests. Please wait a moment and try again."
) {
  return NextResponse.json(
    { error: message, retryAfterSeconds: result.retryAfterSeconds },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds || 60),
      },
    }
  );
}
