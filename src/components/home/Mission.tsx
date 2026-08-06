"use client";

import { motion } from "framer-motion";
import { staggerContainer, fadeUp, slideInLeft, viewportOnce } from "@/lib/animations";
import { Code2, Lightbulb, Rocket } from "lucide-react";

export function Mission() {
  return (
    <section className="py-24 relative z-10">
      <div className="container-grid items-start">

          {/* Left — eyebrow + accent line */}
          <motion.div
            variants={slideInLeft}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="col-span-4 md:col-span-6 lg:col-span-3"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-[2px] bg-secondary rounded-full" />
              <span className="eyebrow text-accent-glow">Our Mission</span>
            </div>
            <div className="hidden md:block w-[1px] h-40 bg-gradient-to-b from-white/20 to-transparent mt-6 ml-4" />
          </motion.div>

          {/* Right — body */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="col-span-4 md:col-span-6 lg:col-span-9"
          >
            <motion.h2
              variants={fadeUp}
              className="text-h2 font-black uppercase tracking-tighter text-white mb-8"
            >
              We bridge the gap between{" "}
              <span className="text-gradient-cyan">
                academic learning
              </span>{" "}
              and industry innovation.
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="text-body text-white/50 max-w-2xl mb-12"
            >
              Connect Club is more than a tech community — it's a launchpad. We
              prepare students for real-world engineering through hands-on
              projects, hackathons, and direct mentorship from industry
              professionals.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {[
                { label: "Build", desc: "Real-world software used by students and faculty.", icon: <Code2 className="w-6 h-6 text-accent-glow" /> },
                { label: "Learn", desc: "Industry-grade stacks before you graduate.", icon: <Lightbulb className="w-6 h-6 text-accent-glow" /> },
                { label: "Ship", desc: "Products with actual users, not just demos.", icon: <Rocket className="w-6 h-6 text-accent-glow" /> },
              ].map((item) => (
                <div
                  key={item.label}
                  className="glass-card p-8 group h-full flex flex-col"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent-glow/10 flex items-center justify-center mb-6">
                    {item.icon}
                  </div>
                  <p className="font-display font-black text-xl text-white uppercase mb-2">{item.label}</p>
                  <p className="text-body text-white/50">{item.desc}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
      </div>
    </section>
  );
}
