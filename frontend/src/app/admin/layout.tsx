"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, ShoppingBag, LineChart, Boxes, UtensilsCrossed, Users, CalendarClock, QrCode, LogOut, Sparkles, Menu as MenuIcon, X } from "lucide-react";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { useSession } from "@/stores/session";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, testid: "admin-nav-dashboard" },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag, testid: "admin-nav-orders" },
  { href: "/admin/reservations", label: "Reservations", icon: CalendarClock, testid: "admin-nav-reservations" },
  { href: "/admin/tables", label: "Tables & QR", icon: QrCode, testid: "admin-nav-tables" },
  { href: "/admin/revenue", label: "Revenue", icon: LineChart, testid: "admin-nav-revenue" },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes, testid: "admin-nav-inventory" },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed, testid: "admin-nav-menu" },
  { href: "/admin/customers", label: "Customers", icon: Users, testid: "admin-nav-customers" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { user, clear } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const qc = useQueryClient();
  const { data: notifsData } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => api<{ notifications: any[] }>("/api/notifications"),
    refetchInterval: 5000,
  });

  const markReadMut = useMutation({
    mutationFn: (n_id: string) => api(`/api/notifications/${n_id}/read`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-notifications"] }); },
  });

  const [notifiedSet] = useState(() => new Set<string>());

  useEffect(() => {
    const unread = (notifsData?.notifications || []).filter((n: any) => !n.read && n.type === "staff_call");
    for (const n of unread) {
      if (!notifiedSet.has(n.id)) {
        notifiedSet.add(n.id);
        const tId = toast.info(n.message || `Table calling for staff!`, {
          icon: '🛎️',
          duration: 15000,
          action: {
            label: 'Mark Resolved',
            onClick: () => {
              markReadMut.mutate(n.id);
              toast.dismiss(tId);
            }
          }
        });
      }
    }
  }, [notifsData, notifiedSet, markReadMut]);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [path]);

  const Sidebar = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      <Link href="/admin" onClick={onItemClick} className="px-6 py-6 flex items-center gap-2 border-b border-bone" data-testid="admin-brand">
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
            <Link key={n.href} href={n.href} data-testid={n.testid} onClick={onItemClick} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${active ? "bg-ink text-cream" : "text-ink hover:bg-cream"}`}>
              <Icon className="h-4 w-4" /> {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-bone">
        <div className="px-3 py-2 mb-2">
          <div className="text-sm font-semibold" data-testid="admin-user-name">{user?.name}</div>
          <div className="text-xs text-stone truncate">{user?.email}</div>
        </div>
        <button data-testid="admin-logout" onClick={() => { clear(); router.push("/"); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-cream text-ink">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <RoleGuard allow={["admin"]}>
      <div className="min-h-screen bg-cream lg:flex">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-bone flex items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2" data-testid="admin-brand-mobile">
            <div className="h-7 w-7 rounded-full bg-clay flex items-center justify-center"><Sparkles className="h-3.5 w-3.5 text-white" /></div>
            <div>
              <div className="font-heading font-semibold leading-tight text-sm">SmartDine</div>
              <div className="text-[10px] text-stone uppercase tracking-wider">Operations</div>
            </div>
          </Link>
          <button data-testid="admin-drawer-btn" onClick={() => setDrawerOpen(true)} className="h-10 w-10 rounded-full border border-bone flex items-center justify-center hover:bg-cream">
            <MenuIcon className="h-4 w-4" />
          </button>
        </header>

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 bg-white border-r border-bone flex-col shrink-0 min-h-screen">
          <Sidebar />
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50" data-testid="admin-drawer">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white border-r border-bone flex flex-col shadow-2xl">
              <button data-testid="admin-drawer-close" onClick={() => setDrawerOpen(false)} className="absolute top-4 right-4 h-9 w-9 rounded-full hover:bg-cream flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
              <Sidebar onItemClick={() => setDrawerOpen(false)} />
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </RoleGuard>
  );
}
