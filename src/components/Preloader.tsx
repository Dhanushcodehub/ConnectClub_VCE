"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TITLE = "CONNECT CLUB";

export function Preloader() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const hasVisited = sessionStorage.getItem("hasVisitedConnectClub");

    if (!hasVisited) {
      setIsLoading(true);
      sessionStorage.setItem("hasVisitedConnectClub", "true");

      // Animate progress from 0 to 100
      const startTime = Date.now();
      const duration = 2600; // ms
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(Math.round((elapsed / duration) * 100), 100);
        setProgress(pct);
        if (pct >= 100) clearInterval(progressInterval);
      }, 30);

      // Dismiss loader
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 3000);

      setHasChecked(true);
      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    } else {
      setIsLoading(false);
      setHasChecked(true);
    }
  }, []);

  // Canvas particle animation
  useEffect(() => {
    if (!isLoading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Create converging particles
    const particles: {
      x: number;
      y: number;
      tx: number;
      ty: number;
      size: number;
      speed: number;
      opacity: number;
    }[] = [];

    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.max(w, h) * 0.7;
      particles.push({
        x: w / 2 + Math.cos(angle) * radius,
        y: h / 2 + Math.sin(angle) * radius,
        tx: w / 2 + (Math.random() - 0.5) * 120,
        ty: h / 2 + (Math.random() - 0.5) * 60,
        size: Math.random() * 2 + 0.5,
        speed: 0.008 + Math.random() * 0.012,
        opacity: Math.random() * 0.6 + 0.2,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, w, h);

      particles.forEach((p) => {
        p.x += (p.tx - p.x) * p.speed;
        p.y += (p.ty - p.y) * p.speed;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147, 51, 234, ${p.opacity})`;
        ctx.fill();
      });

      // Draw faint connection lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(147, 51, 234, ${0.15 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isLoading]);

  if (!hasChecked) return null;

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, delay: 0.4 } }}
          className="fixed inset-0 z-[100] bg-[#0c0c0e] overflow-hidden"
        >
          {/* Particle canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Split curtains for cinematic exit */}
          <motion.div
            initial={{ x: 0 }}
            exit={{ x: "-102%", transition: { duration: 0.88, ease: [0.76, 0, 0.24, 1] } }}
            className="absolute top-0 bottom-0 left-0 w-[51%] bg-[#0c0c0e] z-[2]"
          />
          <motion.div
            initial={{ x: 0 }}
            exit={{ x: "102%", transition: { duration: 0.88, ease: [0.76, 0, 0.24, 1] } }}
            className="absolute top-0 bottom-0 right-0 w-[51%] bg-[#0c0c0e] z-[2]"
          />

          {/* Center content */}
          <div className="relative z-[3] h-full flex flex-col items-center justify-center select-none">
            {/* Pre-title */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/30 mb-2"
            >
              Welcome to
            </motion.div>

            {/* Letter-by-letter title */}
            <div className="flex items-baseline leading-none mb-1.5">
              {TITLE.split("").map((ch, i) =>
                ch === " " ? (
                  <span key={i} className="inline-block w-[0.25em]" />
                ) : (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: "85%", skewY: 7 }}
                    animate={{ opacity: 1, y: 0, skewY: 0 }}
                    transition={{
                      duration: 0.65,
                      delay: i * 0.07 + 0.24,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="inline-block font-heading font-black text-[clamp(28px,5vw,56px)] tracking-[-0.02em] uppercase bg-gradient-to-br from-white via-primary to-white bg-[length:300%_100%] bg-clip-text text-transparent animate-[shimmer_2.8s_1s_ease-in-out_infinite]"
                  >
                    {ch}
                  </motion.span>
                )
              )}
            </div>

            {/* Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 1.3 }}
              className="text-[clamp(10px,1.5vw,14px)] font-mono tracking-[0.45em] uppercase text-primary mb-2.5"
              style={{ textShadow: "0 0 20px rgba(147,51,234,0.5)" }}
            >
              VCE
            </motion.div>

            {/* Tagline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.7 }}
              className="text-[10px] font-mono tracking-[0.12em] text-white/30"
            >
              Building the Next Generation of Innovators
            </motion.div>
          </div>

          {/* Bottom-left loading percentage */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="absolute bottom-6 left-6 z-[3] flex items-end gap-0.5"
          >
            <span className="font-mono text-[clamp(20px,3vw,32px)] font-black tabular-nums text-white/70 leading-none">
              {progress}
            </span>
            <span className="font-mono text-[10px] text-white/25 mb-0.5">%</span>
          </motion.div>

          {/* Bottom progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5 z-[3]">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-purple-400"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
