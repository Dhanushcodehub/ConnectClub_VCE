"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Send, User, Link as LinkIcon, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react";
import { getAllUsers, createNotification, ConnectUser } from "@/lib/firebase/users";
import ImageUploader from "@/components/ImageUploader";

export default function AdminNotificationsPage() {
  const [users, setUsers] = useState<ConnectUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form state
  const [targetUser, setTargetUser] = useState("all");
  const [type, setType] = useState<"system" | "event" | "project" | "certificate">("system");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const allUsers = await getAllUsers();
        setUsers(allUsers);
      } catch (error) {
        console.error("Failed to load users", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    setSending(true);
    setStatus(null);

    try {
      const payload: any = {
        type,
        title,
        message,
        read: false,
        createdAt: new Date(),
      };
      if (actionUrl) {
        payload.actionUrl = actionUrl;
      }
      if (imageUrl) {
        payload.imageUrl = imageUrl;
      }

      if (targetUser === "all") {
        // Broadcast to all users
        const promises = users.map(u => 
          createNotification({
            userId: u.uid,
            ...payload
          })
        );
        await Promise.all(promises);
        setStatus({ type: "success", message: `Successfully sent to ${users.length} users!` });
      } else {
        // Send to specific user
        await createNotification({
          userId: targetUser,
          ...payload
        });
        setStatus({ type: "success", message: "Successfully sent notification!" });
      }

      // Reset form
      setTitle("");
      setMessage("");
      setActionUrl("");
      setImageUrl("");
    } catch (error) {
      console.error("Error sending notification:", error);
      setStatus({ type: "error", message: "Failed to send notification. Please try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3 mb-2">
          <Bell className="w-8 h-8 text-primary" />
          Send Notifications
        </h1>
        <p className="text-white/50 text-lg">Broadcast messages to all users or send personalized alerts.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#0C0C0E] border border-white/[0.06] rounded-2xl p-6 lg:p-8"
      >
        <form onSubmit={handleSend} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target Audience */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                <User className="w-4 h-4" /> Target Audience
              </label>
              <select
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
              >
                <option value="all" className="bg-[#0C0C0E]">Broadcast to All Users ({users.length})</option>
                <optgroup label="Specific Users" className="bg-[#0C0C0E]">
                  {users.map(u => (
                    <option key={u.uid} value={u.uid} className="bg-[#0C0C0E]">
                      {u.name || u.email}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Notification Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Bell className="w-4 h-4" /> Notification Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
              >
                <option value="system" className="bg-[#0C0C0E]">System Alert</option>
                <option value="event" className="bg-[#0C0C0E]">Event Update</option>
                <option value="project" className="bg-[#0C0C0E]">Project Update</option>
                <option value="certificate" className="bg-[#0C0C0E]">Certificate Issued</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70">Notification Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New Hackathon Announced!"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detailed message content..."
              required
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
              <LinkIcon className="w-4 h-4" /> Action URL (Optional)
            </label>
            <input
              type="url"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              placeholder="https://connectclubvce.in/events"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Cover Image (Optional)
            </label>
            <ImageUploader 
              onUpload={setImageUrl} 
              defaultImage={imageUrl}
              className="h-32 w-full max-w-sm"
            />
          </div>

          {status && (
            <div className={`p-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <p className="text-sm font-medium">{status.message}</p>
            </div>
          )}

          <div className="pt-4 flex justify-end border-t border-white/5">
            <button
              type="submit"
              disabled={sending || loading}
              className="px-6 py-3 rounded-xl bg-primary text-white font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Notification
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
