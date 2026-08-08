import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./config";
import { ConnectEvent, eventsData } from "../data/events";
import { ConnectProject, projectsData } from "../data/projects";

// Events
export async function getEvents(): Promise<ConnectEvent[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "events"));
    if (querySnapshot.empty) {
      return [];
    }
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConnectEvent));
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

export async function getEventBySlug(slug: string): Promise<ConnectEvent | null> {
  try {
    const docRef = doc(db, "events", slug);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ConnectEvent;
    }
    return null;
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
}

// Projects
export async function getProjects(): Promise<ConnectProject[]> {
  if (typeof window === "undefined") return [];
  try {
    const querySnapshot = await getDocs(collection(db, "projects"));
    if (querySnapshot.empty) {
      return [];
    }
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConnectProject));
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

export async function getProjectBySlug(slug: string): Promise<ConnectProject | null> {
  if (typeof window === "undefined") return null;
  try {
    const docRef = doc(db, "projects", slug);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ConnectProject;
    }
    return null;
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
}
