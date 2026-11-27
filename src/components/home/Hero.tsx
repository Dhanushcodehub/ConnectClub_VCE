"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowDown, Sparkles } from "lucide-react";
import { staggerContainer, fadeUp } from "@/lib/animations";
import { CTAButton } from "@/components/ui/CTAButton";
import { BackgroundClient } from "@/components/three/BackgroundClient";

const HeroGlobe = dynamic(
  () => import("@/components/three/HeroGlobe").then((m) => m.HeroGlobe),
  { ssr: false }
);

const PHRASES = [
  "Engineering Excellence.",
  "Building the Future.",
  "Innovating Together.",
  "Shipping Real Products.",
];

function TypingEffect({ reducedMotion }: { reducedMotion: boolean }) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [del, setDel] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const cur = PHRASES[idx];
    let t: ReturnType<typeof setTimeout>;
    if (!del && text.length < cur.length)
      t = setTimeout(() => setText(cur.slice(0, text.length + 1)), 58);
    else if (!del)
      t = setTimeout(() => setDel(true), 2000);
    else if (del && text.length > 0)
      t = setTimeout(() => setText(text.slice(0, -1)), 30);
    else
      t = setTimeout(() => {
        setDel(false);
        setIdx((i) => (i + 1) % PHRASES.length);
      }, 0);
    return () => clearTimeout(t);
  }, [text, del, idx, reducedMotion]);

  if (reducedMotion) {
    return <span className="text-primary">{PHRASES[0]}</span>;
  }

  return (
    <>
      <span className="text-primary">{text}</span>
      <span className="inline-block w-[2px] h-[0.8em] bg-secondary align-middle ml-1 animate-pulse" />
    </>
  );
}

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = Boolean(useReducedMotion());

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const leftY = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-[100svh] flex flex-col justify-center md:flex-row md:items-center overflow-hidden overflow-x-clip pt-20 pb-6 md:pt-0 md:pb-0"
    >

      {/* Solid background layer for mix-blend-mode to resolve against */}
      <div className="absolute inset-0 bg-background z-[min(-2)] pointer-events-none" style={{ zIndex: -2 }} />

      {/* Interactive Grid Background */}
      <BackgroundClient />

      {/* Container: Left-aligned content matching desktop, stacked cleanly above globe on mobile */}
      <div className="relative z-10 w-full container-grid items-center md:min-h-[90vh] py-4 sm:py-6 md:pt-24 md:pb-16">

        {/* ── LEFT: content aligned to left ─── */}
        <motion.div
          style={shouldReduceMotion ? undefined : { y: leftY, opacity }}
          variants={staggerContainer}
          initial={shouldReduceMotion ? false : "hidden"}
          animate="visible"
          className="col-span-4 md:col-span-4 lg:col-span-6 flex flex-col items-start text-left z-20 min-w-0"
        >
          {/* Eyebrow */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
              },
            }}
            className="mb-4 sm:mb-5 md:mb-6 max-w-full"
          >
            <span className="inline-flex items-center gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 md:py-2 rounded-md border border-white/10 bg-[#0D0F1A]/85 backdrop-blur-md text-[9px] sm:text-[10px] md:text-label font-bold tracking-[0.12em] sm:tracking-widest uppercase text-white/70 shadow-lg max-w-full">
              <motion.span
                className="w-1.5 h-1.5 shrink-0 rounded-md bg-emerald-400"
                animate={
                  shouldReduceMotion
                    ? undefined
                    : {
                        scale: [1, 1.25, 1],
                        opacity: [0.7, 1, 0.7],
                        boxShadow: [
                          "0 0 0px rgba(52, 211, 153, 0.4)",
                          "0 0 8px rgba(52, 211, 153, 0.8)",
                          "0 0 0px rgba(52, 211, 153, 0.4)",
                        ],
                      }
                }
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <span className="truncate">STUDENT TECHNOLOGY CLUB · VCE</span>
            </span>
          </motion.div>

          {/* Heading — word-by-word stagger */}
          <motion.h1
            variants={fadeUp}
            className="text-[clamp(34px,9.5vw,44px)] sm:text-[clamp(40px,6vw,64px)] font-anton font-normal uppercase tracking-wide text-white mb-3 sm:mb-4 md:mb-6 leading-[1.03] sm:leading-[1.1]"
          >
            We Build.<br />
            We Ship.<br />
            We Connect.
          </motion.h1>

          {/* Typing subline */}
          <motion.p
            variants={fadeUp}
            className="font-display font-semibold uppercase tracking-widest text-white/40 mb-3 sm:mb-4 md:mb-6 text-[10px] sm:text-[11px] md:text-label min-h-[1.5em]"
          >
            <TypingEffect reducedMotion={shouldReduceMotion} />
          </motion.p>

          {/* Description */}
          <motion.p
            variants={fadeUp}
            className="text-[14px] sm:text-[15px] md:text-body text-white/65 md:text-white/60 mb-6 md:mb-8 max-w-full sm:max-w-sm md:max-w-md leading-relaxed"
          >
            The official technology community at Vardhaman College of
            Engineering. Real software, epic events, and real career outcomes.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto mb-2 sm:mb-4 md:mb-8">
            <CTAButton
              href="/events"
              variant="primary"
              size="md"
              wrapperClassName="w-full sm:w-auto flex sm:inline-flex"
              className="w-full sm:w-auto"
              icon={<ArrowRight className="w-4 h-4 text-current" />}
            >
              Explore Events
            </CTAButton>
            <CTAButton
              href="/connect-ai"
              variant="secondary"
              size="md"
              wrapperClassName="w-full sm:w-auto flex sm:inline-flex"
              className="w-full sm:w-auto"
              icon={<Sparkles className="w-4 h-4 text-purple-400" />}
              iconPosition="left"
            >
              Connect AI
            </CTAButton>
          </motion.div>
        </motion.div>

        {/* Right side remains open on tablet/desktop so the sphere video is visible behind it */}
        <div className="hidden md:block md:col-span-2 lg:col-span-6 pointer-events-none" />

      </div>

      {/* ── RIGHT / MOBILE BOTTOM: Real-time 3D Globe (stacked cleanly on mobile without text overlap, right-aligned overlay on md+) ─── */}
      <div className="relative md:absolute md:inset-0 flex items-center justify-center md:justify-end pointer-events-none z-0 overflow-hidden w-full mt-2 md:mt-0">
        <div className="w-full md:w-1/2 lg:w-7/12 flex justify-center items-center opacity-95 md:opacity-100 md:pr-6 lg:pr-10 lg:translate-x-4">
          <HeroGlobe className="w-[230px] min-[375px]:w-[270px] sm:w-[320px] md:w-[400px] lg:w-[540px] xl:w-[600px] aspect-square max-w-full" />
        </div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex-col items-center gap-2 hidden md:flex"
      >
        <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/20">Scroll</span>
        <motion.div
          animate={shouldReduceMotion ? undefined : { y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <ArrowDown className="w-4 h-4 text-white/20" />
        </motion.div>
      </motion.div>

      <div className="absolute bottom-0 inset-x-0 h-16 md:h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-30" />
    </section>
  );
}
