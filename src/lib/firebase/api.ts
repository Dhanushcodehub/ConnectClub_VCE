import { collection, getDocs, doc, getDoc, updateDoc, increment, addDoc, serverTimestamp, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "./config";
import { ConnectEvent, eventsData } from "../data/events";
import { ConnectProject, projectsData } from "../data/projects";

// Events
export async function getEvents(): Promise<ConnectEvent[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "events"));
    if (querySnapshot.empty) {
      return eventsData;
    }
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConnectEvent));
  } catch (error) {
    console.error("Error fetching events:", error);
    return eventsData;
  }
}

export async function getEventBySlug(slug: string): Promise<ConnectEvent | null> {
  try {
    const docRef = doc(db, "events", slug);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ConnectEvent;
    }
    return eventsData.find(e => e.id === slug) || null;
  } catch (error) {
    console.error("Error fetching event:", error);
    return eventsData.find(e => e.id === slug) || null;
  }
}

// Projects
export async function getProjects(): Promise<ConnectProject[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "projects"));
    if (querySnapshot.empty) {
      return projectsData;
    }
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConnectProject));
  } catch (error) {
    console.error("Error fetching projects:", error);
    return projectsData;
  }
}

export async function getProjectBySlug(slug: string): Promise<ConnectProject | null> {
  try {
    const docRef = doc(db, "projects", slug);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ConnectProject;
    }
    return projectsData.find(p => p.id === slug) || null;
  } catch (error) {
    console.error("Error fetching project:", error);
    return projectsData.find(p => p.id === slug) || null;
  }
}

// Project Interactions
export async function toggleProjectLike(projectId: string, isLiking: boolean): Promise<boolean> {
  try {
    const docRef = doc(db, "projects", projectId);
    await updateDoc(docRef, {
      likes: increment(isLiking ? 1 : -1)
    });
    return true;
  } catch (error) {
    console.error("Error toggling like:", error);
    return false;
  }
}

export interface ProjectComment {
  id: string;
  authorName: string;
  content: string;
  timestamp: any;
}

export async function getProjectComments(projectId: string): Promise<ProjectComment[]> {
  try {
    const commentsRef = collection(db, "projects", projectId, "comments");
    const q = query(commentsRef, orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProjectComment[];
  } catch (error) {
    console.error("Error fetching comments:", error);
    return [];
  }
}

export async function addProjectComment(projectId: string, authorName: string, content: string): Promise<boolean> {
  try {
    const commentsRef = collection(db, "projects", projectId, "comments");
    await addDoc(commentsRef, {
      authorName,
      content,
      timestamp: serverTimestamp()
    });
    
    // Increment comment count on the project
    const projectRef = doc(db, "projects", projectId);
    await updateDoc(projectRef, {
      commentsCount: increment(1)
    });
    
    return true;
  } catch (error) {
    console.error("Error adding comment:", error);
    return false;
  }
}
