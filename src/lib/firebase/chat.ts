import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, limit, where, getDocs, writeBatch, doc, updateDoc, deleteDoc, setDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "./config";

export interface ChatMessage {
  id?: string;
  text: string;
  senderName: string;
  senderEmail: string;
  senderRole: "admin" | "member";
  timestamp: any; // Firestore server timestamp or JS Date
  read?: boolean;
  replyTo?: { id: string; text: string; senderName: string };
  reactions?: Record<string, string[]>;
}

const CHAT_COLLECTION = "messages";
const TYPING_COLLECTION = "typing_status";

/**
 * Send a new chat message to the global channel.
 */
export async function sendChatMessage(message: Omit<ChatMessage, "id" | "timestamp">) {
  if (typeof window === "undefined") throw new Error("Client only");
  try {
    await addDoc(collection(db, CHAT_COLLECTION), {
      ...message,
      read: false,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

/**
 * Subscribe to the latest 100 chat messages.
 * Returns an unsubscribe function.
 */
export function subscribeToMessages(callback: (messages: ChatMessage[]) => void) {
  if (typeof window === "undefined") return () => {};

  const q = query(
    collection(db, CHAT_COLLECTION), 
    orderBy("timestamp", "desc"),
    limit(100)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        text: data.text,
        senderName: data.senderName,
        senderEmail: data.senderEmail,
        senderRole: data.senderRole,
        timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
        read: data.read ?? true, // default old messages to read
        replyTo: data.replyTo,
        reactions: data.reactions,
      } as ChatMessage;
    });

    // Reverse to get oldest-to-newest order for displaying
    callback(messages.reverse());
  }, (error) => {
    console.error("Error subscribing to messages:", error);
  });

  return unsubscribe;
}

const DM_COLLECTION = "direct_messages";

export interface DirectMessage extends ChatMessage {
  roomId: string; // member's email
}

/**
 * Send a direct message between admin and a specific member.
 */
export async function sendDirectMessage(message: Omit<DirectMessage, "id" | "timestamp">) {
  if (typeof window === "undefined") throw new Error("Client only");
  try {
    await addDoc(collection(db, DM_COLLECTION), {
      ...message,
      read: false,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error sending DM:", error);
    throw error;
  }
}

/**
 * Subscribe to the direct messages between admin and a specific member.
 * Returns an unsubscribe function.
 */
export function subscribeToDirectMessages(roomId: string, callback: (messages: DirectMessage[]) => void) {
  if (typeof window === "undefined") return () => {};

  const q = query(
    collection(db, DM_COLLECTION),
    where("roomId", "==", roomId),
    orderBy("timestamp", "desc"),
    limit(100)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        text: data.text,
        senderName: data.senderName,
        senderEmail: data.senderEmail,
        senderRole: data.senderRole,
        roomId: data.roomId,
        read: data.read ?? true,
        replyTo: data.replyTo,
        reactions: data.reactions,
        timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
      } as DirectMessage;
    });

    // Reverse to get oldest-to-newest order for displaying
    callback(messages.reverse());
  }, (error) => {
    console.error("Error subscribing to DMs:", error);
  });

  return unsubscribe;
}

/**
 * Mark all unread messages in a room as read, if the current user didn't send them.
 */
export async function markMessagesAsRead(roomId: string, currentUserEmail: string) {
  if (typeof window === "undefined") return;
  try {
    const q = query(
      collection(db, DM_COLLECTION),
      where("roomId", "==", roomId),
      where("read", "==", false),
      where("senderEmail", "!=", currentUserEmail)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => {
      batch.update(doc(db, DM_COLLECTION, d.id), { read: true });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }
}

/**
 * Subscribe to unread direct messages to calculate badges.
 * Admin listens for all unread DMs from members.
 * Members listen for all unread DMs from admin in their own room.
 */
export function subscribeToUnreadCounts(
  currentUserEmail: string, 
  role: "admin" | "member", 
  callback: (counts: Record<string, number>) => void
) {
  if (typeof window === "undefined") return () => {};

  let q;
  if (role === "admin") {
    // Admin needs to know how many unread messages came from members
    q = query(
      collection(db, DM_COLLECTION),
      where("read", "==", false),
      where("senderRole", "==", "member")
    );
  } else {
    // Member needs to know how many unread messages came from admin to them
    q = query(
      collection(db, DM_COLLECTION),
      where("roomId", "==", currentUserEmail),
      where("read", "==", false),
      where("senderRole", "==", "admin")
    );
  }

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const counts: Record<string, number> = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      // Use roomId to group counts since roomId is the member's email
      const roomId = data.roomId; 
      counts[roomId] = (counts[roomId] || 0) + 1;
    });
    
    callback(counts);
  }, (error) => {
    console.error("Error subscribing to unread counts:", error);
  });

  return unsubscribe;
}

/**
 * Set the typing status of a user in a specific room.
 */
export async function setTypingStatus(roomId: string, userEmail: string, userName: string, isTyping: boolean) {
  if (typeof window === "undefined") throw new Error("Client only");
  try {
    const docRef = doc(db, TYPING_COLLECTION, `${roomId}_${userEmail}`);
    if (isTyping) {
      await setDoc(docRef, {
        roomId,
        userEmail,
        userName,
        timestamp: serverTimestamp(),
      });
    } else {
      await deleteDoc(docRef);
    }
  } catch (error) {
    console.error("Error setting typing status:", error);
  }
}

/**
 * Subscribe to typing statuses in a specific room, excluding the current user.
 */
export function subscribeToTypingStatus(roomId: string, currentUserEmail: string, callback: (typingUsers: {email: string, name: string}[]) => void) {
  if (typeof window === "undefined") return () => {};

  const q = query(
    collection(db, TYPING_COLLECTION),
    where("roomId", "==", roomId)
  );

  return onSnapshot(q, (snapshot) => {
    const typingUsers = snapshot.docs
      .map(doc => doc.data())
      .filter(data => data.userEmail !== currentUserEmail)
      .map(data => ({ email: data.userEmail, name: data.userName }));
    
    callback(typingUsers);
  }, (error) => {
    console.error("Error subscribing to typing status:", error);
  });
}

/**
 * Add a reaction to a specific message.
 */
export async function addReaction(messageId: string, collectionName: string, emoji: string, userEmail: string) {
  if (typeof window === "undefined") throw new Error("Client only");
  try {
    const docRef = doc(db, collectionName, messageId);
    await updateDoc(docRef, {
      [`reactions.${emoji}`]: arrayUnion(userEmail)
    });
  } catch (error) {
    console.error("Error adding reaction:", error);
  }
}

/**
 * Remove a reaction from a specific message.
 */
export async function removeReaction(messageId: string, collectionName: string, emoji: string, userEmail: string) {
  if (typeof window === "undefined") throw new Error("Client only");
  try {
    const docRef = doc(db, collectionName, messageId);
    await updateDoc(docRef, {
      [`reactions.${emoji}`]: arrayRemove(userEmail)
    });
  } catch (error) {
    console.error("Error removing reaction:", error);
  }
}

/**
 * Subscribe to the latest message for each direct message room.
 */
export function subscribeToLastMessages(callback: (lastMessages: Record<string, {text: string, timestamp: Date, senderName: string}>) => void) {
  if (typeof window === "undefined") return () => {};

  const q = query(
    collection(db, DM_COLLECTION),
    orderBy("timestamp", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const lastMessages: Record<string, {text: string, timestamp: Date, senderName: string}> = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const roomId = data.roomId;
      
      if (!lastMessages[roomId]) {
        lastMessages[roomId] = {
          text: data.text,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
          senderName: data.senderName
        };
      }
    });
    
    callback(lastMessages);
  }, (error) => {
    console.error("Error subscribing to last messages:", error);
  });
}
