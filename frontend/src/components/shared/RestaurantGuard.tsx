"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useSession } from "@/stores/session";
import type { Role } from "@/types";

export function RestaurantGuard({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const params = useParams();
  const urlSlug = params?.slug as string;
  const user = useSession((s) => s.user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const ph = (useSession as any).persist;
    if (ph?.hasHydrated?.()) {
      setHydrated(true);
      return;
    }
    const unsub = ph?.onFinishHydration?.(() => setHydrated(true));
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    
    // Normalize legacy slugs returned from backend
    const normalizedUserSlug = user?.restaurant_slug === "mehfil-hyderabad" ? "mehfil" : user?.restaurant_slug;

    if (!user) {
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("sd-session");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.state?.user && parsed?.state?.token) {
              useSession.getState().setSession(parsed.state.user, parsed.state.token);
              if (parsed.state.restaurantSlug) {
                useSession.getState().setRestaurantSlug(parsed.state.restaurantSlug);
              }
              return;
            }
          }
        } catch {}
      }
      router.replace(`/r/${urlSlug}/login`);
    } else if (!allow.includes(user.role)) {
      router.replace("/");
    } else if (normalizedUserSlug && normalizedUserSlug !== urlSlug) {
      router.replace(`/r/${normalizedUserSlug}/login`);
    }
  }, [hydrated, user, allow, router, urlSlug, path]);

  const normalizedUserSlug = user?.restaurant_slug === "mehfil-hyderabad" ? "mehfil" : user?.restaurant_slug;
  if (!hydrated || !user || !allow.includes(user.role) || (normalizedUserSlug && normalizedUserSlug !== urlSlug)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone bg-ink text-cream">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm tracking-wider uppercase font-royal">Authenticating…</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
