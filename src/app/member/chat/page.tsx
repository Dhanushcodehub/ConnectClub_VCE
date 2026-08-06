"use client";

import { useEffect, useState } from "react";
import GlobalChat from "@/components/chat/GlobalChat";
import { useAuth } from "@/lib/contexts/AuthContext";
import { ConnectMember, getMemberByEmail } from "@/lib/firebase/members";
import { subscribeToUnreadCounts } from "@/lib/firebase/chat";

export default function MemberChatPage() {
  const { user, role } = useAuth();
  const [profile, setProfile] = useState<ConnectMember | null>(null);
  const [activeTab, setActiveTab] = useState<"global" | "dm">("global");
  
  // Unread message tracking
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user?.email) {
      getMemberByEmail(user.email).then(p => setProfile(p));
    }
  }, [user]);

  useEffect(() => {
    if (user?.email && role) {
      // member role will only fetch counts where roomId === user.email
      const unsubscribe = subscribeToUnreadCounts(user.email, role as "admin" | "member", setUnreadCounts);
      return () => unsubscribe();
    }
  }, [user, role]);

  // For members, the roomId is their own email
  const unreadDmCount = user?.email ? (unreadCounts[user.email] || 0) : 0;

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex border-b border-white/10 px-6 pt-4 space-x-6 shrink-0 bg-background/50">
        <button 
          onClick={() => setActiveTab("global")}
          className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors relative ${
            activeTab === "global" ? "border-primary text-primary" : "border-transparent text-white/50 hover:text-white"
          }`}
        >
          Global Club Chat
        </button>
        <button 
          onClick={() => setActiveTab("dm")}
          className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "dm" ? "border-primary text-primary" : "border-transparent text-white/50 hover:text-white"
          }`}
        >
          Direct with Admin
          {unreadDmCount > 0 && activeTab !== "dm" && (
            <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] text-white shadow-lg shadow-primary/30">
              {unreadDmCount > 9 ? "9+" : unreadDmCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === "global" ? (
          <GlobalChat memberProfile={profile} />
        ) : (
          <GlobalChat 
            key="dm"
            memberProfile={profile} 
            dmRoomId={user?.email || undefined} 
            dmRoomName="Admin"
          />
        )}
      </div>
    </div>
  );
}
