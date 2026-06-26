"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useScrollProgress } from "./useScrollProgress";

/* ------------------------------------------------------------------ */
/*  Steps Data                                                        */
/* ------------------------------------------------------------------ */

interface Step {
  num: number;
  emoji: string;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    num: 1,
    emoji: "📱",
    title: "Scan QR Code",
    description: "Customer scans the QR code on their table",
  },
  {
    num: 2,
    emoji: "🌐",
    title: "Restaurant Page Opens",
    description: "Branded restaurant page loads instantly",
  },
  {
    num: 3,
    emoji: "📋",
    title: "Explore Digital Menu",
    description: "Browse categories, photos, prices & descriptions",
  },
  {
    num: 4,
    emoji: "🤖",
    title: "Chat with AI Waiter",
    description: "Ask for recommendations, dietary filters, combos",
  },
  {
    num: 5,
    emoji: "🛒",
    title: "Place Order",
    description: "Review cart and confirm with one tap",
  },
  {
    num: 6,
    emoji: "👨‍🍳",
    title: "Kitchen Receives Order",
    description: "Order appears on Kitchen Display instantly",
  },
  {
    num: 7,
    emoji: "📍",
    title: "Track Order Live",
    description: "Customer sees real-time status updates",
  },
  {
    num: 8,
    emoji: "🍽️",
    title: "Food is Served",
    description: "Enjoy the meal — no delays, no errors",
  },
];

/* ------------------------------------------------------------------ */
/*  Timeline Node (the dot on the line)                               */
/* ------------------------------------------------------------------ */

function TimelineNode({ index }: { index: number }) {
  const nodeRef = useRef<HTMLDivElement>(null!);
  const isInView = useInView(nodeRef, { once: false, margin: "-40% 0px -40% 0px" });

  return (
    <div ref={nodeRef} className="relative flex items-center justify-center">
      {/* Outer glow ring — only visible when in view */}
      <motion.div
        className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-clay to-electric-blue"
        initial={{ opacity: 0, scale: 0.4 }}
        animate={
          isInView
            ? { opacity: 0.35, scale: 1 }
            : { opacity: 0, scale: 0.4 }
        }
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      {/* Inner solid dot */}
      <motion.div
        className="relative w-4 h-4 rounded-full border-2 border-white/20"
        initial={{ backgroundColor: "rgba(255,255,255,0.1)" }}
        animate={
          isInView
            ? {
                backgroundColor: "#D95333",
                borderColor: "rgba(217,83,51,0.6)",
                boxShadow: "0 0 12px rgba(217,83,51,0.5)",
              }
            : {
                backgroundColor: "rgba(255,255,255,0.1)",
                borderColor: "rgba(255,255,255,0.2)",
                boxShadow: "0 0 0px rgba(217,83,51,0)",
              }
        }
        transition={{ duration: 0.4 }}
        data-testid={`timeline-node-${index}`}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step Card                                                         */
/* ------------------------------------------------------------------ */

interface StepCardProps {
  step: Step;
  index: number;
  /** "left" | "right" — which side of the timeline this card sits on */
  side: "left" | "right";
}

function StepCard({ step, index, side }: StepCardProps) {
  const slideX = side === "left" ? -40 : 40;

  return (
    <motion.div
      initial={{ opacity: 0, x: slideX, y: 12 }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{
        scale: 1.02,
        borderColor: "rgba(255,255,255,0.1)",
        transition: { duration: 0.2 },
      }}
      className="group bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6
                 backdrop-blur-sm cursor-default transition-colors duration-200"
      data-testid={`how-it-works-step-${step.num}`}
    >
      {/* Top row: number badge + emoji + title */}
      <div className="flex items-center gap-3 mb-3">
        {/* Step number circle */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-clay to-gold
                      text-white font-bold text-sm flex items-center justify-center
                      shadow-lg shadow-clay/20"
        >
          {step.num}
        </div>
        {/* Emoji */}
        <span className="text-2xl" role="img" aria-label={step.title}>
          {step.emoji}
        </span>
        {/* Title */}
        <h3 className="font-heading text-lg text-white tracking-tight leading-snug">
          {step.title}
        </h3>
      </div>

      {/* Description */}
      <p className="text-sm text-stone leading-relaxed pl-[52px]">
        {step.description}
      </p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Section                                                      */
/* ------------------------------------------------------------------ */

export function HowItWorks() {
  const { ref: sectionRef, scrollProgress } = useScrollProgress();

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-24 px-6 lg:px-24 max-w-[1400px] mx-auto overflow-hidden"
      data-testid="how-it-works-section"
    >
      {/* ── Ambient glow blobs ────────────────────────────────── */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2
                    w-[600px] h-[600px] rounded-full
                    bg-gradient-to-br from-clay/10 via-gold/5 to-electric-blue/10
                    blur-[150px] opacity-40"
        aria-hidden
      />

      {/* ── Section Header ────────────────────────────────────── */}
      <motion.div
        className="text-center mb-20"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl text-white tracking-tight mb-4">
          How{" "}
          <span className="bg-gradient-to-r from-clay via-gold to-electric-blue bg-clip-text text-transparent">
            SmartDine
          </span>{" "}
          Works
        </h2>
        <p className="text-stone text-lg md:text-xl max-w-xl mx-auto">
          From scan to served in 8 simple steps
        </p>
      </motion.div>

      {/* ── Timeline Grid ─────────────────────────────────────── */}
      <div className="relative max-w-5xl mx-auto">
        {/* ── Vertical connecting line (gradient, scroll-animated) */}
        {/* Background track */}
        <div
          className="absolute left-5 md:left-1/2 md:-translate-x-1/2 top-0 bottom-0
                      w-[2px] bg-white/[0.06]"
          aria-hidden
        />
        {/* Animated fill */}
        <motion.div
          className="absolute left-5 md:left-1/2 md:-translate-x-1/2 top-0
                      w-[2px] origin-top"
          style={{
            height: "100%",
            scaleY: scrollProgress,
            background:
              "linear-gradient(to bottom, #D95333 0%, #EAB308 40%, #2A64F6 100%)",
          }}
          aria-hidden
        />

        {/* ── Steps ───────────────────────────────────────────── */}
        <div className="relative flex flex-col gap-12 md:gap-16">
          {steps.map((step, i) => {
            const isOdd = i % 2 === 0; // steps 1,3,5,7 → left on desktop

            return (
              <div
                key={step.num}
                className="relative grid grid-cols-[40px_1fr] md:grid-cols-[1fr_40px_1fr] items-center gap-4 md:gap-6"
              >
                {/* ── Desktop LEFT cell ─────────────────────── */}
                <div className="hidden md:block">
                  {isOdd ? (
                    <StepCard step={step} index={i} side="left" />
                  ) : (
                    /* empty placeholder */ <div />
                  )}
                </div>

                {/* ── Timeline node (center on desktop, left on mobile) */}
                <div className="flex justify-center z-10">
                  <TimelineNode index={i} />
                </div>

                {/* ── Desktop RIGHT cell ────────────────────── */}
                <div className="hidden md:block">
                  {!isOdd ? (
                    <StepCard step={step} index={i} side="right" />
                  ) : (
                    <div />
                  )}
                </div>

                {/* ── Mobile card (always right of the line) ── */}
                <div className="block md:hidden col-start-2">
                  <StepCard step={step} index={i} side="right" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
