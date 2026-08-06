"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Code2, ExternalLink } from "lucide-react";
import { staggerContainer, fadeUp, slideInRight, viewportOnce } from "@/lib/animations";

export function FeaturedProject() {
  return (
    <section className="py-24 relative z-10">
      <div className="container-grid">

        {/* Section header */}
          <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="col-span-4 md:col-span-6 lg:col-span-12 mb-16"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <span className="w-8 h-[2px] bg-primary rounded-full" />
            <span className="eyebrow text-primary">Featured Project</span>
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
          className="col-span-4 md:col-span-6 lg:col-span-12 glass-card overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Content */}
            <div className="md:col-span-7 p-8 md:p-16 flex flex-col justify-center order-2 md:order-1">
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={viewportOnce}
                >
                  <motion.div variants={fadeUp} className="flex items-center gap-2.5 mb-5">
                    <Code2 className="w-4 h-4 text-primary" />
                    <span className="eyebrow text-primary">Internal Tooling</span>
                  </motion.div>

                  <motion.h3
                    variants={fadeUp}
                    className="text-h3 font-black uppercase tracking-tighter text-gradient-cyan mb-6"
                  >
                    Connect AI
                  </motion.h3>

                  <motion.p variants={fadeUp} className="text-body text-white/60 mb-8 max-w-lg">
                    An intelligent assistant powered by the Gemini API, designed
                    to answer student queries, manage event registrations, and
                    guide new members. Built directly into our platform.
                  </motion.p>

                  <motion.div variants={fadeUp} className="flex flex-wrap gap-2 mb-10">
                    {["Next.js", "Firebase", "Gemini API", "Tailwind CSS"].map((tech) => (
                      <span
                        key={tech}
                        className="px-3 py-1 text-xs font-medium bg-white/[0.04] border border-white/[0.08] rounded-full text-white/60"
                      >
                        {tech}
                      </span>
                    ))}
                  </motion.div>

                  <motion.div variants={fadeUp} className="flex items-center gap-4">
                    <Link
                      href="/projects/connect-ai"
                      className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl text-label font-bold uppercase tracking-widest btn-glow transition-all border border-transparent hover:!bg-none hover:bg-white/10 hover:text-white hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                    >
                      Case Study
                      <ArrowRight className="w-4 h-4 text-current group-hover:animate-pulse group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                      href="/connect-ai"
                      className="flex items-center gap-2 text-label font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Live Demo
                    </Link>
                  </motion.div>
                </motion.div>
              </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
