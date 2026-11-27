"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useNotifications } from "@/lib/contexts/NotificationContext";
import { subscribeToMessages, subscribeToDirectMessages } from "@/lib/firebase/chat";
import { collection, query, onSnapshot, orderBy, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

/** Fire a native OS notification if permission is granted */
function fireOSNotification(title: string, body: string, onClick?: () => void) {
  if (typeof window === "undefined") return;
  if (Notification.permission !== "granted") return;
  const n = new Notification(title, {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
  });
  if (onClick) n.onclick = () => { window.focus(); onClick(); };
}

export function GlobalChatListener() {
  const { user, role } = useAuth();
  const { toast } = useNotifications();
  const pathname = usePathname();

  // Track if it's the initial load so we don't spam notifications for old messages
  const initialLoadRef = useRef(true);
  const lastGlobalMsgIdRef = useRef<string | null>(null);

  // ── 1. Chat & DM listener ─────────────────────────────────────────────────
  useEffect(() => {
    // We only want notifications if they are logged in and have an email
    if (!user || !role || !user.email) return;

    // Listen to Global Chat
    const unsubscribeGlobal = subscribeToMessages((messages) => {
      if (messages.length === 0) return;

      const latestMsg = messages[messages.length - 1];

      // If it's initial load, just record the latest ID and don't notify
      if (initialLoadRef.current) {
        lastGlobalMsgIdRef.current = latestMsg.id || null;
        setTimeout(() => { initialLoadRef.current = false; }, 1000);
        return;
      }

      if (
        latestMsg.id !== lastGlobalMsgIdRef.current &&
        latestMsg.senderEmail !== user.email
      ) {
        lastGlobalMsgIdRef.current = latestMsg.id || null;

        const isViewingGlobalChat = (pathname === '/admin/chat' || pathname === '/member/chat') &&
          !document.hidden;

        if (!isViewingGlobalChat || document.hidden) {
          const goToChat = () => { window.location.href = role === "admin" ? "/admin/chat" : "/member/chat"; };
          toast(`Club Chat: ${latestMsg.senderName}`, latestMsg.text, goToChat);

          // Native OS popup only when tab is hidden
          if (document.hidden) {
            fireOSNotification(`Club Chat: ${latestMsg.senderName}`, latestMsg.text, goToChat);
          }
        }
      }
    });

    // Listen to Direct Messages
    let unsubscribeDM: () => void = () => {};

    if (role === "admin") {
      const q = query(
        collection(db, "direct_messages"),
        orderBy("timestamp", "desc"),
        limit(10)
      );

      let initialAdminDMLoad = true;
      const seenAdminDMIds = new Set<string>();

      unsubscribeDM = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) return;

        const docs = snapshot.docs;

        if (initialAdminDMLoad) {
          docs.forEach((d) => seenAdminDMIds.add(d.id));
          initialAdminDMLoad = false;
          return;
        }

        for (const doc of [...docs].reverse()) {
          const data = doc.data();
          if (seenAdminDMIds.has(doc.id)) continue;
          seenAdminDMIds.add(doc.id);

          if (data.senderEmail === user.email) continue;
          if (!document.hidden && pathname === '/admin/chat') continue;

          const goToChat = () => { window.location.href = "/admin/chat"; };
          toast(`DM from ${data.senderName}`, data.text, goToChat);

          if (document.hidden) {
            fireOSNotification(`DM from ${data.senderName}`, data.text, goToChat);
          }
        }

        const windowIds = new Set(docs.map((d) => d.id));
        for (const id of seenAdminDMIds) {
          if (!windowIds.has(id)) seenAdminDMIds.delete(id);
        }
      }, () => {});
    } else {
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

          const goToChat = () => { window.location.href = "/member/chat"; };
          toast(`DM from Admin`, latestMsg.text, goToChat);

          if (document.hidden) {
            fireOSNotification(`DM from Admin`, latestMsg.text, goToChat);
          }
        }
      });
    }

    // Ask for browser notification permission once
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      unsubscribeGlobal();
      unsubscribeDM();
    };
  }, [user, role, pathname, toast]);

  // ── 2. Admin broadcast → native OS popup ─────────────────────────────────
  useEffect(() => {
    // Only for logged-in students (uid exists, role is NOT admin/member portal)
    if (!user?.uid) return;

    const seenNotifIds = new Set<string>();
    let isInitialLoad = true;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        isInitialLoad = false;
        return;
      }

      // On first load, just seed the seen set — don't fire popups for old notifications
      if (isInitialLoad) {
        snapshot.docs.forEach((d) => seenNotifIds.add(d.id));
        isInitialLoad = false;
        return;
      }

      // For each new doc that wasn't in the initial set, fire in-app toast + OS popup
      for (const docSnap of snapshot.docs) {
        if (seenNotifIds.has(docSnap.id)) continue;
        seenNotifIds.add(docSnap.id);

        const data = docSnap.data();
        const title: string = data.title || "Connect Club";
        const message: string = data.message || "";
        const actionUrl: string | undefined = data.actionUrl;

        const handleClick = actionUrl
          ? () => { window.location.href = actionUrl; }
          : undefined;

        // Always show in-app toast
        toast(title, message, handleClick);

        // Native OS popup — fires whether or not the tab is visible
        // so the student sees it even if the site is open in background
        fireOSNotification(`🔔 ${title}`, message, handleClick);
      }
    }, () => {
      // Swallow permission-denied errors silently
    });

    return () => unsubscribe();
  }, [user?.uid, toast]);

  return null;
}
