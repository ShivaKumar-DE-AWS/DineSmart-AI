"use client";

import { useEffect, useState, useRef, useCallback, RefObject } from "react";

interface UseScrollProgressReturn {
  ref: RefObject<HTMLDivElement>;
  scrollProgress: number;
}

/**
 * Returns a normalized scroll progress value [0..1] for a given element.
 * - 0 = element just entered the viewport from the bottom
 * - 1 = element has exited the viewport from the top
 *
 * Uses IntersectionObserver to gate scroll listening (only active when visible),
 * and requestAnimationFrame to throttle scroll calculations for performance.
 */
export function useScrollProgress(): UseScrollProgressReturn {
  const ref = useRef<HTMLDivElement>(null!);
  const [scrollProgress, setScrollProgress] = useState(0);
  const isVisible = useRef(false);
  const rafId = useRef<number | null>(null);

  const calculateProgress = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // Total travel distance: from when top of element hits bottom of viewport
    // to when bottom of element exits top of viewport
    const totalTravel = windowHeight + rect.height;

    // Current position: how far the element has traveled through the viewport
    // When rect.top === windowHeight → element just entered (progress = 0)
    // When rect.bottom === 0 → element just exited (progress = 1)
    const traveled = windowHeight - rect.top;

    const progress = Math.min(1, Math.max(0, traveled / totalTravel));
    setScrollProgress(progress);
  }, []);

  const handleScroll = useCallback(() => {
    if (!isVisible.current) return;

    if (rafId.current !== null) return;

    rafId.current = requestAnimationFrame(() => {
      calculateProgress();
      rafId.current = null;
    });
  }, [calculateProgress]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // IntersectionObserver to gate scroll listening — only attach scroll
    // listener when the element is at least partially visible
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible.current = entry.isIntersecting;

        if (entry.isIntersecting) {
          calculateProgress();
          window.addEventListener("scroll", handleScroll, { passive: true });
        } else {
          window.removeEventListener("scroll", handleScroll);

          // Snap to 0 or 1 when element leaves viewport
          const rect = el.getBoundingClientRect();
          if (rect.top > window.innerHeight) {
            setScrollProgress(0);
          } else if (rect.bottom < 0) {
            setScrollProgress(1);
          }
        }
      },
      { threshold: 0 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [calculateProgress, handleScroll]);

  return { ref, scrollProgress };
}

export default useScrollProgress;
