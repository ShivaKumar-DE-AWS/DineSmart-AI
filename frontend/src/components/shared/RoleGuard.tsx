"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/stores/session";
import type { Role } from "@/types";

export function RoleGuard({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const user = useSession((s) => s.user);

  useEffect(() => {
    if (!user) {
      router.replace(`/auth/login?next=${encodeURIComponent(path || "/")}`);
    } else if (!allow.includes(user.role)) {
      router.replace("/");
    }
  }, [user, allow, router, path]);

  if (!user || !allow.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone" data-testid="role-guard-loading">
        Authenticating…
      </div>
    );
  }
  return <>{children}</>;
}
