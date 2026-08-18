import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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
  const projectId = "BXC00RW0FWf7tQxWKv8e";
  
  const doc1 = await getDoc(doc(db, "projects", projectId));
  console.log("In projects collection:", doc1.exists() ? doc1.data() : "NOT FOUND");
  
  const doc2 = await getDoc(doc(db, "user_projects", projectId));
  console.log("In user_projects collection:", doc2.exists() ? doc2.data() : "NOT FOUND");
}

main().catch(console.error);
