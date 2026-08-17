import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { initializeFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Use the app's own domain as authDomain in the browser so signInWithRedirect
// stays same-origin (the /__/auth/* rewrite in next.config.ts proxies to Firebase).
// Falls back to the env variable during SSR / build.
const resolvedAuthDomain =
  typeof window !== "undefined"
    ? window.location.host // e.g. "connectclub-vce.vercel.app" or "localhost:3000"
    : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: resolvedAuthDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase only initializes when a valid web config is present (set via
// NEXT_PUBLIC_FIREBASE_* in .env.local). Without it, the app still renders
// and Connect AI works, but data-driven pages fall back to empty/static data.
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const app: FirebaseApp | null =
  isFirebaseConfigured && !getApps().length
    ? initializeApp(firebaseConfig)
    : (getApps()[0] ?? null);

export const db: Firestore = (app
  ? initializeFirestore(app, { experimentalForceLongPolling: true })
  : null) as unknown as Firestore;
export const auth: Auth = (app ? getAuth(app) : null) as unknown as Auth;
export const storage: FirebaseStorage = (app ? getStorage(app) : null) as unknown as FirebaseStorage;
export default app;
