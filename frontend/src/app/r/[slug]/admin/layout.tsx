"use client";
import { RestaurantGuard } from "@/components/shared/RestaurantGuard";
import { AdminShell } from "@/components/admin/AdminShell";

export default function SlugAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestaurantGuard allow={["admin"]}>
      <AdminShell>{children}</AdminShell>
    </RestaurantGuard>
  );
}
