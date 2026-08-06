"use client";

import { useEffect, useState } from "react";
import GlobalChat from "@/components/chat/GlobalChat";
import { getMembers, ConnectMember } from "@/lib/firebase/members";
import { Users, Globe, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { subscribeToUnreadCounts } from "@/lib/firebase/chat";

export default function AdminChatPage() {
  const { user, role } = useAuth();
  const [members, setMembers] = useState<ConnectMember[]>([]);
  const [activeRoom, setActiveRoom] = useState<string>("global"); // "global" or member.email
  const [loading, setLoading] = useState(true);
  
  // Unread message tracking
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  // Mobile responsiveness
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  useEffect(() => {
    getMembers().then(data => {
      setMembers(data.filter(m => m.email));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (user?.email && role) {
      const unsubscribe = subscribeToUnreadCounts(user.email, role as "admin" | "member", setUnreadCounts);
      return () => unsubscribe();
    }
  }, [user, role]);

  const getActiveMember = () => {
    return members.find(m => m.email === activeRoom);
  };

  const handleRoomSelect = (roomId: string) => {
    setActiveRoom(roomId);
    setIsMobileChatOpen(true);
  };

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* DM Sidebar - Hidden on mobile if chat is open */}
      <aside className={`w-full md:w-80 border-r border-white/5 bg-[#0C0C0E]/90 flex-col shrink-0 z-10 shadow-2xl ${isMobileChatOpen ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-white/5 flex items-center bg-white/[0.02]">
          <h2 className="text-lg font-black text-white flex items-center tracking-tight">
            <MessageSquare className="w-5 h-5 mr-2.5 text-primary" />
            Messages
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <button
            onClick={() => handleRoomSelect("global")}
            className={`w-full flex items-center px-4 py-3.5 rounded-2xl transition-all text-left ${
              activeRoom === "global" 
                ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(0,85,255,0.1)]" 
                : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mr-3 ${activeRoom === "global" ? "bg-primary/20 text-primary" : "bg-white/5 text-white/50"}`}>
              <Globe className="w-5 h-5" />
            </div>
            <span className="font-bold text-[14px] tracking-wide truncate">Global Chat</span>
          </button>

          <div className="pt-6 pb-2 px-2 flex items-center gap-3">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Direct Messages</span>
            <div className="h-px bg-white/5 flex-1" />
          </div>

          {loading ? (
            <div className="text-center text-white/30 text-xs py-4 flex flex-col items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary/50 border-t-primary rounded-full animate-spin" />
              Loading...
            </div>
          ) : members.length === 0 ? (
            <div className="text-center text-white/30 text-xs py-4 px-2">No members found.</div>
          ) : (
            members.map(member => {
              const unreadCount = member.email ? (unreadCounts[member.email] || 0) : 0;
              
              return (
                <button
                  key={member.id}
                  onClick={() => handleRoomSelect(member.email!)}
                  className={`w-full flex items-center px-3.5 py-3 rounded-2xl transition-all text-left group relative ${
                    activeRoom === member.email 
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(0,85,255,0.1)]" 
                      : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mr-3 transition-colors ${
                    activeRoom === member.email 
                      ? "bg-primary text-white shadow-lg shadow-primary/30" 
                      : "bg-white/10 text-white/70 group-hover:bg-white/20 group-hover:text-white"
                  }`}>
                    <span className="text-sm font-black uppercase tracking-wider">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <div className="overflow-hidden flex-1">
                    <div className={`font-bold text-[14px] truncate transition-colors ${activeRoom === member.email ? "text-primary" : "text-white/90 group-hover:text-white"}`}>
                      {member.name}
                    </div>
                    <div className="text-[11px] opacity-60 truncate font-medium mt-0.5">{member.tier}</div>
                  </div>
                  
                  {/* Unread Badge */}
                  {unreadCount > 0 && activeRoom !== member.email && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0 ml-2">
                      <span className="text-[9px] font-black text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Area - Hidden on mobile if NO chat is open */}
      <main className={`flex-1 bg-background/50 h-full relative ${!isMobileChatOpen ? 'hidden md:block' : 'block'}`}>
        {activeRoom === "global" ? (
          <GlobalChat onBack={() => setIsMobileChatOpen(false)} />
        ) : (
          <GlobalChat 
            key={activeRoom} // Force remount when switching DMs
            dmRoomId={activeRoom} 
            dmRoomName={getActiveMember()?.name} 
            onBack={() => setIsMobileChatOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
