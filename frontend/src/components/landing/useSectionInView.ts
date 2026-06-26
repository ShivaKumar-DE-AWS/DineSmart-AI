"use client";

import { useEffect, useState, useRef, RefObject } from "react";

interface UseSectionInViewOptions {
  /** IntersectionObserver threshold (0..1). Defaults to 0.15 */
  threshold?: number;
  /** Root margin for triggering earlier/later. Defaults to "0px" */
  rootMargin?: string;
  /** If true, stays true once element has been in view (no re-triggering). Defaults to false */
  once?: boolean;
}

interface UseSectionInViewReturn {
  ref: RefObject<HTMLDivElement>;
  isInView: boolean;
}

/**
 * Lightweight IntersectionObserver hook for gating animations and 3D rendering.
 *
 * Returns a ref to attach to the target element and a boolean indicating
 * whether the element is currently in the viewport.
 *
 * @example
 * ```tsx
 * const { ref, isInView } = useSectionInView({ threshold: 0.15 });
 * return (
 *   <section ref={ref}>
 *     {isInView && <ExpensiveComponent />}
 *   </section>
 * );
 * ```
 */
export function useSectionInView(
  options: UseSectionInViewOptions = {}
): UseSectionInViewReturn {
  const { threshold = 0.15, rootMargin = "0px", once = false } = options;

  const ref = useRef<HTMLDivElement>(null!);
  const [isInView, setIsInView] = useState(false);
  const hasBeenInView = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If `once` mode and already triggered, skip observing
    if (once && hasBeenInView.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const inView = entry.isIntersecting;

        if (inView) {
          setIsInView(true);
          hasBeenInView.current = true;

          if (once) {
            observer.unobserve(el);
          }
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, once]);

  return { ref, isInView };
}

export default useSectionInView;
