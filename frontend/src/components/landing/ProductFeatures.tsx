"use client";

import { motion } from "framer-motion";
import { Bot, QrCode, Monitor, Truck, Ticket, TrendingUp, Package, Users, Menu, Bell, Star, Building2 } from "lucide-react";

export function ProductFeatures() {
  const features = [
    { icon: Bot, title: "AI Waiter", desc: "Conversational assistant that takes orders and upsells." },
    { icon: QrCode, title: "QR Ordering", desc: "Instant table-side ordering without app downloads." },
    { icon: Monitor, title: "Kitchen Dashboard", desc: "Real-time sync between frontend and kitchen." },
    { icon: Truck, title: "Live Order Tracking", desc: "Keep customers updated on their food status." },
    { icon: Ticket, title: "Token Management", desc: "Digital token system for seamless pickups." },
    { icon: TrendingUp, title: "Revenue Analytics", desc: "Actionable insights on sales and performance." },
    { icon: Package, title: "Inventory Tracking", desc: "Automated stock reduction with every order." },
    { icon: Users, title: "Customer Insights", desc: "Understand your regulars and their preferences." },
    { icon: Menu, title: "Menu Management", desc: "Dynamic pricing, out-of-stock toggles, and categories." },
    { icon: Bell, title: "Notifications", desc: "Instant alerts for staff and customers." },
    { icon: Star, title: "Loyalty System", desc: "Reward repeat customers automatically." },
    { icon: Building2, title: "Multi-Restaurant", desc: "Manage all your branches from one account." },
  ];

  return (
    <section className="py-24 px-6 lg:px-24 max-w-[1400px] mx-auto">
      <div className="text-center mb-16">
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">Everything You Need</h2>
        <p className="text-stone text-lg max-w-2xl mx-auto">
          An enterprise-grade feature set designed specifically for modern food businesses.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {features.map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: (i % 4) * 0.1 }}
            className="group relative p-[1px] rounded-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="bg-white/[0.02] border border-white/5 h-full p-6 rounded-[15px] relative z-10 hover:bg-white/[0.04] transition-colors">
              <feature.icon className="w-8 h-8 text-clay mb-4 group-hover:text-gold transition-colors" />
              <h3 className="text-lg font-heading text-cream mb-2">{feature.title}</h3>
              <p className="text-sm text-stone leading-relaxed">{feature.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
