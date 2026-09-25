"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, ArrowDown, Sparkles } from "lucide-react";
import { staggerContainer, fadeUp } from "@/lib/animations";
import { BackgroundClient } from "../three/BackgroundClient";

const LogoCanvas = dynamic(
  () => import("@/components/three/HeroCanvas"),
  { ssr: false, loading: () => null }
);

const PHRASES = [
  "Engineering Excellence.",
  "Building the Future.",
  "Innovating Together.",
  "Shipping Real Products.",
];

function TypingEffect() {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [del, setDel] = useState(false);

  useEffect(() => {
    const cur = PHRASES[idx];
    let t: ReturnType<typeof setTimeout>;
    if (!del && text.length < cur.length)
      t = setTimeout(() => setText(cur.slice(0, text.length + 1)), 58);
    else if (!del)
      t = setTimeout(() => setDel(true), 2000);
    else if (del && text.length > 0)
      t = setTimeout(() => setText(text.slice(0, -1)), 30);
    else { setDel(false); setIdx((i) => (i + 1) % PHRASES.length); }
    return () => clearTimeout(t);
  }, [text, del, idx]);

  return (
    <>
      <span className="text-primary">{text}</span>
      <span className="inline-block w-[2px] h-[0.8em] bg-secondary align-middle ml-1 animate-pulse" />
    </>
  );
}

const TECH_TAGS = ["Next.js", "Firebase", "Gemini AI", "TypeScript", "DevOps", "Open Source"];

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const leftY  = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
  const rightY = useTransform(scrollYProgress, [0, 1], ["0%", "5%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.9], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-[100svh] flex items-center overflow-hidden pt-20 pb-10 md:pt-0 md:pb-0">
      
      {/* Background */}
      <BackgroundClient />

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-full md:w-[55%] h-full bg-[radial-gradient(ellipse_at_center,rgba(147,51,234,0.15),transparent_65%)] md:bg-[radial-gradient(ellipse_at_60%_50%,rgba(147,51,234,0.1),transparent_65%)]" />
        <div className="absolute right-[5%] md:right-[15%] top-[20%] md:top-[30%] w-[250px] md:w-[300px] h-[250px] md:h-[300px] rounded-full bg-[radial-gradient(ellipse,rgba(168,85,247,0.07),transparent_70%)]" />
      </div>

      <div className="relative z-10 container-grid items-center min-h-full md:min-h-[90vh] py-12 md:pt-24 md:pb-16 gap-y-12 md:gap-y-0">

          {/* â”€â”€ LEFT: content â”€â”€â”€ */}
          <motion.div
            style={{ y: leftY, opacity }}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="col-span-4 md:col-span-6 lg:col-span-6 flex flex-col items-center text-center md:items-start md:text-left z-20"
          >
            {/* Eyebrow */}
            <motion.div variants={fadeUp} className="mb-6">
              <span className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-white/10 bg-[#0D0F1A] text-[10px] md:text-label font-bold tracking-widest uppercase text-white/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Student Technology Club Â· VCE
              </span>
            </motion.div>

            {/* Heading â€” word-by-word stagger */}
            <motion.h1
              variants={fadeUp}
              className="text-h1 font-black uppercase tracking-tighter text-white mb-4 md:mb-6 leading-[1.05]"
            >
              We Build.<br />
              <span className="text-primary">We Ship.</span><br />
              We Connect.
            </motion.h1>

            {/* Typing subline */}
            <motion.p
              variants={fadeUp}
              className="font-display font-semibold uppercase tracking-widest text-white/30 mb-4 md:mb-6 text-[10px] md:text-label"
            >
              <TypingEffect />
            </motion.p>

            {/* Description */}
            <motion.p
              variants={fadeUp}
              className="text-sm md:text-body text-white/40 mb-8 max-w-sm md:max-w-md"
            >
              The official technology community at Vardhaman College of
              Engineering. Real software, epic events, and real career outcomes.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 sm:px-0 mb-8">
              <Link
                href="/events"
                className="group flex items-center justify-center gap-2 px-6 md:px-8 py-3.5 md:py-4 rounded-xl text-xs md:text-label font-bold uppercase tracking-widest btn-glow transition-all border border-transparent hover:!bg-none hover:bg-white/10 hover:text-white hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] w-full sm:w-auto"
              >
                Explore Events
                <ArrowRight className="w-4 h-4 text-current group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/connect-ai"
                className="group flex items-center justify-center gap-2 px-6 md:px-8 py-3.5 md:py-4 rounded-xl text-xs md:text-label font-bold uppercase tracking-widest transition-all border bg-[#0D0F1A] text-white/70 border-white/10 hover:bg-[#13151F] hover:text-white hover:border-white/30 w-full sm:w-auto"
              >
                <Sparkles className="w-4 h-4 text-current group-hover:animate-pulse" />
                Connect AI
              </Link>
            </motion.div>

            {/* Tech stack tags */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-2 justify-center md:justify-start">
              {TECH_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider border border-white/[0.07] bg-[#0D0F1A] text-white/35 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* â”€â”€ RIGHT: 3D logo â”€â”€â”€ */}
          <motion.div
            style={{ y: rightY }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="col-span-4 md:col-span-6 lg:col-span-6 flex flex-col items-center justify-center z-10 w-full"
          >
            <div className="relative w-[280px] sm:w-[320px] md:w-[90%] lg:w-[580px] md:max-w-[580px] mx-auto aspect-square">
              <div className="absolute inset-[8%] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(ellipse,rgba(147,51,234,0.22) 0%,transparent 68%)", filter: "blur(24px)" }}
              />
              <div className="absolute inset-0">
                <LogoCanvas />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.7 }}
              className="mt-4 md:mt-6 relative z-20 flex flex-col items-center gap-1 select-none"
            >
              <p className="font-display font-black uppercase tracking-[0.2em] text-white/70 text-[10px] md:text-base">
                Connect Club
              </p>
              <p className="eyebrow text-[7px] md:text-[9px] text-white/25">Vardhaman College of Engineering</p>
            </motion.div>
          </motion.div>

        </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 hidden md:flex"
      >
        <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/20">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <ArrowDown className="w-4 h-4 text-white/20" />
        </motion.div>
      </motion.div>

      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-30" />
    </section>
  );
}

