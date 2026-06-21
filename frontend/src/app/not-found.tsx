"use client";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-8xl font-bold text-brand-secondary/30 mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-zinc-500 text-sm mb-8">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link href="/" className="inline-flex items-center gap-2 bg-brand-primary text-white px-6 py-3 rounded-full text-sm font-medium hover:opacity-90 transition">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
