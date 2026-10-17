"use client";

import { useEffect, useRef, useCallback, useState, useId } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export type MascotExpression =
  | "normal"
  | "happy"
  | "surprised"
  | "love"
  | "excited"
  | "wink"
  | "dizzy";

const EXPRESSION_ORDER: MascotExpression[] = [
  "normal",
  "happy",
  "surprised",
  "love",
  "excited",
  "wink",
  "dizzy",
];

const EXPRESSION_NAMES: Record<MascotExpression, string> = {
  normal: "Curious",
  happy: "Happy!",
  surprised: "Whoa!",
  love: "Loved!",
  excited: "Excited!",
  wink: "Wink ;)",
  dizzy: "Dizzy @~@",
};

interface AIMascotProps {
  /** Size in pixels (width and height). Defaults to 135. */
  size?: number;
  className?: string;
  onExpressionChange?: (expr: MascotExpression) => void;
}

export function AIMascot({
  size = 135,
  className = "",
  onExpressionChange,
}: AIMascotProps) {
  const prefersReduced = useReducedMotion();
  const reactId = useId();
  const uid = `mascot-${reactId.replace(/:/g, "")}`;

  // Current expression
  const [exprIndex, setExprIndex] = useState(0);
  const currentExpr = EXPRESSION_ORDER[exprIndex];

  // Click reaction trigger key
  const [clickCount, setClickCount] = useState(0);
  const [showRipple, setShowRipple] = useState(false);
  const [expressionToast, setExpressionToast] = useState<string | null>(null);

  // 3D Tilt & Movement refs (updated in rAF loop for max performance without React re-renders)
  const containerRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<SVGEllipseElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  // Target and current interpolated values
  const currentXRot = useRef(0);
  const currentYRot = useRef(0);
  const currentZRot = useRef(0);
  const currentLeanX = useRef(0);
  const currentLeanY = useRef(0);
  const targetXRot = useRef(0);
  const targetYRot = useRef(0);
  const targetLeanX = useRef(0);
  const targetLeanY = useRef(0);

  // Pupil cursor offsets (for normal, surprised, wink)
  const pupilLeftRef = useRef({ x: 0, y: 0 });
  const pupilRightRef = useRef({ x: 0, y: 0 });
  const targetPupilLeft = useRef({ x: 0, y: 0 });
  const targetPupilRight = useRef({ x: 0, y: 0 });
  const [pupilState, setPupilState] = useState({ lx: 0, ly: 0, rx: 0, ry: 0 });

  // Eye geometries relative to 100x100 face coordinate space
  const eyeRadius = 9;
  const pupilRadius = 4.8;
  const maxPupilTravel = 3.6;

  const leftEyeCenter = { x: 33, y: 44 };
  const rightEyeCenter = { x: 67, y: 44 };

  // Calculate target rotation & pupil tracking from pointer
  const handlePointerCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Horizontal tilt (-22deg to +22deg) and vertical tilt (-18deg to +18deg)
      const maxDistX = Math.max(window.innerWidth * 0.45, 300);
      const maxDistY = Math.max(window.innerHeight * 0.45, 300);

      const normX = Math.max(-1, Math.min(1, dx / maxDistX));
      const normY = Math.max(-1, Math.min(1, dy / maxDistY));

      targetYRot.current = normX * 22; // rotate around Y (yaw)
      targetXRot.current = -normY * 18; // rotate around X (pitch: down is negative)
      targetLeanX.current = normX * 8; // subtle shift toward cursor
      targetLeanY.current = normY * 6;

      // Pupil offset inside eyes
      const travelRatio = Math.min(dist / 240, 1) * maxPupilTravel;
      if (dist > 0.1) {
        const px = (dx / dist) * travelRatio;
        const py = (dy / dist) * travelRatio;
        targetPupilLeft.current = { x: px, y: py };
        targetPupilRight.current = { x: px, y: py };
      }
    },
    [maxPupilTravel]
  );

  // Mouse & Touch listeners
  useEffect(() => {
    if (prefersReduced) return;

    const onMouseMove = (e: MouseEvent) => {
      handlePointerCoords(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerCoords(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onLeave = () => {
      // Smoothly return to neutral posture
      targetXRot.current = 0;
      targetYRot.current = 0;
      targetLeanX.current = 0;
      targetLeanY.current = 0;
      targetPupilLeft.current = { x: 0, y: 0 };
      targetPupilRight.current = { x: 0, y: 0 };
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [prefersReduced, handlePointerCoords]);

  // Main 3D Animation rAF loop
  useEffect(() => {
    if (prefersReduced) return;

    let rafId: number;
    let startTime = performance.now();

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const renderFrame = (now: number) => {
      const elapsed = (now - startTime) / 1000;

      // Idle breathing and gentle floating
      const idleFloatY = Math.sin(elapsed * 2.2) * 5;
      const idleSwayZ = Math.sin(elapsed * 1.5) * 1.8;
      const idleBreathScale = 1 + Math.sin(elapsed * 2.8) * 0.015;

      // Interpolate 3D rotations & positional lean (0.09 = fluid damping)
      currentXRot.current = lerp(currentXRot.current, targetXRot.current, 0.09);
      currentYRot.current = lerp(currentYRot.current, targetYRot.current, 0.09);
      currentLeanX.current = lerp(currentLeanX.current, targetLeanX.current, 0.09);
      currentLeanY.current = lerp(currentLeanY.current, targetLeanY.current, 0.09);

      // Pupils interpolation
      pupilLeftRef.current.x = lerp(
        pupilLeftRef.current.x,
        targetPupilLeft.current.x,
        0.14
      );
      pupilLeftRef.current.y = lerp(
        pupilLeftRef.current.y,
        targetPupilLeft.current.y,
        0.14
      );
      pupilRightRef.current.x = lerp(
        pupilRightRef.current.x,
        targetPupilRight.current.x,
        0.14
      );
      pupilRightRef.current.y = lerp(
        pupilRightRef.current.y,
        targetPupilRight.current.y,
        0.14
      );

      const rotX = currentXRot.current;
      const rotY = currentYRot.current;
      const rotZ = idleSwayZ;
      const posX = currentLeanX.current;
      const posY = currentLeanY.current + idleFloatY;

      // Apply 3D transform directly to sphere element (no React re-renders!)
      if (sphereRef.current) {
        sphereRef.current.style.transform = `translate3d(${posX.toFixed(2)}px, ${posY.toFixed(2)}px, 0px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg) scale(${idleBreathScale.toFixed(3)})`;
      }

      // Parallax for face layer: extra forward depth (translateZ: 28px) + slight parallax offset
      if (faceRef.current) {
        const faceParallaxX = rotY * 0.35;
        const faceParallaxY = -rotX * 0.35;
        faceRef.current.style.transform = `translate3d(${faceParallaxX.toFixed(2)}px, ${faceParallaxY.toFixed(2)}px, 28px)`;
      }

      // Dynamic specular highlight reflection offset (moves opposite to sphere tilt to simulate fixed light source in 3D!)
      if (shineRef.current) {
        const shineOffsetX = -rotY * 0.45;
        const shineOffsetY = rotX * 0.35;
        shineRef.current.setAttribute("cx", (38 + shineOffsetX).toFixed(2));
        shineRef.current.setAttribute("cy", (30 + shineOffsetY).toFixed(2));
      }

      // Drop shadow scale & blur follows float
      if (shadowRef.current) {
        const shadowScale = 1 - (posY / 30);
        const shadowOpacity = Math.max(0.2, 0.45 - (posY / 40));
        shadowRef.current.style.transform = `scale(${Math.max(0.7, Math.min(1.2, shadowScale)).toFixed(2)})`;
        shadowRef.current.style.opacity = shadowOpacity.toFixed(2);
      }

      // Check if pupil state changed enough to trigger SVG pupil re-render
      const plx = pupilLeftRef.current.x;
      const ply = pupilLeftRef.current.y;
      const prx = pupilRightRef.current.x;
      const pry = pupilRightRef.current.y;

      setPupilState((prev) => {
        if (
          Math.abs(prev.lx - plx) > 0.08 ||
          Math.abs(prev.ly - ply) > 0.08 ||
          Math.abs(prev.rx - prx) > 0.08 ||
          Math.abs(prev.ry - pry) > 0.08
        ) {
          return { lx: plx, ly: ply, rx: prx, ry: pry };
        }
        return prev;
      });

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [prefersReduced]);

  // Click & tap handler: cycles expressions, triggers squash/stretch & glow ripple
  const handleClick = () => {
    const nextIdx = (exprIndex + 1) % EXPRESSION_ORDER.length;
    setExprIndex(nextIdx);
    setClickCount((c) => c + 1);
    setShowRipple(true);

    const nextExpr = EXPRESSION_ORDER[nextIdx];
    setExpressionToast(EXPRESSION_NAMES[nextExpr]);
    onExpressionChange?.(nextExpr);

    // Reset ripple after animation
    setTimeout(() => setShowRipple(false), 600);
  };

  // Toast timer cleanup
  useEffect(() => {
    if (!expressionToast) return;
    const timer = setTimeout(() => setExpressionToast(null), 1200);
    return () => clearTimeout(timer);
  }, [expressionToast, clickCount]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}
      style={{
        width: size,
        height: size + 20, // headroom for floating & drop shadow
        perspective: 900,
        WebkitPerspective: 900,
      }}
    >
      {/* Interactive Clickable Area */}
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={`Connect AI mascot. Current expression: ${currentExpr}. Click to change mood.`}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.92 }}
        className="relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-full"
        style={{
          width: size,
          height: size,
          transformStyle: "preserve-3d",
          WebkitTransformStyle: "preserve-3d",
        }}
      >
        {/* Ambient Glow behind mascot */}
        <div
          className="absolute inset-[-18%] rounded-full pointer-events-none transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(147, 51, 234, 0.42) 0%, rgba(59, 130, 246, 0.22) 45%, transparent 72%)",
            filter: "blur(22px)",
          }}
        />

        {/* Click Ripple Wave Ring */}
        <AnimatePresence>
          {showRipple && (
            <motion.div
              key={clickCount}
              initial={{ scale: 0.85, opacity: 0.9 }}
              animate={{ scale: 1.45, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-purple-400/80 pointer-events-none shadow-[0_0_24px_rgba(168,85,247,0.7)]"
            />
          )}
        </AnimatePresence>

        {/* 3D Sphere Body with Squash-and-Stretch Animation on Click */}
        <motion.div
          ref={sphereRef}
          key={`sphere-${clickCount}`}
          initial={
            clickCount > 0
              ? { scaleX: 1.18, scaleY: 0.84, rotate: -4 }
              : undefined
          }
          animate={{ scaleX: 1, scaleY: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 450,
            damping: 18,
            mass: 0.8,
          }}
          className="relative w-full h-full rounded-full"
          style={{
            transformStyle: "preserve-3d",
            WebkitTransformStyle: "preserve-3d",
            willChange: "transform",
          }}
        >
          {/* Main 3D Sphere SVG Body */}
          <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            className="w-full h-full block rounded-full overflow-hidden"
            style={{
              filter: "drop-shadow(0 14px 28px rgba(11, 4, 28, 0.75))",
            }}
          >
            <defs>
              {/* Deep 3D Spherical Radial Gradient: Highlight -> Midtone -> Deep Ambient Shadow */}
              <radialGradient
                id={`${uid}-sphere-gradient`}
                cx="38%"
                cy="32%"
                r="64%"
                fx="36%"
                fy="30%"
              >
                <stop offset="0%" stopColor="#A78BFA" /> {/* Bright lavender highlight */}
                <stop offset="22%" stopColor="#818CF8" /> {/* Electric periwinkle blue */}
                <stop offset="52%" stopColor="#7C3AED" /> {/* Rich royal violet */}
                <stop offset="82%" stopColor="#4C1D95" /> {/* Deep dark purple */}
                <stop offset="100%" stopColor="#1E0B4B" /> {/* Shadow rim */}
              </radialGradient>

              {/* Dynamic Specular Sheen (Soft reflection on top-left) */}
              <radialGradient id={`${uid}-specular`} cx="38%" cy="28%" r="35%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.75)" />
                <stop offset="45%" stopColor="rgba(255, 255, 255, 0.25)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
              </radialGradient>

              {/* Bottom Rim Light (Fresnel glow from below) */}
              <radialGradient id={`${uid}-rim-light`} cx="50%" cy="92%" r="55%">
                <stop offset="0%" stopColor="rgba(167, 139, 250, 0.65)" />
                <stop offset="50%" stopColor="rgba(96, 165, 250, 0.25)" />
                <stop offset="100%" stopColor="rgba(124, 58, 237, 0)" />
              </radialGradient>

              {/* Inner ambient vignette shadow */}
              <radialGradient id={`${uid}-inner-shadow`} cx="50%" cy="50%" r="50%">
                <stop offset="70%" stopColor="rgba(0,0,0,0)" />
                <stop offset="100%" stopColor="rgba(11, 4, 28, 0.55)" />
              </radialGradient>

              {/* Eye Socket Shadow */}
              <radialGradient id={`${uid}-eye-socket`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0a0319" />
                <stop offset="80%" stopColor="#170638" />
                <stop offset="100%" stopColor="#250b56" />
              </radialGradient>

              {/* Heart Eye Gradient (Love) */}
              <linearGradient id={`${uid}-heart`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F472B6" />
                <stop offset="50%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#D946EF" />
              </linearGradient>

              {/* Star Eye Gradient (Excited) */}
              <linearGradient id={`${uid}-star`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="50%" stopColor="#67E8F9" />
                <stop offset="100%" stopColor="#A855F7" />
              </linearGradient>

              {/* Soft Blushing Cheeks */}
              <radialGradient id={`${uid}-blush`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(244, 114, 182, 0.45)" />
                <stop offset="100%" stopColor="rgba(244, 114, 182, 0)" />
              </radialGradient>
            </defs>

            {/* Base Sphere */}
            <circle
              cx="50"
              cy="50"
              r="49"
              fill={`url(#${uid}-sphere-gradient)`}
            />

            {/* Bottom-up Rim Light */}
            <circle cx="50" cy="50" r="49" fill={`url(#${uid}-rim-light)`} />

            {/* Inner Spherical Shadow Ring */}
            <circle cx="50" cy="50" r="49" fill={`url(#${uid}-inner-shadow)`} />

            {/* Specular Light Highlight (dynamically shifting with cursor reflection) */}
            <ellipse
              ref={shineRef}
              cx="38"
              cy="28"
              rx="17"
              ry="11"
              fill={`url(#${uid}-specular)`}
              opacity="0.9"
            />
          </svg>

          {/* 3D Floating Face Layer (pops forward via translateZ for true depth parallax) */}
          <div
            ref={faceRef}
            className="absolute inset-0 pointer-events-none"
            style={{
              transformStyle: "preserve-3d",
              WebkitTransformStyle: "preserve-3d",
            }}
          >
            <svg
              viewBox="0 0 100 100"
              width={size}
              height={size}
              className="w-full h-full block overflow-visible"
            >
              {/* Blushing Cheeks for expressive moods */}
              {(currentExpr === "happy" ||
                currentExpr === "love" ||
                currentExpr === "wink") && (
                <g className="transition-opacity duration-300">
                  <ellipse cx="23" cy="56" rx="6" ry="3.5" fill={`url(#${uid}-blush)`} />
                  <ellipse cx="77" cy="56" rx="6" ry="3.5" fill={`url(#${uid}-blush)`} />
                </g>
              )}

              {/* ─── DYNAMIC EYE EXPRESSIONS ─── */}
              {/* Expression 1: NORMAL */}
              {currentExpr === "normal" && (
                <g key="normal" className="transition-all duration-200">
                  {/* Left Eye */}
                  <circle
                    cx={leftEyeCenter.x}
                    cy={leftEyeCenter.y}
                    r={eyeRadius}
                    fill={`url(#${uid}-eye-socket)`}
                    stroke="rgba(255, 255, 255, 0.15)"
                    strokeWidth="0.8"
                  />
                  <circle
                    cx={leftEyeCenter.x + pupilState.lx}
                    cy={leftEyeCenter.y + pupilState.ly}
                    r={pupilRadius}
                    fill="#050112"
                  />
                  <circle
                    cx={leftEyeCenter.x + pupilState.lx - 1.4}
                    cy={leftEyeCenter.y + pupilState.ly - 1.4}
                    r={1.7}
                    fill="#ffffff"
                    opacity="0.9"
                  />
                  <circle
                    cx={leftEyeCenter.x + pupilState.lx + 1.2}
                    cy={leftEyeCenter.y + pupilState.ly + 1.2}
                    r={0.9}
                    fill="rgba(192, 132, 252, 0.9)"
                  />

                  {/* Right Eye */}
                  <circle
                    cx={rightEyeCenter.x}
                    cy={rightEyeCenter.y}
                    r={eyeRadius}
                    fill={`url(#${uid}-eye-socket)`}
                    stroke="rgba(255, 255, 255, 0.15)"
                    strokeWidth="0.8"
                  />
                  <circle
                    cx={rightEyeCenter.x + pupilState.rx}
                    cy={rightEyeCenter.y + pupilState.ry}
                    r={pupilRadius}
                    fill="#050112"
                  />
                  <circle
                    cx={rightEyeCenter.x + pupilState.rx - 1.4}
                    cy={rightEyeCenter.y + pupilState.ry - 1.4}
                    r={1.7}
                    fill="#ffffff"
                    opacity="0.9"
                  />
                  <circle
                    cx={rightEyeCenter.x + pupilState.rx + 1.2}
                    cy={rightEyeCenter.y + pupilState.ry + 1.2}
                    r={0.9}
                    fill="rgba(192, 132, 252, 0.9)"
                  />

                  {/* Gentle Smile */}
                  <path
                    d="M 40 61 Q 50 68 60 61"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                </g>
              )}

              {/* Expression 2: HAPPY (^ ^) */}
              {currentExpr === "happy" && (
                <g key="happy" className="animate-in fade-in zoom-in-95 duration-200">
                  {/* Left Happy Curve */}
                  <path
                    d="M 25 46 Q 33 34 41 46"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    filter="drop-shadow(0 0 4px rgba(255,255,255,0.6))"
                  />
                  {/* Right Happy Curve */}
                  <path
                    d="M 59 46 Q 67 34 75 46"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    filter="drop-shadow(0 0 4px rgba(255,255,255,0.6))"
                  />
                  {/* Cheerful Grin */}
                  <path
                    d="M 38 58 Q 50 71 62 58"
                    fill="rgba(255,255,255,0.15)"
                    stroke="#ffffff"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* Expression 3: SURPRISED (O O) */}
              {currentExpr === "surprised" && (
                <g key="surprised" className="animate-in fade-in zoom-in-95 duration-200">
                  {/* Left Wide Eye */}
                  <circle
                    cx={leftEyeCenter.x}
                    cy={leftEyeCenter.y}
                    r="12"
                    fill="#ffffff"
                    stroke="rgba(167, 139, 250, 0.8)"
                    strokeWidth="1.6"
                    filter="drop-shadow(0 0 6px rgba(167, 139, 250, 0.5))"
                  />
                  <circle
                    cx={leftEyeCenter.x + pupilState.lx * 0.7}
                    cy={leftEyeCenter.y + pupilState.ly * 0.7}
                    r="6.5"
                    fill="#0a0319"
                  />
                  <circle
                    cx={leftEyeCenter.x + pupilState.lx * 0.7 - 2}
                    cy={leftEyeCenter.y + pupilState.ly * 0.7 - 2}
                    r="2.2"
                    fill="#ffffff"
                  />

                  {/* Right Wide Eye */}
                  <circle
                    cx={rightEyeCenter.x}
                    cy={rightEyeCenter.y}
                    r="12"
                    fill="#ffffff"
                    stroke="rgba(167, 139, 250, 0.8)"
                    strokeWidth="1.6"
                    filter="drop-shadow(0 0 6px rgba(167, 139, 250, 0.5))"
                  />
                  <circle
                    cx={rightEyeCenter.x + pupilState.rx * 0.7}
                    cy={rightEyeCenter.y + pupilState.ry * 0.7}
                    r="6.5"
                    fill="#0a0319"
                  />
                  <circle
                    cx={rightEyeCenter.x + pupilState.rx * 0.7 - 2}
                    cy={rightEyeCenter.y + pupilState.ry * 0.7 - 2}
                    r="2.2"
                    fill="#ffffff"
                  />

                  {/* Round 'O' Mouth */}
                  <ellipse
                    cx="50"
                    cy="64"
                    rx="4.5"
                    ry="6.5"
                    fill="#0a0319"
                    stroke="#ffffff"
                    strokeWidth="2.2"
                  />
                </g>
              )}

              {/* Expression 4: LOVE (♥ ♥) */}
              {currentExpr === "love" && (
                <g key="love" className="animate-in fade-in zoom-in-95 duration-200">
                  {/* Left Heart Eye */}
                  <g transform={`translate(${leftEyeCenter.x - 11}, ${leftEyeCenter.y - 10}) scale(0.95)`}>
                    <path
                      d="M 11.5 4 C 8.5 -1, 0 1, 1 8 C 2 13.5, 11.5 20, 11.5 20 C 11.5 20, 21 13.5, 22 8 C 23 1, 14.5 -1, 11.5 4 Z"
                      fill={`url(#${uid}-heart)`}
                      filter="drop-shadow(0 0 8px rgba(236, 72, 153, 0.8))"
                    />
                    <circle cx="7" cy="6" r="1.6" fill="#ffffff" opacity="0.8" />
                  </g>

                  {/* Right Heart Eye */}
                  <g transform={`translate(${rightEyeCenter.x - 11}, ${rightEyeCenter.y - 10}) scale(0.95)`}>
                    <path
                      d="M 11.5 4 C 8.5 -1, 0 1, 1 8 C 2 13.5, 11.5 20, 11.5 20 C 11.5 20, 21 13.5, 22 8 C 23 1, 14.5 -1, 11.5 4 Z"
                      fill={`url(#${uid}-heart)`}
                      filter="drop-shadow(0 0 8px rgba(236, 72, 153, 0.8))"
                    />
                    <circle cx="7" cy="6" r="1.6" fill="#ffffff" opacity="0.8" />
                  </g>

                  {/* Sweet Smile */}
                  <path
                    d="M 40 62 Q 50 70 60 62"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* Expression 5: EXCITED (★ ★) */}
              {currentExpr === "excited" && (
                <g key="excited" className="animate-in fade-in zoom-in-95 duration-200">
                  {/* Left 4-Point Star Eye */}
                  <g transform={`translate(${leftEyeCenter.x}, ${leftEyeCenter.y})`}>
                    <path
                      d="M 0 -11 Q 0 0 11 0 Q 0 0 0 11 Q 0 0 -11 0 Q 0 0 0 -11 Z"
                      fill={`url(#${uid}-star)`}
                      filter="drop-shadow(0 0 8px rgba(103, 232, 249, 0.85))"
                    />
                    <circle cx="0" cy="0" r="2.2" fill="#ffffff" />
                  </g>

                  {/* Right 4-Point Star Eye */}
                  <g transform={`translate(${rightEyeCenter.x}, ${rightEyeCenter.y})`}>
                    <path
                      d="M 0 -11 Q 0 0 11 0 Q 0 0 0 11 Q 0 0 -11 0 Q 0 0 0 -11 Z"
                      fill={`url(#${uid}-star)`}
                      filter="drop-shadow(0 0 8px rgba(103, 232, 249, 0.85))"
                    />
                    <circle cx="0" cy="0" r="2.2" fill="#ffffff" />
                  </g>

                  {/* Open Beaming Mouth */}
                  <path
                    d="M 38 58 Q 50 74 62 58 Z"
                    fill="#170638"
                    stroke="#ffffff"
                    strokeWidth="2.2"
                  />
                  <path
                    d="M 43 66 Q 50 63 57 66"
                    fill="none"
                    stroke="#F472B6"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* Expression 6: WINK (; ^) */}
              {currentExpr === "wink" && (
                <g key="wink" className="animate-in fade-in zoom-in-95 duration-200">
                  {/* Left Eye: Playful Wink Arc */}
                  <path
                    d="M 24 45 Q 33 53 42 45"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    filter="drop-shadow(0 0 4px rgba(255,255,255,0.6))"
                  />
                  {/* Wink Lash Accent */}
                  <line
                    x1="40"
                    y1="46"
                    x2="44"
                    y2="42"
                    stroke="#ffffff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />

                  {/* Right Eye: Open Eye Tracking Cursor */}
                  <circle
                    cx={rightEyeCenter.x}
                    cy={rightEyeCenter.y}
                    r={eyeRadius}
                    fill={`url(#${uid}-eye-socket)`}
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="0.8"
                  />
                  <circle
                    cx={rightEyeCenter.x + pupilState.rx}
                    cy={rightEyeCenter.y + pupilState.ry}
                    r={pupilRadius}
                    fill="#050112"
                  />
                  <circle
                    cx={rightEyeCenter.x + pupilState.rx - 1.4}
                    cy={rightEyeCenter.y + pupilState.ry - 1.4}
                    r={1.7}
                    fill="#ffffff"
                  />

                  {/* Playful Smirk tilted */}
                  <path
                    d="M 40 62 Q 52 68 62 59"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* Expression 7: DIZZY (✕ ✕) */}
              {currentExpr === "dizzy" && (
                <g key="dizzy" className="animate-in fade-in zoom-in-95 duration-200">
                  {/* Left Cross Eye */}
                  <g transform={`translate(${leftEyeCenter.x}, ${leftEyeCenter.y})`}>
                    <line
                      x1="-7"
                      y1="-7"
                      x2="7"
                      y2="7"
                      stroke="#ffffff"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      filter="drop-shadow(0 0 4px rgba(255,255,255,0.5))"
                    />
                    <line
                      x1="7"
                      y1="-7"
                      x2="-7"
                      y2="7"
                      stroke="#ffffff"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      filter="drop-shadow(0 0 4px rgba(255,255,255,0.5))"
                    />
                  </g>

                  {/* Right Cross Eye */}
                  <g transform={`translate(${rightEyeCenter.x}, ${rightEyeCenter.y})`}>
                    <line
                      x1="-7"
                      y1="-7"
                      x2="7"
                      y2="7"
                      stroke="#ffffff"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      filter="drop-shadow(0 0 4px rgba(255,255,255,0.5))"
                    />
                    <line
                      x1="7"
                      y1="-7"
                      x2="-7"
                      y2="7"
                      stroke="#ffffff"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      filter="drop-shadow(0 0 4px rgba(255,255,255,0.5))"
                    />
                  </g>

                  {/* Wobbly Squiggle Mouth */}
                  <path
                    d="M 38 63 Q 44 59 48 64 Q 52 69 56 62 Q 60 59 64 63"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </g>
              )}
            </svg>
          </div>
        </motion.div>
      </motion.div>

      {/* Realistic Soft 3D Ground Shadow beneath Mascot */}
      <div
        ref={shadowRef}
        className="w-20 h-3 rounded-full mt-2 pointer-events-none transition-all duration-100"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(147, 51, 234, 0.45) 0%, rgba(10, 4, 28, 0.6) 45%, transparent 75%)",
          filter: "blur(5px)",
        }}
      />

      {/* Floating Reaction Pill on Click */}
      <AnimatePresence>
        {expressionToast && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.8 }}
            animate={{ opacity: 1, y: -10, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute -top-7 px-2.5 py-0.5 rounded-full bg-purple-900/90 border border-purple-400/50 text-[10px] font-bold tracking-wider text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.5)] pointer-events-none whitespace-nowrap z-30"
          >
            {expressionToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
