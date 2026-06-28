"use client";
import Link from "next/link";
import { usePathname , useParams} from "next/navigation";
import { useEffect, useState, Suspense, useRef } from "react";
import { ShoppingBag, Menu as MenuIcon, X, ChefHat, ArrowRight, BellRing, Instagram, Facebook, Twitter, Sparkles } from "lucide-react";
import { useCart } from "@/stores/cart";
import { AIWaiterDock } from "@/components/customer/AIWaiterDock";
import { MehfilLogo } from "@/components/customer/MehfilLogo";
import { TableSessionGuard } from "@/components/customer/TableSessionGuard";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useTable } from "@/stores/table";
import { Order } from "@/types";
import { toast } from "sonner";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { useSession } from "@/stores/session";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const slug = params?.slug as string;
  
  // Get restaurant config from local JSON files
  const {
    config: restaurantConfig,
    isLoading: restaurantLoading,
    isError: restaurantError,
    retry: retryRestaurant,
  } = useRestaurantConfig();

  // Enhanced navigation with new pages
  const NAV = [
    { href: `/r/${slug}`, label: "Home", testid: "nav-home" },
    { href: `/r/${slug}/menu`, label: "Menu", testid: "nav-menu" },
    { href: `/r/${slug}/reserve`, label: "Reserve", testid: "nav-reserve" },
    { href: `/r/${slug}/track`, label: "Track", testid: "nav-track" },
    { href: `/r/${slug}/about`, label: "About", testid: "nav-about" },
    { href: `/r/${slug}/contact`, label: "Contact", testid: "nav-contact" },
  ];

  // Secondary nav items (right side)
  const { user } = useSession();
  const SECONDARY_NAV = [
    { href: `/r/${slug}/smartdine`, label: "SmartDine", testid: "nav-smartdine" },
    { href: `/r/${slug}/login`, label: "Staff Login", testid: "nav-staff" },
  ];

  const path = usePathname();
  const cartCount = useCart((s) => s.count());
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { session } = useTable();
  const { data: restaurant } = useQuery({
    queryKey: ["restaurant", slug],
    queryFn: () => api<any>(`/api/restaurants/${slug}`),
    enabled: !!slug,
  });

  const { data: sessionOrdersData } = useQuery({
    queryKey: ["session-orders", session?.id],
    queryFn: () => api<{ orders: Order[] }>(`/api/orders?table_session_id=${session?.id}`),
    enabled: !!session?.id,
    refetchInterval: 15000,
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
  const cartSlug = useCart(s => s.restaurantSlug);
  const setCartSlug = useCart(s => s.setRestaurantSlug);
  const clearCart = useCart(s => s.clear);

  useEffect(() => {
    if (cartSlug && cartSlug !== slug) {
      clearCart();
    }
    if (cartSlug !== slug) {
      setCartSlug(slug);
    }
  }, [slug, cartSlug, clearCart, setCartSlug]);

  const sessionSlug = useSession(s => s.restaurantSlug);
  const setSessionSlug = useSession(s => s.setRestaurantSlug);
  const clearSession = useSession(s => s.clear);

  useEffect(() => {
    if (sessionSlug && sessionSlug !== slug) {
      clearSession();
    }
    if (sessionSlug !== slug) {
      setSessionSlug(slug);
    }
  }, [slug, sessionSlug, clearSession, setSessionSlug]);

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

  const isStaffPage = path?.includes("/kitchen") || path?.includes("/counter") || path?.includes("/admin");

  if (restaurantLoading) {
    return (
      <div className="mehfil min-h-screen mehfil-paper grid place-items-center" role="status" aria-live="polite">
        <div className="text-center px-6">
          <div className="h-10 w-10 rounded-full border-2 border-brand-secondary border-t-brand-primary animate-spin mx-auto" aria-hidden="true" />
          <p className="font-editorial italic text-[#1A1106]/70 mt-4">Preparing your dining experience…</p>
        </div>
      </div>
    );
  }

  if (restaurantError || !restaurantConfig.id) {
    return (
      <div className="mehfil min-h-screen mehfil-paper grid place-items-center px-6">
        <div className="max-w-lg text-center mehfil-card rounded-3xl p-8" role="alert">
          <h1 className="font-royal text-3xl text-brand-primary">Restaurant unavailable</h1>
          <p className="font-editorial italic text-[#1A1106]/70 mt-3">
            We could not safely load this restaurant. No placeholder menu or payment details have been shown.
          </p>
          <button onClick={() => retryRestaurant()} className="mt-6 mehfil-btn-royal rounded-full px-6 py-3 font-royal text-xs tracking-widest uppercase">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (isStaffPage) {
    return (
      <div className="mehfil min-h-screen mehfil-paper" style={restaurantConfig ? {
        '--brand-primary': restaurantConfig.primary_color || '#8A1A2A',
        '--brand-secondary': restaurantConfig.secondary_color || '#C9A348'
      } as React.CSSProperties : undefined}>
        {children}
      </div>
    );
  }


  if (isStaffPage) {
    return (
      <div className="mehfil min-h-screen mehfil-paper" style={restaurantConfig ? {
        '--brand-primary': restaurantConfig.primary_color || '#8A1A2A',
        '--brand-secondary': restaurantConfig.secondary_color || '#C9A348'
      } as React.CSSProperties : undefined}>
        {children}
      </div>
    );
  }

  return (
    <div className="mehfil min-h-screen mehfil-paper" style={restaurantConfig ? {
      '--brand-primary': restaurantConfig.primary_color || '#8A1A2A',
      '--brand-secondary': restaurantConfig.secondary_color || '#C9A348'
    } as React.CSSProperties : undefined}>
      <Suspense fallback={null}><TableSessionGuard /></Suspense>
      {restaurantConfig?.sandbox_mode && (
        <div className="bg-alert text-white text-center py-2 px-4 text-xs font-medium tracking-wide sticky top-0 z-[60]">
          ⚠️ SANDBOX MODE: Orders placed here will not be sent to the kitchen.
        </div>
      )}
      <a href="#customer-content" className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-2 focus:left-2 focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
      <header className={`sticky top-0 z-40 transition-all duration-300 pt-[env(safe-area-inset-top)] ${scrolled ? "bg-[#FAF5EC]/90 backdrop-blur-md border-b border-[#E7DFCB]" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-3 flex items-center justify-between gap-4">
          <MehfilLogo size="sm" />
          
          {/* Main Navigation - Desktop */}
          <nav className="hidden lg:flex items-center gap-6 text-xs tracking-[0.12em] uppercase font-royal" data-testid="mehfil-nav">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} data-testid={n.testid} className={`transition-colors whitespace-nowrap ${path === n.href || (n.href !== `/r/${slug}` && path?.startsWith(n.href)) ? "text-brand-primary" : "text-[#1A1106] hover:text-brand-primary"}`}>
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Right Side - Actions */}
          <div className="flex items-center gap-2">
            {/* Secondary Nav - Desktop */}
            <div className="hidden lg:flex items-center gap-3">
              {SECONDARY_NAV.map((n) => (
                <Link key={n.href} href={n.href} data-testid={n.testid} className={`text-xs tracking-[0.1em] uppercase font-royal transition-colors ${path === n.href ? "text-brand-primary" : "text-[#1A1106]/70 hover:text-brand-primary"}`}>
                  {n.label}
                </Link>
              ))}
            </div>

            {session && (
              <button 
                onClick={callStaff} 
                disabled={callingStaff}
                className="flex items-center justify-center h-[38px] w-[38px] md:h-auto md:w-auto md:px-4 md:py-2.5 text-xs font-royal tracking-widest uppercase border border-brand-secondary/40 bg-[#FAF5EC] text-brand-primary rounded-full hover:bg-brand-primary hover:text-[#FAF5EC] transition-colors disabled:opacity-50"
                title="Call Staff"
                aria-label={callingStaff ? "Calling restaurant staff" : "Call restaurant staff"}
              >
                <BellRing className="h-4 w-4" />
                <span className="hidden md:inline ml-2">Call Staff</span>
              </button>
            )}
            <Link href={`/r/${slug}/cart`} data-testid="cart-link" aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`} className="relative inline-flex items-center gap-2 mehfil-btn-royal px-4 md:px-5 py-2.5 rounded-full text-xs md:text-sm font-medium tracking-wider uppercase">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span data-testid="cart-count" className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-brand-secondary text-[#1A1106] text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <button data-testid="mobile-menu-btn" aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen((o) => !o)} className="lg:hidden h-11 w-11 rounded-full border border-[#E7DFCB] flex items-center justify-center text-brand-primary">
              {mobileOpen ? <X className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div id="mobile-navigation" className="lg:hidden border-t border-[#E7DFCB] bg-[#FAF5EC] backdrop-blur-md" data-testid="mobile-menu">
            <div className="max-w-7xl mx-auto px-5 py-4">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-sm tracking-[0.15em] uppercase font-royal border-b border-[#E7DFCB]/50 text-[#1A1106] hover:text-brand-primary transition-colors">
                  {n.label}
                </Link>
              ))}
              <div className="mt-4 pt-4 border-t border-[#E7DFCB]">
                <div className="text-xs font-royal tracking-[0.2em] uppercase text-[#8A6A1B] mb-3 px-4">More</div>
                {SECONDARY_NAV.map((n) => (
                  <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm tracking-[0.15em] uppercase font-royal text-[#1A1106]/70 hover:text-brand-primary transition-colors">
                    {n.label}
                  </Link>
                ))}
              </div>
              {session && (
                <button 
                  onClick={callStaff} 
                  disabled={callingStaff}
                  className="w-full mt-4 text-left px-4 py-3 text-sm tracking-[0.15em] uppercase font-royal text-brand-primary hover:bg-[#E7DFCB]/30 border-t border-[#E7DFCB]"
                >
                  <div className="flex items-center gap-3">
                    <BellRing className="h-4 w-4" />
                    Call Staff
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <main id="customer-content">{children}</main>

      {activeOrders.length > 0 && !path.includes("/track") && !path.includes("/checkout") && (
        <Link 
          href={`/r/${slug}/track`} 
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-brand-primary text-[#FAF5EC] pl-4 pr-5 py-3 rounded-full shadow-2xl flex items-center gap-3 hover:bg-[#7a1523] transition-colors border border-brand-secondary/40 max-w-[90vw] whitespace-nowrap group"
          data-testid="global-active-order-badge"
        >
          <div className="relative flex items-center justify-center h-10 w-10 bg-[#FAF5EC]/10 rounded-full">
            <ChefHat className="h-5 w-5 text-brand-secondary" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
          </div>
          <div className="flex flex-col flex-1 pr-2">
            <span className="font-royal text-[9px] tracking-[0.2em] uppercase text-brand-secondary mb-0.5">Live Tracking</span>
            <span className="font-editorial italic text-sm">{activeOrders.length} order{activeOrders.length > 1 ? 's' : ''} in progress</span>
          </div>
          <div className="bg-[#FAF5EC]/20 rounded-full h-8 w-8 flex items-center justify-center group-hover:bg-brand-secondary group-hover:text-[#1A1106] transition-colors">
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      )}      <AIWaiterDock />

      {/* Footer */}
      <footer className="mt-20 mehfil-royal-bg text-[#FAF5EC]" data-testid="mehfil-footer">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-10">
            {/* Brand Column */}
            <div className="lg:col-span-2">
              <MehfilLogo size="md" invert />
              {restaurantConfig?.tagline && (
                <p className="font-editorial italic text-[#FAF5EC]/70 mt-5 leading-relaxed max-w-sm">{restaurantConfig.tagline}</p>
              )}
              {/* Social Links */}
              <div className="flex items-center gap-4 mt-6">
                {restaurantConfig?.social_links?.instagram && (
                  <a aria-label={`${restaurantConfig.name} on Instagram`} href={restaurantConfig.social_links.instagram} target="_blank" rel="noopener noreferrer" className="h-11 w-11 rounded-full border border-[#FAF5EC]/20 flex items-center justify-center hover:bg-brand-secondary hover:text-[#1A1106] transition-colors">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {restaurantConfig?.social_links?.facebook && (
                  <a aria-label={`${restaurantConfig.name} on Facebook`} href={restaurantConfig.social_links.facebook} target="_blank" rel="noopener noreferrer" className="h-11 w-11 rounded-full border border-[#FAF5EC]/20 flex items-center justify-center hover:bg-brand-secondary hover:text-[#1A1106] transition-colors">
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {restaurantConfig?.social_links?.twitter && (
                  <a aria-label={`${restaurantConfig.name} on X`} href={restaurantConfig.social_links.twitter} target="_blank" rel="noopener noreferrer" className="h-11 w-11 rounded-full border border-[#FAF5EC]/20 flex items-center justify-center hover:bg-brand-secondary hover:text-[#1A1106] transition-colors">
                    <Twitter className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-royal tracking-[0.2em] text-brand-secondary uppercase text-xs mb-4">Explore</h4>
              <ul className="space-y-2.5 text-sm text-[#FAF5EC]/85">
                <li><Link href={`/r/${slug}/menu`} className="hover:text-brand-secondary transition-colors">Menu</Link></li>
                <li><Link href={`/r/${slug}/reserve`} className="hover:text-brand-secondary transition-colors">Reservations</Link></li>
                <li><Link href={`/r/${slug}/track`} className="hover:text-brand-secondary transition-colors">Track Order</Link></li>
                <li><Link href={`/r/${slug}/about`} className="hover:text-brand-secondary transition-colors">About Us</Link></li>
                <li><Link href={`/r/${slug}/contact`} className="hover:text-brand-secondary transition-colors">Contact</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-royal tracking-[0.2em] text-brand-secondary uppercase text-xs mb-4">Reach Us</h4>
              <ul className="space-y-2.5 text-sm text-[#FAF5EC]/85">
                {restaurantConfig?.contact?.phone && <li>{restaurantConfig.contact.phone}</li>}
                {restaurantConfig?.contact?.email && <li>{restaurantConfig.contact.email}</li>}
                <li className="whitespace-pre-line">{restaurantConfig?.contact?.address || "Visit us today"}</li>
              </ul>
            </div>

            {/* Hours */}
            <div>
              <h4 className="font-royal tracking-[0.2em] text-brand-secondary uppercase text-xs mb-4">Hours</h4>
              <ul className="space-y-2.5 text-sm text-[#FAF5EC]/85">
                <li>Lunch — {restaurantConfig?.hours?.lunch || "12:00 to 15:30"}</li>
                <li>Dinner — {restaurantConfig?.hours?.dinner || "18:30 to 23:30"}</li>
                <li>{restaurantConfig?.hours?.open_days || "Open all 7 days"}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-brand-secondary/15 px-6 md:px-10 py-5 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-[#FAF5EC]/60 font-royal tracking-wider uppercase">
              <span>© {new Date().getFullYear()} {restaurantConfig?.name || "SmartDine"}</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">Powered by</span>
              <Link href={`/r/${slug}/smartdine`} className="hidden sm:inline-flex items-center gap-1 text-brand-secondary hover:text-[#FAF5EC] transition-colors">
                <Sparkles className="h-3 w-3" /> SmartDine
              </Link>
            </div>
            <div className="flex gap-6 text-xs text-[#FAF5EC]/60 font-royal tracking-wider uppercase">
              <Link href={`/r/${slug}/login`} className="hover:text-brand-secondary transition-colors">Staff</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
