"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Restaurants", href: "#restaurants" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Pricing", href: "#pricing" },
] as const;

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll(); // check initial position
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <header
      data-testid="navigation-header"
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? "bg-ink/80 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <nav className="max-w-[1400px] mx-auto flex items-center justify-between px-6 md:px-12 lg:px-16 h-[72px]">
        {/* ─── Logo ─── */}
        <Link
          href="/"
          className="flex items-center gap-2 group"
          data-testid="brand-logo"
        >
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 group-hover:border-white/20 transition-colors duration-300">
            <Sparkles className="w-[18px] h-[18px] text-gold" />
          </div>
          <span className="text-xl font-heading font-bold tracking-tight select-none">
            <span className="text-white">Smart</span>
            <span className="text-clay">Dine</span>
            <span className="text-electric-blue ml-1">AI</span>
          </span>
        </Link>

        {/* ─── Desktop Nav Links ─── */}
        <ul className="hidden lg:flex items-center gap-1" data-testid="desktop-nav-links">
          {NAV_LINKS.map(({ label, href }) => (
            <li key={href}>
              <a
                href={href}
                data-testid={`nav-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
                className="relative px-4 py-2 text-sm font-medium text-stone hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/[0.04] group"
              >
                {label}
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 group-hover:w-4 h-[2px] bg-gradient-to-r from-clay to-electric-blue rounded-full transition-all duration-300" />
              </a>
            </li>
          ))}
        </ul>

        {/* ─── Desktop Right Actions ─── */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/auth/login"
            data-testid="staff-login-link"
            className="text-sm font-medium text-stone hover:text-white transition-colors duration-200 px-4 py-2 rounded-lg hover:bg-white/[0.04]"
          >
            Staff Login
          </Link>
          <Link
            href="/auth/restaurant"
            data-testid="get-started-cta"
            className="relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-clay to-electric-blue rounded-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-clay/25 hover:scale-[1.03] active:scale-[0.98]"
          >
            <span className="relative z-10">Get Started</span>
            {/* Hover shimmer overlay */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-200%] hover-shimmer" />
          </Link>
        </div>

        {/* ─── Mobile Hamburger ─── */}
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          data-testid="mobile-menu-toggle"
          className="lg:hidden relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.08] transition-colors duration-200"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          <AnimatePresence mode="wait" initial={false}>
            {mobileOpen ? (
              <motion.span
                key="close"
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-5 h-5" />
              </motion.span>
            ) : (
              <motion.span
                key="menu"
                initial={{ opacity: 0, rotate: 90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: -90 }}
                transition={{ duration: 0.2 }}
              >
                <Menu className="w-5 h-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </nav>

      {/* ─── Mobile Slide-Down Drawer ─── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            data-testid="mobile-menu-drawer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden overflow-hidden bg-ink/95 backdrop-blur-2xl border-b border-white/5"
          >
            <div className="max-w-[1400px] mx-auto px-6 md:px-12 pb-8 pt-4 flex flex-col gap-1">
              {NAV_LINKS.map(({ label, href }, i) => (
                <motion.a
                  key={href}
                  href={href}
                  onClick={closeMobile}
                  data-testid={`mobile-nav-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                  className="text-base font-medium text-stone hover:text-white px-4 py-3 rounded-xl hover:bg-white/[0.04] transition-colors duration-200"
                >
                  {label}
                </motion.a>
              ))}

              {/* Divider */}
              <div className="h-px bg-white/[0.06] my-3" />

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
                className="flex flex-col gap-3 mt-1"
              >
                <Link
                  href="/auth/login"
                  onClick={closeMobile}
                  data-testid="mobile-staff-login-link"
                  className="text-base font-medium text-stone hover:text-white px-4 py-3 rounded-xl hover:bg-white/[0.04] transition-colors duration-200"
                >
                  Staff Login
                </Link>
                <Link
                  href="/auth/restaurant"
                  onClick={closeMobile}
                  data-testid="mobile-get-started-cta"
                  className="flex items-center justify-center px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-clay to-electric-blue rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-clay/25 active:scale-[0.98]"
                >
                  Get Started
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
