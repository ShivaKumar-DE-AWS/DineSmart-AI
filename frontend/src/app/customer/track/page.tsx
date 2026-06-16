"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export default function TrackLanding() {
  const router = useRouter();
  const [id, setId] = useState("");
  return (
    <div className="px-6 md:px-12 lg:px-20 py-16 max-w-xl mx-auto">
      <h1 className="font-heading text-4xl md:text-5xl tracking-tight mb-6">Track an order</h1>
      <p className="text-stone mb-6">Paste your order id below.</p>
      <Input data-testid="track-id-input" placeholder="Order ID" value={id} onChange={(e) => setId(e.target.value)} />
      <button data-testid="track-go-btn" onClick={() => id && router.push(`/customer/track/${id}`)} className="mt-4 bg-clay text-white rounded-full px-6 py-3 font-medium hover:bg-clay-dark transition">
        Track →
      </button>
    </div>
  );
}
