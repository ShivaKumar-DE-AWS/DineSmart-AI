"use client";
import { RoleGuard } from "@/components/shared/RoleGuard";

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allow={["cashier", "admin"]}>
      {children}
    </RoleGuard>
  );
}
