"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Sparkles } from "lucide-react";
import { staggerContainer, fadeUp } from "@/lib/animations";
import { BackgroundClient } from "../three/BackgroundClient";

// Lazy-load 3D canvas (no SSR)
const LogoCanvas = dynamic(
  () => import("@/components/three/HeroCanvas"),
  { ssr: false, loading: () => null }
);

// ─── Typing effect ────────────────────────────────────────────────────────────
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
      <span className="text-gradient-cyan">{text}</span>
      <span className="inline-block w-[2px] h-[0.8em] bg-secondary align-middle ml-1 animate-pulse" />
    </>
  );
}


// ─── Hero ─────────────────────────────────────────────────────────────────────
export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const leftY  = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
  const rightY = useTransform(scrollYProgress, [0, 1], ["0%", "5%"]);
  
  // Adjusted opacity fade so it doesn't disappear too quickly on mobile scrolling
  const opacity = useTransform(scrollYProgress, [0, 0.9], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-[100svh] flex items-center overflow-hidden pt-20 pb-10 md:pt-0 md:pb-0">
      
      {/* 3D Moving Grid & Stars Background - Scoped explicitly to Hero */}
      <BackgroundClient />

      {/* Ambient right-side glow that complements the logo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-full md:w-[55%] h-full bg-[radial-gradient(ellipse_at_center,rgba(0,85,255,0.15),transparent_65%)] md:bg-[radial-gradient(ellipse_at_60%_50%,rgba(0,85,255,0.1),transparent_65%)]" />
        <div className="absolute right-[5%] md:right-[15%] top-[20%] md:top-[30%] w-[250px] md:w-[300px] h-[250px] md:h-[300px] rounded-full bg-[radial-gradient(ellipse,rgba(0,229,255,0.07),transparent_70%)]" />
      </div>

      <div className="relative z-10 container-grid items-center min-h-full md:min-h-[90vh] py-12 md:pt-24 md:pb-16 gap-y-12 md:gap-y-0">

          {/* ── LEFT: content ─── */}
          <motion.div
            style={{ y: leftY, opacity }}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="col-span-4 md:col-span-6 lg:col-span-6 flex flex-col items-center text-center md:items-start md:text-left z-20"
          >
            {/* Eyebrow */}
            <motion.div variants={fadeUp} className="mb-6">
              <span className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-accent-glow/20 bg-accent-glow/10 text-[10px] md:text-label font-bold tracking-widest uppercase text-accent-glow">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-glow animate-pulse" />
                Student Technology Club · VCE
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              variants={fadeUp}
              className="text-h1 font-black uppercase tracking-tighter text-white mb-4 md:mb-6 leading-[1.05]"
            >
              We Build.<br />
              <span className="text-gradient-cyan">We Ship.</span><br />
              We Connect.
            </motion.h1>

            {/* Typing */}
            <motion.p
              variants={fadeUp}
              className="font-display font-semibold uppercase tracking-widest text-white/20 mb-4 md:mb-6 text-[10px] md:text-label"
            >
              <TypingEffect />
            </motion.p>

            {/* Description */}
            <motion.p
              variants={fadeUp}
              className="text-sm md:text-body text-white/50 md:text-white/40 mb-8 max-w-sm md:max-w-md"
            >
              The official technology community at Vardhaman College of
              Engineering. Real software, epic events, and real career outcomes.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 sm:px-0">
              <Link
                href="/events"
                className="group flex items-center justify-center gap-2 px-6 md:px-8 py-3.5 md:py-4 rounded-xl text-xs md:text-label font-bold uppercase tracking-widest btn-glow transition-all border border-transparent hover:!bg-none hover:bg-white/10 hover:text-white hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] w-full sm:w-auto"
              >
                Explore Events
                <ArrowRight className="w-4 h-4 text-current group-hover:animate-pulse group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/connect-ai"
                className="group flex items-center justify-center gap-2 px-6 md:px-8 py-3.5 md:py-4 rounded-xl text-xs md:text-label font-bold uppercase tracking-widest transition-all border bg-white/5 text-white/80 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] w-full sm:w-auto"
              >
                <Sparkles className="w-4 h-4 text-current group-hover:animate-pulse" />
                Connect AI
              </Link>
            </motion.div>
          </motion.div>

          {/* ── RIGHT: 3D logo ─── */}
          <motion.div
            style={{ y: rightY }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="col-span-4 md:col-span-6 lg:col-span-6 flex flex-col items-center justify-center z-10"
          >
            {/* Globe container - Responsive sizing */}
            <div className="relative w-full max-w-[280px] sm:max-w-[360px] md:max-w-[90%] lg:max-w-[580px] mx-auto">
              <div className="relative w-full pb-[100%]">
                {/* Ambient glow behind the sphere */}
                <div className="absolute inset-[8%] rounded-full pointer-events-none"
                  style={{ background: "radial-gradient(ellipse,rgba(0,85,255,0.22) 0%,transparent 68%)", filter: "blur(24px)" }}
                />

                {/* 3D canvas */}
                <div className="absolute inset-0">
                  <LogoCanvas />
                </div>
              </div>
            </div>

            {/* Connect Club wordmark */}
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

      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-30" />
    </section>
  );
}
