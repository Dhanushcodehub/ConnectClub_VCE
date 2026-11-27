"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ConnectEvent } from "@/lib/data/events";
import { Plus, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/AuthContext";

export default function MemberEventsPage() {
  const [events, setEvents] = useState<ConnectEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "events"));
        if (!querySnapshot.empty) {
          const eventsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConnectEvent));
          setEvents(eventsData);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, "events", id));
        setEvents(events.filter(e => e.id !== id));
      } catch (error) {
        console.error("Error deleting event:", error);
        alert("Failed to delete event.");
      }
    }
  };

  const handleToggleClosed = async (id: string, currentClosed: boolean | undefined) => {
    const newClosed = !currentClosed;
    try {
      await updateDoc(doc(db, "events", id), {
        isClosed: newClosed,
      });
      setEvents(events.map(e => e.id === id ? { ...e, isClosed: newClosed } : e));
    } catch (error) {
      console.error("Error toggling event registration status:", error);
      alert("Failed to update registration status.");
    }
  };

  return (
    <div>
        <header className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-white/5 flex items-center justify-between gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">Manage Events</h1>
          <Link 
            href="/member/events/create" 
            className="bg-primary hover:bg-primary/90 text-white px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 transition-colors shadow-md active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Add Event</span>
          </Link>
        </header>

        <div className="p-4 sm:p-6 md:p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-white/50 font-medium">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl sm:rounded-3xl p-8 sm:p-12 md:p-16 text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No events yet</h3>
              <p className="text-white/50 mb-6 max-w-md mx-auto text-sm sm:text-base">Get started by creating your first event to engage with the community.</p>
              <Link 
                href="/member/events/create" 
                className="bg-white/5 text-white hover:bg-white/10 border border-white/10 px-5 sm:px-6 py-2.5 rounded-lg font-medium text-sm sm:text-base transition-colors inline-block"
              >
                Create First Event
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-7xl mx-auto">
              {events.map((event) => (
                <div key={event.id} className="bg-[#0c0c0e] border border-white/5 rounded-2xl sm:rounded-3xl p-5 sm:p-6 hover:border-white/10 transition-colors shadow-lg flex flex-col h-full group relative overflow-hidden">
                  
                  {/* Subtle top gradient */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-5 sm:mb-6">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                        event.status === "Upcoming" ? "bg-primary/20 text-primary border-primary/20" :
                        event.status === "Ongoing" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                        "bg-white/5 text-white/50 border-white/5"
                      )}>
                        {event.status}
                      </span>
                      <button
                        onClick={() => handleToggleClosed(event.id, event.isClosed)}
                        title={`Click to ${event.isClosed ? "Open" : "Close"} registrations`}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider transition-all flex items-center gap-1 hover:scale-105 active:scale-95",
                          event.isClosed
                            ? "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25"
                            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", event.isClosed ? "bg-red-400" : "bg-emerald-400 animate-pulse")} />
                        {event.isClosed ? "Closed" : "Open"}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white/5 p-1 rounded-xl border border-white/5">
                      <Link href={`/member/events/${event.id}/edit`} className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <div className="w-px h-3 bg-white/10"></div>
                      <button onClick={() => handleDelete(event.id, event.title)} className="p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">{event.title}</h3>
                  <p className="text-xs sm:text-sm text-white/50 line-clamp-3 flex-1 leading-relaxed mb-5 sm:mb-6">
                    {event.description || "No description available for this event."}
                  </p>
                  
                  <div className="mt-auto pt-4 border-t border-white/5 space-y-2">
                     <div className="flex items-center text-xs text-white/60">
                        <span className="w-14 font-medium text-white/40">Date</span>
                        <span className="flex-1 truncate">{event.date}</span>
                     </div>
                     <div className="flex items-center text-xs text-white/60">
                        <span className="w-14 font-medium text-white/40">Venue</span>
                        <span className="flex-1 truncate">{event.venue || "TBA"}</span>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
