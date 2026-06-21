"use client";
import { RoleGuard } from "@/components/shared/RoleGuard";

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allow={["kitchen", "admin"]}>
      {children}
    </RoleGuard>
  );
}
