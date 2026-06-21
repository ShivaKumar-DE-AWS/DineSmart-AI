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
    if (!user) {
      router.replace(`/r/${urlSlug}/login`);
    } else if (!allow.includes(user.role)) {
      router.replace("/");
    } else if (user.restaurant_slug && user.restaurant_slug !== urlSlug) {
      router.replace(`/r/${user.restaurant_slug}/login`);
    }
  }, [hydrated, user, allow, router, urlSlug, path]);

  if (!hydrated || !user || !allow.includes(user.role) || (user.restaurant_slug && user.restaurant_slug !== urlSlug)) {
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
