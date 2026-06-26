"use client";

import { useMemo, Suspense } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";

/* -------------------------------------------------------------------------- */
/*  3D Restaurant Table Scene (lazy-loaded, ssr: false)                       */
/* -------------------------------------------------------------------------- */

function TableMesh() {
  return (
    <group position={[0, -0.15, 0]}>
      {/* Table top */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.6, 1.6, 0.08, 48]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.35} metalness={0.2} />
      </mesh>
      {/* Table top edge ring */}
      <mesh position={[0, 0.04, 0]}>
        <torusGeometry args={[1.6, 0.02, 8, 48]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Table leg */}
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 1.0, 16]} />
        <meshStandardMaterial color="#111111" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Table base */}
      <mesh position={[0, -1.05, 0]}>
        <cylinderGeometry args={[0.6, 0.65, 0.06, 32]} />
        <meshStandardMaterial color="#111111" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  );
}

function SmartphoneMesh() {
  return (
    <group position={[0.3, 0.02, 0.2]} rotation={[-Math.PI / 2, 0, 0.2]}>
      {/* Phone body */}
      <mesh castShadow>
        <boxGeometry args={[0.35, 0.7, 0.03]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.2} metalness={0.8} />
      </mesh>
      {/* Phone screen (glowing) */}
      <mesh position={[0, 0, 0.016]}>
        <planeGeometry args={[0.3, 0.6]} />
        <meshStandardMaterial
          color="#1a3a6a"
          emissive="#2A64F6"
          emissiveIntensity={0.6}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
      {/* Screen content lines */}
      {[0.18, 0.08, -0.02, -0.12].map((y, i) => (
        <mesh key={i} position={[-0.02, y, 0.018]}>
          <planeGeometry args={[0.2, 0.025]} />
          <meshBasicMaterial color="#4a7af5" transparent opacity={0.5} />
        </mesh>
      ))}
      {/* Screen glow point light */}
      <pointLight
        position={[0, 0, 0.15]}
        color="#2A64F6"
        intensity={0.4}
        distance={1.5}
        decay={2}
      />
    </group>
  );
}

function QRStandMesh() {
  return (
    <group position={[-0.5, 0.17, -0.3]} rotation={[0, 0.3, 0]}>
      {/* Stand base */}
      <mesh>
        <boxGeometry args={[0.3, 0.04, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Stand card */}
      <mesh position={[0, 0.2, -0.04]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[0.25, 0.35, 0.01]} />
        <meshStandardMaterial color="#f0ede8" roughness={0.8} metalness={0} />
      </mesh>
      {/* QR code pattern (grid of small boxes) */}
      {Array.from({ length: 16 }).map((_, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const show = [0, 1, 3, 4, 6, 7, 8, 10, 12, 13, 15].includes(i);
        if (!show) return null;
        return (
          <mesh
            key={i}
            position={[
              -0.055 + col * 0.038,
              0.13 + row * 0.038,
              -0.033,
            ]}
            rotation={[-0.15, 0, 0]}
          >
            <boxGeometry args={[0.03, 0.03, 0.002]} />
            <meshBasicMaterial color="#111111" />
          </mesh>
        );
      })}
    </group>
  );
}

function PlateMesh() {
  return (
    <group position={[-0.15, -0.08, 0.55]}>
      {/* Plate body */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.32, 0.03, 32]} />
        <meshStandardMaterial color="#e8e4dc" roughness={0.6} metalness={0.05} />
      </mesh>
      {/* Inner ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <torusGeometry args={[0.22, 0.005, 8, 32]} />
        <meshStandardMaterial color="#d4d0c8" roughness={0.7} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Floating AI sparkle particles                                             */
/* -------------------------------------------------------------------------- */

function FloatingSparkles() {
  const sparkleData = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => ({
        position: [
          0.3 + (Math.random() - 0.5) * 0.6,
          0.25 + Math.random() * 0.7,
          0.2 + (Math.random() - 0.5) * 0.5,
        ] as [number, number, number],
        scale: 0.015 + Math.random() * 0.02,
        speed: 1 + Math.random() * 2,
        floatIntensity: 0.3 + Math.random() * 0.5,
        color: i % 3 === 0 ? "#D95333" : i % 3 === 1 ? "#EAB308" : "#2A64F6",
      })),
    []
  );

  // Lazy-import Float from drei inside the component tree (already inside Canvas)
  const { Float } = require("@react-three/drei");

  return (
    <>
      {sparkleData.map((s, i) => (
        <Float
          key={i}
          speed={s.speed}
          floatIntensity={s.floatIntensity}
          rotationIntensity={0.2}
        >
          <mesh position={s.position}>
            <sphereGeometry args={[s.scale, 8, 8]} />
            <meshStandardMaterial
              color={s.color}
              emissive={s.color}
              emissiveIntensity={2}
              toneMapped={false}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Full 3D Scene (composed)                                                  */
/* -------------------------------------------------------------------------- */

function RestaurantTableScene() {
  const { Canvas } = require("@react-three/fiber");
  const { OrbitControls, Environment } = require("@react-three/drei");

  return (
    <Canvas
      camera={{
        position: [2.2, 2.4, 3.0],
        fov: 35,
        near: 0.1,
        far: 50,
      }}
      dpr={[1, 1.5]}
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["transparent"]} />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        color="#fff5e6"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-3, 4, -2]} intensity={0.3} color="#2A64F6" />
      <pointLight position={[3, 3, 3]} intensity={0.2} color="#D95333" />

      <Suspense fallback={null}>
        {/* Scene objects */}
        <group rotation={[0, -0.4, 0]}>
          <TableMesh />
          <SmartphoneMesh />
          <QRStandMesh />
          <PlateMesh />
          <FloatingSparkles />
        </group>

        <Environment preset="city" environmentIntensity={0.15} />
      </Suspense>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.6}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 4}
      />
    </Canvas>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dynamic import wrapper (SSR disabled)                                     */
/* -------------------------------------------------------------------------- */

const Scene3D = dynamic(
  () => Promise.resolve({ default: RestaurantTableScene }),
  {
    ssr: false,
    loading: () => null,
  }
);

/* -------------------------------------------------------------------------- */
/*  Animation variants                                                        */
/* -------------------------------------------------------------------------- */

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

/* -------------------------------------------------------------------------- */
/*  HeroSection Component                                                     */
/* -------------------------------------------------------------------------- */

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen bg-ink overflow-hidden pt-32"
    >
      {/* ─── Background Glow Blobs ─── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 overflow-hidden"
      >
        <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-clay/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-[15%] right-[10%] w-[600px] h-[600px] bg-electric-blue/10 rounded-full blur-[150px]" />
        <div className="absolute top-[40%] left-[50%] w-[350px] h-[350px] bg-gold/5 rounded-full blur-[120px]" />
      </div>

      {/* ─── Content Grid ─── */}
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-16 xl:px-24 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        {/* ─── Text Content ─── */}
        <div className="flex-1 flex flex-col items-center text-center pt-8 lg:pt-0 max-w-4xl">
          {/* Badge */}
          <motion.div
            {...fadeUp(0)}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl text-cream text-sm font-medium mb-8"
            data-testid="hero-badge"
          >
            <span className="text-base">✨</span>
            <span>AI-Powered Restaurant Platform</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            {...fadeUp(0.1)}
            className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight text-white mb-6"
            data-testid="hero-headline"
          >
            Dining Made Smarter
            <br />
            with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-clay via-gold to-electric-blue">
              AI.
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            {...fadeUp(0.2)}
            className="text-stone text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10"
            data-testid="hero-subheading"
          >
            Scan. Chat. Order. Track. Enjoy.
            <br />
            SmartDine transforms every restaurant into an intelligent dining
            experience.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            {...fadeUp(0.3)}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 w-full sm:w-auto"
            data-testid="hero-cta-group"
          >
            <Link
              href="/demo"
              className="w-full sm:w-auto inline-flex items-center justify-center bg-white text-ink rounded-full px-8 py-4 font-semibold text-base shadow-[0_0_50px_-12px_rgba(255,255,255,0.35)] hover:shadow-[0_0_60px_-8px_rgba(255,255,255,0.45)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
              data-testid="hero-cta-primary"
            >
              Book a Demo
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center border border-white/20 text-white rounded-full px-8 py-4 font-medium text-base hover:bg-white/5 active:bg-white/10 transition-all duration-200 backdrop-blur-sm"
              data-testid="hero-cta-secondary"
            >
              Explore Features ↓
            </Link>
          </motion.div>

          {/* Trust Line */}
          <motion.div
            {...fadeUp(0.45)}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            data-testid="hero-trust"
          >
            {/* Avatar Stack */}
            <div className="flex -space-x-2.5">
              {[1, 2, 3, 4].map((seed) => (
                <div
                  key={seed}
                  className="w-9 h-9 rounded-full border-2 border-ink bg-bone overflow-hidden ring-1 ring-white/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.dicebear.com/7.x/notionists/svg?seed=smartdine${seed}`}
                    alt={`Restaurant owner ${seed}`}
                    width={36}
                    height={36}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-stone text-center sm:text-left">
              Trusted by{" "}
              <span className="text-cream font-medium">500+ restaurants</span>{" "}
              across India
            </p>
          </motion.div>
        </div>
      </div>

      {/* ─── Bottom gradient fade ─── */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-ink to-transparent z-20 pointer-events-none"
      />
    </section>
  );
}
