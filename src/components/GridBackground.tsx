"use client";

import { useEffect, useState } from "react";

export function GridBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] bg-background overflow-hidden">
      
      {/* Base Grid (Static) */}
      <div className="absolute inset-0 bg-grid-pattern" />

      {/* Interactive Cursor Spotlight Grid */}
      {isClient && (
        <div 
          className="absolute inset-0 bg-grid-pattern-light transition-opacity duration-300"
          style={{
            WebkitMaskImage: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, black, transparent)`,
            maskImage: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, black, transparent)`
          }}
        />
      )}

      {/* Cursor Glow Orb */}
      {isClient && (
        <div 
          className="absolute w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-100 mix-blend-screen pointer-events-none"
          style={{
            left: mousePosition.x,
            top: mousePosition.y,
          }}
        />
      )}
      
      {/* Static Glowing Orbs (Ambiance) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[120px] mix-blend-screen animate-pulse-slow" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-secondary/10 blur-[150px] mix-blend-screen animate-pulse-slow delay-1000" />
    </div>
  );
}
