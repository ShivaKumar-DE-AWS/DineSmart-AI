"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/stores/session";
import type { Role } from "@/types";

export function RoleGuard({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
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
      const isSubdomain = typeof window !== "undefined" && window.location.hostname !== "smartdineai.co.in" && window.location.hostname !== "www.smartdineai.co.in" && window.location.hostname !== "localhost";
      const loginUrl = isSubdomain ? "/login" : "/auth/restaurant";
      router.replace(`${loginUrl}?next=${encodeURIComponent(path || "/")}`);
    } else if (!allow.includes(user.role)) {
      router.replace("/");
    }
  }, [hydrated, user, allow, router, path]);

  if (!hydrated || !user || !allow.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone" data-testid="role-guard-loading">
        Authenticating…
      </div>
    );
  }
  return <>{children}</>;
}
