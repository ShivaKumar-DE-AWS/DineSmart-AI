"use client";
import { SuperAdminShell } from "@/components/admin/SuperAdminShell";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminShell>{children}</SuperAdminShell>;
}
