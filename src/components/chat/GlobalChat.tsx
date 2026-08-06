"use client";

import { useState, useEffect, useRef } from "react";
import { ChatMessage, subscribeToMessages, sendChatMessage, subscribeToDirectMessages, sendDirectMessage, markMessagesAsRead } from "@/lib/firebase/chat";
import { useAuth } from "@/lib/contexts/AuthContext";
import { ConnectMember } from "@/lib/firebase/members";
import { Send, Loader2, User, ArrowLeft, Check, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function GlobalChat({ 
  memberProfile,
  dmRoomId,
  dmRoomName,
  onBack // For mobile
}: { 
  memberProfile?: ConnectMember | null,
  dmRoomId?: string,
  dmRoomName?: string,
  onBack?: () => void
}) {
  const { user, role } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    let unsubscribe: () => void;
    
    if (dmRoomId) {
      unsubscribe = subscribeToDirectMessages(dmRoomId, (fetchedMessages) => {
        setMessages(fetchedMessages);
        setLoading(false);
        scrollToBottom();
        // Mark messages as read when we receive them
        if (user?.email) {
          markMessagesAsRead(dmRoomId, user.email);
        }
      });
    } else {
      unsubscribe = subscribeToMessages((fetchedMessages) => {
        setMessages(fetchedMessages);
        setLoading(false);
        scrollToBottom();
      });
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [dmRoomId, user?.email]);

  // Also mark as read when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      if (dmRoomId && user?.email) {
        markMessagesAsRead(dmRoomId, user.email);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [dmRoomId, user?.email]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !role) return;

    const text = inputText;
    setInputText(""); // Optimistic clear
    setSending(true);

    try {
      const senderName = role === "admin" ? "Admin" : (memberProfile?.name || user.email || "Unknown");
      
      const msgData = {
        text: text.trim(),
        senderName: senderName,
        senderEmail: user.email || "",
        senderRole: role as "admin" | "member"
      };

      if (dmRoomId) {
        await sendDirectMessage({
          ...msgData,
          roomId: dmRoomId
        });
      } else {
        await sendChatMessage(msgData);
      }
      
      scrollToBottom();
    } catch (error) {
      console.error("Failed to send message", error);
      alert("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col w-full relative">
      <header className="px-6 py-5 border-b border-white/5 shrink-0 bg-background/80 backdrop-blur-xl z-20 sticky top-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="md:hidden p-2 -ml-2 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
              {dmRoomId ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {dmRoomName || "Direct Message"}
                </>
              ) : (
                "Global Club Chat"
              )}
            </h1>
            <p className="text-white/40 text-[11px] mt-0.5 font-medium">
              {dmRoomId ? "Private End-to-End Encrypted Channel" : "Communicate with all members and admin"}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
              <User className="w-8 h-8 text-white/30" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">No messages yet</h3>
              <p className="text-white/40 text-sm">Send a message to start the conversation.</p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const isMe = msg.senderEmail === user?.email;
              const isAdmin = msg.senderRole === "admin";
              
              // Sequence grouping logic
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
              
              const isConsecutivePrev = prevMsg && prevMsg.senderEmail === msg.senderEmail;
              const isConsecutiveNext = nextMsg && nextMsg.senderEmail === msg.senderEmail;
              
              const isFirstInSequence = !isConsecutivePrev;
              const isLastInSequence = !isConsecutiveNext;

              // Radius logic for iMessage-style bubbles
              let borderRadiusClass = "rounded-2xl";
              if (isMe) {
                if (isLastInSequence) borderRadiusClass += " rounded-br-[4px]";
              } else {
                if (isLastInSequence) borderRadiusClass += " rounded-bl-[4px]";
              }

              return (
                <motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex w-full ${isMe ? "justify-end" : "justify-start"} ${isFirstInSequence ? "mt-6" : "mt-1"}`}
                >
                  <div className={`flex max-w-[85%] md:max-w-[70%] items-end gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                    
                    {/* Avatar (only show on last message in sequence for others) */}
                    {!isMe && (
                      <div className={`shrink-0 w-7 h-7 rounded-full bg-gradient-to-tr from-white/10 to-white/5 border border-white/10 flex items-center justify-center overflow-hidden ${isLastInSequence ? "opacity-100" : "opacity-0 invisible"}`}>
                        {isAdmin ? (
                          <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[9px]">AD</div>
                        ) : (
                          <span className="text-[11px] font-bold text-white/80 uppercase">
                            {msg.senderName.charAt(0)}
                          </span>
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} min-w-0`}>
                      {isFirstInSequence && !isMe && (
                        <div className="flex items-baseline space-x-2 mb-1.5 px-1 ml-1">
                          <span className={`text-xs font-bold ${isAdmin ? "text-green-400" : "text-white/70"}`}>
                            {msg.senderName}
                          </span>
                        </div>
                      )}
                      
                      <div className={`px-3.5 py-2 shadow-sm group relative max-w-full ${borderRadiusClass} ${
                        isMe 
                          ? "bg-primary text-white" 
                          : "bg-[#1C1C21] text-white/90 border border-white/5"
                      }`}>
                        <p className="whitespace-pre-wrap text-[14px] leading-relaxed break-words">{msg.text}</p>
                        
                        {/* Timestamp & Read Receipt */}
                        <div className={`flex items-center gap-1.5 mt-1 select-none ${isMe ? "justify-end text-white/60" : "justify-start text-white/40"}`}>
                          <span className="text-[9px] font-medium tracking-wide">
                            {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && dmRoomId && (
                            msg.read ? <CheckCheck className="w-3 h-3 text-white/80" /> : <Check className="w-3 h-3 text-white/50" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <div className="p-3 md:p-5 bg-background/80 backdrop-blur-xl border-t border-white/5 shrink-0">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-end gap-2 bg-[#131316] p-1.5 rounded-2xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none text-white px-3 py-2.5 focus:outline-none placeholder:text-white/30 text-[14px] resize-none min-h-[40px] max-h-[120px] custom-scrollbar"
            rows={1}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="p-2.5 mb-0.5 mr-0.5 bg-primary text-white rounded-xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shrink-0 shadow-lg shadow-primary/20"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -ml-0.5 mt-0.5" />}
          </button>
        </form>
        <div className="text-center mt-3">
          <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest">End-to-End Encrypted</p>
        </div>
      </div>
    </div>
  );
}
