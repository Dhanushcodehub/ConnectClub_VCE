"use client";

import React, { useState, useRef, MouseEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CTAButtonProps {
  href?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "glass" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  disabled?: boolean;
  target?: string;
  rel?: string;
  fullWidth?: boolean;
}

export function CTAButton({
  href,
  onClick,
  children,
  variant = "primary",
  size = "md",
  className,
  icon,
  iconPosition = "right",
  disabled = false,
  target,
  rel,
  fullWidth = false,
}: CTAButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, opacity: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      opacity: 1,
    });
  };

  const handleMouseLeave = () => {
    setMousePos((prev) => ({ ...prev, opacity: 0 }));
  };

  // Base sizing
  const sizeClasses = {
    sm: "px-5 py-2.5 text-xs rounded-lg gap-2",
    md: "px-7 py-3.5 text-xs md:text-xs rounded-xl gap-2.5",
    lg: "px-9 py-4 text-sm rounded-xl gap-3",
  }[size];

  // Variant styles
  const variantClasses = {
    primary:
      "bg-gradient-to-r from-[#7E22CE] via-[#9333EA] to-[#A855F7] text-white font-black uppercase tracking-widest shadow-[0_0_25px_rgba(147,51,234,0.45)] hover:shadow-[0_0_40px_rgba(168,85,247,0.7),0_0_80px_rgba(147,51,234,0.4)] border border-white/20 hover:border-white/50",
    secondary:
      "bg-[#0D0F1A] text-white/90 hover:text-white font-black uppercase tracking-widest border border-white/10 hover:border-purple-500/50 hover:bg-[#151829] shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_0_25px_rgba(147,51,234,0.3)]",
    glass:
      "bg-white/[0.05] backdrop-blur-md text-white/90 hover:text-white font-black uppercase tracking-widest border border-white/15 hover:border-white/40 hover:bg-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]",
    outline:
      "bg-transparent text-white font-black uppercase tracking-widest border border-purple-500/40 hover:border-purple-400 text-purple-200 hover:text-white hover:bg-purple-600/20 shadow-[0_0_15px_rgba(147,51,234,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]",
  }[variant];

  const content = (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "relative overflow-hidden inline-flex items-center justify-center font-display transition-all duration-300 select-none group cursor-pointer",
        sizeClasses,
        variantClasses,
        fullWidth ? "w-full" : "",
        disabled ? "opacity-50 pointer-events-none" : "",
        className
      )}
    >
      {/* Dynamic Cursor Spotlight Light */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
        style={{
          opacity: mousePos.opacity,
          background: `radial-gradient(130px circle at ${mousePos.x}px ${mousePos.y}px, ${
            variant === "primary"
              ? "rgba(255, 255, 255, 0.35)"
              : "rgba(168, 85, 247, 0.3)"
          }, transparent 70%)`,
        }}
      />

      {/* Shimmer Light Beam Sweep */}
      <div className="pointer-events-none absolute -inset-full top-0 block h-full w-[200%] -rotate-45 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-full z-0" />

      {/* Subtle Inset Top Highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent z-10" />

      {/* Content wrapper */}
      <span className="relative z-20 flex items-center justify-center gap-2.5">
        {icon && iconPosition === "left" && (
          <span className="transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:scale-110">
            {icon}
          </span>
        )}
        <span className="tracking-[0.14em]">{children}</span>
        {icon && iconPosition === "right" && (
          <span className="transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-110">
            {icon}
          </span>
        )}
      </span>
    </motion.div>
  );

  if (href && !disabled) {
    return (
      <Link href={href} target={target} rel={rel} className={fullWidth ? "w-full flex" : "inline-flex"}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={fullWidth ? "w-full flex" : "inline-flex"}
    >
      {content}
    </button>
  );
}
