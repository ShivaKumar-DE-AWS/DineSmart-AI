"use client";
import Link from "next/link";
import { usePathname , useParams} from "next/navigation";
import { useEffect, useState, Suspense, useRef } from "react";
import { ShoppingBag, Menu as MenuIcon, X, ChefHat, ArrowRight, BellRing } from "lucide-react";
import { useCart } from "@/stores/cart";
import { AIWaiterDock } from "@/components/customer/AIWaiterDock";
import { MehfilLogo } from "@/components/customer/MehfilLogo";
import { TableSessionGuard } from "@/components/customer/TableSessionGuard";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useTable } from "@/stores/table";
import { Order } from "@/types";
import { toast } from "sonner";
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const slug = params?.slug as string;

  const NAV = [
    { href: `/r/${slug}`, label: "Home", testid: "nav-home" },
    { href: `/r/${slug}/menu`, label: "Menu", testid: "nav-menu" },
    { href: `/r/${slug}/reserve`, label: "Reserve", testid: "nav-reserve" },
    { href: `/r/${slug}/track`, label: "Track", testid: "nav-track" },
    { href: `/r/${slug}/login`, label: "Staff Login", testid: "nav-staff" },
  ];

  const path = usePathname();
  const cartCount = useCart((s) => s.count());
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { session } = useTable();
  const { data: sessionOrdersData } = useQuery({
    queryKey: ["session-orders", session?.id],
    queryFn: () => api<{ orders: Order[] }>(`/api/orders?table_session_id=${session?.id}`),
    enabled: !!session?.id,
    refetchInterval: 10000,
  });
  const sessionOrders = sessionOrdersData?.orders ?? [];
  const activeOrders = sessionOrders.filter((o) => !["delivered", "cancelled"].includes(o.status));

  // Global order stage notifications
  const prevStatuses = useRef<Record<string, string>>({});
  useEffect(() => {
    sessionOrders.forEach((o) => {
      const prev = prevStatuses.current[o.id];
      if (prev && prev !== o.status) {
        if (o.status === "preparing") toast.success(`Order ${o.token} is now preparing!`);
        else if (o.status === "ready") toast.success(`Order ${o.token} is ready for pickup!`);
        else if (o.status === "served") toast.success(`Order ${o.token} has been served. Enjoy!`);
      }
      prevStatuses.current[o.id] = o.status;
    });
  }, [sessionOrders]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // --- COLLABORATIVE CART SYNC ---
  const cartItems = useCart(s => s.items);
  const lastUpdatedBy = useCart(s => s.lastUpdatedBy);
  const setCartItems = useCart(s => s.setItems);

  useEffect(() => {
    if (!session?.id) return;
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    const es = new EventSource(`${base}/api/tables/${session.id}/cart/stream`);
    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (JSON.stringify(parsed) !== JSON.stringify(useCart.getState().items)) {
          setCartItems(parsed);
        }
      } catch (err) {}
    };
    return () => es.close();
  }, [session?.id, setCartItems]);

  useEffect(() => {
    if (session?.id && lastUpdatedBy === "local") {
      api(`/api/tables/${session.id}/cart`, { method: "POST", body: JSON.stringify({ items: cartItems }) });
    }
  }, [cartItems, lastUpdatedBy, session?.id]);

  // --- CALL STAFF ---
  const [callingStaff, setCallingStaff] = useState(false);
  const callStaff = async () => {
    if (!session?.id) return;
    try {
      setCallingStaff(true);
      await api(`/api/tables/${session.id}/call-staff`, { method: "POST" });
      toast.success("Staff has been notified and will be with you shortly!");
    } catch (err) {
      toast.error("Failed to call staff.");
    } finally {
      setTimeout(() => setCallingStaff(false), 3000);
    }
  };

  // Re-set body class on customer routes (theme scope)
  useEffect(() => {
    document.documentElement.classList.add("mehfil");
    document.body.classList.add("mehfil");
    return () => {
      document.documentElement.classList.remove("mehfil");
      document.body.classList.remove("mehfil");
    };
  }, []);

  return (
    <div className="mehfil min-h-screen mehfil-paper">
      <Suspense fallback={null}><TableSessionGuard /></Suspense>
      <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? "bg-[#FAF5EC]/90 backdrop-blur-md border-b border-[#E7DFCB]" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-3 flex items-center justify-between gap-4">
          <MehfilLogo size="sm" />
          <nav className="hidden md:flex items-center gap-9 text-sm tracking-[0.15em] uppercase font-royal" data-testid="mehfil-nav">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} data-testid={n.testid} className={`transition-colors ${path === n.href || (n.href !== `/r/${slug}` && path?.startsWith(n.href)) ? "text-[#8A1A2A]" : "text-[#1A1106] hover:text-[#8A1A2A]"}`}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {session && (
              <button 
                onClick={callStaff} 
                disabled={callingStaff}
                className="flex items-center justify-center h-[38px] w-[38px] md:h-auto md:w-auto md:px-4 md:py-2.5 text-xs font-royal tracking-widest uppercase border border-[#C9A348]/40 bg-[#FAF5EC] text-[#8A1A2A] rounded-full hover:bg-[#8A1A2A] hover:text-[#FAF5EC] transition-colors disabled:opacity-50"
                title="Call Staff"
              >
                <BellRing className="h-4 w-4" />
                <span className="hidden md:inline ml-2">Call Staff</span>
              </button>
            )}
            <Link href={`/r/${slug}/cart`} data-testid="cart-link" className="relative inline-flex items-center gap-2 mehfil-btn-royal px-4 md:px-5 py-2.5 rounded-full text-xs md:text-sm font-medium tracking-wider uppercase">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span data-testid="cart-count" className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-[#C9A348] text-[#1A1106] text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <button data-testid="mobile-menu-btn" onClick={() => setMobileOpen((o) => !o)} className="md:hidden h-10 w-10 rounded-full border border-[#E7DFCB] flex items-center justify-center text-[#8A1A2A]">
              {mobileOpen ? <X className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-[#E7DFCB] bg-[#FAF5EC]" data-testid="mobile-menu">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)} className="block px-6 py-3.5 text-sm tracking-[0.15em] uppercase font-royal border-b border-[#E7DFCB]/50 text-[#1A1106]">
                {n.label}
              </Link>
            ))}
            {session && (
              <button 
                onClick={callStaff} 
                disabled={callingStaff}
                className="w-full text-left px-5 py-4 text-sm tracking-[0.15em] uppercase font-royal text-[#8A1A2A] hover:bg-[#E7DFCB]/30 border-t border-[#E7DFCB]"
              >
                <div className="flex items-center gap-3">
                  <BellRing className="h-4 w-4" />
                  Call Staff
                </div>
              </button>
            )}
          </div>
        )}
      </header>

      <main>{children}</main>

      {activeOrders.length > 0 && path !== "/customer/track" && !path.startsWith("/customer/track/") && (
        <Link 
          href={`/r/${slug}/track`} 
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#8A1A2A] text-[#FAF5EC] pl-4 pr-5 py-3 rounded-full shadow-2xl flex items-center gap-3 hover:bg-[#7a1523] transition-colors border border-[#C9A348]/40 max-w-[90vw] whitespace-nowrap group"
          data-testid="global-active-order-badge"
        >
          <div className="relative flex items-center justify-center h-10 w-10 bg-[#FAF5EC]/10 rounded-full">
            <ChefHat className="h-5 w-5 text-[#C9A348]" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
          </div>
          <div className="flex flex-col flex-1 pr-2">
            <span className="font-royal text-[9px] tracking-[0.2em] uppercase text-[#C9A348] mb-0.5">Live Tracking</span>
            <span className="font-editorial italic text-sm">{activeOrders.length} order{activeOrders.length > 1 ? 's' : ''} in progress</span>
          </div>
          <div className="bg-[#FAF5EC]/20 rounded-full h-8 w-8 flex items-center justify-center group-hover:bg-[#C9A348] group-hover:text-[#1A1106] transition-colors">
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      )}      <AIWaiterDock />

      {/* Footer */}
      <footer className="mt-20 mehfil-royal-bg text-[#FAF5EC]" data-testid="mehfil-footer">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 grid md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <MehfilLogo size="md" invert />
            <p className="font-editorial italic text-[#FAF5EC]/70 mt-5 leading-relaxed">A Hyderabadi heritage, plated with grace since 2006.</p>
          </div>
          <div>
            <h4 className="font-royal tracking-[0.2em] text-[#C9A348] uppercase text-xs mb-4">Visit Us</h4>
            <p className="text-sm text-[#FAF5EC]/85 leading-relaxed">
              Banjara Hills, Road No. 12<br />
              Hyderabad, Telangana 500034<br />
              India
            </p>
          </div>
          <div>
            <h4 className="font-royal tracking-[0.2em] text-[#C9A348] uppercase text-xs mb-4">Hours</h4>
            <p className="text-sm text-[#FAF5EC]/85 leading-relaxed">
              Lunch — 12:00 to 15:30<br />
              Dinner — 18:30 to 23:30<br />
              Open all 7 days
            </p>
          </div>
          <div>
            <h4 className="font-royal tracking-[0.2em] text-[#C9A348] uppercase text-xs mb-4">Reach</h4>
            <p className="text-sm text-[#FAF5EC]/85 leading-relaxed">
              +91 90000 12345<br />
              hello@mehfil.in<br />
              <Link href={`/r/${slug}/reserve`} className="underline underline-offset-4 hover:text-[#C9A348]">Reserve a table</Link>
            </p>
          </div>
        </div>
        <div className="border-t border-[#C9A348]/15 px-6 md:px-10 py-5 max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#FAF5EC]/60 font-royal tracking-wider uppercase">
          <div>© 2026 Mehfil · A Hyderabad institution</div>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-[#C9A348]">Privacy</Link>
            <Link href="#" className="hover:text-[#C9A348]">Terms</Link>
            <Link href="/auth/login" className="hover:text-[#C9A348]">Staff</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
