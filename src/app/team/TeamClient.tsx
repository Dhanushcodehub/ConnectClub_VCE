"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { getMembers, ConnectMember, MemberTier } from "@/lib/firebase/members";
import { Loader2 } from "lucide-react";

export default function TeamPage() {
  const [members, setMembers] = useState<ConnectMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getMembers();
      setMembers(data);
      setLoading(false);
    }
    load();
  }, []);

  const getTierMembers = (tier: MemberTier) => members.filter(m => m.tier === tier);

  const renderTierSection = (title: string, tier: MemberTier, isLarge: boolean = false) => {
    const tierMembers = getTierMembers(tier);
    if (tierMembers.length === 0) return null;

    return (
      <div className="w-full mb-24 md:mb-32">
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="col-span-full mb-12 flex flex-col items-center text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-8 h-[2px] bg-primary rounded-full" />
            <span className="text-label text-primary font-bold uppercase tracking-[0.2em]">{title}</span>
            <span className="w-8 h-[2px] bg-primary rounded-full" />
          </div>
        </motion.div>

        <div className={`grid grid-cols-1 gap-6 ${isLarge ? 'md:grid-cols-2 lg:grid-cols-3 max-w-5xl' : 'sm:grid-cols-2 lg:grid-cols-3 max-w-6xl'} mx-auto`}>
          {tierMembers.map((member) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="group relative bg-[#0C0C0E]/80 backdrop-blur-sm border border-white/[0.05] rounded-3xl p-8 hover:border-white/[0.15] hover:bg-[#111115] transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.05)] flex flex-col overflow-hidden min-h-[320px]"
            >
              {/* Background Image if available */}
              {member.imageUrl && (
                <div className="absolute inset-0 z-0 opacity-30 group-hover:opacity-60 transition-opacity duration-500">
                  <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0E] via-[#0C0C0E]/90 to-[#0C0C0E]/20" />
                </div>
              )}

              {/* Top Section with Department and Socials */}
              <div className="flex justify-between items-start mb-12 relative z-10">
                <div className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-block backdrop-blur-md">
                  {member.department || tier}
                </div>
                
                <div className="flex gap-2">
                  {member.linkedinUrl && (
                    <a href={member.linkedinUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/60 hover:text-[#0077b5] hover:border-[#0077b5] hover:bg-[#0077b5]/20 transition-all">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                        <rect width="4" height="12" x="2" y="9" />
                        <circle cx="4" cy="4" r="2" />
                      </svg>
                    </a>
                  )}
                  {member.instaUrl && (
                    <a href={member.instaUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/60 hover:text-[#E1306C] hover:border-[#E1306C] hover:bg-[#E1306C]/20 transition-all">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>

              {/* Content Area */}
              <div className="mt-auto relative z-10">
                <h3 className={`font-black text-white uppercase tracking-tight mb-2 ${isLarge ? 'text-3xl' : 'text-2xl'}`}>
                  {member.name}
                </h3>
                <p className="text-white/80 font-medium mb-4 text-lg">{member.position}</p>
                <div className="pt-4 border-t border-white/20 flex items-center justify-between">
                  <span className="text-white/50 text-xs font-bold uppercase tracking-wider">Roll No</span>
                  <span className="text-white/70 text-sm font-mono bg-white/10 backdrop-blur-md px-2 py-1 rounded-md">{member.rollNo}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen pt-32 pb-24 md:pt-48 md:pb-32 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none opacity-50" />
      
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="w-full container-grid mb-24 relative z-10"
      >
        <motion.div variants={fadeUp} className="col-span-full text-center max-w-3xl mx-auto flex flex-col items-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="w-8 h-[2px] bg-primary rounded-full" />
            <span className="text-label text-primary font-bold uppercase tracking-[0.2em]">The Minds Behind The Magic</span>
            <span className="w-8 h-[2px] bg-primary rounded-full" />
          </div>
          <h1 className="text-h1 font-black text-white uppercase tracking-tight mb-6">
            Meet The Team
          </h1>
          <p className="text-body text-white/50 max-w-2xl">
            A diverse group of innovators, creators, and leaders dedicated to pushing the boundaries of technology in our college.
          </p>
        </motion.div>
      </motion.div>

      <div className="w-full container-grid relative z-20">
        {loading ? (
          <div className="col-span-full py-32 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="col-span-full py-32 flex justify-center items-center text-white/50">
            No team members found. Add some from the admin dashboard.
          </div>
        ) : (
          <div className="col-span-full px-4 md:px-0">
            {renderTierSection("Executive Board", "Executive Board", true)}
            {renderTierSection("Core Team", "Core Team")}
            {renderTierSection("Volunteers", "Volunteers")}
            {renderTierSection("Alumni Legacy", "Alumni")}
          </div>
        )}
      </div>
    </div>
  );
}
