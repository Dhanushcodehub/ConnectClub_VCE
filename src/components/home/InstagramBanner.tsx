"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { CTAButton } from "@/components/ui/CTAButton";
import { staggerContainer, fadeUp, slideInRight, viewportOnce } from "@/lib/animations";

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export function InstagramBanner() {
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
          className="col-span-4 md:col-span-6 lg:col-span-12 mb-14 text-center md:text-left flex flex-col items-center md:items-start"
        >
          <motion.div variants={fadeUp} className="flex items-center justify-center md:justify-start gap-3 mb-4">
            <span className="w-6 h-[2px] bg-white/20 rounded-full" />
            <span className="eyebrow text-white/40">Social Media</span>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="text-h2 font-display font-black uppercase tracking-wide text-white"
          >
            Stay <span className="text-highlight">Updated</span>
          </motion.h2>
        </motion.div>

        {/* Cinematic banner card */}
        <motion.div
          variants={slideInRight}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="col-span-4 md:col-span-6 lg:col-span-12 rounded-3xl border border-white/[0.07] overflow-hidden relative group"
          style={{ background: "#0C0C0E" }}
        >
          {/* Background glow and gradients */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-700 opacity-60 group-hover:opacity-100"
            style={{
              background: "radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.15) 0%, transparent 60%)",
            }}
          />
          <div className="absolute inset-0 bg-grid-pattern opacity-30" />

          {/* Large Background Text Watermark */}
          <div className="absolute bottom-0 right-0 pointer-events-none select-none z-0 translate-y-[20%] translate-x-[15%]">
            <span
              className="font-display font-black leading-none whitespace-nowrap text-white opacity-5"
              style={{ 
                fontSize: "clamp(3rem, 11vw, 12rem)",
                WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
                maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)"
              }}
            >
              #CONNECT
            </span>
          </div>

          <div className="relative p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10 z-10">
            
            {/* Content Left */}
            <div className="flex-1 max-w-2xl text-center md:text-left">
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[1px] mb-8 inline-block shadow-[0_0_30px_rgba(217,70,239,0.3)] cursor-pointer"
              >
                <div className="w-full h-full bg-[#0C0C0E] rounded-2xl flex items-center justify-center">
                  <InstagramIcon className="w-8 h-8 text-white" />
                </div>
              </motion.div>
              <h3 className="text-3xl md:text-4xl font-display font-black text-white mb-6 uppercase tracking-tight">
                Follow Us On Instagram
              </h3>
              <p className="text-white/60 text-lg leading-relaxed mb-8">
                Join our growing community online. Get the latest updates on upcoming hackathons, tech workshops, behind-the-scenes event prep, and connect with fellow developers at Vardhaman College of Engineering.
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <CTAButton
                  href="https://instagram.com/connectclubvce"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="primary"
                  size="lg"
                  icon={<InstagramIcon className="w-4 h-4" />}
                  iconPosition="left"
                >
                  @connectclubvce
                </CTAButton>
              </div>
            </div>

            {/* Right Side Visual (Abstract representation of posts/feed) */}
            <div className="hidden lg:flex flex-col gap-4 w-[400px] absolute right-4 md:right-10 top-12 bottom-[-20%] pointer-events-none transform rotate-[-5deg] group-hover:rotate-0 transition-transform duration-700 z-10 overflow-visible">
              {/* Fake post 1 */}
              <div className="w-full rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-sm shadow-xl flex items-center gap-4 translate-x-12 group-hover:translate-x-0 transition-transform duration-700 delay-100">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/40 to-purple-600/20 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-2.5 w-1/3 bg-white/20 rounded-full" />
                  <div className="h-2 w-3/4 bg-white/10 rounded-full" />
                  <div className="h-2 w-1/2 bg-white/10 rounded-full" />
                </div>
              </div>
              {/* Fake post 2 */}
              <div className="w-full rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-sm shadow-xl flex items-center gap-4 -translate-x-4 group-hover:translate-x-0 transition-transform duration-700 delay-200">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500/40 to-primary/20 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-2.5 w-1/2 bg-white/20 rounded-full" />
                  <div className="h-2 w-4/5 bg-white/10 rounded-full" />
                  <div className="h-2 w-2/3 bg-white/10 rounded-full" />
                </div>
              </div>
              {/* Fake post 3 (Full size post mockup) */}
              <div className="w-full rounded-2xl border border-white/5 bg-[#0C0C0E]/50 p-4 backdrop-blur-md shadow-2xl flex flex-col gap-4 translate-x-6 group-hover:translate-x-0 transition-transform duration-700 delay-300">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[1px]">
                    <div className="w-full h-full rounded-full bg-[#0C0C0E] flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-white/20" />
                    </div>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="h-2 w-1/3 bg-white/30 rounded-full" />
                    <div className="h-1.5 w-1/4 bg-white/10 rounded-full" />
                  </div>
                </div>
                {/* Image */}
                <div className="w-full aspect-[4/3] rounded-xl bg-gradient-to-br from-pink-500/20 to-orange-400/10 border border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-grid-pattern opacity-20" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0E]/80 to-transparent" />
                </div>
                {/* Footer / Caption */}
                <div className="space-y-2.5">
                  <div className="flex gap-2">
                    <div className="w-5 h-5 rounded-full bg-white/20" />
                    <div className="w-5 h-5 rounded-full bg-white/10" />
                    <div className="w-5 h-5 rounded-full bg-white/10" />
                  </div>
                  <div className="h-2 w-full bg-white/20 rounded-full" />
                  <div className="h-2 w-2/3 bg-white/10 rounded-full" />
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}
