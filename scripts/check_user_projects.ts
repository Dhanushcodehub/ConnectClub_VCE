import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

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

async function main() {
  const userId = "SSqcX7Cmp5ODNhoDuhMSsCU4I0H3";
  const q = query(collection(db, "user_projects"), where("userId", "==", userId));
  const snap = await getDocs(q);
  console.log(`Found ${snap.size} user_projects for ${userId}`);
  snap.forEach(doc => {
    console.log(doc.id, doc.data().status, doc.data().title);
  });
}

main().catch(console.error);
