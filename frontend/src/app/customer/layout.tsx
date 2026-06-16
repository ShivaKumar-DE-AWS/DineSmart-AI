"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Sparkles, Home, UtensilsCrossed } from "lucide-react";
import { useCart } from "@/stores/cart";
import { AIWaiterDock } from "@/components/customer/AIWaiterDock";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const cartCount = useCart((s) => s.count());

  return (
    <div className="min-h-screen bg-cream bg-grain">
      <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-md border-b border-bone">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <Link href="/customer" className="flex items-center gap-2" data-testid="customer-brand-link">
            <div className="h-8 w-8 rounded-full bg-clay flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-heading font-semibold text-lg tracking-tight">SmartDine<span className="text-clay">.</span>AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="/customer" className={path === "/customer" ? "text-clay" : "text-ink hover:text-clay"} data-testid="nav-home">Home</Link>
            <Link href="/customer/menu" className={path?.startsWith("/customer/menu") ? "text-clay" : "text-ink hover:text-clay"} data-testid="nav-menu">Menu</Link>
            <Link href="/customer/track" className={path?.startsWith("/customer/track") ? "text-clay" : "text-ink hover:text-clay"} data-testid="nav-track">Track</Link>
          </nav>
          <Link href="/customer/cart" data-testid="cart-link" className="relative inline-flex items-center gap-2 bg-ink text-cream px-4 py-2 rounded-full text-sm font-medium hover:bg-ink/85 transition">
            <ShoppingBag className="h-4 w-4" />
            <span>Cart</span>
            {cartCount > 0 && (
              <span data-testid="cart-count" className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-clay text-white text-xs font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main>{children}</main>
      <AIWaiterDock />

      <footer className="border-t border-bone mt-20 px-6 md:px-10 py-8 text-center text-sm text-stone">
        SmartDine AI · Tap the chat dock for an AI sommelier
      </footer>
    </div>
  );
}
