"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingBag, Menu as MenuIcon, X } from "lucide-react";
import { useCart } from "@/stores/cart";
import { AIWaiterDock } from "@/components/customer/AIWaiterDock";
import { MehfilLogo } from "@/components/customer/MehfilLogo";

const NAV = [
  { href: "/customer", label: "Home", testid: "nav-home" },
  { href: "/customer/menu", label: "Menu", testid: "nav-menu" },
  { href: "/customer/reserve", label: "Reserve", testid: "nav-reserve" },
  { href: "/customer/track", label: "Track", testid: "nav-track" },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const cartCount = useCart((s) => s.count());
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? "bg-[#FAF5EC]/90 backdrop-blur-md border-b border-[#E7DFCB]" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-3 flex items-center justify-between gap-4">
          <MehfilLogo size="sm" />
          <nav className="hidden md:flex items-center gap-9 text-sm tracking-[0.15em] uppercase font-royal" data-testid="mehfil-nav">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} data-testid={n.testid} className={`transition-colors ${path === n.href || (n.href !== "/customer" && path?.startsWith(n.href)) ? "text-[#8A1A2A]" : "text-[#1A1106] hover:text-[#8A1A2A]"}`}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/customer/cart" data-testid="cart-link" className="relative inline-flex items-center gap-2 mehfil-btn-royal px-4 md:px-5 py-2.5 rounded-full text-xs md:text-sm font-medium tracking-wider uppercase">
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
          </div>
        )}
      </header>

      <main>{children}</main>

      <AIWaiterDock />

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
              <Link href="/customer/reserve" className="underline underline-offset-4 hover:text-[#C9A348]">Reserve a table</Link>
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
