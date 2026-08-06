"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { Calendar, LayoutGrid, Image as ImageIcon, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, where, limit, orderBy } from "firebase/firestore";

export default function MemberDashboard() {
  const { user } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<{ id: string; title: string; date: string }[]>([]);

  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        const eventsRef = collection(db, "events");
        const q = query(eventsRef, where("status", "==", "Upcoming"), limit(3));
        const snapshot = await getDocs(q);
        const events = snapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title,
          date: doc.data().date,
        }));
        setUpcomingEvents(events);
      } catch (error) {
        console.error("Error fetching upcoming events:", error);
      }
    };
    fetchUpcomingEvents();
  }, []);

  const quickLinks = [
    { title: "Manage Events", icon: <Calendar className="w-8 h-8 text-primary" />, href: "/member/events", desc: "View and edit club events" },
    { title: "Manage Projects", icon: <LayoutGrid className="w-8 h-8 text-blue-400" />, href: "/member/projects", desc: "Update project showcase" },
    { title: "Manage Gallery", icon: <ImageIcon className="w-8 h-8 text-purple-400" />, href: "/member/gallery", desc: "Upload event photos" },
  ];

  return (
    <div className="p-8 md:p-12">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black font-heading text-white mb-4">
          Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">{user?.email?.split('@')[0]}</span>!
        </h1>
        <p className="text-white/60 text-lg max-w-2xl">
          This is your member portal. You can manage events, projects, and the gallery from here. Your permissions are active based on your assigned role.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Quick Links */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickLinks.map((link, idx) => (
            <Link 
              key={idx} 
              href={link.href}
              className="p-6 rounded-3xl bg-card border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all group flex flex-col items-start"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {link.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{link.title}</h3>
              <p className="text-white/50 text-sm mb-6 flex-grow">{link.desc}</p>
              <div className="text-primary text-sm font-medium flex items-center group-hover:underline">
                Open <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </Link>
          ))}
        </div>

        {/* Sidebar / Upcoming */}
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-card border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-20">
              <Sparkles className="w-24 h-24 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2 relative z-10">Member Status</h2>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6 relative z-10 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>Active & Verified</span>
            </div>
            <p className="text-white/60 text-sm relative z-10">
              You have active write permissions for the modules in the sidebar. Please ensure all public changes meet the Connect Club guidelines.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-card border border-white/5">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-primary" />
              Upcoming Events
            </h2>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <h3 className="text-white font-medium mb-1">{event.title}</h3>
                    <p className="text-white/40 text-xs">{event.date}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-white/50 text-sm text-center py-6 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                No upcoming events scheduled.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
