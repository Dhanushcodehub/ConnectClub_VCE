"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { getUserRegistrations } from "@/lib/firebase/users";
import { motion } from "framer-motion";
import { Ticket, Calendar, MapPin, ArrowRight } from "lucide-react";
import { TicketCard } from "@/app/u/_components/TicketCard";
import Link from "next/link";

export default function MyTicketsPage() {
  const { user, profile } = useAuth();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRegistrations() {
      if (user?.uid) {
        try {
          const regs = await getUserRegistrations(user.uid);
          
          // Deduplicate by eventId to handle race condition duplicates
          const uniqueRegs = Array.from(new Map(regs.map(r => [r.eventId, r])).values());
          setRegistrations(uniqueRegs);
        } catch (error) {
          console.error("Failed to fetch registrations:", error);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchRegistrations();
  }, [user]);

  const tickets = registrations.filter(r => r.ticketId);

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-12"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
          <Ticket className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2 tracking-tight">
            My Tickets
          </h1>
          <p className="text-white/50">
            Access your event passes and scan them at the venue.
          </p>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-32">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : tickets.length > 0 ? (
        <div className="flex flex-col gap-12 pb-24">
          {tickets.map((reg, i) => (
            <motion.div
              key={reg.ticketId}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, type: "spring", stiffness: 100, damping: 20 }}
            >
              <TicketCard 
                ticketId={reg.ticketId}
                eventName={reg.eventId === "inspirex-s2" ? "InspireX Season 2" : reg.eventId}
                userName={profile?.name || "Attendee"}
                userEmail={user?.email || profile?.rollNo || ""}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#0c0c0e] border border-white/10 rounded-[2rem] p-12 text-center max-w-2xl mx-auto shadow-2xl"
        >
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8">
            <Ticket className="w-10 h-10 text-white/20" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-4">No tickets found</h2>
          <p className="text-white/50 mb-10 max-w-md mx-auto leading-relaxed">
            You don't have any active event tickets right now. Browse our upcoming events and secure your spot!
          </p>
          <Link 
            href="/events"
            className="inline-flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            Browse Events <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      )}
    </div>
  );
}
