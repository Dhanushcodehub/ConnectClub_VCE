"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { 
  Trash2, 
  MailOpen, 
  Mail, 
  Search, 
  Copy, 
  Check, 
  Reply, 
  Sparkles, 
  CheckCheck, 
  Inbox, 
  Clock, 
  User, 
  ArrowLeft,
  X,
  Send,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ContactMessage {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  message: string;
  status: "unread" | "read";
  createdAt: any;
}

const AVATAR_GRADIENTS = [
  "from-purple-600 to-indigo-600 text-purple-100",
  "from-pink-600 to-rose-600 text-pink-100",
  "from-emerald-600 to-teal-600 text-emerald-100",
  "from-blue-600 to-cyan-600 text-cyan-100",
  "from-amber-600 to-orange-600 text-amber-100",
  "from-violet-600 to-fuchsia-600 text-violet-100",
];

function GmailIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.5 6.5V17.5C1.5 18.6 2.4 19.5 3.5 19.5H6.5V10.5L12 14.5L17.5 10.5V19.5H20.5C21.6 19.5 22.5 18.6 22.5 17.5V6.5C22.5 5.1 20.9 4.3 19.8 5.1L12 11L4.2 5.1C3.1 4.3 1.5 5.1 1.5 6.5Z" fill="#EA4335"/>
      <path d="M17.5 10.5L22.5 6.5V17.5C22.5 18.6 21.6 19.5 20.5 19.5H17.5V10.5Z" fill="#4285F4"/>
      <path d="M1.5 17.5V6.5L6.5 10.5V19.5H3.5C2.4 19.5 1.5 18.6 1.5 17.5Z" fill="#34A853"/>
      <path d="M17.5 4.5L12 8.7L6.5 4.5C5.4 3.7 4 4.5 4 5.9V6.5L12 12.5L20 6.5V5.9C20 4.5 18.6 3.7 17.5 4.5Z" fill="#FBBC05"/>
    </svg>
  );
}

function getAvatarStyle(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function parseDate(createdAt: any): Date | null {
  if (!createdAt) return null;
  if (typeof createdAt.toDate === "function") {
    return createdAt.toDate();
  }
  if (createdAt instanceof Date) {
    return createdAt;
  }
  if (typeof createdAt === "number" || typeof createdAt === "string") {
    const d = new Date(createdAt);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return "Just now";
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function formatFullDate(date: Date | null): string {
  if (!date) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "unread" | "read">("all");
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [deleteModalMsg, setDeleteModalMsg] = useState<ContactMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "contact_messages"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messagesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ContactMessage[];

        setMessages(messagesData);
        setLoading(false);

        // Auto-select first message on desktop if none selected
        if (messagesData.length > 0) {
          setSelectedId((prev) => {
            if (prev && messagesData.some((m) => m.id === prev)) {
              return prev;
            }
            // Only auto-select on wider screens initially
            if (typeof window !== "undefined" && window.innerWidth >= 768) {
              return messagesData[0].id;
            }
            return prev;
          });
        }
      },
      (error) => {
        console.error("Error fetching messages:", error);
        toast.error("Failed to load messages in realtime.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const selectedMessage = useMemo(() => {
    return messages.find((m) => m.id === selectedId) || null;
  }, [messages, selectedId]);

  const unreadCount = useMemo(() => {
    return messages.filter((m) => m.status === "unread").length;
  }, [messages]);

  const readCount = useMemo(() => {
    return messages.filter((m) => m.status === "read").length;
  }, [messages]);

  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      // Filter tab
      if (filterStatus === "unread" && msg.status !== "unread") return false;
      if (filterStatus === "read" && msg.status !== "read") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${msg.firstName || ""} ${msg.lastName || ""} ${msg.name || ""}`.toLowerCase();
        const email = (msg.email || "").toLowerCase();
        const message = (msg.message || "").toLowerCase();
        return fullName.includes(q) || email.includes(q) || message.includes(q);
      }

      return true;
    });
  }, [messages, filterStatus, searchQuery]);

  const handleSelectMessage = (msg: ContactMessage) => {
    setSelectedId(msg.id);
    if (msg.status === "unread") {
      // Automatically mark as read when inspected
      toggleStatus(msg.id, "unread", false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: "unread" | "read", showToast = true) => {
    const nextStatus = currentStatus === "unread" ? "read" : "unread";
    try {
      await updateDoc(doc(db, "contact_messages", id), {
        status: nextStatus,
      });
      if (showToast) {
        toast.success(nextStatus === "read" ? "Marked as read" : "Marked as unread");
      }
    } catch (error) {
      console.error("Error updating message status:", error);
      toast.error("Could not update message status.");
    }
  };

  const handleMarkAllRead = async () => {
    const unread = messages.filter((m) => m.status === "unread");
    if (unread.length === 0) return;

    setIsMarkingAll(true);
    try {
      const batch = writeBatch(db);
      unread.forEach((m) => {
        batch.update(doc(db, "contact_messages", m.id), { status: "read" });
      });
      await batch.commit();
      toast.success(`Marked all ${unread.length} inquiries as read`);
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all as read.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModalMsg) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "contact_messages", deleteModalMsg.id));
      toast.success("Inquiry deleted successfully");
      if (selectedId === deleteModalMsg.id) {
        const remaining = filteredMessages.filter((m) => m.id !== deleteModalMsg.id);
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      }
      setDeleteModalMsg(null);
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete inquiry.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    toast.success("Email copied to clipboard");
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessage(true);
    toast.success("Message text copied");
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const getSenderName = (msg: ContactMessage) => {
    if (msg.firstName || msg.lastName) {
      return `${msg.firstName || ""} ${msg.lastName || ""}`.trim();
    }
    return msg.name || "Community Member";
  };

  const getGmailComposeUrl = (msg: ContactMessage, templateBody?: string) => {
    const sender = getSenderName(msg);
    const subject = encodeURIComponent(`Re: Connect Club Inquiry - ${sender}`);
    const body = encodeURIComponent(
      templateBody ||
        `Hi ${msg.firstName || sender},\n\nThank you for reaching out to Connect Club at Vardhaman College of Engineering!\n\nRegarding your message:\n"${msg.message}"\n\nBest regards,\nConnect Club Team\nVardhaman College of Engineering`
    );
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(msg.email)}&su=${subject}&body=${body}`;
  };

  const getReplyMailto = (msg: ContactMessage, templateBody?: string) => {
    const sender = getSenderName(msg);
    const subject = encodeURIComponent(`Re: Connect Club Inquiry - ${sender}`);
    const body = encodeURIComponent(
      templateBody ||
        `Hi ${msg.firstName || sender},\n\nThank you for reaching out to Connect Club at Vardhaman College of Engineering!\n\nRegarding your message:\n"${msg.message}"\n\nBest regards,\nConnect Club Team\nVardhaman College of Engineering`
    );
    return `mailto:${msg.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="flex flex-col h-[calc(100svh-4rem)] md:h-screen overflow-hidden bg-transparent">
      {/* Top Header */}
      <header className="px-5 md:px-8 py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-[#08080b]/90 backdrop-blur-xl z-20">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black font-heading text-white tracking-tight">
              Contact Messages
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Inbox
            </span>
          </div>
          <p className="text-xs md:text-sm text-white/50 mt-0.5">
            Review and respond to inquiries submitted through the contact page
          </p>
        </div>

        {/* Header Metric Badges & Actions */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-white/70">
            <span className="font-semibold text-white mr-1">{messages.length}</span> Total
          </div>

          {unreadCount > 0 && (
            <div className="flex items-center bg-purple-500/15 border border-purple-500/30 rounded-full px-3 py-1 text-xs text-purple-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mr-1.5 animate-ping" />
              <span className="font-bold text-white mr-1">{unreadCount}</span> New
            </div>
          )}

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isMarkingAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 hover:bg-white/15 text-white/90 border border-white/10 transition-colors disabled:opacity-50"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Two-Pane Split View */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Pane: Message List / Inquiries Feed */}
        <aside
          className={cn(
            "w-full md:w-[380px] lg:w-[420px] shrink-0 border-r border-white/5 flex flex-col h-full bg-[#0a0a0d]/60 backdrop-blur-md overflow-hidden",
            // On mobile, hide list when message is selected
            selectedId ? "hidden md:flex" : "flex"
          )}
        >
          {/* Search & Filter Bar */}
          <div className="p-3.5 border-b border-white/5 space-y-3 shrink-0 bg-white/[0.01]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search sender, email, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/5 rounded-xl text-xs">
              <button
                onClick={() => setFilterStatus("all")}
                className={cn(
                  "flex-1 py-1.5 rounded-lg font-medium transition-all text-center",
                  filterStatus === "all"
                    ? "bg-primary text-white shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                All ({messages.length})
              </button>
              <button
                onClick={() => setFilterStatus("unread")}
                className={cn(
                  "flex-1 py-1.5 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1",
                  filterStatus === "unread"
                    ? "bg-primary text-white shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <span>Unread</span>
                {unreadCount > 0 && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px]",
                      filterStatus === "unread" ? "bg-white text-black font-bold" : "bg-purple-500/20 text-purple-300 font-semibold"
                    )}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilterStatus("read")}
                className={cn(
                  "flex-1 py-1.5 rounded-lg font-medium transition-all text-center",
                  filterStatus === "read"
                    ? "bg-primary text-white shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                Read ({readCount})
              </button>
            </div>
          </div>

          {/* List Feed Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03] p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-white/10" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-white/10 rounded w-1/2" />
                        <div className="h-2.5 bg-white/5 rounded w-3/4" />
                      </div>
                    </div>
                    <div className="h-2.5 bg-white/5 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-white/50">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-white/40">
                  <Inbox className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-white/70">No messages found</p>
                <p className="text-xs text-white/40 mt-1 max-w-[200px]">
                  {searchQuery ? "Try searching with different terms" : "Your inquiries inbox is clean!"}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-3 px-3 py-1 rounded-full text-xs bg-white/10 text-white hover:bg-white/15"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = selectedId === msg.id;
                const isUnread = msg.status === "unread";
                const senderName = getSenderName(msg);
                const dateObj = parseDate(msg.createdAt);
                const relTime = formatRelativeTime(dateObj);
                const avatarStyle = getAvatarStyle(senderName);

                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={cn(
                      "group relative p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border text-left",
                      isSelected
                        ? "bg-purple-600/[0.12] border-purple-500/40 shadow-[0_0_24px_rgba(168,85,247,0.12)]"
                        : isUnread
                        ? "bg-white/[0.04] border-white/10 hover:border-purple-500/30 hover:bg-white/[0.06]"
                        : "bg-white/[0.015] border-transparent hover:border-white/10 hover:bg-white/[0.03]"
                    )}
                  >
                    {/* Top Row: Avatar, Name, Relative Date */}
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-full bg-gradient-to-tr flex items-center justify-center font-bold text-xs shrink-0 shadow-inner",
                          avatarStyle
                        )}
                      >
                        {senderName.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={cn(
                              "text-xs truncate font-semibold",
                              isUnread ? "text-white" : "text-white/80"
                            )}
                          >
                            {senderName}
                          </span>
                          <span className="text-[10px] text-white/40 shrink-0 font-medium">
                            {relTime}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-white/40 truncate mt-0.5">
                          <span className="truncate">{msg.email}</span>
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 shadow-[0_0_6px_#a855f7]" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Message Preview Snippet */}
                    <p
                      className={cn(
                        "mt-2 text-xs line-clamp-2 leading-relaxed pl-12",
                        isUnread ? "text-white/85 font-medium" : "text-white/55"
                      )}
                    >
                      {msg.message}
                    </p>

                    {/* Hover Quick Actions */}
                    <div className="absolute right-3 bottom-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-[#0c0c0e]/90 px-1.5 py-0.5 rounded-lg border border-white/10 backdrop-blur-md">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStatus(msg.id, msg.status);
                        }}
                        className="p-1 text-white/50 hover:text-white transition-colors"
                        title={isUnread ? "Mark as read" : "Mark as unread"}
                      >
                        {isUnread ? <MailOpen className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModalMsg(msg);
                        }}
                        className="p-1 text-red-400/50 hover:text-red-400 transition-colors"
                        title="Delete inquiry"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Pane: Message Detail & Action Canvas */}
        <section
          className={cn(
            "flex-1 flex flex-col h-full overflow-y-auto bg-[#060608]/40",
            // On mobile, show only when message is selected
            !selectedId ? "hidden md:flex" : "flex"
          )}
        >
          {selectedMessage ? (
            <div className="flex-1 flex flex-col p-4 md:p-8 max-w-4xl w-full mx-auto space-y-6">
              {/* Header Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setSelectedId(null)}
                    className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  {/* Status Indicator Pill */}
                  <div
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5",
                      selectedMessage.status === "unread"
                        ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                        : "bg-white/5 text-white/60 border-white/10"
                    )}
                  >
                    {selectedMessage.status === "unread" ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                        Unread Inquiry
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        Read
                      </>
                    )}
                  </div>
                </div>

                {/* Toolbar Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStatus(selectedMessage.id, selectedMessage.status)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center gap-1.5 transition-all"
                  >
                    {selectedMessage.status === "unread" ? (
                      <>
                        <MailOpen className="w-3.5 h-3.5 text-primary" />
                        <span>Mark as Read</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5 text-white/50" />
                        <span>Mark as Unread</span>
                      </>
                    )}
                  </button>

                  <a
                    href={getGmailComposeUrl(selectedMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white flex items-center gap-2 transition-all shadow-md shadow-red-600/25"
                    title="Open compose window directly in Gmail"
                  >
                    <GmailIcon className="w-4 h-4 shrink-0" />
                    <span>Reply with Gmail</span>
                  </a>

                  <a
                    href={getReplyMailto(selectedMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                    title="Open in System Mail app (Outlook / Desktop client)"
                  >
                    <Mail className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => setDeleteModalMsg(selectedMessage)}
                    className="p-2 rounded-xl text-red-400/60 hover:text-red-400 bg-red-500/5 hover:bg-red-500/15 border border-red-500/20 transition-all"
                    title="Delete inquiry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sender Information Card */}
              <div className="p-5 md:p-6 rounded-3xl bg-[#0c0c0e] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-2xl bg-gradient-to-tr flex items-center justify-center font-black text-xl shrink-0 shadow-lg",
                      getAvatarStyle(getSenderName(selectedMessage))
                    )}
                  >
                    {getSenderName(selectedMessage).charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
                      {getSenderName(selectedMessage)}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <a
                        href={getGmailComposeUrl(selectedMessage)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs md:text-sm text-primary hover:underline flex items-center gap-1.5"
                        title="Compose email in Gmail"
                      >
                        {selectedMessage.email}
                        <ExternalLink className="w-3 h-3 text-white/40" />
                      </a>
                      <button
                        onClick={() => handleCopyEmail(selectedMessage.email)}
                        className="p-1 text-white/40 hover:text-white rounded transition-colors"
                        title="Copy email"
                      >
                        {copiedEmail ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-white/40 flex items-center gap-1.5 sm:text-right">
                  <Clock className="w-3.5 h-3.5 text-white/40 shrink-0" />
                  <span>{formatFullDate(parseDate(selectedMessage.createdAt))}</span>
                </div>
              </div>

              {/* Full Message Container */}
              <div className="p-6 md:p-8 rounded-3xl bg-[#0a0a0d] border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    <span>Inquiry Content</span>
                  </div>
                  <button
                    onClick={() => handleCopyMessage(selectedMessage.message)}
                    className="text-xs text-white/50 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    {copiedMessage ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Message</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-white/90 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedMessage.message}
                </div>
              </div>

              {/* Quick Reply & Response Helper */}
              <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-white">Quick Reply Assistant</span>
                  </div>
                  <span className="text-[11px] text-white/50 flex items-center gap-1.5">
                    <GmailIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Opens directly in Gmail</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <a
                    href={getGmailComposeUrl(
                      selectedMessage,
                      `Hi ${selectedMessage.firstName || getSenderName(selectedMessage)},\n\nThank you for reaching out to Connect Club! We have received your inquiry and our team is reviewing it.\n\nWe will get back to you with more details shortly.\n\nBest regards,\nConnect Club Team\nVardhaman College of Engineering`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-primary/30 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-white group-hover:text-primary transition-colors">
                        General Acknowledgment
                      </div>
                      <ExternalLink className="w-3 h-3 text-white/30 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-[11px] text-white/45 mt-1 line-clamp-2">
                      Confirm inquiry receipt and promise a prompt follow-up.
                    </div>
                  </a>

                  <a
                    href={getGmailComposeUrl(
                      selectedMessage,
                      `Hi ${selectedMessage.firstName || getSenderName(selectedMessage)},\n\nThank you for inquiring about Connect Club events! You can view our upcoming schedule, workshops, and registrations on our portal at https://connectclub-vce.vercel.app/events.\n\nFeel free to ask if you have questions about a specific event.\n\nWarm regards,\nConnect Club Team`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-primary/30 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-white group-hover:text-primary transition-colors">
                        Events & Workshops
                      </div>
                      <ExternalLink className="w-3 h-3 text-white/30 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-[11px] text-white/45 mt-1 line-clamp-2">
                      Provide event portal links and details.
                    </div>
                  </a>

                  <a
                    href={getGmailComposeUrl(
                      selectedMessage,
                      `Hi ${selectedMessage.firstName || getSenderName(selectedMessage)},\n\nThank you for your interest in joining Connect Club! We welcome passionate innovators, designers, and developers at Vardhaman.\n\nKeep an eye on our portal announcements and Instagram (@connectclub_vce) for upcoming recruitment drives.\n\nBest regards,\nConnect Club Team`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-primary/30 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-white group-hover:text-primary transition-colors">
                        Club Membership
                      </div>
                      <ExternalLink className="w-3 h-3 text-white/30 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-[11px] text-white/45 mt-1 line-clamp-2">
                      Share membership recruitment instructions.
                    </div>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State: No Message Selected */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white/40">
              <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-4 shadow-xl text-primary">
                <MailOpen className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">No Message Selected</h3>
              <p className="text-xs text-white/50 max-w-sm mt-1.5 leading-relaxed">
                Choose an inquiry from the left pane to view full sender details, read the message, and send an email reply.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalMsg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0e0e12] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Delete Contact Message?</h3>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete the inquiry from{" "}
                  <span className="font-semibold text-white">{getSenderName(deleteModalMsg)}</span> (
                  {deleteModalMsg.email})? This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalMsg(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isDeleting ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
