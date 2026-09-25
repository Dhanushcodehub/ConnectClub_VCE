"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Calendar, MapPin, Users } from "lucide-react";
import { staggerContainer, fadeUp, slideInLeft, viewportOnce } from "@/lib/animations";

export function FeaturedEvent() {
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
            <span className="eyebrow text-white/40">Featured Event</span>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-h2 font-black uppercase tracking-tighter text-white"
          >
            What&apos;s{" "}
            <span className="text-primary">Coming Up</span>
          </motion.h2>
        </motion.div>

        {/* Cinematic card */}
        <motion.div
          variants={slideInLeft}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="col-span-4 md:col-span-6 lg:col-span-12 rounded-2xl border border-white/[0.07] overflow-hidden"
          style={{ background: "#0C0E1A" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Image */}
            <div className="md:col-span-5 relative min-h-[280px] md:min-h-[420px] overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200"
                alt="InspireX Season 2"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] hover:scale-105"
              />
              {/* Image overlays */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0C0E1A] hidden md:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0C0E1A] to-transparent md:hidden" />

              {/* Status badge */}
              <div className="absolute top-5 left-5 z-10">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-[#0A1A0F] text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Upcoming
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="md:col-span-7 p-8 md:p-14 flex flex-col justify-center">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
              >
                <motion.span variants={fadeUp} className="eyebrow text-white/30 block mb-4">
                  InspireX Season 2
                </motion.span>

                <motion.h3
                  variants={fadeUp}
                  className="text-h3 font-black uppercase tracking-tighter text-primary mb-5"
                >
                  InspireX Season 2
                </motion.h3>

                <motion.p variants={fadeUp} className="text-body text-white/40 mb-8 max-w-lg leading-relaxed">
                  A Full day event featuring inspiring talks, Real World Opportunities, and networking opportunities with industry leaders. Join us to explore the latest trends and innovations in technology and design.
                </motion.p>

                <motion.div
                  variants={fadeUp}
                  className="flex flex-col sm:flex-row gap-4 mb-10"
                >
                  {[
                    { icon: <Calendar className="w-4 h-4" />, text: "Coming Soon" },
                    { icon: <MapPin className="w-4 h-4" />, text: "Main Auditorium, VCE" },
                    { icon: <Users className="w-4 h-4" />, text: "200+ Participants" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/[0.07] text-white/50 text-xs font-bold uppercase tracking-wider"
                      style={{ background: "#0A0B14" }}
                    >
                      <span className="text-blue-400">{item.icon}</span>
                      {item.text}
                    </div>
                  ))}
                </motion.div>

                <motion.div variants={fadeUp}>
                  <Link
                    href="/events/inspirex-2026"
                    className="group inline-flex items-center gap-3 px-7 py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest btn-glow transition-all border border-transparent hover:!bg-none hover:bg-white/10 hover:text-white hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                  >
                    Register Now
                    <ArrowRight className="w-4 h-4 text-current group-hover:translate-x-1 transition-transform" />
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

