"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutDashboard, Store, Settings, ScrollText, LogOut, Sparkles, Menu as MenuIcon, X } from "lucide-react";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { useSession } from "@/stores/session";

const nav = [
  { href: "/super-admin", label: "Global Dashboard", icon: LayoutDashboard, exact: true, testid: "sa-nav-dashboard" },
  { href: "/super-admin/restaurants", label: "Restaurants", icon: Store, testid: "sa-nav-restaurants" },
  { href: "/super-admin/settings", label: "Platform Settings", icon: Settings, testid: "sa-nav-settings" },
  { href: "/super-admin/audit", label: "Audit Logs", icon: ScrollText, testid: "sa-nav-audit" },
];

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { user, clear } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setDrawerOpen(false); }, [path]);

  const Sidebar = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      <Link href="/super-admin" onClick={onItemClick} className="px-6 py-6 flex items-center gap-2 border-b border-bone" data-testid="sa-brand">
        <div className="h-8 w-8 rounded-full bg-clay flex items-center justify-center"><Sparkles className="h-4 w-4 text-white" /></div>
        <div>
          <div className="font-heading font-semibold leading-tight text-brand">SmartDine HQ</div>
          <div className="text-xs text-stone uppercase tracking-wider font-bold text-red-600">Super Admin</div>
        </div>
      </Link>
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {nav.map((n) => {
          const Icon = n.icon;
          const active = n.exact ? path === n.href : path?.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} data-testid={n.testid} onClick={onItemClick} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${active ? "bg-ink text-cream" : "text-ink hover:bg-cream"}`}>
              <Icon className="h-3.5 w-3.5" /> {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-bone">
        <div className="px-3 py-2 mb-2">
          <div className="text-sm font-semibold" data-testid="sa-user-name">{user?.name}</div>
          <div className="text-xs text-stone truncate">{user?.email}</div>
        </div>
        <button onClick={() => { clear(); router.push("/auth/login"); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition" data-testid="sa-nav-logout">
          <LogOut className="h-3.5 w-3.5" /> Log Out
        </button>
      </div>
    </>
  );

  return (
    <RoleGuard allow={["superadmin"]}>
      <div className="min-h-screen bg-sand flex font-body text-ink">
        <aside className="hidden md:flex flex-col w-60 border-r border-bone bg-white shadow-sm z-10 sticky top-0 h-screen">
          <Sidebar />
        </aside>

        {drawerOpen && (
          <div className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm md:hidden" onClick={() => setDrawerOpen(false)} />
        )}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 md:hidden flex flex-col ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <Sidebar onItemClick={() => setDrawerOpen(false)} />
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden bg-white border-b border-bone h-14 flex items-center px-4 sticky top-0 z-30 flex-shrink-0">
            <button onClick={() => setDrawerOpen(!drawerOpen)} className="p-2 -ml-2 text-stone hover:text-ink">
              {drawerOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
            <span className="font-heading font-medium ml-2">SmartDine HQ</span>
          </header>
          <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-[1200px] mx-auto">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
