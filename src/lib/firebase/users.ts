import { collection, getDocs, doc, getDoc, setDoc, updateDoc, query, where, orderBy, limit, addDoc, serverTimestamp, increment, deleteDoc, Timestamp, writeBatch } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./config";
import { commitInChunks, type BatchOp } from "@/lib/firebase/batch";
import { generateTicketId } from "@/lib/tickets";

// ─── User Profile ───────────────────────────────────────────
export interface ConnectUser {
  uid: string;
  name: string;
  email: string;
  rollNo: string;
  rollNoVerified?: boolean;
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
  imageUrl?: string;
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
  ticketId?: string;
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
  screenshots?: string[];
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

export const fallbackUsers: ConnectUser[] = [
  {
    uid: "student-1",
    name: "Bhavesh Sharma",
    email: "bhavesh.sharma@gmail.com",
    rollNo: "22881A0512",
    phone: "9876543210",
    department: "CSE",
    yearOfStudy: "3rd Year",
    provider: "google",
    projectsCount: 2,
    likesReceived: 14,
    commentsCount: 5,
    certificatesCount: 1,
    createdAt: new Date("2026-08-15T10:00:00Z"),
    updatedAt: new Date("2026-08-15T10:00:00Z"),
  },
  {
    uid: "student-2",
    name: "Ananya Reddy",
    email: "ananya.reddy@gmail.com",
    rollNo: "23881A6624",
    phone: "9848012345",
    department: "AI&ML",
    yearOfStudy: "2nd Year",
    provider: "google",
    projectsCount: 1,
    likesReceived: 8,
    commentsCount: 2,
    certificatesCount: 2,
    createdAt: new Date("2026-08-20T14:30:00Z"),
    updatedAt: new Date("2026-08-20T14:30:00Z"),
  },
  {
    uid: "student-3",
    name: "Karthik Varma",
    email: "karthik.varma@outlook.com",
    rollNo: "21881A1245",
    phone: "9123456780",
    department: "IT",
    yearOfStudy: "4th Year",
    provider: "email",
    projectsCount: 4,
    likesReceived: 32,
    commentsCount: 12,
    certificatesCount: 3,
    createdAt: new Date("2026-07-10T09:15:00Z"),
    updatedAt: new Date("2026-07-10T09:15:00Z"),
  },
  {
    uid: "student-4",
    name: "Sneha Patel",
    email: "sneha.patel@gmail.com",
    rollNo: "24881A0456",
    phone: "9988776655",
    department: "ECE",
    yearOfStudy: "1st Year",
    provider: "google",
    projectsCount: 0,
    likesReceived: 2,
    commentsCount: 1,
    certificatesCount: 0,
    createdAt: new Date("2026-09-01T16:45:00Z"),
    updatedAt: new Date("2026-09-01T16:45:00Z"),
  },
  {
    uid: "student-5",
    name: "Rohit Kumar",
    email: "rohit.k@gmail.com",
    rollNo: "22881A6708",
    phone: "9001122334",
    department: "DS",
    yearOfStudy: "3rd Year",
    provider: "email",
    projectsCount: 1,
    likesReceived: 5,
    commentsCount: 3,
    certificatesCount: 1,
    createdAt: new Date("2026-08-28T11:20:00Z"),
    updatedAt: new Date("2026-08-28T11:20:00Z"),
  },
];

export async function getAllUsers(): Promise<ConnectUser[]> {
  if (!isFirebaseConfigured || !db) return fallbackUsers;
  try {
    const q = query(collection(db, USERS_COLLECTION));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return [];
    return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as ConnectUser));
  } catch (error) {
    console.error("Error fetching all users:", error);
    return fallbackUsers;
  }
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

const inMemoryNotifications: UserNotification[] = [];

export async function getUserNotifications(userId: string): Promise<UserNotification[]> {
  if (!isFirebaseConfigured || !db) {
    return inMemoryNotifications.filter(n => n.userId === userId);
  }
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const notifs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserNotification[];

    // Sort in memory (descending by createdAt)
    return notifs.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
      return timeB - timeA;
    }).slice(0, 50);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return inMemoryNotifications.filter(n => n.userId === userId);
  }
}

export async function markNotificationRead(notifId: string): Promise<void> {
  const local = inMemoryNotifications.find(n => n.id === notifId);
  if (local) local.read = true;
  if (!isFirebaseConfigured || !db) return;
  try {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notifId);
    await updateDoc(docRef, { read: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  inMemoryNotifications.forEach(n => {
    if (n.userId === userId) n.read = true;
  });
  if (!isFirebaseConfigured || !db) return;
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    const querySnapshot = await getDocs(q);
    // Chunked: >500 unread docs would exceed the Firestore batch cap.
    const ops: BatchOp[] = querySnapshot.docs.map((d) => ({
      type: "update" as const,
      ref: d.ref,
      data: { read: true },
    }));
    await commitInChunks(db, ops);
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (!isFirebaseConfigured || !db) {
    return inMemoryNotifications.filter(n => n.userId === userId && !n.read).length;
  }
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
    return inMemoryNotifications.filter(n => n.userId === userId && !n.read).length;
  }
}

export async function createNotification(notification: Omit<UserNotification, "id">): Promise<string> {
  const newNotif: UserNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...notification,
    createdAt: new Date(),
  };
  inMemoryNotifications.unshift(newNotif);

  if (!isFirebaseConfigured || !db) {
    return newNotif.id;
  }

  try {
    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      ...notification,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
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

    const ticketId = generateTicketId();

    await addDoc(collection(db, REGISTRATIONS_COLLECTION), {
      userId,
      eventId,
      eventTitle,
      ticketId,
      registeredAt: serverTimestamp(),
      attended: false,
      certificateIssued: false,
    });

    // Also send a notification to the user
    await addDoc(collection(db, "notifications"), {
      userId,
      title: "🎟 Registration Confirmed!",
      message: `You're all set for ${eventTitle}! We've saved your spot. Get ready for an amazing experience! 🚀`,
      type: "event",
      read: false,
      createdAt: serverTimestamp(),
      actionUrl: `/events/${eventId}`
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
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const projects = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserProject[];
    
    // In-memory sorting to avoid composite index requirements
    return projects.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error("Error fetching user projects:", error);
    return [];
  }
}

export async function getApprovedUserProjects(): Promise<UserProject[]> {
  if (!isFirebaseConfigured) return [];
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
