"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ShoppingBag, LineChart, Boxes, UtensilsCrossed, Users, LogOut, Sparkles } from "lucide-react";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { useSession } from "@/stores/session";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, testid: "admin-nav-dashboard" },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, testid: "admin-nav-orders" },
  { href: "/admin/revenue", label: "Revenue", icon: LineChart, testid: "admin-nav-revenue" },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes, testid: "admin-nav-inventory" },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed, testid: "admin-nav-menu" },
  { href: "/admin/customers", label: "Customers", icon: Users, testid: "admin-nav-customers" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { user, clear } = useSession();

  return (
    <RoleGuard allow={["admin"]}>
      <div className="min-h-screen bg-cream flex">
        <aside className="w-64 bg-white border-r border-bone flex flex-col shrink-0">
          <Link href="/admin" className="px-6 py-6 flex items-center gap-2 border-b border-bone" data-testid="admin-brand">
            <div className="h-8 w-8 rounded-full bg-clay flex items-center justify-center"><Sparkles className="h-4 w-4 text-white" /></div>
            <div>
              <div className="font-heading font-semibold leading-tight">SmartDine</div>
              <div className="text-xs text-stone uppercase tracking-wider">Operations</div>
            </div>
          </Link>
          <nav className="flex-1 py-4 px-3 space-y-1">
            {nav.map((n) => {
              const Icon = n.icon;
              const active = n.exact ? path === n.href : path?.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} data-testid={n.testid} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${active ? "bg-ink text-cream" : "text-ink hover:bg-cream"}`}>
                  <Icon className="h-4 w-4" /> {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-3 py-4 border-t border-bone">
            <div className="px-3 py-2 mb-2">
              <div className="text-sm font-semibold" data-testid="admin-user-name">{user?.name}</div>
              <div className="text-xs text-stone">{user?.email}</div>
            </div>
            <button data-testid="admin-logout" onClick={() => { clear(); router.push("/"); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-cream text-ink">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </RoleGuard>
  );
}
