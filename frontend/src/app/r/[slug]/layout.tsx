"use client";
import Link from "next/link";
import { usePathname , useParams} from "next/navigation";
import { useEffect, useState, Suspense, useRef } from "react";
import { ShoppingBag, Menu as MenuIcon, X, ChefHat, ArrowRight, BellRing, Instagram, Facebook, Twitter, Sparkles, Check } from "lucide-react";
import { useCart } from "@/stores/cart";
import { MehfilLogo } from "@/components/customer/MehfilLogo";
import { TableSessionGuard } from "@/components/customer/TableSessionGuard";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useTable } from "@/stores/table";
import { Order } from "@/types";
import { toast } from "sonner";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { useSession } from "@/stores/session";
import { getOrCreateAnonID } from "@/lib/notify";
import VoiceAgentOverlay from "@/components/VoiceAgentOverlay";

const STAFF_CALL_REASONS = [
  { id: "Water / Refill", label: "Water / Refill", icon: "💧", desc: "Drinking water or ice" },
  { id: "Request Bill / Payment", label: "Request Bill / Payment", icon: "🧾", desc: "Ready to settle the bill" },
  { id: "Cutlery / Tissues", label: "Cutlery / Napkins / Tissues", icon: "🍴", desc: "Extra plates, spoons, or napkins" },
  { id: "Condiments / Sauces", label: "Condiments / Sauces", icon: "🧂", desc: "Ketchup, salt, pepper, chilli" },
  { id: "Clear Table", label: "Clear Table / Plates", icon: "🧹", desc: "Remove empty dishes" },
  { id: "Order Assistance", label: "Order Assistance", icon: "📖", desc: "Help with menu or recommendations" },
];

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  
  // ponytail: if the restaurant was deleted or doesn't exist, block rendering
  if (!restaurantLoading && restaurantError) {
    if (typeof window !== "undefined") {
      window.location.href = "/404";
    }
    return null;
  }

  const { session } = useTable();
  const [deviceId, setDeviceId] = useState("");
  const [localOrderIds, setLocalOrderIds] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setDeviceId(getOrCreateAnonID());
      try {
        const ids = JSON.parse(localStorage.getItem("sd-my-order-ids") || "[]");
        if (Array.isArray(ids) && ids.length > 0) setLocalOrderIds(ids.join(","));
      } catch {}
    }
  }, []);

  const { data: sessionOrdersData } = useQuery({
    queryKey: ["session-orders", session?.id, deviceId, localOrderIds],
    queryFn: () => {
      const params = new URLSearchParams();
      if (session?.id) params.set("table_session_id", session.id);
      if (deviceId) params.set("device_id", deviceId);
      if (localOrderIds) params.set("order_ids", localOrderIds);
      return api<{ orders: Order[] }>(`/api/orders?${params.toString()}`);
    },
    enabled: !!(session?.id || deviceId || localOrderIds),
    refetchInterval: 15000,
  });
  const sessionOrders = sessionOrdersData?.orders ?? [];
  const activeOrders = sessionOrders.filter((o) => !["delivered", "cancelled", "completed"].includes(o.status) && o.payment_status !== "paid");

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
    const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");
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

  // --- CALL STAFF WITH GENERALIZED REASONS ---
  const [callingStaff, setCallingStaff] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReasonNote, setCustomReasonNote] = useState("");

  const callStaff = () => {
    if (!session?.id) {
      toast.error("Please join a table session first.");
      return;
    }
    setShowCallModal(true);
  };

  const toggleReason = (id: string) => {
    setSelectedReasons(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const submitStaffCall = async () => {
    if (!session?.id) return;
    try {
      setCallingStaff(true);
      await api(`/api/tables/${session.id}/call-staff`, { 
        method: "POST",
        body: JSON.stringify({
          reasons: selectedReasons,
          note: customReasonNote.trim() || undefined,
        }),
      });
      toast.success("Staff has been notified and will be with you shortly!");
      setShowCallModal(false);
      setSelectedReasons([]);
      setCustomReasonNote("");
    } catch (err) {
      toast.error("Failed to call staff.");
    } finally {
      setCallingStaff(false);
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
      <Suspense fallback={null}><TableSessionGuard slug={slug} /></Suspense>
      {restaurantConfig?.sandbox_mode && (
        <div className="bg-alert text-white text-center py-2 px-4 text-xs font-medium tracking-wide sticky top-0 z-[60] flex items-center justify-center gap-2 flex-wrap">
          <span>⚠️ SANDBOX MODE: Orders placed here will not be sent to the kitchen.</span>
          <Link href="/admin/settings" className="underline hover:text-white/80 ml-2">Disable in Admin</Link>
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

            {mounted && session && (
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
            <Link href={`/r/${slug}/cart`} data-testid="cart-link" aria-label={`Cart, ${mounted ? cartCount : 0} item${(mounted ? cartCount : 0) === 1 ? "" : "s"}`} className="relative inline-flex items-center gap-2 mehfil-btn-royal px-4 md:px-5 py-2.5 rounded-full text-xs md:text-sm font-medium tracking-wider uppercase">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
              {mounted && cartCount > 0 && (
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
              {mounted && session && (
                <button 
                  onClick={() => { callStaff(); setMobileOpen(false); }} 
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
      
      {/* Voice AI Waiter */}
      {restaurantConfig && (
        <VoiceAgentOverlay restaurantId={restaurantConfig.id} />
      )}

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
      )}

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

      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#FAF5EC] border border-[#E7DFCB] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-[#1A1106] max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowCallModal(false)}
              className="absolute top-5 right-5 h-9 w-9 rounded-full bg-[#1A1106]/5 hover:bg-[#1A1106]/10 flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5 text-[#1A1106]" />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-editorial text-xl sm:text-2xl font-bold text-[#1A1106]">Call Staff Assistance</h3>
                <p className="text-xs font-royal uppercase tracking-wider text-[#1A1106]/60">Table {session?.table_number || "Guest"}</p>
              </div>
            </div>
            <p className="text-sm text-[#1A1106]/80 my-4">
              Select what you need so our team can prepare before arriving at your table:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {STAFF_CALL_REASONS.map((reason) => {
                const isSelected = selectedReasons.includes(reason.id);
                return (
                  <div
                    key={reason.id}
                    onClick={() => toggleReason(reason.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                      isSelected 
                        ? "bg-brand-primary text-[#FAF5EC] border-brand-primary shadow-md" 
                        : "bg-white/80 hover:bg-white text-[#1A1106] border-[#E7DFCB]"
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{reason.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold font-royal uppercase tracking-wide flex items-center justify-between">
                        <span className="truncate">{reason.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 ml-1 text-brand-secondary" />}
                      </div>
                      <div className={`text-[11px] leading-tight mt-0.5 ${isSelected ? "text-[#FAF5EC]/80" : "text-[#1A1106]/60"}`}>
                        {reason.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-1.5 mb-6">
              <label className="text-xs font-royal uppercase tracking-wider text-[#1A1106]/70 block">
                Additional Note (Optional)
              </label>
              <input
                type="text"
                value={customReasonNote}
                onChange={(e) => setCustomReasonNote(e.target.value)}
                placeholder="e.g., Please bring high chair, extra spicy dip..."
                className="w-full bg-white border border-[#E7DFCB] rounded-xl px-4 py-2.5 text-xs text-[#1A1106] focus:outline-none focus:border-brand-primary transition"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCallModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-[#E7DFCB] font-royal uppercase tracking-wider text-xs font-semibold text-[#1A1106]/70 hover:bg-[#1A1106]/5 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitStaffCall}
                disabled={callingStaff}
                className="flex-[2] py-3 px-4 rounded-xl bg-brand-primary text-[#FAF5EC] font-royal uppercase tracking-wider text-xs font-semibold hover:bg-brand-primary/90 transition shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {callingStaff ? "Notifying..." : (
                  <>
                    <BellRing className="h-4 w-4" />
                    <span>Notify Staff</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
