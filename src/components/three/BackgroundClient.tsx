"use client";

import dynamic from "next/dynamic";

const BackgroundCanvas = dynamic(
  () => import("@/components/three/BackgroundCanvas").then((m) => m.BackgroundCanvas),
  { ssr: false }
);

export function BackgroundClient() {
  return <BackgroundCanvas />;
}
