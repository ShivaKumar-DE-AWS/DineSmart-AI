import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Navigation() {
  return (
    <header className="absolute top-0 left-0 w-full z-50 px-6 md:px-12 lg:px-24 pt-8 pb-4 flex items-center justify-between">
      <div className="flex items-center gap-2" data-testid="brand-logo">
        <div className="text-2xl font-bold tracking-tight bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
          {/* Logo representation based on the provided image */}
          <Sparkles className="w-5 h-5 text-gold" />
          <span className="text-white">Smart</span>
          <span className="text-[#D95333]">Dine</span>
          <span className="text-[#2A64F6] ml-1">AI</span>
        </div>
      </div>
      <div className="flex gap-4 items-center">
        <Link href="/auth/login" className="text-sm font-medium text-cream hover:text-white hidden sm:block transition">
          Staff Login
        </Link>
        <Link href="/auth/restaurant" className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white px-6 py-2.5 rounded-full text-sm font-medium transition shadow-lg">
          Create Restaurant
        </Link>
      </div>
    </header>
  );
}
