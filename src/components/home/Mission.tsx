"use client";

import { motion } from "framer-motion";
import { staggerContainer, fadeUp, slideInLeft, viewportOnce } from "@/lib/animations";
import { Code2, Lightbulb, Rocket } from "lucide-react";

const pillars = [
  {
    label: "Build",
    desc: "Real-world software used by students and faculty every single day.",
    icon: <Code2 className="w-5 h-5" />,
    color: "text-blue-400",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    topLine: "from-blue-500/60",
    num: "01",
  },
  {
    label: "Learn",
    desc: "Industry-grade stacks â€” Next.js, Firebase, AI/ML â€” before you graduate.",
    icon: <Lightbulb className="w-5 h-5" />,
    color: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    topLine: "from-amber-500/60",
    num: "02",
  },
  {
    label: "Ship",
    desc: "Products with actual users, not just demos that sit on your hard drive.",
    icon: <Rocket className="w-5 h-5" />,
    color: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    topLine: "from-emerald-500/60",
    num: "03",
  },
];

export function Mission() {
  return (
    <section className="py-28 relative z-10">
      {/* Horizontal divider line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="container-grid items-start gap-y-16">

          {/* Left â€” eyebrow + accent line */}
          <motion.div
            variants={slideInLeft}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="col-span-4 md:col-span-6 lg:col-span-3"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="w-6 h-[2px] bg-white/20 rounded-full" />
              <span className="eyebrow text-white/40">Our Mission</span>
            </div>
            <div className="hidden md:block w-[1px] h-32 bg-gradient-to-b from-white/10 to-transparent mt-6 ml-4" />
          </motion.div>

          {/* Right â€” body */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="col-span-4 md:col-span-6 lg:col-span-9"
          >
            <motion.h2
              variants={fadeUp}
              className="text-h2 font-black uppercase tracking-tighter text-white mb-6"
            >
              We bridge the gap between{" "}
              <span className="text-primary">
                academic learning
              </span>{" "}
              and industry innovation.
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="text-body text-white/40 max-w-2xl mb-14"
            >
              Connect Club is more than a tech community â€” it&apos;s a launchpad. We
              prepare students for real-world engineering through hands-on
              projects, hackathons, and direct mentorship from industry
              professionals.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {pillars.map((item) => (
                <div
                  key={item.label}
                  className="group relative rounded-2xl p-7 border border-white/[0.07] transition-all duration-300 hover:border-white/[0.14] hover:-translate-y-1 overflow-hidden"
                  style={{ background: "#0D0F1A" }}
                >
                  {/* Decorative background number */}
                  <span className="absolute top-4 right-5 font-black text-6xl text-white/[0.03] select-none pointer-events-none leading-none font-display">
                    {item.num}
                  </span>

                  {/* Gradient top border on hover */}
                  <div className={`absolute top-0 left-6 right-6 h-[2px] rounded-full bg-gradient-to-r ${item.topLine} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-5 ${item.iconBg} ${item.color}`}>
                    {item.icon}
                  </div>
                  <p className="font-display font-black text-xl text-white uppercase mb-2 tracking-tight">{item.label}</p>
                  <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
      </div>
    </section>
  );
}

