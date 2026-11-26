"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";

// ─── Infinite Moving 3D Grid ────────────────────────────────────────────────
function InfiniteGrid({ reducedMotion }: { reducedMotion: boolean }) {
  const gridRef = useRef<THREE.GridHelper>(null!);

  useFrame((_, delta) => {
    if (reducedMotion || !gridRef.current) return;
    // Move the grid towards the camera to create infinite forward motion
    gridRef.current.position.z += delta * 4; // speed of grid

    // Reset position to loop seamlessly.
    // The grid size is 200 with 100 divisions. So each grid cell is 200/100 = 2 units.
    if (gridRef.current.position.z > 2) {
      gridRef.current.position.z = 0;
    }
  });

  return (
    <gridHelper 
      ref={gridRef}
      args={[200, 100, "#0066FF", "#002266"]} // size, divisions, center color, grid color
      position={[0, -6, 0]}
    />
  );
}

// Deterministic pseudo-random helper so CyberDots geometry stays pure for React Compiler
function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// ─── Cyber Dust / Starfield Dots ─────────────────────────────────────────────
function CyberDots({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
  const pointsRef = useRef<THREE.Points>(null!);

  const geo = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (seededUnit(i * 3 + 1) - 0.5) * 100; // x spread
      positions[i * 3 + 1] = (seededUnit(i * 3 + 2) - 0.5) * 50;  // y spread
      positions[i * 3 + 2] = (seededUnit(i * 3 + 3) - 0.5) * 100; // z spread
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count]);

  useFrame((_, delta) => {
    if (reducedMotion || !pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.02; // slow rotation
    pointsRef.current.position.z += delta * 2; // slow movement towards user

    // Reset if it gets too close to keep them flowing
    if (pointsRef.current.position.z > 50) {
      pointsRef.current.position.z = -50;
    }
  });

  return (
    <points ref={pointsRef} geometry={geo}>
      <pointsMaterial color="#00AAFF" size={0.12} sizeAttenuation transparent opacity={0.6} />
    </points>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function BGScene({ dotCount, reducedMotion }: { dotCount: number; reducedMotion: boolean }) {
  return (
    <>
      <fog attach="fog" args={["#000000", 10, 50]} /> {/* Fade to pitch black in the distance */}
      <InfiniteGrid reducedMotion={reducedMotion} />
      <CyberDots count={dotCount} reducedMotion={reducedMotion} />
    </>
  );
}

// ─── Exported canvas (fixed, full-screen, behind everything) ─────────────────
export function BackgroundCanvas() {
  const shouldReduceMotion = Boolean(useReducedMotion());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 60 }}
      gl={{ antialias: !isMobile, alpha: true, powerPreference: "high-performance" }}
      dpr={isMobile ? [1, 1.25] : [1, 1.5]}
      frameloop={shouldReduceMotion ? "demand" : "always"}
      style={{ position: "absolute", inset: 0, zIndex: -1, pointerEvents: "none" }}
    >
      <ambientLight intensity={0.5} />
      <BGScene dotCount={isMobile ? 600 : 1500} reducedMotion={shouldReduceMotion} />
    </Canvas>
  );
}
