"use client";

import Link from "next/link";
import { Ticket, ArrowRight, Sparkles, ExternalLink } from "lucide-react";

export default function EventManagementPage() {
  const managedEvents = [
    {
      id: "inspirex",
      name: "InspireX Season 2",
      description: "Manage registrations and issue certificates from the external InspireX database.",
      status: "Active",
      icon: Sparkles,
      href: "/admin/event-management/inspirex",
      color: "from-blue-500 to-indigo-500",
      bgClass: "bg-blue-500/10 border-blue-500/20"
    },
    {
      id: "uxplore",
      name: "UXplore",
      description: "Manage UXplore design competition registrations and certificates.",
      status: "Upcoming",
      icon: Ticket,
      href: "#",
      color: "from-purple-500 to-pink-500",
      bgClass: "bg-purple-500/10 border-purple-500/20"
    }
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#0C0C0E] p-8 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
            <Ticket className="w-8 h-8 text-primary" />
            Event Operations
          </h1>
          <p className="text-white/60">Central hub for managing external events, registrations, and certificates.</p>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {managedEvents.map((event) => {
          const Icon = event.icon;
          const isActive = event.status === "Active";
          
          return (
            <Link 
              key={event.id}
              href={event.href}
              className={`block group relative bg-[#0C0C0E] border border-white/5 rounded-3xl p-8 hover:border-white/15 transition-all overflow-hidden ${!isActive && "opacity-60 cursor-not-allowed"}`}
              onClick={(e) => !isActive && e.preventDefault()}
            >
              {/* Decorative gradient */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${event.color} rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity`} />
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${event.bgClass}`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isActive ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-white/5 text-white/40 border border-white/10"}`}>
                  {event.status}
                </span>
              </div>
              
              <div className="relative z-10">
                <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-primary transition-colors">{event.name}</h2>
                <p className="text-white/60 mb-8 leading-relaxed">
                  {event.description}
                </p>
                
                <div className="flex items-center text-sm font-bold text-white/40 group-hover:text-white transition-colors">
                  {isActive ? (
                    <>
                      Manage Event
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  ) : (
                    <>
                      Coming Soon
                    </>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
