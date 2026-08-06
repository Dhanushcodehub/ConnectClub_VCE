"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useNotifications } from "@/lib/contexts/NotificationContext";
import { subscribeToMessages, subscribeToDirectMessages } from "@/lib/firebase/chat";
import { collection, query, onSnapshot, orderBy, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export function GlobalChatListener() {
  const { user, role } = useAuth();
  const { toast } = useNotifications();
  const pathname = usePathname();
  
  // Track if it's the initial load so we don't spam notifications for old messages
  const initialLoadRef = useRef(true);
  const lastGlobalMsgIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    // We only want notifications if they are logged in and have an email
    if (!user || !role || !user.email) return;

    // Listen to Global Chat
    const unsubscribeGlobal = subscribeToMessages((messages) => {
      if (messages.length === 0) return;
      
      const latestMsg = messages[messages.length - 1]; // Because we reverse it in subscribeToMessages
      
      // If it's initial load, just record the latest ID and don't notify
      if (initialLoadRef.current) {
        lastGlobalMsgIdRef.current = latestMsg.id || null;
        
        // Give it a tiny delay to mark initial load as false, so both listeners can initialize
        setTimeout(() => { initialLoadRef.current = false; }, 1000);
        return;
      }

      // If it's a new message, not from me, and I'm not looking at the global chat right now
      if (
        latestMsg.id !== lastGlobalMsgIdRef.current && 
        latestMsg.senderEmail !== user.email
      ) {
        lastGlobalMsgIdRef.current = latestMsg.id || null;
        
        // Don't notify if we are currently looking at the global chat
        const isViewingGlobalChat = (pathname === '/admin/chat' || pathname === '/member/chat') && 
          // Assuming activeRoom state in those pages handles it, but loosely:
          !document.hidden;
          
        if (!isViewingGlobalChat || document.hidden) {
          toast(
            `Club Chat: ${latestMsg.senderName}`, 
            latestMsg.text,
            () => { window.location.href = role === "admin" ? "/admin/chat" : "/member/chat"; }
          );
          
          // Request browser notification if permitted
          if (Notification.permission === "granted" && document.hidden) {
            new Notification(`Club Chat: ${latestMsg.senderName}`, { body: latestMsg.text });
          }
        }
      }
    });

    // Listen to Direct Messages
    let unsubscribeDM: () => void = () => {};
    
    if (role === "admin") {
      // Admin needs to listen to ALL DMs where they are not the sender
      const q = query(
        collection(db, "direct_messages"),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      
      let initialAdminDMLoad = true;
      let lastAdminDMMsgId: string | null = null;
      
      unsubscribeDM = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) return;
        
        const doc = snapshot.docs[0];
        const data = doc.data();
        const id = doc.id;
        
        if (initialAdminDMLoad) {
          lastAdminDMMsgId = id;
          initialAdminDMLoad = false;
          return;
        }
        
        if (id !== lastAdminDMMsgId && data.senderEmail !== user.email) {
          lastAdminDMMsgId = id;
          
          if (!document.hidden && pathname === '/admin/chat') return; // Might be viewing it
          
          toast(
            `DM from ${data.senderName}`, 
            data.text,
            () => { window.location.href = "/admin/chat"; }
          );
          
          if (Notification.permission === "granted" && document.hidden) {
            new Notification(`DM from ${data.senderName}`, { body: data.text });
          }
        }
      });
    } else {
      // Member only listens to their own DM room
      let initialMemberDMLoad = true;
      let lastMemberDMMsgId: string | null = null;
      
      unsubscribeDM = subscribeToDirectMessages(user.email, (messages) => {
        if (messages.length === 0) return;
        
        const latestMsg = messages[messages.length - 1];
        
        if (initialMemberDMLoad) {
          lastMemberDMMsgId = latestMsg.id || null;
          initialMemberDMLoad = false;
          return;
        }
        
        if (latestMsg.id !== lastMemberDMMsgId && latestMsg.senderEmail !== user.email) {
          lastMemberDMMsgId = latestMsg.id || null;
          
          if (!document.hidden && pathname === '/member/chat') return;
          
          toast(
            `DM from Admin`, 
            latestMsg.text,
            () => { window.location.href = "/member/chat"; }
          );
          
          if (Notification.permission === "granted" && document.hidden) {
            new Notification(`DM from Admin`, { body: latestMsg.text });
          }
        }
      });
    }

    // Ask for browser notification permission
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      unsubscribeGlobal();
      unsubscribeDM();
    };
  }, [user, role, pathname, toast]);

  return null; // This component just runs the effect
}
