"use client";

import { useEffect, useRef } from "react";

export function GridBackground() {
  const spotlightRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const posRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
    };

    const tick = () => {
      const { x, y } = posRef.current;
      if (spotlightRef.current) {
        spotlightRef.current.style.webkitMaskImage = `radial-gradient(400px circle at ${x}px ${y}px, black, transparent)`;
        (spotlightRef.current.style as any).maskImage = `radial-gradient(400px circle at ${x}px ${y}px, black, transparent)`;
      }
      if (orbRef.current) {
        orbRef.current.style.left = `${x}px`;
        orbRef.current.style.top = `${y}px`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    // Don't repaint forever while the cursor is idle — stop the rAF loop
    // until the next move. Cuts constant GPU/CPU work on static pages.
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const armIdleStop = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
        }
      }, 4000);
    };
    const wakeOnMove = () => {
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
      armIdleStop();
    };
    window.addEventListener("mousemove", wakeOnMove, { passive: true });
    armIdleStop();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousemove", wakeOnMove);
      if (idleTimer) clearTimeout(idleTimer);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] bg-background overflow-hidden">

      {/* Base Grid (Static) */}
      <div className="absolute inset-0 bg-grid-pattern" />

      {/* Interactive Cursor Spotlight Grid — DOM updated via ref, no re-renders */}
      <div
        ref={spotlightRef}
        className="absolute inset-0 bg-grid-pattern-light"
      />

      {/* Cursor Glow Orb — DOM updated via ref */}
      <div
        ref={orbRef}
        className="absolute w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 mix-blend-screen pointer-events-none"
        style={{ left: -9999, top: -9999 }}
      />

      {/* Static Glowing Orbs (Ambiance) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[120px] mix-blend-screen animate-pulse-slow" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-secondary/10 blur-[150px] mix-blend-screen animate-pulse-slow delay-1000" />
    </div>
  );
}
