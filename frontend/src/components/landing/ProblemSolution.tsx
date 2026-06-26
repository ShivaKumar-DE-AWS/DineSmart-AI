"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  XCircle,
  CheckCircle2,
  Sparkles,
  Zap,
  ArrowDown,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const painPoints = [
  "Customers wait 15+ minutes to place an order",
  "Waiters overwhelmed during peak hours",
  "Paper menus — outdated, torn, unhygienic",
  "Wrong orders and miscommunication",
  "No real-time tracking for customers",
  "Zero analytics or customer insights",
] as const;

const benefits = [
  "Instant QR scan ordering — no waiting",
  "AI Waiter handles orders 24/7",
  "Dynamic digital menus with photos & descriptions",
  "Zero errors — direct-to-kitchen digital orders",
  "Live order tracking for every customer",
  "Complete analytics dashboard for owners",
] as const;

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const headingVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ProblemSolution() {
  return (
    <section
      id="problem"
      className="relative py-24 px-6 lg:px-24 max-w-[1400px] mx-auto overflow-hidden"
    >
      {/* ── Section Heading ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16 lg:mb-20"
      >
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-cream text-sm font-medium mb-6 backdrop-blur-md">
          <Zap className="h-4 w-4 text-gold" />
          Why Restaurants Switch
        </span>
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl tracking-tight text-white">
          The Difference Is{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-clay via-gold to-electric-blue">
            Night & Day
          </span>
        </h2>
      </motion.div>

      {/* ── Split-Screen Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 lg:gap-0">
        {/* ─── Left Panel: The Old Way ───────────────────────────── */}
        <div className="relative rounded-3xl p-6 sm:p-8 bg-alert/[0.04] border border-alert/10 overflow-hidden">
          {/* Red glow blob */}
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-alert/15 rounded-full blur-[120px] pointer-events-none" />

          <motion.div
            variants={headingVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="flex items-center gap-3 mb-8 relative z-10"
          >
            <div className="w-10 h-10 rounded-xl bg-alert/10 flex items-center justify-center shrink-0">
              <XCircle className="h-5 w-5 text-alert/70" />
            </div>
            <h3 className="font-heading text-xl sm:text-2xl text-alert/80 tracking-tight">
              The Old Way
            </h3>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="space-y-3 relative z-10"
          >
            {painPoints.map((point, i) => (
              <motion.div
                key={i}
                variants={cardVariants}
                data-testid={`pain-point-${i}`}
                className="flex items-start gap-3 rounded-2xl bg-white/[0.02] border border-white/5 p-4 backdrop-blur-sm group hover:bg-alert/[0.04] transition-colors duration-300"
              >
                <XCircle className="h-5 w-5 text-alert/60 mt-0.5 shrink-0" />
                <span className="text-sm sm:text-base text-stone leading-relaxed">
                  {point}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Muted overlay for desaturated feel */}
          <div className="absolute inset-0 bg-ink/20 rounded-3xl pointer-events-none mix-blend-saturation" />
        </div>

        {/* ─── Center Divider ────────────────────────────────────── */}
        {/* Desktop: vertical line + VS badge */}
        <div className="hidden lg:flex flex-col items-center justify-center relative px-8">
          <div className="absolute inset-y-8 w-px bg-gradient-to-b from-alert/40 via-white/20 to-ready/40" />
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            whileInView={{ scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
            className="relative z-10 w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-[0_0_40px_-5px_rgba(255,255,255,0.15)]"
          >
            <span className="font-heading text-lg font-bold text-transparent bg-clip-text bg-gradient-to-br from-alert via-gold to-ready">
              VS
            </span>
          </motion.div>
        </div>

        {/* Mobile: horizontal divider + VS badge */}
        <div className="flex lg:hidden items-center justify-center relative py-2">
          <div className="absolute inset-x-8 h-px bg-gradient-to-r from-alert/40 via-white/20 to-ready/40" />
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            whileInView={{ scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="relative z-10 w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-[0_0_30px_-5px_rgba(255,255,255,0.15)]"
          >
            <span className="font-heading text-base font-bold text-transparent bg-clip-text bg-gradient-to-br from-alert via-gold to-ready">
              VS
            </span>
          </motion.div>
        </div>

        {/* ─── Right Panel: The SmartDine Way ────────────────────── */}
        <div className="relative rounded-3xl p-6 sm:p-8 bg-ready/[0.04] border border-ready/10 overflow-hidden">
          {/* Green/gold glow blob */}
          <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-ready/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-10 left-1/2 w-48 h-48 bg-gold/10 rounded-full blur-[100px] pointer-events-none" />

          <motion.div
            variants={headingVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="flex items-center gap-3 mb-8 relative z-10"
          >
            <div className="w-10 h-10 rounded-xl bg-ready/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-ready" />
            </div>
            <h3 className="font-heading text-xl sm:text-2xl text-ready tracking-tight">
              The SmartDine Way
            </h3>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="space-y-3 relative z-10"
          >
            {benefits.map((benefit, i) => (
              <motion.div
                key={i}
                variants={cardVariants}
                data-testid={`benefit-${i}`}
                className="flex items-start gap-3 rounded-2xl bg-white/[0.03] border border-white/5 p-4 backdrop-blur-sm group hover:bg-ready/[0.06] transition-colors duration-300"
              >
                <CheckCircle2 className="h-5 w-5 text-ready mt-0.5 shrink-0" />
                <span className="text-sm sm:text-base text-cream/90 leading-relaxed">
                  {benefit}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Bottom Caption + CTA ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="text-center mt-16 lg:mt-20 space-y-4"
      >
        <p className="text-stone text-sm sm:text-base">
          Join{" "}
          <span className="text-cream font-semibold">500+ restaurants</span>{" "}
          that switched to SmartDine
        </p>
        <Link
          href="#how-it-works"
          data-testid="see-how-it-works-cta"
          className="inline-flex items-center gap-2 text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-clay via-gold to-electric-blue hover:opacity-80 transition-opacity"
        >
          See How It Works
          <ArrowDown className="h-4 w-4 text-gold animate-bounce" />
        </Link>
      </motion.div>
    </section>
  );
}
