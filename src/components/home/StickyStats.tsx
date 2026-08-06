"use client";

import { useEffect, useState, useRef } from "react";
import { animate, useInView } from "framer-motion";

function Counter({ from = 0, to, duration = 2, suffix = "" }: { from?: number; to: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(from);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });

  useEffect(() => {
    if (inView) {
      const controls = animate(from, to, {
        duration,
        onUpdate(value) { setCount(Math.round(value)); },
        ease: "easeOut",
      });
      return () => controls.stop();
    }
  }, [from, to, duration, inView]);

  return <span ref={ref}>{count}{suffix}</span>;
}

const stats = [
  { label: "Members", value: 150, suffix: "+" },
  { label: "Events", value: 40, suffix: "+" },
  { label: "Projects", value: 25, suffix: "" },
  { label: "Lines", value: 100, suffix: "k+" },
];

export function StickyStats() {
  return (
    <div className="relative z-40 border-t border-b border-white/[0.08] bg-white/[0.02]">
      <div className="flex overflow-hidden whitespace-nowrap py-3 w-full">
        <div className="flex animate-marquee shrink-0 justify-around min-w-full items-center gap-12 md:gap-24 px-6 md:px-12">
          {stats.map((stat, idx) => (
            <div key={`first-${idx}`} className="flex flex-row items-center gap-2 md:gap-3">
              <span className="text-h3 font-black text-gradient-cyan">
                <Counter to={stat.value} suffix={stat.suffix} />
              </span>
              <span className="text-label text-white/50 uppercase tracking-widest font-bold">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
        <div className="flex animate-marquee shrink-0 justify-around min-w-full items-center gap-12 md:gap-24 px-6 md:px-12" aria-hidden="true">
          {stats.map((stat, idx) => (
            <div key={`second-${idx}`} className="flex flex-row items-center gap-2 md:gap-3">
              <span className="text-h3 font-black text-gradient-cyan">
                <Counter to={stat.value} suffix={stat.suffix} />
              </span>
              <span className="text-label text-white/50 uppercase tracking-widest font-bold">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
