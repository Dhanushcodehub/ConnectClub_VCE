"use client";

import { useEffect, useState, useRef } from "react";
import { animate, useInView } from "framer-motion";
import { motion } from "framer-motion";
import { Users, Zap, Layers, GitBranch } from "lucide-react";
import { staggerContainer, fadeUp, viewportOnce } from "@/lib/animations";

function Counter({ from = 0, to, duration = 2, suffix = "" }: { from?: number; to: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(from);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });

  useEffect(() => {
    if (inView) {
      const controls = animate(from, to, {
        duration,
        onUpdate(value) { setCount(Math.round(value)); },
        ease: "easeOut",
      });
      return () => controls.stop();
    }
  }, [from, to, duration, inView]);

  return <span ref={ref}>{count}{suffix}</span>;
}

const stats = [
  {
    label: "Active Members",
    value: 150,
    suffix: "+",
    icon: <Users className="w-5 h-5" />,
    color: "text-blue-400",
    accent: "bg-blue-500/10 border-blue-500/20",
    glow: "#3B82F6",
    desc: "Students across all years",
  },
  {
    label: "Events Hosted",
    value: 40,
    suffix: "+",
    icon: <Zap className="w-5 h-5" />,
    color: "text-cyan-400",
    accent: "bg-cyan-500/10 border-cyan-500/20",
    glow: "#06B6D4",
    desc: "Hackathons, workshops & talks",
  },
  {
    label: "Projects Shipped",
    value: 25,
    suffix: "",
    icon: <Layers className="w-5 h-5" />,
    color: "text-violet-400",
    accent: "bg-violet-500/10 border-violet-500/20",
    glow: "#8B5CF6",
    desc: "Live products with real users",
  },
  {
    label: "Lines of Code",
    value: 100,
    suffix: "k+",
    icon: <GitBranch className="w-5 h-5" />,
    color: "text-emerald-400",
    accent: "bg-emerald-500/10 border-emerald-500/20",
    glow: "#10B981",
    desc: "Across all open-source repos",
  },
];

export function StickyStats() {
  return (
    <section className="py-20 relative z-10 border-t border-white/[0.06]">
      {/* Subtle top glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="container-grid">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="col-span-4 md:col-span-6 lg:col-span-12 mb-12"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-3">
            <span className="w-6 h-[2px] bg-white/20 rounded-full" />
            <span className="eyebrow text-white/40">By the numbers</span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-h2 font-black uppercase tracking-tighter text-white">
            What We've{" "}
            <span className="text-primary">Accomplished</span>
          </motion.h2>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="col-span-4 md:col-span-6 lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              variants={fadeUp}
              className="group relative rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-1 cursor-default overflow-hidden"
              style={{
                background: "#0C0E1A",
                borderColor: "rgba(255,255,255,0.07)",
              }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                style={{
                  background: `radial-gradient(ellipse at 20% 20%, ${stat.glow}15, transparent 70%)`,
                }}
              />

              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-5 ${stat.accent} ${stat.color} relative z-10`}>
                {stat.icon}
              </div>

              {/* Number */}
              <div className={`text-4xl font-black tracking-tight mb-1 ${stat.color} relative z-10`}>
                <Counter to={stat.value} suffix={stat.suffix} />
              </div>

              {/* Label */}
              <p className="font-display font-bold text-white text-sm uppercase tracking-wider mb-1 relative z-10">
                {stat.label}
              </p>
              <p className="text-xs text-white/30 relative z-10">{stat.desc}</p>

              {/* Bottom accent line */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, transparent, ${stat.glow}80, transparent)` }}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

