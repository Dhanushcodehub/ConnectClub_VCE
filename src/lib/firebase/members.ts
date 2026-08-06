import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, orderBy, where } from "firebase/firestore";
import { db } from "./config";

export type MemberTier = "Executive Board" | "Core Team" | "Volunteers" | "Alumni";

export interface ConnectMember {
  id?: string;
  name: string;
  position: string;
  tier: MemberTier;
  department?: string;
  rollNo: string;
  linkedinUrl?: string;
  instaUrl?: string;
  imageUrl?: string;
  order: number;
  email?: string; // For future login association
  uid?: string; // Firebase Auth UID if they have a login
  permissions?: string[]; // E.g., ['events', 'projects', 'timeline', 'gallery']
}

const MEMBERS_COLLECTION = "members";

export async function getMemberByEmail(email: string): Promise<ConnectMember | null> {
  if (typeof window === "undefined") return null;
  try {
    const q = query(collection(db, MEMBERS_COLLECTION), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as ConnectMember;
  } catch (error) {
    console.error("Error fetching member by email:", error);
    return null;
  }
}

export async function getMembers(): Promise<ConnectMember[]> {
  if (typeof window === "undefined") return [];
  try {
    const q = query(collection(db, MEMBERS_COLLECTION), orderBy("order", "asc"));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return [];
    }
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConnectMember));
  } catch (error) {
    console.error("Error fetching members:", error);
    return [];
  }
}

export async function addMember(member: Omit<ConnectMember, "id">): Promise<string> {
  if (typeof window === "undefined") throw new Error("Client only");
  try {
    const docRef = await addDoc(collection(db, MEMBERS_COLLECTION), member);
    return docRef.id;
  } catch (error) {
    console.error("Error adding member:", error);
    throw error;
  }
}

export async function updateMember(id: string, member: Partial<Omit<ConnectMember, "id">>): Promise<void> {
  if (typeof window === "undefined") throw new Error("Client only");
  try {
    const docRef = doc(db, MEMBERS_COLLECTION, id);
    await updateDoc(docRef, member);
  } catch (error) {
    console.error("Error updating member:", error);
    throw error;
  }
}

export async function deleteMember(id: string): Promise<void> {
  if (typeof window === "undefined") throw new Error("Client only");
  try {
    const docRef = doc(db, MEMBERS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting member:", error);
    throw error;
  }
}
