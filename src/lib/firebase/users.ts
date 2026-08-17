import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, where, orderBy, limit, addDoc, serverTimestamp, increment, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "./config";

// ─── User Profile ───────────────────────────────────────────
export interface ConnectUser {
  uid: string;
  name: string;
  email: string;
  rollNo: string;
  phone: string;
  photoURL?: string;
  department?: string;
  yearOfStudy?: string;
  provider: "email" | "google";
  createdAt: any;
  updatedAt: any;
  bio?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  projectsCount: number;
  likesReceived: number;
  commentsCount: number;
  certificatesCount: number;
}

// ─── Notification ───────────────────────────────────────────
export interface UserNotification {
  id: string;
  userId: string;
  type: "certificate" | "event" | "project" | "system" | "comment" | "like";
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: any;
}

// ─── Certificate ────────────────────────────────────────────
export interface UserCertificate {
  id: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  certificateUrl: string;
  issuedAt: any;
}

// ─── Event Registration ─────────────────────────────────────
export interface EventRegistration {
  id: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  registeredAt: any;
  attended: boolean;
  certificateIssued: boolean;
}

// ─── User Project ───────────────────────────────────────────
export interface UserProject {
  id: string;
  userId: string;
  authorName: string;
  title: string;
  description: string;
  technologies: string[];
  githubUrl?: string;
  demoUrl?: string;
  banner?: string;
  status: "pending" | "approved" | "rejected";
  likes: number;
  commentsCount: number;
  createdAt: any;
  updatedAt: any;
}

const USERS_COLLECTION = "users";
const NOTIFICATIONS_COLLECTION = "notifications";
const CERTIFICATES_COLLECTION = "certificates";
const REGISTRATIONS_COLLECTION = "event_registrations";
const USER_PROJECTS_COLLECTION = "user_projects";

// ═══════════════════════════════════════════════════════════════
// USER PROFILE
// ═══════════════════════════════════════════════════════════════

export async function getUserProfile(uid: string): Promise<ConnectUser | null> {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { uid: docSnap.id, ...docSnap.data() } as ConnectUser;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function createUserProfile(userData: Omit<ConnectUser, "projectsCount" | "likesReceived" | "commentsCount" | "certificatesCount">): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, userData.uid);
    await setDoc(docRef, {
      ...userData,
      projectsCount: 0,
      likesReceived: 0,
      commentsCount: 0,
      certificatesCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
}

export async function updateUserProfile(uid: string, data: Partial<ConnectUser>): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

export async function checkUserExists(uid: string): Promise<boolean> {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error("Error checking user:", error);
    return false;
  }
}

export async function getAllUsers(): Promise<ConnectUser[]> {
  try {
    const q = query(collection(db, USERS_COLLECTION));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ConnectUser));
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

export async function getUserNotifications(userId: string): Promise<UserNotification[]> {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserNotification[];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

export async function markNotificationRead(notifId: string): Promise<void> {
  try {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notifId);
    await updateDoc(docRef, { read: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    const querySnapshot = await getDocs(q);
    const updates = querySnapshot.docs.map(d => updateDoc(doc(db, NOTIFICATIONS_COLLECTION, d.id), { read: true }));
    await Promise.all(updates);
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error("Error counting unread notifications:", error);
    return 0;
  }
}

export async function createNotification(notification: Omit<UserNotification, "id">): Promise<void> {
  try {
    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      ...notification,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// CERTIFICATES
// ═══════════════════════════════════════════════════════════════

export async function getUserCertificates(userId: string): Promise<UserCertificate[]> {
  try {
    const q = query(
      collection(db, CERTIFICATES_COLLECTION),
      where("userId", "==", userId),
      orderBy("issuedAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserCertificate[];
  } catch (error) {
    console.error("Error fetching certificates:", error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// EVENT REGISTRATIONS
// ═══════════════════════════════════════════════════════════════

export async function registerForEvent(userId: string, eventId: string, eventTitle: string): Promise<void> {
  try {
    // Check if already registered
    const q = query(
      collection(db, REGISTRATIONS_COLLECTION),
      where("userId", "==", userId),
      where("eventId", "==", eventId)
    );
    const existing = await getDocs(q);
    if (!existing.empty) {
      throw new Error("Already registered for this event");
    }

    await addDoc(collection(db, REGISTRATIONS_COLLECTION), {
      userId,
      eventId,
      eventTitle,
      registeredAt: serverTimestamp(),
      attended: false,
      certificateIssued: false,
    });
  } catch (error) {
    console.error("Error registering for event:", error);
    throw error;
  }
}

export async function getUserRegistrations(userId: string): Promise<EventRegistration[]> {
  try {
    const q = query(
      collection(db, REGISTRATIONS_COLLECTION),
      where("userId", "==", userId),
      orderBy("registeredAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EventRegistration[];
  } catch (error) {
    console.error("Error fetching registrations:", error);
    return [];
  }
}

export async function checkEventRegistration(userId: string, eventId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, REGISTRATIONS_COLLECTION),
      where("userId", "==", userId),
      where("eventId", "==", eventId)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking registration:", error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// USER PROJECTS
// ═══════════════════════════════════════════════════════════════

export async function submitUserProject(project: Omit<UserProject, "id" | "likes" | "commentsCount" | "createdAt" | "updatedAt">): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, USER_PROJECTS_COLLECTION), {
      ...project,
      likes: 0,
      commentsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Increment user's project count
    const userRef = doc(db, USERS_COLLECTION, project.userId);
    await updateDoc(userRef, { projectsCount: increment(1) });

    return docRef.id;
  } catch (error) {
    console.error("Error submitting project:", error);
    throw error;
  }
}

export async function getUserProjects(userId: string): Promise<UserProject[]> {
  try {
    const q = query(
      collection(db, USER_PROJECTS_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserProject[];
  } catch (error) {
    console.error("Error fetching user projects:", error);
    return [];
  }
}

export async function getApprovedUserProjects(): Promise<UserProject[]> {
  try {
    const q = query(
      collection(db, USER_PROJECTS_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserProject[];
  } catch (error) {
    console.error("Error fetching approved projects:", error);
    return [];
  }
}
