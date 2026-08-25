"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { Users, Calendar, LayoutGrid, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, where, orderBy, limit, getCountFromServer } from "firebase/firestore";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  
  const [stats, setStats] = useState({
    activeEvents: 0,
    liveProjects: 0,
    teamMembers: 0,
    inquiries: 0
  });
  const [recentActivity, setRecentActivity] = useState<{ id: string; message: string; date: Date }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Active Events (Upcoming or Ongoing)
        const eventsRef = collection(db, "events");
        const eventsSnapshot = await getDocs(eventsRef);
        let activeEventsCount = 0;
        eventsSnapshot.forEach((doc) => {
          const status = doc.data().status;
          if (status === "Upcoming" || status === "Ongoing") activeEventsCount++;
        });

        // 2. Live Projects
        const projectsRef = collection(db, "projects");
        const projectsSnapshot = await getDocs(projectsRef);
        let liveProjectsCount = 0;
        projectsSnapshot.forEach((doc) => {
          if (doc.data().status === "Live") liveProjectsCount++;
        });

        // 3. Team Members
        const membersRef = collection(db, "members");
        const membersSnap = await getCountFromServer(membersRef);
        
        // 4. Inquiries
        const inquiriesRef = collection(db, "contactInquiries");
        const inquiriesSnap = await getCountFromServer(inquiriesRef);

        setStats({
          activeEvents: activeEventsCount,
          liveProjects: liveProjectsCount,
          teamMembers: membersSnap.data().count,
          inquiries: inquiriesSnap.data().count
        });

        // 5. Recent Inquiries for Activity Feed
        const recentInqQuery = query(inquiriesRef, orderBy("createdAt", "desc"), limit(3));
        const recentInqSnap = await getDocs(recentInqQuery);
        const activities = recentInqSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            message: `New inquiry from ${data.name || 'Unknown'}: "${(data.subject || '').substring(0, 30)}..."`,
            date: data.createdAt ? new Date(data.createdAt.toMillis()) : new Date()
          };
        });
        
        setRecentActivity(activities);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    { title: "Active Events", value: stats.activeEvents, icon: <Calendar className="w-6 h-6 text-primary" />, href: "/admin/events" },
    { title: "Live Projects", value: stats.liveProjects, icon: <LayoutGrid className="w-6 h-6 text-primary" />, href: "/admin/projects" },
    { title: "Team Members", value: stats.teamMembers, icon: <Users className="w-6 h-6 text-primary" />, href: "/admin/members" },
    { title: "Total Inquiries", value: stats.inquiries, icon: <Sparkles className="w-6 h-6 text-primary" />, href: "/admin/messages" },
  ];

  return (
    <div>
      <header className="px-4 md:px-8 py-4 md:py-6 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
        <h1 className="text-xl md:text-2xl font-bold text-white">Dashboard Overview</h1>
        <div className="flex items-center space-x-2 md:space-x-3 text-xs md:text-sm text-white/60 w-full sm:w-auto overflow-hidden">
          <span className="shrink-0">Logged in as:</span>
          <span className="text-white bg-white/10 px-3 py-1 rounded-full truncate max-w-full">{user?.email}</span>
        </div>
      </header>

      <div className="p-4 md:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-white/50">Loading dashboard data...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
              {statCards.map((stat, idx) => (
                <Link key={idx} href={stat.href} className="p-4 md:p-6 rounded-3xl bg-[#0c0c0e] border border-white/5 flex items-center space-x-4 hover:bg-white/5 hover:border-white/10 transition-all group">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    {stat.icon}
                  </div>
                  <div>
                    <div className="text-2xl md:text-3xl font-black font-heading text-white">{stat.value}</div>
                    <div className="text-xs md:text-sm text-white/50">{stat.title}</div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
              <div className="p-4 md:p-8 rounded-3xl bg-[#0c0c0e] border border-white/5">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <h2 className="text-lg md:text-xl font-bold text-white">Recent Inquiries</h2>
                  <Link href="/admin/messages" className="text-primary text-xs md:text-sm font-medium hover:underline flex items-center">
                    View All <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1" />
                  </Link>
                </div>
                
                {recentActivity.length > 0 ? (
                  <div className="space-y-3 md:space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start p-3 md:p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 md:mt-2 mr-3 md:mr-4 shrink-0" />
                        <div>
                          <p className="text-white/90 text-xs md:text-sm font-medium">{activity.message}</p>
                          <p className="text-white/40 text-[10px] md:text-xs mt-1">{activity.date.toLocaleDateString()} at {activity.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 md:py-12 text-white/50 bg-white/5 rounded-2xl border border-white/5 border-dashed text-sm">
                    No recent activity found.
                  </div>
                )}
              </div>
              
              <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20 flex flex-col justify-center items-center text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none z-0"></div>
                <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-primary mb-3 md:mb-4 relative z-10" />
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2 relative z-10">Connect Club OS</h2>
                <p className="text-white/70 text-sm md:text-base max-w-sm mb-6 relative z-10">
                  You have full administrative access to manage events, projects, members, and the gallery.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto relative z-10">
                  <Link href="/admin/events/create" className="px-5 py-2.5 bg-primary text-white font-medium rounded-full hover:bg-primary/90 transition-colors text-sm w-full sm:w-auto text-center">
                    New Event
                  </Link>
                  <Link href="/admin/projects/create" className="px-5 py-2.5 bg-white/10 text-white font-medium border border-white/20 rounded-full hover:bg-white/20 transition-colors text-sm w-full sm:w-auto text-center">
                    New Project
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
