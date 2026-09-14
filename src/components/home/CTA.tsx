"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { staggerContainer, fadeUp, scaleIn, viewportOnce } from "@/lib/animations";

export function CTA() {
  return (
    <section className="py-28 relative z-10">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="container-grid">
        <div className="col-span-4 md:col-span-6 lg:col-span-12">
          <motion.div
            variants={scaleIn}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="relative rounded-2xl border border-white/[0.07] p-12 md:p-20 overflow-hidden"
            style={{ background: "#0C0E1A" }}
          >
            {/* Background glow blobs */}
            <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-blue-600/15 blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              className="relative z-10 text-center flex flex-col items-center"
            >
              <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
                <span className="w-6 h-[2px] bg-white/20 rounded-full" />
                <span className="eyebrow text-white/40">Get Involved</span>
                <span className="w-6 h-[2px] bg-white/20 rounded-full" />
              </motion.div>

              <motion.h2
                variants={fadeUp}
                className="text-h1 font-black uppercase tracking-tighter text-white mb-5"
              >
                Ready to{" "}
                <span className="text-gradient-cyan">Build?</span>
              </motion.h2>

              <motion.p
                variants={fadeUp}
                className="text-body text-white/40 max-w-xl mb-12 leading-relaxed"
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
                  className="group flex items-center gap-3 px-9 py-4.5 rounded-xl text-label font-bold uppercase tracking-widest btn-glow transition-all border border-transparent hover:!bg-none hover:bg-white/10 hover:text-white hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] w-full sm:w-auto justify-center"
                >
                  See Upcoming Events
                  <ArrowRight className="w-4 h-4 text-current group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/connect-ai"
                  className="flex items-center gap-3 px-9 py-4.5 rounded-xl text-label font-bold uppercase tracking-widest border border-white/10 bg-[#0A0B14] text-white/60 hover:bg-[#13151F] hover:text-white hover:border-white/25 transition-all w-full sm:w-auto justify-center"
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
