"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Calendar, MapPin, Users } from "lucide-react";
import { staggerContainer, fadeUp, slideInLeft, slideInRight, viewportOnce } from "@/lib/animations";

export function FeaturedEvent() {
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
            <span className="w-8 h-[2px] bg-accent-glow rounded-full" />
            <span className="eyebrow text-accent-glow">Featured Event</span>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-h2 font-black uppercase tracking-tighter text-white"
          >
            What&apos;s{" "}
            <span className="text-gradient-cyan">Coming Up</span>
          </motion.h2>
        </motion.div>

        {/* Cinematic card */}
        <motion.div
          variants={slideInLeft}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="col-span-4 md:col-span-6 lg:col-span-12 glass-card overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Image */}
            <div className="md:col-span-5 relative min-h-[320px] md:min-h-[460px] overflow-hidden">
              <img
                  src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200"
                  alt="InspireX Hackathon"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[rgba(9,9,11,0.9)] hidden md:block" />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(9,9,11,0.9)] to-transparent md:hidden" />

              {/* Status badge */}
              <div className="absolute top-6 left-6 z-10">
                <span className="eyebrow bg-accent-glow/20 text-accent-glow border border-accent-glow/30 px-4 py-2 rounded-full">
                  Upcoming
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="md:col-span-7 p-8 md:p-16 flex flex-col justify-center">
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={viewportOnce}
                >
                <motion.h3
                  variants={fadeUp}
                  className="text-h3 font-black uppercase tracking-tighter text-gradient-cyan mb-6"
                >
                  InspireX Hackathon 2026
                </motion.h3>

                <motion.p variants={fadeUp} className="text-body text-white/60 mb-8 max-w-lg">
                  A 48-hour building sprint. Bring your ideas, form a team, and
                  build the next big thing. Mentorship, food, and huge prizes.
                </motion.p>

                  <motion.div
                    variants={fadeUp}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10"
                  >
                    {[
                      { icon: <Calendar className="w-4 h-4" />, text: "Oct 15–17, 2026" },
                      { icon: <MapPin className="w-4 h-4" />, text: "Main Auditorium, VCE" },
                      { icon: <Users className="w-4 h-4" />, text: "200+ Participants" },
                    ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-white/50 text-label font-bold uppercase tracking-widest">
                      <span className="text-primary">{item.icon}</span>
                      {item.text}
                    </div>
                  ))}
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <Link
                      href="/events/inspirex-2026"
                      className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl text-sm font-bold uppercase tracking-widest btn-glow transition-all border border-transparent hover:!bg-none hover:bg-white/10 hover:text-white hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                    >
                      Register Now
                      <ArrowRight className="w-4 h-4 text-current group-hover:animate-pulse group-hover:translate-x-1 transition-transform" />
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
