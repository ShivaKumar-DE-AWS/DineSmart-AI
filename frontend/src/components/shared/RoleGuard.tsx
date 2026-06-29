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
      router.replace(`/auth/restaurant?next=${encodeURIComponent(path || "/")}`);
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
