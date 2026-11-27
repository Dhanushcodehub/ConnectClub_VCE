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

export function getBattlegroundAdminApp() {
  const SECONDARY_APP_NAME = 'BattlegroundApp';
  const apps = getApps();
  const existingApp = apps.find(app => app.name === SECONDARY_APP_NAME);
  if (existingApp) {
    return existingApp;
  }

  if (!process.env.BG_FIREBASE_PROJECT_ID || !process.env.BG_FIREBASE_PRIVATE_KEY || !process.env.BG_FIREBASE_CLIENT_EMAIL) {
    throw new Error("Battleground Firebase Admin environment variables are missing.");
  }
  
  let privateKey = process.env.BG_FIREBASE_PRIVATE_KEY || "";
  privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

  if (privateKey && !privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    if (privateKey.startsWith('n')) {
      privateKey = privateKey.substring(1);
    }
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`;
  }

  try {
    const app = initializeApp({
      credential: cert({
        projectId: process.env.BG_FIREBASE_PROJECT_ID,
        clientEmail: process.env.BG_FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    }, SECONDARY_APP_NAME);
    console.log('Battleground Firebase Admin initialized successfully');
    return app;
  } catch (error: any) {
    console.error('Battleground Firebase Admin initialization error:', error);
    throw error;
  }
}

export function getBattlegroundAdminDb() {
  return getFirestore(getBattlegroundAdminApp());
}
