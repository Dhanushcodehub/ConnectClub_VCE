"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ArrowDown, Sparkles } from "lucide-react";
import { staggerContainer, fadeUp } from "@/lib/animations";
import { CTAButton } from "@/components/ui/CTAButton";

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

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const leftY = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-[100svh] flex items-center overflow-hidden pt-20 pb-10 md:pt-0 md:pb-0">

      {/* Brightened Hero Background Video in Loop */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <video
          ref={videoRef}
          src="/hero1.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover scale-[1.02] brightness-125 contrast-105"
        />
        {/* Subtle lateral gradient to ensure left text readability while keeping right sphere bright */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
        {/* Soft bottom blend to transition smoothly into the next section */}
        <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-background via-transparent to-transparent" />
        {/* Bottom-left corner shield covering Gemini logo */}
        <div className="absolute bottom-0 left-0 w-80 h-36 bg-gradient-to-tr from-black via-black/90 to-transparent pointer-events-none z-10" />
      </div>

      {/* Container: Left-aligned content matching the screenshot */}
      <div className="relative z-10 container-grid items-center min-h-full md:min-h-[90vh] py-12 md:pt-24 md:pb-16">

        {/* ── LEFT: content aligned to left ─── */}
        <motion.div
          style={{ y: leftY, opacity }}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="col-span-4 md:col-span-7 lg:col-span-6 flex flex-col items-start text-left z-20"
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
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-white/10 bg-[#0D0F1A]/85 backdrop-blur-md text-[10px] md:text-label font-bold tracking-widest uppercase text-white/70 shadow-lg">
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                animate={{
                  scale: [1, 1.25, 1],
                  opacity: [0.7, 1, 0.7],
                  boxShadow: [
                    "0 0 0px rgba(52, 211, 153, 0.4)",
                    "0 0 8px rgba(52, 211, 153, 0.8)",
                    "0 0 0px rgba(52, 211, 153, 0.4)",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              STUDENT TECHNOLOGY CLUB · VCE
            </span>
          </motion.div>

          {/* Heading — word-by-word stagger */}
          <motion.h1
            variants={fadeUp}
            className="text-h1 font-anton font-normal uppercase tracking-wide text-white mb-4 md:mb-6 leading-[1.05]"
          >
            We Build.<br />
            <span className="text-highlight">We Ship.</span><br />
            We Connect.
          </motion.h1>

          {/* Typing subline */}
          <motion.p
            variants={fadeUp}
            className="font-display font-semibold uppercase tracking-widest text-white/40 mb-4 md:mb-6 text-[10px] md:text-label"
          >
            <TypingEffect />
          </motion.p>

          {/* Description */}
          <motion.p
            variants={fadeUp}
            className="text-sm md:text-body text-white/60 mb-8 max-w-sm md:max-w-md leading-relaxed"
          >
            The official technology community at Vardhaman College of
            Engineering. Real software, epic events, and real career outcomes.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-row items-center gap-4 w-full sm:w-auto mb-8">
            <CTAButton
              href="/events"
              variant="primary"
              size="md"
              icon={<ArrowRight className="w-4 h-4 text-current" />}
            >
              Explore Events
            </CTAButton>
            <CTAButton
              href="/connect-ai"
              variant="secondary"
              size="md"
              icon={<Sparkles className="w-4 h-4 text-purple-400" />}
              iconPosition="left"
            >
              Connect AI
            </CTAButton>
          </motion.div>
        </motion.div>

        {/* Right side remains completely open so the sphere in hero.mp4 is fully visible */}
        <div className="hidden md:block col-span-5 lg:col-span-6 pointer-events-none" />

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
