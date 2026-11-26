import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFirebaseErrorMessage(error: unknown): string {
  const errObj = error as { code?: string; message?: string } | null | undefined;
  if (!errObj || !errObj.code) {
    return errObj?.message?.replace(/^Firebase:\s*/i, '').trim() || "An unexpected error occurred. Please try again.";
  }

  switch (errObj.code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return "Invalid email or password. Please check your credentials and try again.";
    case 'auth/email-already-in-use':
      return "An account with this email already exists.";
    case 'auth/weak-password':
      return "Password is too weak. It should be at least 6 characters long.";
    case 'auth/network-request-failed':
      return "Network error. Please check your internet connection.";
    case 'auth/too-many-requests':
      return "Too many failed attempts. Please try again later.";
    case 'auth/invalid-email':
      return "Please enter a valid email address.";
    case 'auth/requires-recent-login':
      return "For your security, please log out and log back in to perform this action.";
    case 'auth/unauthorized-domain':
      return "This domain is not authorized for Google Sign-In. Add this domain under Firebase Authentication → Settings → Authorized domains.";
    case 'auth/popup-closed-by-user':
      return "Google sign-in was cancelled before completing.";
    case 'auth/cancelled-popup-request':
      return "Another sign-in popup is already open. Please complete it or try again.";
    case 'auth/popup-blocked':
      return "Sign-in popup was blocked by your browser. Please allow popups for this site and try again.";
    case 'auth/operation-not-allowed':
      return "Google Sign-In is currently disabled in Firebase Authentication.";
    case 'auth/account-exists-with-different-credential':
      return "An account already exists with this email using a different sign-in method. Please sign in with your email and password.";
    case 'auth/user-disabled':
      return "This account has been disabled. Please contact Connect Club support.";
    case 'auth/internal-error':
      return "Authentication service encountered an internal error. Please try again.";
    case 'auth/configuration-not-found':
      return "Authentication is not configured. Missing Firebase environment variables.";
    default: {
      // Strip 'Firebase: Error (auth/...).' wrapper; never return an empty string.
      const stripped = errObj.message
        ? errObj.message.replace(/^Firebase:\s*(Error\s*)?(\([^\)]+\)\.?\s*)?/i, '').trim()
        : '';
      return stripped || `Authentication failed (${errObj.code}). Please try again.`;
    }
  }
}
