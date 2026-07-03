"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Store, MapPin, Sparkles, ArrowRight, Clock, CheckCircle2, Star } from "lucide-react";

interface RestaurantCard {
  name: string;
  slug?: string;
  location: string;
  specialty: string;
  image: string;
  status: "live" | "upcoming";
  rating?: string;
  description: string;
}

const RESTAURANTS: RestaurantCard[] = [
  // Present Onboarded Restaurants
  {
    name: "Royal Mehfil",
    slug: "mehfil",
    location: "Hyderabad, Telangana",
    specialty: "Authentic Hyderabadi Biryani & Kebabs",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80",
    status: "live",
    rating: "4.9",
    description: "Experience royal dining with instant QR table ordering and digital kitchen sync.",
  },
  {
    name: "The Spice Garden",
    slug: "spice-garden",
    location: "Bangalore, Karnataka",
    specialty: "South Indian & Pan-Asian Curries",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80",
    status: "live",
    rating: "4.8",
    description: "A lush garden dining experience enhanced by SmartDine's seamless digital menu.",
  },
  {
    name: "Premium Biryani House",
    slug: "biryani-house",
    location: "Mumbai, Maharashtra",
    specialty: "Dum Biryani & Mughlai Delicacies",
    image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&auto=format&fit=crop&q=80",
    status: "live",
    rating: "4.9",
    description: "High-volume peak hour orders processed with zero errors using digital ordering.",
  },
  // Upcoming Restaurants
  {
    name: "Azure Seafood & Lounge",
    location: "Panaji, Goa",
    specialty: "Coastal Delicacies & Craft Mocktails",
    image: "https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=800&auto=format&fit=crop&q=80",
    status: "upcoming",
    description: "Sunset beachside lounge onboarding with SmartDine multi-table session management.",
  },
  {
    name: "Bistro 360",
    location: "New Delhi, NCR",
    specialty: "Continental & Artisanal Desserts",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80",
    status: "upcoming",
    description: "Modern metropolitan dining featuring automated kitchen routing and inventory tracking.",
  },
  {
    name: "Silk Route Dining",
    location: "Chennai, Tamil Nadu",
    specialty: "Pan-Asian & Cantonese Heritage",
    image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop&q=80",
    status: "upcoming",
    description: "Heritage dining bringing digital speed to traditional multi-course dining.",
  },
];

export function PartnerRestaurants() {
  const [filter, setFilter] = useState<"all" | "live" | "upcoming">("all");

  const filteredRestaurants = RESTAURANTS.filter((res) => {
    if (filter === "live") return res.status === "live";
    if (filter === "upcoming") return res.status === "upcoming";
    return true;
  });

  return (
    <section className="py-24 px-6 lg:px-24 max-w-[1400px] mx-auto relative" id="restaurants">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-electric-blue/10 border border-electric-blue/20 text-electric-blue text-xs font-semibold tracking-wider uppercase mb-4">
          <Store className="w-3.5 h-3.5" />
          <span>Our Restaurant Network</span>
        </div>
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
          Present Onboarded & <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold to-clay">Upcoming Restaurants</span>
        </h2>
        <p className="text-stone text-lg max-w-2xl mx-auto">
          Explore our growing network of dining establishments using SmartDine AI for instant digital ordering, table sessions, and kitchen automation without customer-facing AI waiter clutter.
        </p>

        {/* Filter Tabs */}
        <div className="flex items-center justify-center gap-3 mt-8">
          {[
            { id: "all", label: "All Restaurants", count: RESTAURANTS.length },
            { id: "live", label: "Present Onboarded", count: RESTAURANTS.filter((r) => r.status === "live").length },
            { id: "upcoming", label: "Upcoming", count: RESTAURANTS.filter((r) => r.status === "upcoming").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-5 py-2.5 rounded-full text-xs md:text-sm font-medium tracking-wide transition-all duration-300 flex items-center gap-2 ${
                filter === tab.id
                  ? "bg-gradient-to-r from-gold to-clay text-ink font-bold shadow-lg shadow-gold/20 scale-105"
                  : "bg-ink border border-bone text-stone hover:text-white hover:border-white/20"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${filter === tab.id ? "bg-ink/20 text-ink font-bold" : "bg-white/10 text-cream"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Restaurant Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredRestaurants.map((res, idx) => (
          <motion.div
            key={res.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            className="group bg-ink border border-bone rounded-3xl overflow-hidden shadow-xl hover:border-gold/40 transition-all duration-300 flex flex-col"
          >
            {/* Image Banner */}
            <div className="relative h-52 w-full overflow-hidden bg-surface">
              <img
                src={res.image}
                alt={res.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent opacity-80" />
              
              {/* Status Badge */}
              <div className="absolute top-4 left-4">
                {res.status === "live" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-semibold backdrop-blur-md shadow-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Present Onboarded
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/90 text-ink text-xs font-semibold backdrop-blur-md shadow-lg">
                    <Clock className="w-3.5 h-3.5" />
                    Upcoming Restaurant
                  </span>
                )}
              </div>

              {/* Rating */}
              {res.rating && (
                <div className="absolute top-4 right-4 bg-ink/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1 text-xs font-bold text-gold">
                  <Star className="w-3.5 h-3.5 fill-gold" />
                  <span>{res.rating}</span>
                </div>
              )}

              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-cream/90">
                <div className="flex items-center gap-1 bg-ink/60 px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10">
                  <MapPin className="w-3 h-3 text-gold" />
                  <span>{res.location}</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gold mb-1">
                  {res.specialty}
                </div>
                <h3 className="font-heading text-2xl text-white group-hover:text-gold transition-colors mb-2">
                  {res.name}
                </h3>
                <p className="text-stone text-sm leading-relaxed mb-6">
                  {res.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                {res.status === "live" && res.slug ? (
                  <Link
                    href={`/r/${res.slug}`}
                    className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-gold to-clay text-ink font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-95 transition-opacity shadow-lg shadow-gold/10"
                  >
                    <span>Explore Customer Page</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <div className="w-full py-3 px-5 rounded-xl bg-white/5 border border-white/10 text-stone font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>Onboarding in Progress</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
