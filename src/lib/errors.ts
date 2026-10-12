/**
 * Turn Firebase / network / API failures into a message a person can act on.
 * Without this, every failure surfaces as "Failed to load studio data" and
 * hides whether the cause is missing credentials, a security rule denial,
 * an index that is still building, or a genuinely broken request.
 */
export function describeError(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof Error && error.message.startsWith("ADMIN_SDK_NOT_CONFIGURED:")) {
    return (
      "This feature needs the Firebase Admin keys on the server. " +
      "Copy .env.example to .env.local, fill in FIREBASE_PROJECT_ID, " +
      "FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL, then restart the dev server."
    );
  }

  const err = error as { code?: string; message?: string };
  const code = typeof err?.code === "string" ? err.code : "";
  const message = typeof err?.message === "string" ? err.message : "";

  if (code === "permission-denied" || /permission denied/i.test(message)) {
    return (
      "Firestore denied the request. Deploy the updated firestore.rules " +
      "(`firebase deploy --only firestore:rules`) and make sure your account has the right role."
    );
  }

  if (code === "failed-precondition" || /index/i.test(message)) {
    return (
      "A Firestore index for this query is still being built. " +
      "Deploy firestore.indexes.json (`firebase deploy --only firestore:indexes`) " +
      "and retry in a minute."
    );
  }

  if (code === "unauthenticated" || code === "unauthorized") {
    return "Your session has expired. Sign out and sign back in, then retry.";
  }

  if (code === "unavailable" || code === "network-request-failed") {
    return "Cannot reach the server. Check your connection and retry.";
  }

  if (/ADMIN SDK NOT CONFIGURED|environment variables are missing/i.test(message)) {
    return (
      "Firebase Admin credentials are missing on the server. " +
      "Copy .env.example to .env.local and fill in the FIREBASE_* values, then restart."
    );
  }

  if (message) return message;
  return fallback;
}
