"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { getUserRegistrations } from "@/lib/firebase/users";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, ArrowRight, Download, CheckCircle2, Clock3 } from "lucide-react";
import Link from "next/link";

export default function MyEventsPage() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRegistrations() {
      if (user?.uid) {
        try {
          const regs = await getUserRegistrations(user.uid);
          setRegistrations(regs);
        } catch (error) {
          console.error("Failed to fetch registrations:", error);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchRegistrations();
  }, [user]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toMillis ? new Date(timestamp.toMillis()) : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  };

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-10"
      >
        <div className="w-12 h-12 rounded-2xl bg-blue-400/10 text-blue-400 flex items-center justify-center shrink-0">
          <Calendar className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
            My Events
          </h1>
          <p className="text-white/50">
            Events you've registered for and attended.
          </p>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : registrations.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {registrations.map((reg, i) => (
            <motion.div
              key={reg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#0C0C0E] border border-white/[0.06] rounded-3xl p-6 flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-display font-bold text-white line-clamp-2">
                  {reg.eventTitle || "Unknown Event"}
                </h3>
                <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 shrink-0 ml-4 ${
                  reg.attended 
                    ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                }`}>
                  {reg.attended ? (
                    <><CheckCircle2 className="w-3.5 h-3.5" /> Attended</>
                  ) : (
                    <><Clock3 className="w-3.5 h-3.5" /> Registered</>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-8 flex-1">
                <div className="flex items-center gap-3 text-white/50 text-sm">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Registered on {formatDate(reg.registeredAt)}</span>
                </div>
                {reg.eventDate && (
                  <div className="flex items-center gap-3 text-white/50 text-sm">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>{formatDate(reg.eventDate)}</span>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-white/[0.06] flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2">
                  {reg.certificateUrl ? (
                    <a 
                      href={reg.certificateUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary text-sm font-medium hover:underline"
                    >
                      <Download className="w-4 h-4" /> Download Certificate
                    </a>
                  ) : reg.attended ? (
                    <span className="text-white/40 text-sm">Certificate generating...</span>
                  ) : (
                    <span className="text-white/30 text-sm">Attend to earn certificate</span>
                  )}
                </div>
                <Link href={`/events/${reg.eventId}`} className="text-white/50 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium">
                  View Event <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-[#0C0C0E] border border-white/[0.06] rounded-3xl p-12 text-center max-w-2xl mx-auto"
        >
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-white/20" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-4">No events yet</h2>
          <p className="text-white/50 mb-8 max-w-md mx-auto">
            You haven't registered for any events. Discover upcoming workshops, hackathons, and sessions to enhance your skills.
          </p>
          <Link 
            href="/events"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-xl transition-colors"
          >
            Browse Events
          </Link>
        </motion.div>
      )}
    </div>
  );
}
