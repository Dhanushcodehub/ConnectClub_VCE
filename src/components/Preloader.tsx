"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function Preloader() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleDismiss = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Check if visited in current session
    const hasVisited = sessionStorage.getItem("hasVisitedConnectClub");

    if (!hasVisited) {
      setIsLoading(true);
      sessionStorage.setItem("hasVisitedConnectClub", "true");
    } else {
      setIsLoading(false);
    }
    setHasChecked(true);

    // Allow replaying intro via global event
    const handleReplay = () => {
      setIsLoading(true);
      setProgress(0);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    };

    window.addEventListener("open-intro-video", handleReplay);
    return () => window.removeEventListener("open-intro-video", handleReplay);
  }, []);

  // Keyboard shortcut: ESC to dismiss if needed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isLoading) {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, handleDismiss]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration;
    if (total > 0) {
      setProgress(Math.round((current / total) * 100));
    }
  };

  if (!hasChecked) return null;

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } }}
          className="fixed inset-0 z-[100] bg-black overflow-hidden flex items-center justify-center select-none"
        >
          {/* Main Intro Video */}
          <video
            ref={videoRef}
            src="/intro1.mp4"
            autoPlay
            playsInline
            muted
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleDismiss}
            onClick={handleDismiss}
            className="w-full h-full object-cover cursor-pointer brightness-105"
          />

          {/* Corner shield: Deep opaque gradient backing specifically to hide Gemini logo in bottom-right */}
          <div className="absolute bottom-0 right-0 w-80 h-36 bg-gradient-to-tl from-black via-black/95 to-transparent pointer-events-none z-20" />

          {/* Bottom-right: Covers Gemini logo with "Entering the website..." button/pill */}
          <motion.button
            type="button"
            onClick={handleDismiss}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="absolute bottom-6 right-6 z-30 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#090b10]/95 hover:bg-[#121622] backdrop-blur-2xl border border-white/15 text-white shadow-[0_12px_40px_rgba(0,0,0,0.9)] group cursor-pointer transition-all active:scale-95 pointer-events-auto"
            title="Click to enter website"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono tracking-wider uppercase text-white/90">
              Entering the website...
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-1 transition-transform" />
          </motion.button>

          {/* Bottom subtle progress line */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10 z-30">
            <motion.div
              className="h-full bg-gradient-to-r from-primary via-purple-400 to-purple-300"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
