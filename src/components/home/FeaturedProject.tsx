"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Code2, ExternalLink, GitBranch } from "lucide-react";
import { staggerContainer, fadeUp, slideInRight, viewportOnce } from "@/lib/animations";

const techStack = ["Next.js 16", "Firebase", "Gemini API", "TypeScript", "Tailwind CSS"];

export function FeaturedProject() {
  return (
    <section className="py-28 relative z-10">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="container-grid">

        {/* Section header */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="col-span-4 md:col-span-6 lg:col-span-12 mb-14"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <span className="w-6 h-[2px] bg-white/20 rounded-full" />
            <span className="eyebrow text-white/40">Featured Project</span>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-h2 font-black uppercase tracking-tighter text-white"
          >
            What We&apos;ve{" "}
            <span className="text-gradient-cyan">Shipped</span>
          </motion.h2>
        </motion.div>

        {/* Cinematic card */}
        <motion.div
          variants={slideInRight}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="col-span-4 md:col-span-6 lg:col-span-12 rounded-2xl border border-white/[0.07] overflow-hidden relative"
          style={{ background: "#0C0E1A" }}
        >
          {/* Background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 70% 50%, rgba(0,85,255,0.08), transparent 65%)",
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-12 relative z-10">
            {/* Content */}
            <div className="md:col-span-7 p-8 md:p-14 flex flex-col justify-center order-2 md:order-1">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
              >
                <motion.div variants={fadeUp} className="flex items-center gap-2.5 mb-5">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Code2 className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <span className="eyebrow text-blue-400">Internal Tooling</span>
                </motion.div>

                <motion.h3
                  variants={fadeUp}
                  className="text-h3 font-black uppercase tracking-tighter text-gradient-cyan mb-5"
                >
                  Connect AI
                </motion.h3>

                <motion.p variants={fadeUp} className="text-body text-white/40 mb-8 max-w-lg leading-relaxed">
                  An intelligent assistant powered by the Gemini API, designed
                  to answer student queries, manage event registrations, and
                  guide new members. Built directly into our platform.
                </motion.p>

                <motion.div variants={fadeUp} className="flex flex-wrap gap-2 mb-10">
                  {techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-white/[0.07] text-white/35 rounded-lg"
                      style={{ background: "#0A0B14" }}
                    >
                      {tech}
                    </span>
                  ))}
                </motion.div>

                <motion.div variants={fadeUp} className="flex items-center gap-5">
                  <Link
                    href="/projects/connect-ai"
                    className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest btn-glow transition-all border border-transparent hover:!bg-none hover:bg-white/10 hover:text-white hover:border-white/40"
                  >
                    Case Study
                    <ArrowRight className="w-4 h-4 text-current group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/connect-ai"
                    className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Live Demo
                  </Link>
                </motion.div>
              </motion.div>
            </div>

            {/* Visual panel */}
            <div className="md:col-span-5 order-1 md:order-2 flex items-center justify-center p-10 md:p-14 border-b md:border-b-0 md:border-l border-white/[0.05]">
              <div className="w-full max-w-[240px] rounded-2xl border border-white/[0.07] p-6 flex flex-col gap-3" style={{ background: "#0A0B14" }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <GitBranch className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">connect-ai</p>
                    <p className="text-[10px] text-white/30">v2.1.0 · Production</p>
                  </div>
                  <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                </div>
                {[
                  { label: "Students Served", val: "1.2k+", color: "text-blue-400" },
                  { label: "Queries / Day", val: "340+", color: "text-cyan-400" },
                  { label: "Avg Response", val: "0.8s", color: "text-emerald-400" },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-t border-white/[0.05]">
                    <span className="text-[11px] text-white/40">{row.label}</span>
                    <span className={`text-sm font-bold ${row.color}`}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
