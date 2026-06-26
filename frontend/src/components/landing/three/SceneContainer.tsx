"use client";

import React, { Suspense, ReactNode, CSSProperties } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { useSectionInView } from "../useSectionInView";

// Lazy-load Canvas with SSR disabled to avoid Three.js server-side errors
const Canvas = dynamic(
  () => import("@react-three/fiber").then((mod) => mod.Canvas),
  { ssr: false }
);

/* ------------------------------------------------------------------ */
/*  Shimmer Fallback                                                   */
/* ------------------------------------------------------------------ */

function ShimmerFallback() {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-xl"
      data-testid="scene-shimmer-fallback"
    >
      {/* Base dark layer */}
      <div className="absolute inset-0 bg-white/[0.02]" />

      {/* Animated shimmer sweep */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)",
          animation: "shimmer 2s ease-in-out infinite",
        }}
      />

      {/* Subtle gradient accent */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(217,83,51,0.15), transparent 70%)",
        }}
      />

      {/* Inline keyframes for the shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Gradient Placeholder (shown when 3D is not active)                 */
/* ------------------------------------------------------------------ */

function GradientPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 ${className ?? ""}`}
      data-testid="scene-gradient-placeholder"
    >
      {/* Ambient glow blobs */}
      <div
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-30 blur-[120px]"
        style={{ background: "rgba(217, 83, 51, 0.4)" }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-20 blur-[100px]"
        style={{ background: "rgba(234, 179, 8, 0.3)" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full opacity-15 blur-[80px]"
        style={{ background: "rgba(42, 100, 246, 0.3)" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SceneContainer                                                     */
/* ------------------------------------------------------------------ */

interface SceneContainerProps {
  /** Three.js scene children (meshes, lights, controls, etc.) */
  children: ReactNode;
  /** Additional CSS class for the outer wrapper */
  className?: string;
  /** Inline styles for the outer wrapper */
  style?: CSSProperties;
  /** Custom Suspense fallback. Defaults to ShimmerFallback */
  fallback?: ReactNode;
  /** Canvas camera config */
  camera?: Record<string, unknown>;
  /** DPR range. Defaults to [1, 2] */
  dpr?: [number, number];
}

export function SceneContainer({
  children,
  className = "",
  style,
  fallback,
  camera = { position: [0, 0, 5], fov: 45 },
  dpr = [1, 2],
}: SceneContainerProps) {
  const prefersReducedMotion = useReducedMotion();
  const { ref, isInView } = useSectionInView({ threshold: 0.15 });

  const shouldRender3D = isInView && !prefersReducedMotion;

  return (
    <div
      ref={ref}
      className={`relative w-full h-full ${className}`}
      style={style}
      data-testid="scene-container"
    >
      {shouldRender3D ? (
        <Suspense fallback={fallback ?? <ShimmerFallback />}>
          <Canvas
            dpr={dpr}
            gl={{ antialias: true, alpha: true }}
            camera={camera}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
          >
            {children}
          </Canvas>
        </Suspense>
      ) : (
        <GradientPlaceholder />
      )}
    </div>
  );
}

export default SceneContainer;
