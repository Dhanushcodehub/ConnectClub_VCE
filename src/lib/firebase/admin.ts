import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export function getAdminApp() {
  if (getApps().length === 0) {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error("Firebase Admin environment variables are missing. Please check your .env.local file.");
    }
    
    // Ensure private key is properly formatted, stripping out outer quotes if they exist
    // and replacing literal \n with actual newlines
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";
    privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

    // Fix common copy-paste errors where the user accidentally deletes the BEGIN/END tags
    // or the 'n' from \n remains at the beginning
    if (privateKey && !privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      if (privateKey.startsWith('n')) {
        privateKey = privateKey.substring(1);
      }
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`;
    }

    try {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
      console.log('Firebase Admin initialized successfully');
    } catch (error: any) {
      console.error('Firebase Admin initialization error:', error);
      throw error;
    }
  }
  return getApps()[0];
}

export function getAdminAuth() {
  getAdminApp(); // Ensure it's initialized
  return getAuth();
}

export function getAdminDb() {
  getAdminApp(); // Ensure it's initialized
  return getFirestore();
}
