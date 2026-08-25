"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  ChatMessage, 
  subscribeToMessages, 
  sendChatMessage, 
  subscribeToDirectMessages, 
  sendDirectMessage, 
  markMessagesAsRead,
  setTypingStatus,
  subscribeToTypingStatus,
  addReaction,
  removeReaction
} from "@/lib/firebase/chat";
import { useAuth } from "@/lib/contexts/AuthContext";
import { ConnectMember } from "@/lib/firebase/members";
import { Send, Loader2, User, ArrowLeft, Check, CheckCheck, X, Reply, ChevronDown, Smile, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AVATAR_GRADIENTS = [
  ['#FF6B6B', '#EE5A24'], ['#A3CB38', '#009432'], ['#12CBC4', '#1289A7'],
  ['#FDA7DF', '#D980FA'], ['#F79F1F', '#EE5A24'], ['#6C5CE7', '#A29BFE'],
  ['#00CEFF', '#0055FF'], ['#FF9FF3', '#F368E0'],
];

const EMOJI_LIST = ["❤️", "😂", "👍", "🔥", "😮", "😢"];
const ALL_EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "☺️", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗",
  "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕",
  "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰"
];

function getGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

const WALLPAPER = `data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83-1.66 1.66-.83-.83.83-.83zm-5.812 0l.83.83-1.66 1.66-.83-.83.83-.83zm-5.813 0l.83.83-1.66 1.66-.83-.83.83-.83z' fill='%23ffffff' fill-opacity='0.02' fill-rule='evenodd'/%3E%3C/svg%3E`;

function formatText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#53BDEB] underline hover:text-[#7DD3FC] break-all">
          {part}
        </a>
      );
    }
    return <span key={i} className="break-words whitespace-pre-wrap">{part}</span>;
  });
}

function formatDateSeparator(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function GlobalChat({ memberProfile, dmRoomId, dmRoomName, onBack }: { 
  memberProfile?: ConnectMember | null,
  dmRoomId?: string,
  dmRoomName?: string,
  onBack?: () => void
}) {
  const { user, role } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; senderName: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const [typingUsers, setTypingUsers] = useState<{email: string; name: string}[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const isDM = !!dmRoomId;
  const collectionName = isDM ? "direct_messages" : "messages";

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    let unsubscribeMessages: () => void;
    if (isDM) {
      unsubscribeMessages = subscribeToDirectMessages(dmRoomId, (msgs) => {
        setMessages(msgs);
        setIsLoading(false);
        markMessagesAsRead(dmRoomId, user.email || "");
        
        // Track unread if not at bottom
        if (showScrollBottom) {
           // Basic unread approximation
           setUnreadCount(prev => prev + 1);
        } else {
           scrollToBottom();
        }
      });
    } else {
      unsubscribeMessages = subscribeToMessages((msgs) => {
        setMessages(msgs);
        setIsLoading(false);
        if (showScrollBottom) {
           setUnreadCount(prev => prev + 1);
        } else {
           scrollToBottom();
        }
      });
    }

    const unsubscribeTyping = subscribeToTypingStatus(dmRoomId || "global", user.email || "", (users) => {
      setTypingUsers(users);
    });

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [dmRoomId, user, isDM]);

  const scrollToBottom = useCallback((smooth = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
      setUnreadCount(0);
    }
  }, []);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
    
    setShowScrollBottom(!isNearBottom);
    if (isNearBottom) {
      setUnreadCount(0);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Auto resize
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }

    // Typing indicator logic
    if (user && user.email) {
      const room = dmRoomId || "global";
      setTypingStatus(room, user.email, memberProfile?.name || user.displayName || "User", true);
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(room, user.email!, memberProfile?.name || user.displayName || "User", false);
      }, 2000);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !user || isSending) return;

    setIsSending(true);
    const msgData = {
      text: inputValue.trim(),
      senderEmail: user.email || "",
      senderName: memberProfile?.name || user.displayName || "Anonymous User",
      senderRole: (role as "admin" | "member") || "member",
      ...(replyingTo && { replyTo: replyingTo })
    };

    setInputValue("");
    setReplyingTo(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    
    if (user.email) {
       setTypingStatus(dmRoomId || "global", user.email, msgData.senderName, false);
       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    try {
      if (isDM) {
        await sendDirectMessage({ ...msgData, roomId: dmRoomId! });
      } else {
        await sendChatMessage(msgData);
      }
      scrollToBottom(true);
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const onEmojiClick = (emoji: string) => {
    setInputValue(prev => prev + emoji);
  };

  const handleReaction = async (messageId: string, emoji: string, hasReacted: boolean) => {
    if (!user || !user.email) return;
    setReactionMessageId(null);
    try {
      if (hasReacted) {
        await removeReaction(messageId, collectionName, emoji, user.email);
      } else {
        await addReaction(messageId, collectionName, emoji, user.email);
      }
    } catch (err) {
      console.error("Reaction error:", err);
    }
  };

  if (!user) {
    return <div className="flex h-full items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  let lastDateStr = "";

  return (
    <div className="flex flex-col h-full bg-[--background] relative overflow-hidden text-white border-l border-white/5">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-[#111116] border-b border-white/10 z-10 shrink-0">
        {onBack && (
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
        )}
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-base font-semibold">{dmRoomName || "Global Chat"}</h2>
          {isDM && <span className="text-xs text-gray-400">Direct Message</span>}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-2 relative"
        style={{ backgroundImage: `url("${WALLPAPER}")` }}
      >
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderEmail === user?.email;
            const showTail = index === messages.length - 1 || messages[index + 1].senderEmail !== msg.senderEmail;
            const dateStr = formatDateSeparator(msg.timestamp);
            const showDate = dateStr !== lastDateStr;
            if (showDate) lastDateStr = dateStr;
            
            const [gradStart, gradEnd] = getGradient(msg.senderName);

            return (
              <div key={msg.id || index} className="flex flex-col">
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="bg-[#1a1a2e] text-white/50 text-[11px] px-4 py-1.5 rounded-full shadow-sm">
                      {dateStr}
                    </span>
                  </div>
                )}
                
                <div className={`flex items-end gap-2 group relative mb-${showTail ? '3' : '1'} ${isMe ? 'justify-end' : 'justify-start'}`}>
                  
                  {!isMe && showTail ? (
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${gradStart}, ${gradEnd})` }}
                    >
                      {msg.senderName.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    !isMe && <div className="w-7 h-7 shrink-0" />
                  )}
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onDoubleClick={() => setReactionMessageId(msg.id ?? null)}
                    className={`relative max-w-[85%] md:max-w-[75%] px-3 pt-2 pb-2 rounded-2xl text-[15px] shadow-sm
                      ${isMe 
                        ? `bg-primary text-white ${showTail ? 'rounded-tr-none before:content-[""] before:absolute before:right-[-8px] before:top-0 before:border-t-0 before:border-b-[12px] before:border-l-[8px] before:border-transparent before:border-l-primary' : ''}` 
                        : `bg-[#1C1C21] text-gray-100 ${showTail ? 'rounded-tl-none before:content-[""] before:absolute before:left-[-8px] before:top-0 before:border-t-0 before:border-b-[12px] before:border-r-[8px] before:border-transparent before:border-r-[#1C1C21]' : ''}`
                      }
                    `}
                  >
                    {!isMe && (
                      <div className="text-[12px] font-semibold mb-1" style={{ color: gradStart }}>
                        {msg.senderName}
                      </div>
                    )}

                    {msg.replyTo && (
                      <div className="bg-black/20 rounded pl-3 py-1 mb-2 border-l-4 border-[#53BDEB] text-sm">
                        <p className="text-[#53BDEB] font-medium text-[12px]">{msg.replyTo.senderName}</p>
                        <p className="text-gray-300 truncate">{msg.replyTo.text}</p>
                      </div>
                    )}

                    <div className="leading-snug break-words relative">
                      {formatText(msg.text)}
                      {/* Spacer to force text to wrap early, making room for absolute timestamp */}
                      <span className="inline-block w-[65px]" aria-hidden="true" />
                    </div>
                    
                    <div className="absolute right-3 bottom-1.5 flex items-center gap-1">
                      <span className="text-[10px] text-white/60">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && isDM && (
                        msg.read ? <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" /> : <Check className="w-3.5 h-3.5 text-white/60" />
                      )}
                    </div>

                    {/* Reactions Display */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="absolute -bottom-4 right-2 flex gap-1 bg-[#232329] p-1 rounded-full border border-white/5 shadow-md">
                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                          <div key={emoji} className="flex items-center gap-1 px-1.5 text-xs bg-white/5 rounded-full cursor-pointer hover:bg-white/10"
                               onClick={() => handleReaction(msg.id || "", emoji, users.includes(user.email || ''))}>
                            <span>{emoji}</span>
                            <span className="text-white/70 font-medium">{users.length}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Hover Reply Button */}
                    <div className={`absolute top-2 ${isMe ? '-left-10' : '-right-10'} opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1.5 bg-[#232329] rounded-full border border-white/10 hover:bg-white/10`}
                         onClick={() => setReplyingTo({ id: msg.id || "", text: msg.text, senderName: msg.senderName })}>
                      <Reply className="w-4 h-4 text-gray-400" />
                    </div>

                    {/* Reaction Picker Popover */}
                    <AnimatePresence>
                      {reactionMessageId === msg.id && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className={`absolute z-20 -top-12 ${isMe ? 'right-0' : 'left-0'} flex items-center gap-2 bg-[#2A2A35] p-2 rounded-full shadow-lg border border-white/10`}
                        >
                          {EMOJI_LIST.map(emoji => (
                            <button key={emoji} onClick={() => handleReaction(msg.id || "", emoji, (msg.reactions?.[emoji] || []).includes(user.email || ''))} className="text-xl hover:scale-125 transition-transform">
                              {emoji}
                            </button>
                          ))}
                          <div className="w-px h-6 bg-white/10 mx-1"></div>
                          <button onClick={() => setReactionMessageId(null)} className="p-1 rounded-full hover:bg-white/10">
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </motion.div>
                </div>
              </div>
            );
          })
        )}

        {typingUsers.length > 0 && (
          <div className="flex items-end gap-2 mb-2">
             <div className="w-7 h-7" />
             <div className="bg-[#1C1C21] px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-gray-400 flex flex-col items-start shadow-sm">
                <span className="text-[11px] mb-1 font-medium">{typingUsers.map(u => u.name).join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing</span>
                <div className="flex gap-1">
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* FAB Scroll to bottom */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-24 right-4 z-20 w-10 h-10 bg-[#2A2A35] rounded-full flex items-center justify-center shadow-lg border border-white/10 hover:bg-[#353542] transition-colors"
          >
            <ChevronDown className="w-5 h-5 text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-[--background]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="bg-[#111116] border-t border-white/10 flex flex-col z-10">
        
        {/* Reply Preview */}
        {replyingTo && (
          <div className="flex items-center justify-between px-4 py-2 bg-[#1C1C21] border-l-4 border-primary mx-4 mt-2 rounded-tr rounded-br shadow-inner">
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs text-primary font-medium">Replying to {replyingTo.senderName}</span>
              <span className="text-sm text-gray-300 truncate">{replyingTo.text}</span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white/10 rounded-full">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 p-3">
          
          <div className="relative">
             <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-3 text-gray-400 hover:text-white transition-colors">
               <Smile className="w-6 h-6" />
             </button>
             
             {showEmojiPicker && (
               <div className="absolute bottom-14 left-0 bg-[#232329] p-3 rounded-lg border border-white/10 shadow-xl w-64 grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
                 {ALL_EMOJIS.map(em => (
                   <button key={em} type="button" onClick={() => onEmojiClick(em)} className="hover:scale-125 transition-transform">
                     {em}
                   </button>
                 ))}
               </div>
             )}
          </div>

          <div className="flex-1 bg-[#1C1C21] rounded-2xl flex items-center px-4 py-2 min-h-[44px]">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message..."
              className="w-full bg-transparent text-[15px] focus:outline-none resize-none max-h-32 text-gray-100 placeholder:text-gray-500 py-1"
              rows={1}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isSending}
            className={`p-3 rounded-full flex items-center justify-center transition-all duration-300 ${inputValue.trim() ? 'bg-primary text-white shadow-lg' : 'bg-transparent text-gray-400'}`}
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : inputValue.trim() ? (
              <motion.div initial={{ rotate: -90, scale: 0.5 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 10 }}>
                 <Send className="w-5 h-5 ml-1" />
              </motion.div>
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
