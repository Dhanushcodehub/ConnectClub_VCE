import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFirebaseErrorMessage(error: any): string {
  if (!error || !error.code) {
    return error?.message?.replace(/^Firebase:\s*/i, '') || "An unexpected error occurred. Please try again.";
  }

  switch (error.code) {
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
    default:
      // Strip 'Firebase:' prefix if it exists in the message, otherwise generic
      return error.message ? error.message.replace(/^Firebase:\s*(Error\s*)?(\([^\)]+\)\.?\s*)?/i, '') : "An unexpected error occurred.";
  }
}
