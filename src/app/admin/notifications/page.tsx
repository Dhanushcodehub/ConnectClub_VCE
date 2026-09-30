"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  Send, 
  User, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon, 
  Sparkles, 
  Smartphone, 
  Eye, 
  ExternalLink, 
  Calendar, 
  Award, 
  Rocket, 
  Info, 
  Check, 
  RefreshCw, 
  History, 
  ArrowRight, 
  X,
  Users,
  Copy,
  Radio
} from "lucide-react";
import { getAllUsers, createNotification, ConnectUser } from "@/lib/firebase/users";
import { collection, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import ImageUploader from "@/components/ImageUploader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SentBroadcast {
  id: string;
  title: string;
  message: string;
  type: "system" | "event" | "project" | "certificate";
  actionUrl?: string;
  imageUrl?: string;
  createdAt: any;
  userId: string;
}

const NOTIFICATION_TYPES = [
  {
    id: "system" as const,
    label: "System Alert",
    icon: Info,
    color: "amber",
    border: "border-amber-700",
    bg: "bg-amber-950",
    text: "text-amber-300",
    description: "Urgent announcements, maintenance, or club-wide notices",
  },
  {
    id: "event" as const,
    label: "Event Update",
    icon: Rocket,
    color: "purple",
    border: "border-purple-700",
    bg: "bg-purple-950",
    text: "text-purple-300",
    description: "New workshops, hackathons, speaker sessions, and RSVPs",
  },
  {
    id: "project" as const,
    label: "Project Showcase",
    icon: Sparkles,
    color: "blue",
    border: "border-sky-700",
    bg: "bg-sky-950",
    text: "text-sky-300",
    description: "Community project submissions, reviews, and showcase approvals",
  },
  {
    id: "certificate" as const,
    label: "Certificate Issued",
    icon: Award,
    color: "emerald",
    border: "border-emerald-700",
    bg: "bg-emerald-950",
    text: "text-emerald-300",
    description: "Participation certificates, event credentials, and awards",
  },
];

const PRESET_TEMPLATES = [
  {
    tag: "Event",
    title: "🚀 InspireX Season 2 Registrations Open!",
    message: "Registrations are officially open for InspireX Season 2. Reserve your spot now before slots fill up!",
    type: "event" as const,
    actionUrl: "https://connectclub-vce.vercel.app/events",
  },
  {
    tag: "Certificate",
    title: "🏆 Your Event Certificate is Ready!",
    message: "Thank you for participating! Your official verification certificate has been issued and is available for download.",
    type: "certificate" as const,
    actionUrl: "https://connectclub-vce.vercel.app/u/certificates",
  },
  {
    tag: "Alert",
    title: "📢 Important Notice: Upcoming Campus Workshop",
    message: "The upcoming session will begin promptly at 2:00 PM in the ECE Seminar Hall. Please bring your student ID card.",
    type: "system" as const,
    actionUrl: "https://connectclub-vce.vercel.app/events",
  },
  {
    tag: "Project",
    title: "💡 New Project Showcase Approved",
    message: "Check out the newest project built by Connect Club members! Leave a like and share your feedback.",
    type: "project" as const,
    actionUrl: "https://connectclub-vce.vercel.app/projects",
  },
];

export default function AdminNotificationsPage() {
  const [users, setUsers] = useState<ConnectUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentHistory, setSentHistory] = useState<SentBroadcast[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Form state
  const [targetUser, setTargetUser] = useState("all");
  const [type, setType] = useState<"system" | "event" | "project" | "certificate">("system");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const allUsers = await getAllUsers();
        setUsers(allUsers);
      } catch (error) {
        console.error("Failed to load users", error);
        toast.error("Failed to load user audience.");
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();

    // Listen to recent notifications for history
    const q = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc"),
      limit(25)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const raw = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SentBroadcast[];

        // Group/deduplicate broadcasts by title to show distinct broadcasts
        const seen = new Set<string>();
        const uniqueBroadcasts: SentBroadcast[] = [];
        for (const item of raw) {
          const key = `${item.title}_${item.message.slice(0, 30)}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueBroadcasts.push(item);
          }
        }

        setSentHistory(uniqueBroadcasts);
        setHistoryLoading(false);
      },
      (err) => {
        console.error("Error fetching notification history:", err);
        setHistoryLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.rollNo || "").toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const handleApplyTemplate = (tpl: typeof PRESET_TEMPLATES[0]) => {
    setTitle(tpl.title);
    setMessage(tpl.message);
    setType(tpl.type);
    setActionUrl(tpl.actionUrl);
    toast.success(`Loaded template: "${tpl.tag}"`);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Please enter both a title and message.");
      return;
    }

    setSending(true);

    try {
      const payload: any = {
        type,
        title: title.trim(),
        message: message.trim(),
        read: false,
        createdAt: serverTimestamp(),
      };
      if (actionUrl.trim()) {
        payload.actionUrl = actionUrl.trim();
      }
      if (imageUrl.trim()) {
        payload.imageUrl = imageUrl.trim();
      }

      if (targetUser === "all") {
        if (users.length === 0) {
          throw new Error("No registered users found to broadcast to.");
        }
        // Write in fixed-size chunks instead of Promise.all over every user:
        // a mid-flight failure no longer abandons the rest of the broadcast,
        // and we can report exactly how many succeeded.
        const CHUNK_SIZE = 300;
        let succeeded = 0;
        let failed = 0;
        for (let i = 0; i < users.length; i += CHUNK_SIZE) {
          const chunk = users.slice(i, i + CHUNK_SIZE);
          const results = await Promise.allSettled(
            chunk.map((u) =>
              createNotification({
                userId: u.uid,
                ...payload,
              })
            )
          );
          for (const r of results) {
            if (r.status === "fulfilled") succeeded++;
            else failed++;
          }
        }
        if (failed > 0) {
          toast.error(
            `Broadcast partially delivered: ${succeeded} sent, ${failed} failed. Retry to reach the remaining users.`
          );
        } else {
          toast.success(`Broadcast sent successfully to all ${succeeded} registered students!`);
        }
      } else {
        const specific = users.find((u) => u.uid === targetUser);
        await createNotification({
          userId: targetUser,
          ...payload,
        });
        toast.success(`Notification delivered to ${specific?.name || specific?.email || "student"}!`);
      }

      // Reset form fields
      setTitle("");
      setMessage("");
      setActionUrl("");
      setImageUrl("");
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast.error(error?.message || "Failed to send notification. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const selectedTypeInfo = useMemo(() => {
    return NOTIFICATION_TYPES.find((t) => t.id === type) || NOTIFICATION_TYPES[0];
  }, [type]);

  return (
    <div className="flex flex-col min-h-full pb-16 bg-transparent">
      {/* Header */}
      <header className="px-5 md:px-8 py-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-[#0E0E12] sticky top-0 z-20 shadow-md">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black font-heading text-white tracking-tight">
              Push Notifications & Broadcasts
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-950 text-purple-200 border border-purple-700 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Delivery
            </span>
          </div>
          <p className="text-xs md:text-sm text-zinc-300 mt-0.5">
            Deliver instant announcements, event updates, and alerts to student accounts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-full px-4 py-1.5 text-xs text-zinc-200 shadow-sm">
            <Users className="w-3.5 h-3.5 mr-2 text-primary" />
            <span className="font-bold text-white mr-1.5">{users.length}</span> Students Reachable
          </div>
        </div>
      </header>

      {/* Main 2-Column Command Center Workspace */}
      <div className="p-4 md:p-8 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Composer Studio (7 cols on lg, 8 cols on xl) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Quick Preset Templates Bar */}
          <div className="p-4 rounded-3xl bg-[#111116] border border-zinc-800 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>1-Click Presets & Quick Templates</span>
              </div>
              <span className="text-[11px] font-semibold text-zinc-400">Click to auto-fill</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PRESET_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-primary transition-all text-left group shadow-sm"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300 group-hover:text-white">
                    {tpl.tag}
                  </div>
                  <div className="text-xs font-bold text-zinc-100 truncate mt-0.5">
                    {tpl.title.replace(/^[^a-zA-Z0-9]+/, "")}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Composer Form */}
          <form
            onSubmit={handleSend}
            className="rounded-3xl bg-[#111116] border border-zinc-800 p-6 md:p-8 shadow-xl space-y-6"
          >
            {/* Step 1: Target Audience */}
            <div className="space-y-3 pb-5 border-b border-zinc-800">
              <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>1. Select Target Audience</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetUser("all")}
                  className={cn(
                    "p-4 rounded-2xl border transition-all text-left flex items-start gap-3",
                    targetUser === "all"
                      ? "bg-purple-950 border-purple-600 shadow-md text-white"
                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0",
                      targetUser === "all" ? "border-primary bg-primary" : "border-zinc-600"
                    )}
                  >
                    {targetUser === "all" && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Broadcast to All Students</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-purple-200 font-mono font-bold border border-zinc-700">
                        {users.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 mt-1">
                      Sends in-app alert to every registered student dashboard
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (targetUser === "all" && users.length > 0) {
                      setTargetUser(users[0].uid);
                    }
                  }}
                  className={cn(
                    "p-4 rounded-2xl border transition-all text-left flex items-start gap-3",
                    targetUser !== "all"
                      ? "bg-purple-950 border-purple-600 shadow-md text-white"
                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0",
                      targetUser !== "all" ? "border-primary bg-primary" : "border-zinc-600"
                    )}
                  >
                    {targetUser !== "all" && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Specific Student / Member</div>
                    <p className="text-[11px] text-zinc-300 mt-1">
                      Target an individual student by name or roll number
                    </p>
                  </div>
                </button>
              </div>

              {/* Specific user selector dropdown if specific target is chosen */}
              {targetUser !== "all" && (
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-700 space-y-3 mt-3">
                  <div className="text-xs font-bold text-zinc-200">Search and Select Student:</div>
                  <input
                    type="text"
                    placeholder="Filter student list by name or roll number..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#16161D] border border-zinc-700 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary"
                  />
                  <select
                    value={targetUser}
                    onChange={(e) => setTargetUser(e.target.value)}
                    className="w-full bg-[#16161D] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                  >
                    {filteredUsers.map((u) => (
                      <option key={u.uid} value={u.uid} className="bg-[#16161D] text-white">
                        {u.name || "Anonymous"} {u.rollNo ? `(${u.rollNo})` : ""} - {u.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Step 2: Notification Category Cards */}
            <div className="space-y-3 pb-5 border-b border-zinc-800">
              <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span>2. Notification Category</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {NOTIFICATION_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={cn(
                        "p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between gap-2.5 shadow-sm",
                        isSelected
                          ? "border-primary bg-purple-950 text-white shadow-md"
                          : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className={cn("p-2 rounded-xl border shadow-sm", t.bg, t.border, t.text)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white tracking-tight">{t.label}</div>
                        <div className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                          {t.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Notification Content */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                <span>3. Notification Content</span>
              </label>

              {/* Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-200">Notification Title *</span>
                  <span className="text-[11px] font-mono text-zinc-400">{title.length}/100 chars</span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 🚀 InspireX 2026: Schedule & Hackathon Rules Announced!"
                  maxLength={100}
                  required
                  className="w-full bg-[#16161D] border border-zinc-700 hover:border-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-xs md:text-sm text-white placeholder:text-zinc-500 transition-colors outline-none font-medium"
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-200">Message Description *</span>
                  <span className="text-[11px] font-mono text-zinc-400">{message.length}/500 chars</span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide essential details, timings, venues, instructions, or links..."
                  maxLength={500}
                  required
                  rows={4}
                  className="w-full bg-[#16161D] border border-zinc-700 hover:border-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-xs md:text-sm text-white placeholder:text-zinc-500 transition-colors outline-none font-medium resize-none leading-relaxed"
                />
              </div>

              {/* Action URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-primary" />
                    <span>Action URL (Optional)</span>
                  </span>
                  <span className="text-[11px] text-zinc-400">Opens when student clicks notification</span>
                </div>

                <input
                  type="url"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="https://connectclub-vce.vercel.app/events"
                  className="w-full bg-[#16161D] border border-zinc-700 hover:border-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-zinc-500 transition-colors outline-none font-mono"
                />

                {/* Quick URL shortcut chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: "Events Portal", url: "https://connectclub-vce.vercel.app/events" },
                    { label: "My Certificates", url: "https://connectclub-vce.vercel.app/u/certificates" },
                    { label: "Projects Feed", url: "https://connectclub-vce.vercel.app/projects" },
                    { label: "Connect AI", url: "https://connectclub-vce.vercel.app/connect-ai" },
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActionUrl(chip.url)}
                      className="px-3 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 hover:text-white border border-zinc-700 transition-colors"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Banner Image Uploader */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                  <span>Notification Banner Image (Optional)</span>
                </span>
                <ImageUploader
                  onUpload={setImageUrl}
                  defaultImage={imageUrl}
                  className="h-32 w-full rounded-2xl"
                />
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="pt-4 flex items-center justify-between border-t border-zinc-800">
              <div className="text-xs font-semibold text-zinc-300">
                Audience:{" "}
                <span className="font-bold text-white">
                  {targetUser === "all" ? `All ${users.length} Students` : "1 Specific Student"}
                </span>
              </div>

              <button
                type="submit"
                disabled={sending || loading || !title.trim() || !message.trim()}
                className="px-6 py-3 rounded-2xl bg-primary hover:bg-purple-600 text-white font-bold text-xs md:text-sm flex items-center gap-2 transition-all shadow-lg shadow-purple-950 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Broadcasting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Notification</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Interactive Live Preview & Broadcast History (5 cols on lg, 4 cols on xl) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Live Mobile / Student Dashboard Preview Card */}
          <div className="rounded-3xl bg-[#111116] border border-zinc-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Student Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 bg-emerald-950 border border-emerald-700 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Real-time
                </span>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors border border-zinc-700"
                  title="Open full interactive preview"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {/* Notification Card Mockup */}
            <div 
              onClick={() => setIsPreviewModalOpen(true)}
              className="p-4 rounded-2xl bg-[#16161D] border border-zinc-700 hover:border-primary shadow-md space-y-3 relative overflow-hidden group cursor-pointer transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-md",
                    selectedTypeInfo.bg,
                    selectedTypeInfo.border,
                    selectedTypeInfo.text
                  )}
                >
                  <selectedTypeInfo.icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300">
                      {selectedTypeInfo.label}
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">Just now</span>
                  </div>

                  <h4 className="text-xs font-bold text-white mt-1 line-clamp-1 leading-snug">
                    {title.trim() || "Notification Title Goes Here..."}
                  </h4>
                </div>
              </div>

              <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap pl-12 font-normal">
                {message.trim() ||
                  "This is a live interactive preview of how the notification text will appear to students on their devices."}
              </p>

              {imageUrl && (
                <div className="pl-12">
                  <img
                    src={imageUrl}
                    alt="Notification Banner"
                    className="w-full h-28 rounded-xl object-cover border border-zinc-700 shadow-md"
                  />
                </div>
              )}

              <div className="pl-12 pt-1 flex items-center justify-between gap-2">
                {actionUrl ? (
                  <a
                    href={actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline hover:text-purple-300 transition-colors"
                  >
                    <span>View Details</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPreviewModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline hover:text-purple-300 transition-colors"
                  >
                    <span>View Details</span>
                    <Eye className="w-3 h-3" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPreviewModalOpen(true);
                  }}
                  className="text-[11px] font-semibold text-zinc-400 group-hover:text-white flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  <span>Inspect Modal</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 text-center leading-normal">
              Click anywhere on the preview card or &quot;View Details&quot; to inspect full interactive student view
            </p>
          </div>

          {/* Recent Broadcasts History */}
          <div className="rounded-3xl bg-[#111116] border border-zinc-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Recent Broadcasts
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-zinc-400">{sentHistory.length} sent</span>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 pr-1">
              {historyLoading ? (
                <div className="p-6 text-center text-xs text-zinc-400">Loading history...</div>
              ) : sentHistory.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400">
                  No past broadcasts found. Sent notifications will appear here.
                </div>
              ) : (
                sentHistory.map((item) => {
                  const typeDef =
                    NOTIFICATION_TYPES.find((t) => t.id === item.type) || NOTIFICATION_TYPES[0];

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all text-left space-y-1.5 group shadow-sm"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={cn("px-2.5 py-0.5 rounded-full font-bold uppercase border", typeDef.bg, typeDef.border, typeDef.text)}>
                          {typeDef.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTitle(item.title);
                            setMessage(item.message);
                            setType(item.type);
                            if (item.actionUrl) setActionUrl(item.actionUrl);
                            if (item.imageUrl) setImageUrl(item.imageUrl);
                            toast.success("Loaded broadcast into composer");
                          }}
                          className="text-zinc-400 hover:text-white flex items-center gap-1 font-semibold transition-colors"
                          title="Reuse template"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Reuse</span>
                        </button>
                      </div>

                      <div className="text-xs font-bold text-white truncate">{item.title}</div>
                      <div className="text-[11px] text-zinc-300 line-clamp-2 leading-relaxed">
                        {item.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full Interactive Student Preview Modal */}
      <AnimatePresence>
        {isPreviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="w-full max-w-lg bg-[#121217] border border-zinc-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
            >
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-700 flex items-center justify-center text-purple-300">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Student Perspective Preview
                    </h3>
                    <p className="text-[11px] text-zinc-300">
                      Simulated student notification drawer (/u/notifications)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1.5 text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Simulated Device Frame */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700 bg-[#09090B]">
                {/* Phone Status Bar */}
                <div className="flex items-center justify-between px-2 py-1 text-[11px] text-zinc-400 font-mono font-bold">
                  <span>9:41 AM</span>
                  <div className="flex items-center gap-1.5">
                    <span>5G</span>
                    <span className="w-4 h-2 border border-zinc-400 rounded-sm inline-block">
                      <span className="bg-zinc-200 h-full w-3 block" />
                    </span>
                  </div>
                </div>

                {/* Simulated Notification Container */}
                <div className="rounded-2xl border border-zinc-700 bg-[#16161D] p-5 shadow-xl space-y-3 relative overflow-hidden">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg",
                        selectedTypeInfo.bg,
                        selectedTypeInfo.border,
                        selectedTypeInfo.text
                      )}
                    >
                      <selectedTypeInfo.icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-purple-300">
                          {selectedTypeInfo.label}
                        </span>
                        <span className="text-[10px] font-semibold text-zinc-300 bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded-md">
                          Just now
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                        {title.trim() || "Notification Title Goes Here"}
                      </h4>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap pl-1 font-normal">
                    {message.trim() ||
                      "This is how your announcement, details, and call to action will render for students inside their notification stream."}
                  </p>

                  {/* Banner Image Preview */}
                  {imageUrl && (
                    <div className="rounded-2xl overflow-hidden border border-zinc-700 bg-black relative aspect-[16/9] shadow-md">
                      <img
                        src={imageUrl}
                        alt="Notification banner"
                        className="w-full h-full object-cover relative z-10"
                      />
                    </div>
                  )}

                  {/* Interactive Action CTA */}
                  {actionUrl && (
                    <div className="pt-2">
                      <a
                        href={actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-purple-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-950"
                      >
                        <span>View Details &rarr;</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Target Information */}
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>Audience Scope:</span>
                    <span className="font-bold text-white">
                      {targetUser === "all" ? `Broadcast (${users.length} Students)` : "Single Student"}
                    </span>
                  </div>
                  {actionUrl && (
                    <div className="flex items-center justify-between">
                      <span>Destination URL:</span>
                      <a
                        href={actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-300 hover:text-white font-mono text-[11px] truncate max-w-[200px]"
                      >
                        {actionUrl}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between shrink-0">
                <span className="text-[11px] font-semibold text-zinc-400">
                  Interactive Preview Mode
                </span>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors border border-zinc-700"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
