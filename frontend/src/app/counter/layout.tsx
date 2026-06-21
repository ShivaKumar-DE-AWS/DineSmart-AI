"use client";
import { RoleGuard } from "@/components/shared/RoleGuard";

export default function CounterLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allow={["counter", "admin"]}>
      {children}
    </RoleGuard>
  );
}
