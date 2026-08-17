"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { getUserNotifications } from "@/lib/firebase/users";
import { motion } from "framer-motion";
import { Calendar, Award, FolderGit2, Heart, Bell, ChevronRight, User } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function UserDashboard() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      if (user?.uid) {
        try {
          const notifs = await getUserNotifications(user.uid);
          setNotifications(notifs.slice(0, 5));
        } catch (error) {
          console.error("Failed to fetch notifications:", error);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    if (user && !profile && !loading) {
      // Bulletproof fallback: if they somehow reach the dashboard without a profile, force them to onboarding
      const timeout = setTimeout(() => {
        if (!profile) window.location.href = "/u/login";
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [user, profile, loading]);

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto space-y-12">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-6"
      >
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          {profile.photoURL ? (
            <Image src={profile.photoURL} alt={profile.name} fill className="object-cover" />
          ) : (
            <span className="text-2xl font-display font-bold text-primary">
              {getInitials(profile.name || "User")}
            </span>
          )}
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
            Welcome back, {profile.name?.split(" ")[0] || "User"}
          </h1>
          <p className="text-white/50 text-lg">
            Here's what's happening with your account today.
          </p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: "Events Attended", value: (profile as any).eventsCount || 0, icon: Calendar, color: "text-blue-400", bg: "bg-blue-400/10" },
          { label: "Certificates", value: profile.certificatesCount || 0, icon: Award, color: "text-yellow-400", bg: "bg-yellow-400/10" },
          { label: "Projects Shared", value: profile.projectsCount || 0, icon: FolderGit2, color: "text-purple-400", bg: "bg-purple-400/10" },
          { label: "Likes Received", value: profile.likesReceived || 0, icon: Heart, color: "text-red-400", bg: "bg-red-400/10" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#0C0C0E] border border-white/[0.06] rounded-2xl p-6"
          >
            <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div className="text-3xl font-display font-bold text-white mb-1">{stat.value}</div>
            <div className="text-white/50 text-sm font-medium">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-display font-bold text-white">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/events" className="group bg-[#0C0C0E] border border-white/[0.06] hover:border-primary/50 transition-colors rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Register for Events</h3>
                  <p className="text-white/50 text-sm">Browse upcoming events</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-primary transition-colors" />
            </Link>
            
            <Link href="/u/projects/submit" className="group bg-[#0C0C0E] border border-white/[0.06] hover:border-primary/50 transition-colors rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-400/10 text-purple-400 flex items-center justify-center">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Submit a Project</h3>
                  <p className="text-white/50 text-sm">Share your latest work</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-purple-400 transition-colors" />
            </Link>

            <Link href="/u/certificates" className="group bg-[#0C0C0E] border border-white/[0.06] hover:border-primary/50 transition-colors rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-yellow-400/10 text-yellow-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-medium">View Certificates</h3>
                  <p className="text-white/50 text-sm">Download your achievements</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-yellow-400 transition-colors" />
            </Link>

            <Link href="/u/profile" className="group bg-[#0C0C0E] border border-white/[0.06] hover:border-primary/50 transition-colors rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-400/10 text-blue-400 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Edit Profile</h3>
                  <p className="text-white/50 text-sm">Update your details</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-blue-400 transition-colors" />
            </Link>
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold text-white">Recent Updates</h2>
            <Link href="/u/notifications" className="text-primary text-sm hover:underline font-medium">
              View All
            </Link>
          </div>
          
          <div className="bg-[#0C0C0E] border border-white/[0.06] rounded-2xl p-6 space-y-6">
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-white/5 rounded-full shrink-0"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-white/5 rounded w-3/4"></div>
                      <div className="h-3 bg-white/5 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length > 0 ? (
              <div className="space-y-6">
                {notifications.map((notif, i) => (
                  <div key={notif.id || i} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-1">
                      <Bell className="w-4 h-4 text-white/70" />
                    </div>
                    <div>
                      <p className="text-white text-sm leading-snug">{notif.message}</p>
                      <p className="text-white/40 text-xs mt-1">
                        {new Date(notif.createdAt?.toMillis ? notif.createdAt.toMillis() : notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 text-sm">No new notifications</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
