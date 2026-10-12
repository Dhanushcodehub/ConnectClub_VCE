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

          {/* Positioned directly over the Gemini logo: 100% solid opacity with increased vertical padding to completely hide watermark */}
          <motion.button
            type="button"
            onClick={handleDismiss}
            initial={{ opacity: 1, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              right: "max(1rem, calc(9.2% - 130px))",
              bottom: "max(1rem, calc(16.3% - 68px))",
            }}
            className="z-30 flex items-center gap-3 px-8 py-6 rounded-full bg-[#08090f] hover:bg-[#121624] border border-white/20 text-white shadow-[0_10px_30px_14px_#08090f,0_12px_40px_rgba(0,0,0,0.95)] group cursor-pointer transition-all active:scale-95 pointer-events-auto"
            title="Click to enter website"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="text-xs font-mono tracking-wider uppercase font-semibold text-white whitespace-nowrap">
              Entering the website...
            </span>
            <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
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
