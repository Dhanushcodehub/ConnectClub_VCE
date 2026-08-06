"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ConnectEvent } from "@/lib/data/events";
import { Plus, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/AuthContext";

export default function AdminEventsPage() {
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

  return (
    <div>
        <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Manage Events</h1>
          <Link href="/admin/events/create" className="bg-primary text-white px-4 py-2 rounded-lg font-medium flex items-center hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Link>
        </header>

        <div className="p-8">
          <div className="bg-card border border-white/5 rounded-3xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-white/50 text-sm">
                  <th className="px-6 py-4 font-medium">Event Name</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-white/50">Loading events...</td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-white/50">No events found in database.</td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-medium text-white">{event.title}</td>
                      <td className="px-6 py-4 text-white/60">{event.date}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-semibold border",
                          event.status === "Upcoming" ? "bg-primary/20 text-primary border-primary/20" :
                          event.status === "Ongoing" ? "bg-green-500/20 text-green-400 border-green-500/20" :
                          "bg-white/10 text-white/80 border-white/10"
                        )}>
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/admin/events/${event.id}/edit`} className="p-2 text-white/50 hover:text-white transition-colors inline-flex" aria-label="Edit">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDelete(event.id, event.title)} className="p-2 text-red-400/50 hover:text-red-400 transition-colors ml-2" aria-label="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}
