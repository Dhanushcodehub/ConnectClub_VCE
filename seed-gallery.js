require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

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

const mockGalleryData = [
  {
    type: "image",
    src: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2000&auto=format&fit=crop",
    category: "Workshops",
    alt: "AI Workshop in action",
    featured: true,
  },
  {
    type: "image",
    src: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=2000&auto=format&fit=crop",
    category: "Hackathons",
    alt: "Hackathon coding session",
    featured: false,
    album: "CodeFest 2025"
  },
  {
    type: "image",
    src: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2000&auto=format&fit=crop",
    category: "Team Moments",
    alt: "Team bonding",
    featured: true,
  },
  {
    type: "image",
    src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2000&auto=format&fit=crop",
    category: "Team Moments",
    alt: "Discussion",
    featured: false,
  },
  {
    type: "image",
    src: "https://images.unsplash.com/photo-1591115765373-5207764f72e7?q=80&w=2000&auto=format&fit=crop",
    category: "Hackathons",
    alt: "Late night hackathon",
    featured: true,
    album: "CodeFest 2025"
  },
  {
    type: "image",
    src: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2000&auto=format&fit=crop",
    category: "Guest Talks",
    alt: "Keynote Speaker",
    featured: true,
  },
  {
    type: "video",
    src: "https://videos.pexels.com/video-files/3255275/3255275-hd_1920_1080_25fps.mp4",
    videoUrl: "https://videos.pexels.com/video-files/3255275/3255275-hd_1920_1080_25fps.mp4",
    category: "Workshops",
    alt: "Workshop Overview",
    featured: false,
  },
  {
    type: "image",
    src: "https://images.unsplash.com/photo-1475721025505-c08f1f1230e9?q=80&w=2000&auto=format&fit=crop",
    category: "Competitions",
    alt: "Competition winner",
    featured: true,
  },
];

async function seed() {
  console.log('Seeding gallery data...');
  const colRef = collection(db, 'gallery_media');
  for (const item of mockGalleryData) {
    try {
      await addDoc(colRef, {
        ...item,
        createdAt: serverTimestamp(),
      });
      console.log('Added:', item.alt);
    } catch (error) {
      console.error('Error adding:', item.alt, error);
    }
  }
  console.log('Done seeding gallery!');
  process.exit(0);
}

seed();
