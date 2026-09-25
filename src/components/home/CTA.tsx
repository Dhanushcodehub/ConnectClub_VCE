"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Instagram, Linkedin, Youtube, Mail } from "lucide-react";
import { staggerContainer, fadeUp, viewportOnce } from "@/lib/animations";

export function CTA() {
  return (
    <section className="relative z-10 bg-[#0C0E1A] pt-32 pb-24 mt-20">
      {/* Torn paper effect using SVG mask or background */}
      <div 
        className="absolute top-0 left-0 w-full h-8 md:h-12 bg-repeat-x z-20 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpolygon fill='white' points='0,100 100,100 100,0 95,20 85,5 75,25 65,10 50,30 40,5 25,25 15,10 5,25 0,0' /%3E%3Cpolygon fill='%230C0E1A' points='0,100 100,100 100,15 95,35 85,20 75,40 65,25 50,45 40,20 25,40 15,25 5,40 0,15' /%3E%3C/svg%3E")`,
          backgroundSize: "120px 100%",
          transform: "translateY(-98%)" 
        }}
      />

      <div className="container-grid">
        <div className="col-span-4 md:col-span-6 lg:col-span-8 lg:col-start-3">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="flex flex-col items-center text-center"
          >
            <motion.h2
              variants={fadeUp}
              className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white mb-6"
              style={{ transform: "skewX(-8deg)" }}
            >
              Get In Touch
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="text-lg md:text-xl text-white/70 mb-16 max-w-2xl"
            >
              Have questions or need assistance? Reach out to us via our official emails or social media.
            </motion.p>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
              {/* Left Column - Socials */}
              <motion.div variants={fadeUp} className="flex flex-col items-center md:items-start space-y-6">
                <a href="#" className="flex items-center gap-4 text-white/60 hover:text-white transition-colors group">
                  <Instagram className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-lg font-medium">Instagram</span>
                </a>
                <a href="#" className="flex items-center gap-4 text-white/60 hover:text-white transition-colors group">
                  <Linkedin className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-lg font-medium">LinkedIn</span>
                </a>
                <a href="#" className="flex items-center gap-4 text-white/60 hover:text-white transition-colors group">
                  <Youtube className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-lg font-medium">YouTube</span>
                </a>
              </motion.div>

              {/* Right Column - Emails */}
              <motion.div variants={fadeUp} className="flex flex-col items-center md:items-start space-y-8">
                <div>
                  <h4 className="text-primary font-bold tracking-widest uppercase text-xs mb-2">Connect Club Email</h4>
                  <a href="mailto:connectclub@vce.ac.in" className="text-xl md:text-2xl font-bold text-white hover:text-primary transition-colors">
                    connectclub@vce.ac.in
                  </a>
                </div>
                <div>
                  <h4 className="text-primary font-bold tracking-widest uppercase text-xs mb-2">Support Email</h4>
                  <a href="mailto:support@connectclubvce.in" className="text-xl md:text-2xl font-bold text-white hover:text-primary transition-colors">
                    support@connectclubvce.in
                  </a>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

