import { GoogleAuthProvider, signInWithPopup, type UserCredential } from "firebase/auth";
import { auth, isFirebaseConfigured } from "./config";

/**
 * Initiates Google OAuth sign-in via a Firebase Auth popup.
 * Prompts account selection so users can choose or switch Google accounts cleanly.
 */
export async function signInWithGooglePopup(): Promise<UserCredential> {
  if (!isFirebaseConfigured || !auth) {
    const err = new Error(
      "Authentication is not configured. Check your NEXT_PUBLIC_FIREBASE_* environment variables."
    );
    (err as Error & { code?: string }).code = "auth/configuration-not-found";
    throw err;
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}
