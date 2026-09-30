import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./config";

export interface ConnectMilestone {
  id?: string;
  year: string;
  month: string;
  title: string;
  description: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  order: number;
}

const TIMELINE_COLLECTION = "timeline";

const fallbackMilestones: ConnectMilestone[] = [
  {
    id: "connect-club-founded",
    year: "2023",
    month: "August",
    title: "Connect Club begins",
    description: "A student-led community was formed to bring together builders, designers, and technology enthusiasts at Vardhaman College of Engineering.",
    mediaUrl: "/logo/logo-light.svg",
    mediaType: "image",
    order: 10,
  },
  {
    id: "connect-club-community",
    year: "2024",
    month: "March",
    title: "Growing the community",
    description: "Workshops, peer learning sessions, and collaborative projects helped students turn ideas into practical work.",
    mediaUrl: "/logo/logo-light.svg",
    mediaType: "image",
    order: 20,
  },
  {
    id: "inspirex-season-one",
    year: "2025",
    month: "September",
    title: "InspireX Season One",
    description: "Connect Club launched its flagship speaker series, creating a space for students to learn directly from creators and industry leaders.",
    mediaUrl: "/inspirex.png",
    mediaType: "image",
    order: 30,
  },
  {
    id: "inspirex-season-two",
    year: "2026",
    month: "September",
    title: "InspireX Season Two",
    description: "Season Two brought together founders, creators, and students for a full day of talks, conversations, and practical insight.",
    mediaUrl: "/inspirex.png",
    mediaType: "image",
    order: 40,
  },
];

export async function getMilestones(): Promise<ConnectMilestone[]> {
  if (!isFirebaseConfigured) return fallbackMilestones;
  try {
    const q = query(collection(db, TIMELINE_COLLECTION), orderBy("order", "asc"));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return fallbackMilestones;
    }
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConnectMilestone));
  } catch (error) {
    console.error("Error fetching milestones:", error);
    return fallbackMilestones;
  }
}

export async function addMilestone(milestone: Omit<ConnectMilestone, "id">): Promise<string> {
  if (typeof window === "undefined") throw new Error("Client only");
  try {
    const docRef = await addDoc(collection(db, TIMELINE_COLLECTION), milestone);
    return docRef.id;
  } catch (error) {
    console.error("Error adding milestone:", error);
    throw error;
  }
}

export async function updateMilestone(id: string, milestone: Partial<Omit<ConnectMilestone, "id">>): Promise<void> {
  if (typeof window === "undefined") throw new Error("Client only");
  try {
    const docRef = doc(db, TIMELINE_COLLECTION, id);
    await updateDoc(docRef, milestone);
  } catch (error) {
    console.error("Error updating milestone:", error);
    throw error;
  }
}

export async function deleteMilestone(id: string): Promise<void> {
  if (typeof window === "undefined") throw new Error("Client only");
  try {
    const docRef = doc(db, TIMELINE_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting milestone:", error);
    throw error;
  }
}
