require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const timelineEvents = [
  {
    year: "2022",
    month: "August",
    title: "Club Founded",
    description: "A small group of passionate students came together to build a community for tech enthusiasts.",
    mediaUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=2000&auto=format&fit=crop",
    mediaType: "image",
    order: 10
  },
  {
    year: "2023",
    month: "March",
    title: "First Workshop",
    description: "Hosted our first major campus workshop on Web Development, reaching over 100 students.",
    mediaUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2000&auto=format&fit=crop",
    mediaType: "image",
    order: 20
  },
  {
    year: "2024",
    month: "September",
    title: "Hackathons",
    description: "Organized our first internal hackathon and started shipping real projects for the college.",
    mediaUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=2000&auto=format&fit=crop",
    mediaType: "image",
    order: 30
  },
  {
    year: "2025",
    month: "February",
    title: "National Events",
    description: "Expanded our reach and hosted participants from across the country in InspireX.",
    mediaUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2000&auto=format&fit=crop",
    mediaType: "image",
    order: 40
  },
  {
    year: "2026",
    month: "July",
    title: "Connect AI Website Launch",
    description: "Launched our new digital platform powered by Gemini AI, setting a new standard for student clubs.",
    mediaUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2000&auto=format&fit=crop",
    mediaType: "image",
    order: 50
  }
];

async function seed() {
  console.log('Seeding timeline...');
  const colRef = collection(db, 'timeline');
  for (const event of timelineEvents) {
    try {
      await addDoc(colRef, event);
      console.log('Added:', event.title);
    } catch (error) {
      console.error('Error adding:', event.title, error);
    }
  }
  console.log('Done!');
  process.exit(0);
}

seed();
