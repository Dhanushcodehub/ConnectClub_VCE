import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const uid = "dCwjsFzAFdN2HeqwqBJv5TYiRiz1";
  const docRef = doc(db, "users", uid);
  const snap = await getDoc(docRef);
  console.log("Exists:", snap.exists());
  if (snap.exists()) {
    console.log("Data:", snap.data());
  } else {
    console.log("User not found in users collection.");
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
