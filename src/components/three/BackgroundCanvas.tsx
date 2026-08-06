"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Infinite Moving 3D Grid ────────────────────────────────────────────────
function InfiniteGrid() {
  const gridRef = useRef<THREE.GridHelper>(null!);

  useFrame((_, delta) => {
    if (gridRef.current) {
      // Move the grid towards the camera to create infinite forward motion
      gridRef.current.position.z += delta * 4; // speed of grid
      
      // Reset position to loop seamlessly.
      // The grid size is 200 with 100 divisions. So each grid cell is 200/100 = 2 units.
      if (gridRef.current.position.z > 2) {
        gridRef.current.position.z = 0;
      }
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

// ─── Cyber Dust / Starfield Dots ─────────────────────────────────────────────
function CyberDots() {
  const pointsRef = useRef<THREE.Points>(null!);

  const geo = useMemo(() => {
    const count = 1500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 100; // x spread
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;  // y spread
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100; // z spread
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.02; // slow rotation
      pointsRef.current.position.z += delta * 2; // slow movement towards user
      
      // Reset if it gets too close to keep them flowing
      if (pointsRef.current.position.z > 50) {
        pointsRef.current.position.z = -50;
      }
    }
  });

  return (
    <points ref={pointsRef} geometry={geo}>
      <pointsMaterial color="#00AAFF" size={0.12} sizeAttenuation transparent opacity={0.6} />
    </points>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function BGScene() {
  return (
    <>
      <fog attach="fog" args={["#000000", 10, 50]} /> {/* Fade to pitch black in the distance */}
      <InfiniteGrid />
      <CyberDots />
    </>
  );
}

// ─── Exported canvas (fixed, full-screen, behind everything) ─────────────────
export function BackgroundCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 60 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
      style={{ position: "absolute", inset: 0, zIndex: -1, pointerEvents: "none" }}
    >
      <ambientLight intensity={0.5} />
      <BGScene />
    </Canvas>
  );
}
