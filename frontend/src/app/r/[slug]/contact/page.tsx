"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { 
  Phone, Mail, MapPin, Clock, Send, Instagram, Facebook, Twitter,
  ArrowRight, MessageCircle, ChevronRight
} from "lucide-react";
import { MehfilLogo } from "@/components/customer/MehfilLogo";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";

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

// Default contact data
const DEFAULT_CONTACT = {
  phone: "+91 98765 43210",
  email: "hello@smartdine.ai",
  address: "Road No. 36, Jubilee Hills, Hyderabad, Telangana 500033",
  google_map_url: "https://maps.google.com/?q=Hyderabad",
  social_links: {
    instagram: "#",
    facebook: "#",
    twitter: "#",
  },
  hours: {
    lunch: "12:00 PM to 3:30 PM",
    dinner: "6:30 PM to 11:30 PM",
    open_days: "Open all 7 days",
  },
};

export default function ContactPage() {
  const params = useParams();
  const slug = params?.slug as string;

  // Get restaurant config from local JSON files
  const { config: restaurantConfig } = useRestaurantConfig();

  const config = { 
    ...DEFAULT_CONTACT, 
    phone: restaurantConfig?.contact?.phone || DEFAULT_CONTACT.phone,
    email: restaurantConfig?.contact?.email || DEFAULT_CONTACT.email,
    address: restaurantConfig?.contact?.address || DEFAULT_CONTACT.address,
    social_links: restaurantConfig?.social_links || DEFAULT_CONTACT.social_links,
    hours: restaurantConfig?.hours || DEFAULT_CONTACT.hours,
  };

  // Contact form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success("Message sent! We'll get back to you soon.");
    setFormData({ name: "", email: "", subject: "", message: "" });
    setIsSubmitting(false);
  };

  return (
    <div className="mehfil min-h-screen mehfil-paper">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 px-5 md:px-6 overflow-hidden" data-testid="contact-hero">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 mehfil-paper" />
          <div className="absolute top-20 -left-20 w-64 h-64 rounded-full bg-brand-secondary/10 blur-3xl" />
          <div className="absolute bottom-20 -right-20 w-80 h-80 rounded-full bg-brand-primary/10 blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center">
          <MehfilLogo size="lg" withTagline />
          
          <motion.div 
            initial="hidden" 
            whileInView="show" 
            viewport={{ once: true }} 
            variants={fadeUp}
            className="mt-8"
          >
            <SectionTag>Get in Touch</SectionTag>
            <h1 className="font-royal text-4xl md:text-6xl text-brand-primary tracking-wide">
              Contact <span className="font-editorial italic mehfil-gold-gradient">Us</span>
            </h1>
            <p className="font-editorial italic text-lg md:text-xl text-[#1A1106]/75 mt-6 max-w-2xl mx-auto leading-relaxed">
              Have a question, suggestion, or want to make a reservation? We&apos;d love to hear from you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-10 px-5 md:px-6 max-w-6xl mx-auto" data-testid="contact-info">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Phone, label: "Call Us", value: config.phone, href: `tel:${config.phone}` },
            { icon: Mail, label: "Email Us", value: config.email, href: `mailto:${config.email}` },
            { icon: MapPin, label: "Visit Us", value: config.address, href: config.google_map_url },
            { icon: Clock, label: "Business Hours", value: `${config.hours.lunch}\n${config.hours.dinner}`, href: null },
          ].map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="mehfil-card rounded-lg p-6 text-center hover:-translate-y-1 transition-all"
            >
              <div className="h-14 w-14 mx-auto rounded-full bg-brand-secondary/10 flex items-center justify-center mb-4">
                <item.icon className="h-6 w-6 text-brand-primary" />
              </div>
              <h3 className="font-royal text-sm tracking-wider uppercase text-brand-primary mb-2">{item.label}</h3>
              {item.href ? (
                <a 
                  href={item.href} 
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="font-editorial text-sm text-[#1A1106]/75 hover:text-brand-primary transition-colors whitespace-pre-line"
                >
                  {item.value}
                </a>
              ) : (
                <p className="font-editorial text-sm text-[#1A1106]/75 whitespace-pre-line">{item.value}</p>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Map & Contact Form */}
      <section className="py-14 md:py-24 px-5 md:px-6 max-w-7xl mx-auto" data-testid="contact-main">
        <div className="grid lg:grid-cols-2 gap-10">
          {/* Google Map */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden shadow-2xl border border-brand-secondary/20"
          >
            <iframe
              src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.1234567890123!2d78.4073!3d17.4325!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTfCsDI2JzA1LjAiTiA3OMKwMjQnMjYuMyJF!5e0!3m2!1sen!2sin!4v1234567890123`}
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Restaurant Location"
              className="w-full h-[400px]"
            />
            
            {/* Map Overlay Info */}
            <div className="p-6 bg-[#FAF5EC]">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-[#FAF5EC]" />
                </div>
                <div>
                  <h3 className="font-royal text-lg text-brand-primary">Our Location</h3>
                  <p className="font-editorial text-sm text-[#1A1106]/75 mt-1">{config.address}</p>
                  <a 
                    href={config.google_map_url || `https://maps.google.com/?q=${encodeURIComponent(config.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-xs font-royal tracking-wider uppercase text-brand-primary hover:text-brand-secondary transition-colors"
                  >
                    Open in Google Maps <ChevronRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="mehfil-card rounded-2xl p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-brand-secondary/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-brand-primary" />
                </div>
                <div>
                  <h2 className="font-royal text-xl text-brand-primary">Send us a Message</h2>
                  <p className="font-editorial text-sm text-[#1A1106]/60">We&apos;ll respond within 24 hours</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B]">Your Name</span>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="mt-1.5 w-full bg-white border border-brand-secondary/30 rounded-lg px-4 py-3 text-sm outline-none focus:border-brand-primary transition-colors"
                      placeholder="John Doe"
                    />
                  </label>
                  <label className="block">
                    <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B]">Email Address</span>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="mt-1.5 w-full bg-white border border-brand-secondary/30 rounded-lg px-4 py-3 text-sm outline-none focus:border-brand-primary transition-colors"
                      placeholder="john@example.com"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B]">Subject</span>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="mt-1.5 w-full bg-white border border-brand-secondary/30 rounded-lg px-4 py-3 text-sm outline-none focus:border-brand-primary transition-colors"
                    placeholder="How can we help?"
                  />
                </label>

                <label className="block">
                  <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B]">Message</span>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={4}
                    className="mt-1.5 w-full bg-white border border-brand-secondary/30 rounded-lg px-4 py-3 text-sm outline-none focus:border-brand-primary transition-colors resize-none"
                    placeholder="Tell us more..."
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mehfil-btn-royal rounded-full py-3.5 font-royal tracking-[0.2em] uppercase text-xs disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    "Sending..."
                  ) : (
                    <>
                      Send Message <Send className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Social Links */}
            <div className="mt-6 flex items-center justify-center gap-4">
              <span className="font-royal text-xs tracking-wider uppercase text-[#8A6A1B]">Follow Us</span>
              {config.social_links?.instagram && (
                <a href={config.social_links.instagram} target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-[#FAF5EC] border border-brand-secondary/30 flex items-center justify-center hover:bg-brand-primary hover:text-[#FAF5EC] transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {config.social_links?.facebook && (
                <a href={config.social_links.facebook} target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-[#FAF5EC] border border-brand-secondary/30 flex items-center justify-center hover:bg-brand-primary hover:text-[#FAF5EC] transition-colors">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {config.social_links?.twitter && (
                <a href={config.social_links.twitter} target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-[#FAF5EC] border border-brand-secondary/30 flex items-center justify-center hover:bg-brand-primary hover:text-[#FAF5EC] transition-colors">
                  <Twitter className="h-4 w-4" />
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-14 md:py-24 px-5 md:px-6 mehfil-royal-bg text-[#FAF5EC]" data-testid="contact-cta">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-royal text-3xl md:text-5xl">
            Ready to <span className="font-editorial italic mehfil-gold-gradient">dine</span> with us?
          </h2>
          <p className="font-editorial italic text-lg text-[#FAF5EC]/80 mt-6 max-w-2xl mx-auto">
            Whether it&apos;s a casual meal or a special celebration, we&apos;re here to make it memorable.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link href={`/r/${slug}/reserve`} className="mehfil-btn-gold rounded-full px-8 py-3.5 text-sm tracking-[0.2em] uppercase font-royal inline-flex items-center gap-2">
              Reserve a Table <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={`/r/${slug}/menu`} className="rounded-full px-8 py-3.5 text-sm tracking-[0.2em] uppercase font-royal border border-brand-secondary/50 text-[#FAF5EC] hover:bg-brand-secondary/10 inline-flex items-center gap-2">
              View Menu
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
