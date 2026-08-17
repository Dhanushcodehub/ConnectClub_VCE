"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { getUserCertificates } from "@/lib/firebase/users";
import { motion } from "framer-motion";
import { Award, Download, ShieldCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function MyCertificatesPage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCertificates() {
      if (user?.uid) {
        try {
          const certs = await getUserCertificates(user.uid);
          setCertificates(certs);
        } catch (error) {
          console.error("Failed to fetch certificates:", error);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchCertificates();
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
        <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center shrink-0">
          <Award className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
            My Certificates
          </h1>
          <p className="text-white/50">
            Achievements and certificates earned from events.
          </p>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : certificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {certificates.map((cert, i) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group relative bg-[#0C0C0E] rounded-3xl overflow-hidden border border-white/[0.06] hover:border-yellow-500/30 transition-colors flex flex-col h-full"
            >
              {/* Subtle gold accent at top */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500/0 via-yellow-500/50 to-yellow-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="p-8 flex-1 flex flex-col">
                <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <ShieldCheck className="w-8 h-8 text-yellow-500" />
                </div>
                
                <div className="text-center mb-6 flex-1">
                  <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2">Certificate of Attendance</p>
                  <h3 className="text-xl font-display font-bold text-white mb-2 line-clamp-2">
                    {cert.eventTitle}
                  </h3>
                  <p className="text-white/50 text-sm">
                    Issued {formatDate(cert.issuedAt)}
                  </p>
                </div>

                <div className="flex items-center gap-3 mt-auto">
                  <a
                    href={cert.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </a>
                  <a
                    href={`/verify/${cert.id}`}
                    target="_blank"
                    className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-white/70 hover:text-white transition-colors shrink-0"
                    title="Verify Certificate"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
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
            <Award className="w-10 h-10 text-white/20" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-4">No certificates yet</h2>
          <p className="text-white/50 mb-8 max-w-md mx-auto">
            Attend events and complete workshops to earn certificates that showcase your skills.
          </p>
          <Link 
            href="/events"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-xl transition-colors"
          >
            Find Events
          </Link>
        </motion.div>
      )}
    </div>
  );
}
