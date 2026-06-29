"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Sparkles, QrCode, MessageCircle, BarChart3, Smartphone,
  ChefHat, Clock, TrendingUp, Users, Zap, Shield, Globe,
  ArrowRight, Check, Star, Crown
} from "lucide-react";
import { MehfilLogo } from "@/components/customer/MehfilLogo";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="mehfil-divider mb-6">
      <span className="font-royal tracking-[0.4em] text-xs uppercase">{children}</span>
    </div>
  );
}

const FEATURES = [
  {
    icon: QrCode,
    title: "QR Code Ordering",
    description: "Scan a QR code at your table to instantly access the menu, place orders, and track preparation — no app download needed.",
  },
  {
    icon: MessageCircle,
    title: "AI Waiter",
    description: "Your personal dining assistant that recommends dishes, answers questions, and places orders — available 24/7.",
  },
  {
    icon: Clock,
    title: "Real-Time Tracking",
    description: "Watch your order progress from kitchen to table with live status updates and estimated preparation times.",
  },
  {
    icon: Sparkles,
    title: "Smart Recommendations",
    description: "AI-powered suggestions based on your preferences, dietary needs, and popular dishes among similar diners.",
  },
  {
    icon: BarChart3,
    title: "Restaurant Analytics",
    description: "Powerful dashboard for restaurant owners with sales insights, inventory management, and customer analytics.",
  },
  {
    icon: Shield,
    title: "Secure Payments",
    description: "Multiple payment options including UPI, cards, wallets, and cash — all processed securely via Stripe.",
  },
];

const BENEFITS_FOR_CUSTOMERS = [
  "Faster ordering — no waiting for staff",
  "Better dish recommendations",
  "Personalized dining experience",
  "Real-time order tracking",
  "Easy reordering of favorites",
  "No app download required",
];

const BENEFITS_FOR_RESTAURANTS = [
  "Reduced staff workload",
  "Increased average order value",
  "Better customer experience",
  "Powerful analytics dashboard",
  "Inventory management",
  "Multi-location support",
];

const HOW_IT_WORKS = [
  { step: 1, title: "Scan QR Code", description: "Scan the QR code at your table to access the restaurant's digital menu.", icon: QrCode },
  { step: 2, title: "Talk to AI Waiter", description: "Ask our AI for recommendations or browse the menu yourself.", icon: MessageCircle },
  { step: 3, title: "Place Your Order", description: "Add items to your cart and customize as you like.", icon: Smartphone },
  { step: 4, title: "Track & Enjoy", description: "Watch your order progress and get notified when it's ready.", icon: Clock },
];

const STATS = [
  { value: "10K+", label: "Orders Processed" },
  { value: "50+", label: "Partner Restaurants" },
  { value: "4.8", label: "Average Rating" },
  { value: "99.9%", label: "Uptime" },
];

export default function SmartDinePage() {
  const params = useParams();
  const slug = params?.slug as string;

  return (
    <div className="mehfil min-h-screen mehfil-paper">
      {/* Hero Section */}
      <section className="relative py-16 md:py-28 px-5 md:px-6 overflow-hidden" data-testid="smartdine-hero">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 mehfil-paper" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-brand-primary/5 blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-secondary/10 border border-brand-secondary/30 mb-8"
          >
            <Sparkles className="h-4 w-4 text-brand-secondary" />
            <span className="font-royal text-xs tracking-wider uppercase text-brand-primary">AI-Powered Dining Platform</span>
          </motion.div>

          <motion.h1 
            initial="hidden" 
            animate="show" 
            variants={fadeUp}
            className="font-royal text-4xl md:text-7xl text-brand-primary tracking-wide"
          >
            Welcome to <span className="font-editorial italic mehfil-gold-gradient">SmartDine</span>
          </motion.h1>

          <motion.p 
            initial="hidden" 
            animate="show" 
            variants={fadeUp}
            className="font-editorial italic text-lg md:text-2xl text-[#1A1106]/75 mt-6 max-w-3xl mx-auto leading-relaxed"
          >
            The AI-powered dining assistant platform that transforms how restaurants serve and customers dine.
          </motion.p>

          <motion.div 
            initial="hidden" 
            animate="show" 
            variants={fadeUp}
            className="mt-10 flex flex-wrap gap-4 justify-center"
          >
            <a href="https://smartdine.co.in" target="_blank" rel="noopener noreferrer" className="mehfil-btn-royal rounded-full px-8 py-3.5 text-sm tracking-[0.2em] uppercase font-royal inline-flex items-center gap-2">
              Try It Now <ArrowRight className="h-4 w-4" />
            </a>
            <a href="https://smartdine.co.in" target="_blank" rel="noopener noreferrer" className="rounded-full px-8 py-3.5 text-sm tracking-[0.2em] uppercase font-royal border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-[#FAF5EC] transition-colors">
              Learn More
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-royal text-3xl md:text-4xl text-brand-primary">{stat.value}</div>
                <div className="font-editorial text-sm text-[#1A1106]/60 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* What is SmartDine */}
      <section className="py-14 md:py-24 px-5 md:px-6 max-w-6xl mx-auto" data-testid="smartdine-about">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <SectionTag>What is SmartDine?</SectionTag>
            <h2 className="font-royal text-3xl md:text-5xl text-brand-primary tracking-wide">
              AI-Powered <span className="font-editorial italic mehfil-gold-gradient">Dining</span>
            </h2>
            <p className="font-editorial text-lg text-[#1A1106]/75 mt-6 leading-relaxed">
              SmartDine is a comprehensive restaurant technology platform that uses artificial intelligence to enhance the dining experience for both customers and restaurant owners.
            </p>
            <p className="font-editorial text-base text-[#1A1106]/65 mt-4 leading-relaxed">
              From QR code ordering to AI-powered recommendations, real-time tracking to smart analytics — SmartDine provides everything a modern restaurant needs to deliver exceptional service.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative mx-auto h-72 w-72 md:h-96 md:w-96">
              <div className="absolute inset-0 rounded-full mehfil-glow bg-brand-secondary/30 blur-3xl" />
              <div className="absolute inset-6 rounded-full bg-gradient-to-br from-[#DDB85C] via-brand-secondary to-[#8A6A1B] flex items-center justify-center shadow-2xl">
                <Sparkles className="h-24 w-24 text-[#5C0E1B]" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-14 md:py-24 px-5 md:px-6 bg-[#F3EBD8]/40" data-testid="smartdine-features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <SectionTag>Platform Features</SectionTag>
            <h2 className="font-royal text-3xl md:text-5xl text-brand-primary tracking-wide">
              Everything you <span className="font-editorial italic mehfil-gold-gradient">need</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="mehfil-card rounded-xl p-6 hover:-translate-y-1 transition-all"
              >
                <div className="h-12 w-12 rounded-lg bg-brand-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-brand-primary" />
                </div>
                <h3 className="font-royal text-lg text-brand-primary">{feature.title}</h3>
                <p className="font-editorial text-sm text-[#1A1106]/70 mt-2 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-14 md:py-24 px-5 md:px-6 max-w-6xl mx-auto" data-testid="smartdine-how">
        <div className="text-center mb-12">
          <SectionTag>How It Works</SectionTag>
          <h2 className="font-royal text-3xl md:text-5xl text-brand-primary tracking-wide">
            Simple as <span className="font-editorial italic mehfil-gold-gradient">1-2-3-4</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map((step, idx) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
              className="text-center"
            >
              <div className="relative h-20 w-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-brand-secondary/20" />
                <div className="absolute inset-2 rounded-full bg-brand-primary flex items-center justify-center">
                  <step.icon className="h-8 w-8 text-[#FAF5EC]" />
                </div>
                <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-brand-secondary text-[#1A1106] text-sm font-royal flex items-center justify-center shadow-lg">
                  {step.step}
                </div>
              </div>
              <h3 className="font-royal text-lg text-brand-primary">{step.title}</h3>
              <p className="font-editorial text-sm text-[#1A1106]/70 mt-2 leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-14 md:py-24 px-5 md:px-6 mehfil-royal-bg text-[#FAF5EC]" data-testid="smartdine-benefits">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <SectionTag>Benefits</SectionTag>
            <h2 className="font-royal text-3xl md:text-5xl">
              Why choose <span className="font-editorial italic mehfil-gold-gradient">SmartDine</span>?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* For Customers */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-[#FAF5EC]/10 rounded-xl p-6 border border-brand-secondary/20"
            >
              <div className="flex items-center gap-3 mb-6">
                <Users className="h-6 w-6 text-brand-secondary" />
                <h3 className="font-royal text-xl text-[#FAF5EC]">For Customers</h3>
              </div>
              <ul className="space-y-3">
                {BENEFITS_FOR_CUSTOMERS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-brand-secondary mt-0.5 flex-shrink-0" />
                    <span className="font-editorial text-[#FAF5EC]/90">{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* For Restaurants */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-[#FAF5EC]/10 rounded-xl p-6 border border-brand-secondary/20"
            >
              <div className="flex items-center gap-3 mb-6">
                <Crown className="h-6 w-6 text-brand-secondary" />
                <h3 className="font-royal text-xl text-[#FAF5EC]">For Restaurants</h3>
              </div>
              <ul className="space-y-3">
                {BENEFITS_FOR_RESTAURANTS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-brand-secondary mt-0.5 flex-shrink-0" />
                    <span className="font-editorial text-[#FAF5EC]/90">{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-14 md:py-24 px-5 md:px-6 max-w-4xl mx-auto text-center" data-testid="smartdine-cta">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-royal text-3xl md:text-5xl text-brand-primary tracking-wide">
            Ready to <span className="font-editorial italic mehfil-gold-gradient">experience</span> SmartDine?
          </h2>
          <p className="font-editorial italic text-lg text-[#1A1106]/75 mt-6 max-w-2xl mx-auto">
            Start by exploring our menu or talking to our AI Waiter. The future of dining is here.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link href={`/r/${slug}/menu`} className="mehfil-btn-royal rounded-full px-8 py-3.5 text-sm tracking-[0.2em] uppercase font-royal inline-flex items-center gap-2">
              Explore Menu <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={`/r/${slug}/about`} className="rounded-full px-8 py-3.5 text-sm tracking-[0.2em] uppercase font-royal border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-[#FAF5EC] transition-colors">
              About This Restaurant
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Powered by SmartDine */}
      <section className="py-8 px-5 md:px-6 border-t border-[#E7DFCB]" data-testid="smartdine-footer">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-[#1A1106]/60">
            <Sparkles className="h-4 w-4 text-brand-secondary" />
            <span className="font-editorial">Powered by</span>
            <span className="font-royal text-brand-primary">SmartDine</span>
            <span className="font-editorial">— AI-Powered Dining Platform</span>
          </div>
        </div>
      </section>
    </div>
  );
}
