"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { staggerContainer, fadeUp, scaleIn, viewportOnce } from "@/lib/animations";

export function CTA() {
  return (
    <section className="py-24 relative z-10">
      <div className="container-grid">
        <div className="col-span-4 md:col-span-6 lg:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6">
          <motion.div
            variants={scaleIn}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="col-span-12 glass-card p-12 md:p-24 relative overflow-hidden bg-gradient-to-br from-white/[0.05] to-transparent"
          >
            {/* Background glow blobs inside the card */}
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent-glow/15 blur-[120px] pointer-events-none" />

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              className="relative z-10 text-center flex flex-col items-center"
            >
              <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
                <span className="w-8 h-[2px] bg-accent-glow rounded-full" />
                <span className="eyebrow text-accent-glow">Get Involved</span>
                <span className="w-8 h-[2px] bg-accent-glow rounded-full" />
              </motion.div>

              <motion.h2
                variants={fadeUp}
                className="text-h1 font-black uppercase tracking-tighter text-white mb-6"
              >
                Ready to{" "}
                <span className="text-gradient-cyan">Build?</span>
              </motion.h2>

              <motion.p
                variants={fadeUp}
                className="text-body text-white/50 max-w-xl mb-12"
              >
                Join the community of innovators. Attend our next event, or
                talk to Connect AI to find out how to get involved.
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="flex flex-col sm:flex-row items-center gap-4"
              >
                <Link
                  href="/events"
                  className="group flex items-center gap-3 px-10 py-5 rounded-xl text-label font-bold uppercase tracking-widest btn-glow transition-all border border-transparent hover:!bg-none hover:bg-white/10 hover:text-white hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] w-full sm:w-auto justify-center"
                >
                  See Upcoming Events
                  <ArrowRight className="w-4 h-4 text-current group-hover:animate-pulse group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/connect-ai"
                  className="flex items-center gap-3 px-10 py-5 rounded-xl text-label font-bold uppercase tracking-widest border border-accent-glow/30 bg-accent-glow/10 text-accent-glow hover:bg-accent-glow/20 transition-all w-full sm:w-auto justify-center"
                >
                  <Sparkles className="w-4 h-4" />
                  Chat with Connect AI
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
