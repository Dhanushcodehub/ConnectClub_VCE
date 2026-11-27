"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";

const NODE_COUNT = 38;
const SPHERE_RADIUS = 0.94;
const TWO_PI = Math.PI * 2;

function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function createFibonacciCenters(count: number): THREE.Vector3[] {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const base = new THREE.Vector3(
      Math.cos(theta) * radiusAtY,
      y,
      Math.sin(theta) * radiusAtY
    ).normalize();

    const jx = (seededUnit(i * 7 + 1) - 0.5) * 0.24;
    const jy = (seededUnit(i * 7 + 2) - 0.5) * 0.24;
    const jz = (seededUnit(i * 7 + 3) - 0.5) * 0.24;
    return base.add(new THREE.Vector3(jx, jy, jz)).normalize();
  });
}

/**
 * Un-projects the orthographic 2D Connect Club logo sphere onto a seamless 360°
 * equirectangular luminance map so every circle and organic bridge stays sharp
 * and undistorted as the 3D sphere rotates continuously.
 */
function buildEquirectangularLogoTexture(img: HTMLImageElement): THREE.DataTexture | null {
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = img.width;
  srcCanvas.height = img.height;
  const srcCtx = srcCanvas.getContext("2d");
  if (!srcCtx) return null;

  srcCtx.drawImage(img, 0, 0);
  const srcImg = srcCtx.getImageData(0, 0, img.width, img.height);
  const srcData = srcImg.data;

  // Detect whether image uses alpha channel (transparent PNG) or luminance (white-on-black)
  let hasAlphaChannel = false;
  for (let i = 0; i < srcData.length; i += 4) {
    if (srcData[i + 3] < 220) {
      hasAlphaChannel = true;
      break;
    }
  }

  const getPixelVal = (px: number, py: number): number => {
    const idx = (py * img.width + px) * 4;
    if (hasAlphaChannel) {
      return srcData[idx + 3];
    }
    return srcData[idx] * 0.299 + srcData[idx + 1] * 0.587 + srcData[idx + 2] * 0.114;
  };

  // Tightly crop to active bounds of the logo
  let minX = img.width;
  let minY = img.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (getPixelVal(x, y) > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const cropW = Math.max(1, maxX - minX + 1);
  const cropH = Math.max(1, maxY - minY + 1);

  const eqW = 1024;
  const eqH = 512;
  const out = new Uint8Array(eqW * eqH * 4);

  const sampleAlpha = (u: number, v: number): number => {
    const fx = Math.max(0, Math.min(cropW - 1, u * (cropW - 1)));
    const fy = Math.max(0, Math.min(cropH - 1, v * (cropH - 1)));
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(cropW - 1, x0 + 1);
    const y1 = Math.min(cropH - 1, y0 + 1);
    const tx = fx - x0;
    const ty = fy - y0;

    const a00 = getPixelVal(minX + x0, minY + y0);
    const a10 = getPixelVal(minX + x1, minY + y0);
    const a01 = getPixelVal(minX + x0, minY + y1);
    const a11 = getPixelVal(minX + x1, minY + y1);

    const top = a00 + (a10 - a00) * tx;
    const bottom = a01 + (a11 - a01) * tx;
    return top + (bottom - top) * ty;
  };

  for (let py = 0; py < eqH; py++) {
    const lat = (0.5 - (py + 0.5) / eqH) * Math.PI;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);

    for (let px = 0; px < eqW; px++) {
      const lon = ((px + 0.5) / eqW - 0.5) * TWO_PI;

      // Mirror across ±π/2 so front and back hemispheres meet seamlessly
      let foldedLon = lon;
      if (foldedLon > Math.PI * 0.5) foldedLon = Math.PI - foldedLon;
      else if (foldedLon < -Math.PI * 0.5) foldedLon = -Math.PI - foldedLon;

      const ox = Math.sin(foldedLon) * cosLat;
      const oy = -sinLat;

      const u = 0.5 + 0.492 * ox;
      const v = 0.5 + 0.492 * oy;

      const alpha = sampleAlpha(u, v);
      const val = Math.min(255, Math.max(0, Math.round(alpha)));

      const idx = (py * eqW + px) * 4;
      out[idx] = val;
      out[idx + 1] = val;
      out[idx + 2] = val;
      out[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(out, eqW, eqH, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

const SPHERE_VERTEX_SHADER = /* glsl */ `
  varying vec3 vLocalPos;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  void main() {
    vLocalPos = normalize(position);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const SPHERE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uCenters[${NODE_COUNT}];
  uniform float uWeights[${NODE_COUNT}];
  uniform sampler2D uLogoMap;
  uniform float uHasLogoMap;
  uniform float uTime;

  varying vec3 vLocalPos;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  const float PI = 3.14159265359;

  void main() {
    vec3 p = normalize(vLocalPos);
    float blobMask = 0.0;

    if (uHasLogoMap > 0.5) {
      float lon = atan(p.x, p.z);
      float lat = asin(clamp(p.y, -0.9995, 0.9995));
      vec2 eqUv = vec2(0.5 + lon / (2.0 * PI), 0.5 + lat / PI);
      float raw = texture2D(uLogoMap, eqUv).r;
      blobMask = smoothstep(0.32, 0.68, raw);
    } else {
      float field = 0.0;
      for (int i = 0; i < ${NODE_COUNT}; i++) {
        vec3 diff = p - uCenters[i];
        float d2 = dot(diff, diff);
        field += uWeights[i] * exp(-20.0 * d2);
      }
      float aa = max(fwidth(field) * 1.25, 0.015);
      blobMask = smoothstep(0.50 - aa, 0.50 + aa, field);
    }

    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);

    // Sweeping specular shine light + strong purple rim illumination
    vec3 sweepDir = normalize(vec3(
      sin(uTime * 1.15) * 0.9 - 0.2,
      0.55 + cos(uTime * 0.8) * 0.25,
      0.95
    ));
    vec3 purpleRimDir = normalize(vec3(0.85, -0.35, 0.45));

    float keyDiff = max(dot(N, sweepDir), 0.0);
    float purpleDiff = max(dot(N, purpleRimDir), 0.0);
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.3);

    vec3 halfVec = normalize(sweepDir + V);
    float specGloss = pow(max(dot(N, halfVec), 0.0), 38.0);
    float softSheen = pow(max(dot(N, halfVec), 0.0), 9.0);

    // Deep glossy obsidian core with vivid purple Fresnel rim & specular sheen
    vec3 darkColor = vec3(0.018, 0.012, 0.042);
    darkColor += vec3(0.26, 0.09, 0.52) * purpleDiff * 0.48;
    darkColor += vec3(0.82, 0.62, 1.0) * softSheen * 0.20;
    darkColor += vec3(1.0, 0.92, 1.0) * specGloss * 0.65;
    darkColor += vec3(0.72, 0.34, 1.0) * fresnel * 1.05;

    // Crisp luminous white Connect Club logo with dynamic glossy sheen
    vec3 whiteColor = vec3(0.95, 0.94, 1.0) * (0.86 + 0.14 * keyDiff);
    whiteColor += vec3(1.0, 0.98, 1.0) * specGloss * 0.35;
    whiteColor += vec3(0.80, 0.54, 1.0) * purpleDiff * 0.18;
    whiteColor += vec3(0.78, 0.48, 1.0) * fresnel * 0.45;

    vec3 finalColor = mix(darkColor, whiteColor, blobMask);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const RING_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const RING_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uPulseSpeed;
  uniform float uPhase;
  uniform float uBaseOpacity;
  uniform vec3 uCoreColor;
  uniform vec3 uGlowColor;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  void main() {
    float facing = abs(dot(normalize(vWorldNormal), normalize(vViewDir)));
    float core = pow(facing, 4.5);
    float midGlow = pow(facing, 1.85);
    float outerHalo = pow(facing, 0.95);

    // Intense traveling luminous energy arcs gliding around the orbital strings
    float primaryWave = 0.68 + 0.32 * sin(vUv.x * 6.2831853 * 2.0 - uTime * uPulseSpeed + uPhase);
    float streakA = pow(max(0.0, sin(vUv.x * 6.2831853 - uTime * uPulseSpeed * 1.2 + uPhase)), 7.0);
    float streakB = pow(max(0.0, sin(vUv.x * 6.2831853 + 2.4 - uTime * uPulseSpeed * 0.9 + uPhase)), 10.0);
    float flare = streakA + streakB * 0.9;

    vec3 color = mix(uGlowColor, uCoreColor, clamp(core * 0.95 + flare * 0.8, 0.0, 1.0));
    float alpha = (outerHalo * 0.52 + midGlow * 0.72 + core * 1.35) * primaryWave + flare * (core * 1.1 + midGlow * 0.75) * 1.05;

    gl_FragColor = vec4(color, clamp(alpha * uBaseOpacity, 0.0, 1.0));
  }
`;

const BACKDROP_GLOW_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BACKDROP_GLOW_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    float d = length(vUv - vec2(0.5)) * 2.0;
    float pulse = 0.92 + 0.08 * sin(uTime * 1.3);
    float glow = exp(-d * d * 3.8) * 0.42 * pulse;
    vec3 color = mix(vec3(0.48, 0.14, 0.88), vec3(0.75, 0.45, 1.0), exp(-d * d * 8.0));
    gl_FragColor = vec4(color, glow);
  }
`;

const PARTICLE_VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;

  uniform float uTime;
  uniform float uPixelRatio;

  varying float vAlpha;
  varying float vTint;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vAlpha = 0.4 + 0.6 * sin(uTime * 1.9 + aPhase);
    vTint = 0.5 + 0.5 * sin(aPhase * 3.1);
    gl_PointSize = aSize * uPixelRatio * (22.0 / max(-mvPosition.z, 1.0));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  varying float vAlpha;
  varying float vTint;

  void main() {
    vec2 c = abs(gl_PointCoord - vec2(0.5));
    // Crisp soft glowing square/diamond bokeh spark matching the cyber ambiance
    float box = max(c.x, c.y);
    if (box > 0.48) discard;
    float radial = length(c);
    float core = smoothstep(0.48, 0.05, box);
    float sparkle = exp(-radial * 4.5);

    vec3 purple = vec3(0.66, 0.33, 0.97);
    vec3 white = vec3(0.97, 0.95, 1.0);
    vec3 cyanTint = vec3(0.55, 0.78, 1.0);
    vec3 baseCol = mix(purple, cyanTint, vTint * 0.35);
    vec3 color = mix(baseCol, white, sparkle * 0.75);

    gl_FragColor = vec4(color, (core * 0.55 + sparkle * 0.45) * vAlpha * 0.85);
  }
`;

interface OrbitalRingConfig {
  radius: number;
  tube: number;
  tilt: [number, number, number];
  scale: [number, number, number];
  spinSpeed: [number, number, number];
  pulseSpeed: number;
  phase: number;
  baseOpacity: number;
}

const ORBITAL_RINGS: OrbitalRingConfig[] = [
  // Outer framing halo ring
  {
    radius: 1.88,
    tube: 0.028,
    tilt: [0.16, 0.08, 0.0],
    scale: [1.0, 1.0, 1.0],
    spinSpeed: [0.03, -0.07, 0.38],
    pulseSpeed: 2.5,
    phase: 0.4,
    baseOpacity: 1.0,
  },
  // Near-equatorial sweeping orbit
  {
    radius: 1.56,
    tube: 0.032,
    tilt: [1.34, 0.1, 0.14],
    scale: [1.24, 0.82, 1.0],
    spinSpeed: [0.1, 0.14, 0.68],
    pulseSpeed: 3.4,
    phase: 0.0,
    baseOpacity: 1.0,
  },
  // Near-polar sweeping orbit
  {
    radius: 1.62,
    tube: 0.032,
    tilt: [0.24, 0.16, 1.48],
    scale: [1.18, 0.84, 1.0],
    spinSpeed: [-0.09, 0.12, -0.56],
    pulseSpeed: 2.9,
    phase: 1.7,
    baseOpacity: 1.0,
  },
  // Diagonal orbit A
  {
    radius: 1.66,
    tube: 0.03,
    tilt: [0.84, 0.62, -0.54],
    scale: [1.26, 0.80, 1.0],
    spinSpeed: [0.12, -0.1, 0.48],
    pulseSpeed: 3.8,
    phase: 3.1,
    baseOpacity: 1.0,
  },
  // Diagonal orbit B
  {
    radius: 1.58,
    tube: 0.028,
    tilt: [-0.78, 0.56, 0.68],
    scale: [1.20, 0.84, 1.0],
    spinSpeed: [-0.11, -0.09, -0.62],
    pulseSpeed: 3.15,
    phase: 4.5,
    baseOpacity: 1.0,
  },
];

function GlobeScene({
  isMobile,
  reducedMotion,
}: {
  isMobile: boolean;
  reducedMotion: boolean;
}) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const ringsGroupRef = useRef<THREE.Group>(null);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const particlesRef = useRef<THREE.Points>(null);
  const backdropRef = useRef<THREE.Mesh>(null);
  const invalidate = useThree((state) => state.invalidate);

  const sphereGeometry = useMemo(
    () => new THREE.SphereGeometry(SPHERE_RADIUS, isMobile ? 48 : 64, isMobile ? 48 : 64),
    [isMobile]
  );

  const placeholderTexture = useMemo(() => {
    const data = new Uint8Array([0, 0, 0, 255]);
    const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const sphereMaterial = useMemo(() => {
    const centers = createFibonacciCenters(NODE_COUNT);
    const weights = centers.map((_, i) => 0.84 + seededUnit(i + 11) * 0.42);

    return new THREE.ShaderMaterial({
      vertexShader: SPHERE_VERTEX_SHADER,
      fragmentShader: SPHERE_FRAGMENT_SHADER,
      uniforms: {
        uCenters: { value: centers },
        uWeights: { value: weights },
        uLogoMap: { value: placeholderTexture },
        uHasLogoMap: { value: 0 },
        uTime: { value: 0 },
      },
    });
  }, [placeholderTexture]);

  useEffect(() => {
    let cancelled = false;
    let logoTexture: THREE.DataTexture | null = null;

    const img = new Image();
    img.src = "/logo/navbarlogo.png";
    img.onload = () => {
      if (cancelled) return;
      logoTexture = buildEquirectangularLogoTexture(img);
      if (!logoTexture) return;

      const mat = sphereRef.current?.material as THREE.ShaderMaterial | undefined;
      if (mat?.uniforms?.uLogoMap && mat.uniforms.uHasLogoMap) {
        mat.uniforms.uLogoMap.value = logoTexture;
        mat.uniforms.uHasLogoMap.value = 1;
        invalidate();
      }
    };

    return () => {
      cancelled = true;
      logoTexture?.dispose();
    };
  }, [invalidate]);

  const ringGeometries = useMemo(
    () =>
      ORBITAL_RINGS.map(
        (ring) => new THREE.TorusGeometry(ring.radius, ring.tube, 12, isMobile ? 96 : 128)
      ),
    [isMobile]
  );

  const ringMaterials = useMemo(
    () =>
      ORBITAL_RINGS.map(
        (ring) =>
          new THREE.ShaderMaterial({
            vertexShader: RING_VERTEX_SHADER,
            fragmentShader: RING_FRAGMENT_SHADER,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
              uTime: { value: 0 },
              uPulseSpeed: { value: ring.pulseSpeed },
              uPhase: { value: ring.phase },
              uBaseOpacity: { value: ring.baseOpacity },
              uCoreColor: { value: new THREE.Color("#ffffff") },
              uGlowColor: { value: new THREE.Color("#a855f7") },
            },
          })
      ),
    []
  );

  const backdropGeometry = useMemo(() => new THREE.PlaneGeometry(4.4, 4.4), []);
  const backdropMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: BACKDROP_GLOW_VERTEX,
        fragmentShader: BACKDROP_GLOW_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
        },
      }),
    []
  );

  const particleCount = isMobile ? 54 : 96;

  const particleGeometry = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const r = 1.45 + seededUnit(i * 5 + 1) * 1.15;
      const theta = seededUnit(i * 5 + 2) * TWO_PI;
      const phi = Math.acos(2 * seededUnit(i * 5 + 3) - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      sizes[i] = 1.4 + seededUnit(i * 5 + 4) * 2.5;
      phases[i] = seededUnit(i * 5 + 5) * TWO_PI;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    return geo;
  }, [particleCount]);

  const particleMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PARTICLE_VERTEX_SHADER,
        fragmentShader: PARTICLE_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
        },
      }),
    []
  );

  useEffect(() => () => sphereGeometry.dispose(), [sphereGeometry]);
  useEffect(() => () => placeholderTexture.dispose(), [placeholderTexture]);
  useEffect(() => () => sphereMaterial.dispose(), [sphereMaterial]);
  useEffect(() => () => ringGeometries.forEach((g) => g.dispose()), [ringGeometries]);
  useEffect(() => () => ringMaterials.forEach((m) => m.dispose()), [ringMaterials]);
  useEffect(() => () => backdropGeometry.dispose(), [backdropGeometry]);
  useEffect(() => () => backdropMaterial.dispose(), [backdropMaterial]);
  useEffect(() => () => particleGeometry.dispose(), [particleGeometry]);
  useEffect(() => () => particleMaterial.dispose(), [particleMaterial]);

  useFrame((state, rawDelta) => {
    const particleMat = particlesRef.current?.material as THREE.ShaderMaterial | undefined;
    if (particleMat?.uniforms?.uPixelRatio) {
      particleMat.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    }

    if (reducedMotion) return;

    const delta = Math.min(rawDelta, 0.05);

    if (sphereRef.current) {
      sphereRef.current.rotation.y += delta * 0.65;
      const sphereMat = sphereRef.current.material as THREE.ShaderMaterial | undefined;
      if (sphereMat?.uniforms?.uTime) {
        sphereMat.uniforms.uTime.value += delta;
      }
    }

    if (ringsGroupRef.current) {
      ringsGroupRef.current.rotation.y -= delta * 0.14;
    }

    ringRefs.current.forEach((mesh, index) => {
      const cfg = ORBITAL_RINGS[index];
      if (!mesh || !cfg) return;
      const mat = mesh.material as THREE.ShaderMaterial | undefined;
      if (mat?.uniforms?.uTime) {
        mat.uniforms.uTime.value += delta;
      }
      mesh.rotation.x += delta * cfg.spinSpeed[0];
      mesh.rotation.y += delta * cfg.spinSpeed[1];
      mesh.rotation.z += delta * cfg.spinSpeed[2];
    });

    const bgMat = backdropRef.current?.material as THREE.ShaderMaterial | undefined;
    if (bgMat?.uniforms?.uTime) {
      bgMat.uniforms.uTime.value += delta;
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.14;
      particlesRef.current.rotation.x += delta * 0.035;
      if (particleMat?.uniforms?.uTime) {
        particleMat.uniforms.uTime.value += delta;
      }
    }
  });

  return (
    <group>
      {/* Subtle atmospheric purple halo behind the globe */}
      <mesh
        ref={backdropRef}
        geometry={backdropGeometry}
        material={backdropMaterial}
        position={[0, 0, -1.6]}
      />

      {/* Purple & crisp key lighting */}
      <ambientLight intensity={0.45} color="#1e1035" />
      <pointLight position={[-3, 3, 4]} intensity={2.4} color="#c084fc" />
      <pointLight position={[3, -2, -2]} intensity={2.0} color="#9333ea" />

      {/* Undistorted 360° rotating Connect Club logo sphere */}
      <mesh
        ref={sphereRef}
        geometry={sphereGeometry}
        material={sphereMaterial}
        rotation={[0.04, 0.0, 0.0]}
      />

      {/* Glowing purple orbital rings */}
      <group ref={ringsGroupRef}>
        {ORBITAL_RINGS.map((ring, index) => (
          <mesh
            key={index}
            ref={(el) => {
              ringRefs.current[index] = el;
            }}
            geometry={ringGeometries[index]}
            material={ringMaterials[index]}
            rotation={ring.tilt}
            scale={ring.scale}
          />
        ))}
      </group>

      {/* Subtle floating starlight sparks */}
      <points
        ref={particlesRef}
        geometry={particleGeometry}
        material={particleMaterial}
      />
    </group>
  );
}

export function HeroGlobe({ className }: { className?: string }) {
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
    <div className={className} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 5.45], fov: 44 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        frameloop={shouldReduceMotion ? "demand" : "always"}
        resize={{ scroll: false }}
        style={{ width: "100%", height: "100%", background: "transparent", pointerEvents: "none" }}
      >
        <GlobeScene isMobile={isMobile} reducedMotion={shouldReduceMotion} />
      </Canvas>
    </div>
  );
}
