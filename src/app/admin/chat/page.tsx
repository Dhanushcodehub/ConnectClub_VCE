"use client";

import { useEffect, useState, useMemo } from "react";
import GlobalChat from "@/components/chat/GlobalChat";
import { getMembers, ConnectMember } from "@/lib/firebase/members";
import { Globe, Search, Edit } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { subscribeToUnreadCounts, subscribeToLastMessages } from "@/lib/firebase/chat";
import { motion } from "framer-motion";

const AVATAR_GRADIENTS = [
  ['#FF6B6B', '#EE5A24'], ['#A3CB38', '#009432'], ['#12CBC4', '#1289A7'],
  ['#FDA7DF', '#D980FA'], ['#F79F1F', '#EE5A24'], ['#6C5CE7', '#A29BFE'],
  ['#00CEFF', '#0055FF'], ['#FF9FF3', '#F368E0'],
];

function getAvatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function formatRelativeTime(dateInput: Date | { seconds: number } | number | string) {
  if (!dateInput) return '';
  let date: Date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === 'object' && 'seconds' in dateInput) {
    date = new Date(dateInput.seconds * 1000);
  } else {
    date = new Date(dateInput);
  }
  
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMins = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMins < 1) return 'now';
  if (diffInMins < 60) return `${diffInMins}m`;
  if (diffInHours < 24) return `${diffInHours}h`;
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) {
    return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
  }
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

export default function AdminChatPage() {
  const { user, role } = useAuth();
  const [members, setMembers] = useState<ConnectMember[]>([]);
  const [activeRoom, setActiveRoom] = useState<string>("global");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, {text: string, timestamp: Date, senderName: string}>>({});
  
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  useEffect(() => {
    getMembers().then(data => {
      setMembers(data.filter(m => m.email));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (user?.email && role) {
      const unsubscribeUnread = subscribeToUnreadCounts(user.email, role as "admin" | "member", setUnreadCounts);
      const unsubscribeLast = subscribeToLastMessages((data) => {
        setLastMessages(data);
      });
      return () => {
        unsubscribeUnread();
        unsubscribeLast();
      };
    }
  }, [user, role]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    return members.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [members, searchQuery]);

  const getActiveMember = () => {
    return members.find(m => m.email === activeRoom);
  };

  const handleRoomSelect = (roomId: string) => {
    setActiveRoom(roomId);
    setIsMobileChatOpen(true);
  };

  return (
    <div className="flex h-full overflow-hidden bg-transparent">
      {/* Sidebar - Hidden on mobile if chat is open */}
      <aside className={`w-full md:w-[350px] lg:w-[400px] border-r border-white/5 bg-[#0c0c0e] flex-col shrink-0 z-10 shadow-2xl ${isMobileChatOpen ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Chats
          </h2>
          <button className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white">
            <Edit className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3 pt-1 border-b border-white/5 bg-transparent">
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-white/30" />
            </div>
            <input
              type="text"
              placeholder="Search or start a new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-transparent">
          {/* Global Chat */}
          <button
            onClick={() => handleRoomSelect("global")}
            className={`w-full flex items-center px-4 py-2 hover:bg-white/5 transition-colors text-left ${
              activeRoom === "global" ? "bg-white/10" : ""
            }`}
          >
            <div className="relative shrink-0 mr-3 pt-1">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-primary to-secondary text-white shadow-lg">
                <Globe className="w-6 h-6" />
              </div>
            </div>
            <div className="overflow-hidden flex-1 border-b border-white/5 pb-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[15px] text-white truncate">Global Chat</span>
                {lastMessages["global"] && (
                  <span className="text-white/40 text-[10px] shrink-0 ml-2">
                    {formatRelativeTime(lastMessages["global"].timestamp)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[13px] text-white/50 truncate max-w-[85%]">
                   {lastMessages["global"] ? `${lastMessages["global"].senderName}: ${lastMessages["global"].text}` : "All members"}
                </span>
                {unreadCounts["global"] > 0 && activeRoom !== "global" && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#25D366] flex items-center justify-center shrink-0 ml-2"
                  >
                    <span className="text-[10px] font-bold text-white">{unreadCounts["global"] > 9 ? "9+" : unreadCounts["global"]}</span>
                  </motion.div>
                )}
              </div>
            </div>
          </button>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="w-6 h-6 border-2 border-primary/50 border-t-primary rounded-full animate-spin" />
              <span className="text-white/40 text-sm">Loading chats...</span>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 px-4 text-center mt-4">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <Search className="w-5 h-5 text-white/30" />
              </div>
              <p className="text-white/40 text-sm">No chats found for "{searchQuery}"</p>
            </div>
          ) : (
            filteredMembers.map(member => {
              const unreadCount = member.email ? (unreadCounts[member.email] || 0) : 0;
              const lastMsg = member.email ? lastMessages[member.email] : null;
              const [color1, color2] = getAvatarGradient(member.name);
              
              return (
                <button
                  key={member.id}
                  onClick={() => handleRoomSelect(member.email!)}
                  className={`w-full flex items-center px-4 py-2 hover:bg-white/5 transition-colors text-left group ${
                    activeRoom === member.email ? "bg-white/10" : ""
                  }`}
                >
                  <div className="relative shrink-0 mr-3 pt-1">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${color1}, ${color2})` }}
                    >
                      <span className="text-lg font-bold uppercase">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                    {/* Online Status Dot */}
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#25D366] border-2 border-[#0C0C0E] rounded-full z-10" />
                  </div>
                  
                  <div className="overflow-hidden flex-1 border-b border-white/5 pb-3 pt-2">
                    <div className="flex justify-between items-center">
                      <div className={`font-semibold text-[15px] truncate ${activeRoom === member.email ? "text-white" : "text-white/90 group-hover:text-white"}`}>
                        {member.name}
                      </div>
                      {lastMsg && (
                        <div className="text-white/40 text-[10px] shrink-0 ml-2">
                          {formatRelativeTime(lastMsg.timestamp)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-0.5">
                      <div className="text-[13px] text-white/50 truncate max-w-[85%]">
                        {lastMsg ? lastMsg.text : "Start a conversation"}
                      </div>
                      
                      {/* Unread Badge */}
                      {unreadCount > 0 && activeRoom !== member.email && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#25D366] flex items-center justify-center shrink-0 ml-2"
                        >
                          <span className="text-[10px] font-bold text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </div>
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
