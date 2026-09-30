"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  Calendar, 
  Award, 
  FolderGit2, 
  CheckCheck, 
  Trash2, 
  MailOpen, 
  Mail, 
  ExternalLink, 
  Ticket, 
  Copy, 
  Check, 
  Search, 
  X, 
  Rocket, 
  Info, 
  ArrowRight,
  BellOff
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  userId: string;
  type: "certificate" | "event" | "project" | "system" | "comment" | "like";
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  imageUrl?: string;
  createdAt: any;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Realtime Firestore subscription for notifications
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as NotificationItem[];

        setNotifications(notifList);
        setLoading(false);
      },
      (error) => {
        console.error("Error subscribing to notifications:", error);
        toast.error("Failed to load notifications.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const stats = useMemo(() => {
    return {
      all: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      event: notifications.filter((n) => n.type === "event").length,
      certificate: notifications.filter((n) => n.type === "certificate").length,
      system: notifications.filter((n) => n.type === "system").length,
      project: notifications.filter((n) => n.type === "project").length,
    };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Tab filter
      if (selectedFilter === "unread" && n.read) return false;
      if (selectedFilter === "event" && n.type !== "event") return false;
      if (selectedFilter === "certificate" && n.type !== "certificate") return false;
      if (selectedFilter === "system" && n.type !== "system") return false;
      if (selectedFilter === "project" && n.type !== "project") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (n.title || "").toLowerCase();
        const message = (n.message || "").toLowerCase();
        return title.includes(q) || message.includes(q);
      }

      return true;
    });
  }, [notifications, selectedFilter, searchQuery]);

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0 || !user?.uid) return;

    setIsMarkingAll(true);
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, "notifications", n.id), { read: true });
      });
      await batch.commit();
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all notifications as read.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleToggleRead = async (notifId: string, currentRead: boolean) => {
    try {
      await updateDoc(doc(db, "notifications", notifId), {
        read: !currentRead,
      });
      toast.success(!currentRead ? "Marked as read" : "Marked as unread");
    } catch (error) {
      console.error("Error toggling read status:", error);
      toast.error("Failed to update status.");
    }
  };

  const handleDeleteNotification = async (notifId: string) => {
    try {
      await deleteDoc(doc(db, "notifications", notifId));
      toast.success("Notification removed");
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification.");
    }
  };

  const handleCopyTicket = (ticketId: string) => {
    navigator.clipboard.writeText(ticketId);
    setCopiedTicketId(ticketId);
    toast.success(`Copied Ticket ID: ${ticketId}`);
    setTimeout(() => setCopiedTicketId(null), 2000);
  };

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return "Just now";
    const date = timestamp?.toMillis
      ? new Date(timestamp.toMillis())
      : timestamp instanceof Date
      ? timestamp
      : new Date(timestamp);

    if (isNaN(date.getTime())) return "Recently";

    const now = new Date();
    const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  };

  const extractTicketId = (text: string): string | null => {
    const match = text.match(/\b(TX-[A-Z0-9]+)\b/i);
    return match ? match[1].toUpperCase() : null;
  };

  const getTypeTheme = (type: string) => {
    switch (type) {
      case "event":
        return {
          icon: <Rocket className="w-5 h-5 text-purple-300" />,
          bg: "bg-purple-950",
          border: "border-purple-700",
          badge: "bg-purple-950 text-purple-200 border-purple-600",
          label: "Event Update",
        };
      case "certificate":
        return {
          icon: <Award className="w-5 h-5 text-emerald-300" />,
          bg: "bg-emerald-950",
          border: "border-emerald-700",
          badge: "bg-emerald-950 text-emerald-200 border-emerald-600",
          label: "Certificate",
        };
      case "project":
        return {
          icon: <FolderGit2 className="w-5 h-5 text-sky-300" />,
          bg: "bg-sky-950",
          border: "border-sky-700",
          badge: "bg-sky-950 text-sky-200 border-sky-600",
          label: "Project",
        };
      case "system":
      default:
        return {
          icon: <Info className="w-5 h-5 text-amber-300" />,
          bg: "bg-amber-950",
          border: "border-amber-700",
          badge: "bg-amber-950 text-amber-200 border-amber-600",
          label: "System Alert",
        };
    }
  };

  return (
    <div className="p-4 sm:p-8 md:p-12 max-w-5xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-950 border border-purple-700 text-purple-300 flex items-center justify-center shrink-0 shadow-lg shadow-purple-950/50">
            <Bell className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-white shadow-md">
                  {unreadCount} New
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 mt-0.5">
              Stay updated with your event registrations, credentials, and campus announcements
            </p>
          </div>
        </motion.div>

        {unreadCount > 0 && (
          <motion.button
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-semibold text-zinc-100 hover:text-white transition-all self-start sm:self-auto shadow-sm disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4 text-purple-400" />
            <span>Mark all as read</span>
          </motion.button>
        )}
      </div>

      {/* Filter Tabs & Search Control Bar */}
      <div className="p-3.5 rounded-2xl bg-[#0F0F14] border border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: "all", label: "All", count: stats.all },
            { id: "unread", label: "Unread", count: stats.unread },
            { id: "event", label: "Events", count: stats.event },
            { id: "certificate", label: "Certificates", count: stats.certificate },
            { id: "system", label: "Announcements", count: stats.system },
            { id: "project", label: "Projects", count: stats.project },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap border",
                selectedFilter === tab.id
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 border-zinc-800"
              )}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                    selectedFilter === tab.id
                      ? "bg-white text-zinc-900"
                      : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search notifications or tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Notifications Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 space-y-4 rounded-3xl bg-[#0F0F14] border border-zinc-800">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 animate-pulse">
                <div className="w-12 h-12 bg-zinc-800 rounded-2xl shrink-0" />
                <div className="space-y-2 flex-1 pt-1">
                  <div className="h-4 bg-zinc-800 rounded w-1/4" />
                  <div className="h-3 bg-zinc-800/80 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredNotifications.map((notif) => {
                const theme = getTypeTheme(notif.type);
                const ticketId = extractTicketId(notif.message);
                const isUnread = !notif.read;

                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "p-5 rounded-3xl transition-all duration-200 border relative overflow-hidden group shadow-md",
                      isUnread
                        ? "bg-[#14121E] border-purple-600 hover:border-purple-500 shadow-md"
                        : "bg-[#0F0F14] border-zinc-800 hover:border-zinc-700 hover:bg-[#141419]"
                    )}
                  >
                    {/* Unread Left Indicator Strip */}
                    {isUnread && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-500" />
                    )}

                    <div className="flex items-start gap-4">
                      {/* Category Icon */}
                      <div
                        className={cn(
                          "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-md mt-0.5",
                          theme.bg,
                          theme.border
                        )}
                      >
                        {theme.icon}
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 min-w-0">
                        {/* Header Row: Category Badge, Title, Timestamp */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border",
                                theme.badge
                              )}
                            >
                              {theme.label}
                            </span>
                            <h3 className="text-white font-bold text-sm sm:text-base tracking-tight truncate">
                              {notif.title}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className="text-zinc-300 text-xs font-semibold whitespace-nowrap bg-zinc-900 border border-zinc-700 px-2.5 py-0.5 rounded-md">
                              {getTimeAgo(notif.createdAt)}
                            </span>

                            {/* Quick Action Buttons on Card */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleToggleRead(notif.id, notif.read)}
                                className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-colors"
                                title={isUnread ? "Mark as read" : "Mark as unread"}
                              >
                                {isUnread ? (
                                  <MailOpen className="w-4 h-4 text-purple-300" />
                                ) : (
                                  <Mail className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteNotification(notif.id)}
                                className="p-1.5 rounded-lg text-red-400 hover:text-red-200 hover:bg-red-950 border border-transparent hover:border-red-800 transition-colors"
                                title="Dismiss notification"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Message Description */}
                        <p className="text-zinc-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-normal">
                          {notif.message}
                        </p>

                        {/* Smart Ticket ID Badge with 1-click copy & view ticket */}
                        {ticketId && (
                          <div className="mt-3.5 inline-flex flex-wrap items-center gap-2.5 p-2 rounded-2xl bg-zinc-900 border border-zinc-800">
                            <div className="flex items-center gap-1.5 text-xs text-purple-200 font-mono font-bold bg-purple-950 border border-purple-700 px-3 py-1 rounded-xl shadow-inner">
                              <Ticket className="w-3.5 h-3.5 text-purple-300" />
                              <span>{ticketId}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyTicket(ticketId)}
                              className="px-3 py-1 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 flex items-center gap-1.5 transition-colors"
                            >
                              {copiedTicketId === ticketId ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-300">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>Copy Ticket ID</span>
                                </>
                              )}
                            </button>

                            <Link
                              href="/u/tickets"
                              className="px-3 py-1 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-white flex items-center gap-1 transition-colors shadow-sm"
                            >
                              <span>View My Tickets</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        )}

                        {/* Banner Image Preview */}
                        {notif.imageUrl && (
                          <div className="mt-3.5 rounded-2xl overflow-hidden border border-zinc-800 bg-black relative aspect-[16/9] max-w-xl shadow-lg">
                            <img
                              src={notif.imageUrl}
                              alt={notif.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Action URL Button */}
                        {notif.actionUrl && (
                          <div className="mt-3.5 flex items-center gap-3">
                            <a
                              href={notif.actionUrl}
                              target={notif.actionUrl.startsWith("http") ? "_blank" : "_self"}
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shadow-md group-hover:scale-105"
                            >
                              <span>View Details</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          /* Empty State */
          <div className="p-16 rounded-3xl bg-[#0F0F14] border border-zinc-800 flex flex-col items-center justify-center text-center space-y-3 shadow-md">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-400">
              <BellOff className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">All caught up!</h3>
            <p className="text-xs text-zinc-300 max-w-sm leading-relaxed">
              {searchQuery || selectedFilter !== "all"
                ? "No notifications match your current search or filter."
                : "You don't have any notifications right now. When you register for events or receive certificates, they will appear here in real-time."}
            </p>
            {searchQuery || selectedFilter !== "all" ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedFilter("all");
                }}
                className="mt-2 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white transition-colors"
              >
                Clear all filters
              </button>
            ) : (
              <div className="pt-2 flex items-center gap-2.5">
                <Link
                  href="/events"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white transition-all shadow-md"
                >
                  Explore Events
                </Link>
                <Link
                  href="/projects"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition-colors"
                >
                  Browse Projects
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
