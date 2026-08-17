"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { getUserNotifications } from "@/lib/firebase/users";
import { motion } from "framer-motion";
import { Bell, Calendar, Award, FolderGit2, Heart, MessageCircle, CheckCheck } from "lucide-react";
import Link from "next/link";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      if (user?.uid) {
        try {
          const notifs = await getUserNotifications(user.uid);
          setNotifications(notifs);
        } catch (error) {
          console.error("Failed to fetch notifications:", error);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchNotifications();
  }, [user]);

  const handleMarkAllRead = () => {
    // Implement mark all as read logic
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
  };

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toMillis ? new Date(timestamp.toMillis()) : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'event': return <Calendar className="w-5 h-5 text-blue-400" />;
      case 'certificate': return <Award className="w-5 h-5 text-yellow-400" />;
      case 'project': return <FolderGit2 className="w-5 h-5 text-purple-400" />;
      case 'like': return <Heart className="w-5 h-5 text-red-400" />;
      case 'comment': return <MessageCircle className="w-5 h-5 text-green-400" />;
      default: return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'event': return 'bg-blue-400/10';
      case 'certificate': return 'bg-yellow-400/10';
      case 'project': return 'bg-purple-400/10';
      case 'like': return 'bg-red-400/10';
      case 'comment': return 'bg-green-400/10';
      default: return 'bg-gray-400/10';
    }
  };

  return (
    <div className="p-8 md:p-12 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
              Notifications
            </h1>
            <p className="text-white/50">
              Stay updated with your activities.
            </p>
          </div>
        </motion.div>

        {notifications.length > 0 && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium text-white transition-colors self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4" /> Mark all as read
          </motion.button>
        )}
      </div>

      <div className="bg-[#0C0C0E] border border-white/[0.06] rounded-3xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-12 h-12 bg-white/5 rounded-full shrink-0"></div>
                <div className="space-y-2 flex-1 pt-2">
                  <div className="h-4 bg-white/5 rounded w-1/3"></div>
                  <div className="h-3 bg-white/5 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-white/[0.06]">
            {notifications.map((notif, i) => {
              const NotificationContent = (
                <div className={`p-6 flex items-start gap-4 hover:bg-white/[0.02] transition-colors ${!notif.read ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${getIconBg(notif.type)}`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h4 className="text-white font-medium">{notif.title}</h4>
                      <span className="text-white/40 text-xs whitespace-nowrap shrink-0">{getTimeAgo(notif.createdAt)}</span>
                    </div>
                    <p className="text-white/60 text-sm leading-relaxed">{notif.message}</p>
                  </div>
                </div>
              );

              return notif.actionUrl ? (
                <Link key={notif.id} href={notif.actionUrl} className="block">
                  {NotificationContent}
                </Link>
              ) : (
                <div key={notif.id}>
                  {NotificationContent}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 text-center">
            <Bell className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">All caught up!</h3>
            <p className="text-white/50">You don't have any new notifications at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
