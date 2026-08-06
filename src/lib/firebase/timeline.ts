import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { db } from "./config";

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

export async function getMilestones(): Promise<ConnectMilestone[]> {
  if (typeof window === "undefined") return [];
  try {
    const q = query(collection(db, TIMELINE_COLLECTION), orderBy("order", "asc"));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return [];
    }
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConnectMilestone));
  } catch (error) {
    console.error("Error fetching milestones:", error);
    return [];
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
