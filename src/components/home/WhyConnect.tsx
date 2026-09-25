"use client";

import { motion } from "framer-motion";
import { Code, Users, Rocket, Zap, Trophy, Globe } from "lucide-react";
import { staggerContainer, fadeUp, scaleIn, viewportOnce } from "@/lib/animations";

const pillars = [
  {
    title: "Build Real Projects",
    description:
      "Move beyond tutorials. We build open-source tools and platforms that are actually used by students and faculty.",
    icon: <Code className="w-6 h-6" />,
    color: "text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    glow: "#3B82F6",
    span: "col-span-1 md:col-span-8 lg:col-span-8",
    featured: true,
  },
  {
    title: "Elite Network",
    description:
      "Connect with the top performers on campus. Your network is your net worth â€” and here it's exceptional.",
    icon: <Users className="w-6 h-6" />,
    color: "text-cyan-400",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    glow: "#06B6D4",
    span: "col-span-1 md:col-span-4 lg:col-span-4",
    featured: false,
  },
  {
    title: "Fast-Track Growth",
    description:
      "Mentorship and weekly learning sessions to accelerate your engineering career before graduation.",
    icon: <Rocket className="w-6 h-6" />,
    color: "text-violet-400",
    iconBg: "bg-violet-500/10 border-violet-500/20",
    glow: "#8B5CF6",
    span: "col-span-1 md:col-span-4 lg:col-span-4",
    featured: false,
  },
  {
    title: "Win Competitions",
    description:
      "Regular hackathons, coding contests and tech fests with prizes, recognition and portfolio gold.",
    icon: <Trophy className="w-6 h-6" />,
    color: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    glow: "#F59E0B",
    span: "col-span-1 md:col-span-4 lg:col-span-4",
    featured: false,
  },
  {
    title: "Industry Ready",
    description:
      "Learn Next.js, Firebase, AI/ML, DevOps â€” real stacks, not just theory.",
    icon: <Zap className="w-6 h-6" />,
    color: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    glow: "#10B981",
    span: "col-span-1 md:col-span-4 lg:col-span-4",
    featured: false,
  },
  {
    title: "Global Exposure",
    description:
      "Participate in international competitions and gain worldwide visibility for your work.",
    icon: <Globe className="w-6 h-6" />,
    color: "text-orange-400",
    iconBg: "bg-orange-500/10 border-orange-500/20",
    glow: "#F97316",
    span: "col-span-1 md:col-span-4 lg:col-span-4",
    featured: false,
  },
];

export function WhyConnect() {
  return (
    <section className="py-28 relative z-10">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="container-grid">

        {/* Section Header */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          className="col-span-4 md:col-span-6 lg:col-span-12 mb-14"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <span className="w-6 h-[2px] bg-white/20 rounded-full" />
            <span className="eyebrow text-white/40">Why Join Us</span>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-h2 font-black uppercase tracking-tighter text-white"
          >
            Why{" "}
            <span className="text-primary">Connect?</span>
          </motion.h2>
        </motion.div>

        {/* Premium Bento Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="col-span-4 md:col-span-6 lg:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-4"
        >
          {pillars.map((pillar, idx) => (
            <motion.div
              key={idx}
              variants={scaleIn}
              className={`${pillar.span} group relative rounded-2xl border border-white/[0.07] overflow-hidden transition-all duration-300 hover:border-white/[0.15] hover:-translate-y-1`}
              style={{
                background: "#0C0E1A",
                minHeight: pillar.featured ? "220px" : "180px",
              }}
            >
              {/* Hover glow from top-left */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 0% 0%, ${pillar.glow}18, transparent 60%)`,
                }}
              />

              {/* Top gradient border on hover */}
              <div
                className="absolute top-0 left-8 right-8 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, transparent, ${pillar.glow}90, transparent)` }}
              />

              <div className="relative z-10 p-7 flex flex-col h-full">
                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-5 ${pillar.iconBg} ${pillar.color} flex-shrink-0 transition-transform group-hover:scale-110 duration-300`}>
                  {pillar.icon}
                </div>

                <h3 className="font-display font-black text-lg text-white uppercase tracking-tight mb-2">
                  {pillar.title}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed flex-1">
                  {pillar.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

