"use client";
import { RoleGuard } from "@/components/shared/RoleGuard";

export default function CounterLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allow={["counter", "admin"]}>
      <div className="theme-dark-ops min-h-screen bg-coal text-white">{children}</div>
    </RoleGuard>
  );
}
