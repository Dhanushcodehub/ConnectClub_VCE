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
    const projectsRef = collection(db, "projects");
    const q = query(projectsRef); // Add ordering if needed
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      collectionName: "projects"
    })) as unknown as ConnectProject[];
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

export async function getProjectBySlug(slug: string): Promise<ConnectProject | null> {
  try {
    // 1. Check official projects
    let docRef = doc(db, "projects", slug);
    let docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data(), collectionName: "projects" } as unknown as ConnectProject;
    }

    // 2. Check user projects
    docRef = doc(db, "user_projects", slug);
    docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const p = docSnap.data();
      
      let authorPhotoUrl = undefined;
      try {
        if (p.userId) {
          const userSnap = await getDoc(doc(db, "users", p.userId));
          if (userSnap.exists()) {
            authorPhotoUrl = userSnap.data().photoURL;
          }
        }
      } catch (e) {
        console.error("Error fetching author photo:", e);
      }

      return {
        id: docSnap.id,
        name: p.title,
        description: p.description,
        technologies: p.technologies || [],
        timeline: "Community Project",
        banner: p.banner || "",
        screenshots: p.screenshots || [],
        features: p.features || [],
        githubLink: p.githubUrl,
        demoLink: p.demoUrl,
        status: "Live",
        likes: p.likes || 0,
        commentsCount: p.commentsCount || 0,
        authorName: p.authorName, // Include author info
        userId: p.userId,
        authorPhotoUrl,
        collectionName: "user_projects"
      } as ConnectProject & { authorName?: string, userId?: string, collectionName?: string, authorPhotoUrl?: string };
    }

    // 3. Fallback to hardcoded
    return projectsData.find(p => p.id === slug) || null;
  } catch (error) {
    console.error("Error fetching project:", error);
    return projectsData.find(p => p.id === slug) || null;
  }
}

// Helper to resolve collection dynamically
async function resolveProjectCollection(projectId: string): Promise<string> {
  const pRef = doc(db, "projects", projectId);
  const pSnap = await getDoc(pRef);
  if (pSnap.exists()) return "projects";
  
  const upRef = doc(db, "user_projects", projectId);
  const upSnap = await getDoc(upRef);
  if (upSnap.exists()) return "user_projects";

  return "projects"; // default fallback for static ones if they ever get interactions
}

// Project Interactions
export async function toggleProjectLike(projectId: string, isLiking: boolean, collectionName: string = "projects"): Promise<boolean> {
  try {
    const docRef = doc(db, collectionName, projectId);
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
  authorPhotoUrl?: string;
  authorId?: string;
  content: string;
  timestamp: any;
}

export async function getProjectComments(projectId: string, collectionName: string = "projects"): Promise<ProjectComment[]> {
  try {
    const commentsRef = collection(db, collectionName, projectId, "comments");
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

export async function addProjectComment(
  projectId: string, 
  authorName: string, 
  content: string, 
  collectionName: string = "projects",
  authorPhotoUrl?: string,
  authorId?: string
): Promise<boolean> {
  try {
    const commentsRef = collection(db, collectionName, projectId, "comments");
    await addDoc(commentsRef, {
      authorName,
      authorPhotoUrl: authorPhotoUrl || null,
      authorId: authorId || null,
      content,
      timestamp: serverTimestamp()
    });
    
    // Increment comment count on the project
    const projectRef = doc(db, collectionName, projectId);
    await updateDoc(projectRef, {
      commentsCount: increment(1)
    });
    
    return true;
  } catch (error) {
    console.error("Error adding comment:", error);
    return false;
  }
}
