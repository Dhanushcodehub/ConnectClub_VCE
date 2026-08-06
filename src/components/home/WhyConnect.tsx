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
    color: "text-primary",
    glow: "group-hover:shadow-[0_0_40px_rgba(0,85,255,0.15)]",
    span: "col-span-12 sm:col-span-6 lg:col-span-4",
  },
  {
    title: "Elite Network",
    description:
      "Connect with the top performers on campus. Your network is your net worth.",
    icon: <Users className="w-6 h-6" />,
    color: "text-secondary",
    glow: "group-hover:shadow-[0_0_40px_rgba(0,229,255,0.15)]",
    span: "col-span-12 sm:col-span-6 lg:col-span-4",
  },
  {
    title: "Fast-Track Growth",
    description:
      "Mentorship and weekly learning sessions to accelerate your engineering career.",
    icon: <Rocket className="w-6 h-6" />,
    color: "text-purple-400",
    glow: "group-hover:shadow-[0_0_40px_rgba(192,132,252,0.15)]",
    span: "col-span-12 sm:col-span-6 lg:col-span-4",
  },
  {
    title: "Win Competitions",
    description:
      "Regular hackathons, coding contests and tech fests with prizes and recognition.",
    icon: <Trophy className="w-6 h-6" />,
    color: "text-yellow-400",
    glow: "group-hover:shadow-[0_0_40px_rgba(250,204,21,0.12)]",
    span: "col-span-12 sm:col-span-6 lg:col-span-6",
  },
  {
    title: "Industry Ready",
    description:
      "Learn Next.js, Firebase, AI/ML, DevOps — real stacks, not just academics.",
    icon: <Zap className="w-6 h-6" />,
    color: "text-green-400",
    glow: "group-hover:shadow-[0_0_40px_rgba(74,222,128,0.12)]",
    span: "col-span-12 sm:col-span-6 lg:col-span-3",
  },
  {
    title: "Global Exposure",
    description:
      "Participate in international competitions and gain worldwide visibility.",
    icon: <Globe className="w-6 h-6" />,
    color: "text-orange-400",
    glow: "group-hover:shadow-[0_0_40px_rgba(251,146,60,0.12)]",
    span: "col-span-12 sm:col-span-6 lg:col-span-3",
  },
];

export function WhyConnect() {
  return (
    <section className="py-24 relative z-10">
      <div className="container-grid">

        {/* Section Header */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          className="col-span-4 md:col-span-6 lg:col-span-12 mb-16"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <span className="w-8 h-[2px] bg-accent-glow rounded-full" />
            <span className="eyebrow text-accent-glow">Why Join Us</span>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-h2 font-black uppercase tracking-tighter text-white"
          >
            Why{" "}
            <span className="text-gradient-cyan">Connect?</span>
          </motion.h2>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="col-span-4 md:col-span-6 lg:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6"
        >
          {pillars.map((pillar, idx) => (
            <motion.div
              key={idx}
              variants={scaleIn}
              className={`${pillar.span} glass-card p-6 md:p-8 flex flex-col group ${pillar.glow} transition-shadow duration-500`}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-6 ${pillar.color} transition-transform group-hover:scale-110 duration-300`}
              >
                {pillar.icon}
              </div>
              <h3 className="font-display font-black text-xl text-white uppercase tracking-tight mb-2">
                {pillar.title}
              </h3>
              <p className="text-body text-white/50 leading-relaxed flex-1">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
