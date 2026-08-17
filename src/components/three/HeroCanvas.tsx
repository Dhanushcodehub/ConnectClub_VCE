"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Fibonacci sphere distribution ───────────────────────────────────────────
function fibSphere(n: number, r: number): THREE.Vector3[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / (n - 1)) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    return new THREE.Vector3(
      Math.cos(theta) * rad * r,
      y * r,
      Math.sin(theta) * rad * r
    );
  });
}

// ─── Logo Sphere ──────────────────────────────────────────────────────────────
function LogoSphere() {
  const groupRef = useRef<THREE.Group>(null!);
  const mouseRef = useRef({ x: 0, y: 0 });
  const autoY = useRef(0);

  const R = 2.3;           // sphere radius
  const N = 60;            // node count — matches logo density
  const CONNECT = 1.45;    // connection distance increased slightly to ensure more reliable connections

  const positions = useMemo(() => fibSphere(N, R), []);

  // Uniform-ish sizes — like the logo (small variation, no huge blobs)
  const sizes = useMemo(
    () => positions.map((_, i) => 0.055 + (Math.sin(i * 2.4) * 0.5 + 0.5) * 0.10),
    [positions]
  );

  // Connection line geometry
  const lineGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        if (positions[i].distanceTo(positions[j]) < CONNECT) {
          pts.push(positions[i].clone(), positions[j].clone());
        }
      }
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [positions]);

  // Per-node pulse phases
  const phases = useMemo(() => positions.map((_, i) => i * 0.43), [positions]);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Mouse tracking
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    // Slow auto rotation
    autoY.current += 0.0028;
    const tY = autoY.current + mouseRef.current.x * 0.22;
    const tX = 0.12 + mouseRef.current.y * 0.08;

    groupRef.current.rotation.y += (tY - groupRef.current.rotation.y) * 0.022;
    groupRef.current.rotation.x += (tX - groupRef.current.rotation.x) * 0.03;

    // Individual blob pulse
    meshRefs.current.forEach((m, i) => {
      if (!m) return;
      const p = 1 + Math.sin(t * 1.1 + phases[i]) * 0.1;
      m.scale.setScalar(p);
    });
  });

  return (
    <group ref={groupRef}>
      {/* Very subtle inner sphere to give the logo its "body" */}
      <mesh>
        <sphereGeometry args={[R * 0.97, 48, 48]} />
        <meshStandardMaterial
          color="#030d22"
          transparent
          opacity={0.55}
          roughness={1}
        />
      </mesh>

      {/* Connection lines */}
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial 
          color="#1a5cff" 
          transparent 
          opacity={0.6} 
          depthWrite={false}
          depthTest={false} 
        />
      </lineSegments>

      {/* Nodes */}
      {positions.map((pos, i) => {
        // Every 7th node gets the bright cyan accent like the logo variation
        const accent = i % 7 === 0;
        return (
          <mesh
            key={i}
            ref={(el) => { meshRefs.current[i] = el; }}
            position={pos}
          >
            <sphereGeometry args={[sizes[i], 12, 12]} />
            <meshStandardMaterial
              color={accent ? "#00E5FF" : "#1166FF"}
              emissive={accent ? "#00E5FF" : "#0044DD"}
              emissiveIntensity={accent ? 2.2 : 1.0}
              roughness={0.2}
              metalness={0.15}
            />
          </mesh>
        );
      })}

      {/* Atmosphere glow shells */}
      <mesh>
        <sphereGeometry args={[R * 1.04, 32, 32]} />
        <meshBasicMaterial color="#0044FF" transparent opacity={0.035} side={THREE.FrontSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[R * 1.12, 32, 32]} />
        <meshBasicMaterial color="#00AAFF" transparent opacity={0.018} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function LogoCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.8], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      resize={{ scroll: false }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.55} color="#0a1a3a" />
      <pointLight position={[-5, 6, 5]}  intensity={5}   color="#0055FF" />
      <pointLight position={[5, -4, -4]} intensity={3}   color="#00CCFF" />
      <pointLight position={[0, 5, 3]}   intensity={2}   color="#4488FF" />
      <LogoSphere />
    </Canvas>
  );
}
