"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Crown, Heart, Users, ChefHat, Flame, Sparkles, 
  Star, Quote, ArrowRight, Award, Utensils, Clock 
} from "lucide-react";
import { MehfilLogo } from "@/components/customer/MehfilLogo";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";
import type { MenuItem } from "@/types";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

// Default restaurant data (fallback)
const DEFAULT_RESTAURANT = {
  name: "Restaurant",
  tagline: "A Great Dining Experience",
  description: "Where every meal tells a story.",
  history_intro: "Our journey began with a passion for great food and a commitment to serving our community.",
  history: [
    { year: "2020", title: "Founded", description: "We opened our doors with a vision to serve authentic cuisine with a modern twist.", image_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80" },
  ],
  specialties: [
    "Signature Dishes",
    "Fresh Ingredients",
    "Family Friendly",
  ],
  why_us: [
    { icon: "Crown", title: "Quality Food", description: "We use only the freshest ingredients." },
    { icon: "Heart", title: "Made with Love", description: "Every dish is crafted with care." },
    { icon: "Users", title: "Family Friendly", description: "Bring the whole family." },
  ],
  reviews: [
    { name: "Guest", role: "Food Lover", text: "Amazing food and great service!", rating: 5 },
  ],
};

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="mehfil-divider mb-6">
      <span className="font-royal tracking-[0.4em] text-xs uppercase">{children}</span>
    </div>
  );
}

const ICON_MAP: Record<string, any> = {
  Crown, Heart, Users, ChefHat, Flame, Sparkles,
};

export default function AboutPage() {
  const params = useParams();
  const slug = params?.slug as string;

  // Get restaurant config from local JSON files
  const { config: restaurantConfig } = useRestaurantConfig();

  const famousDishes = (restaurantConfig?.famous_dishes || [])
    .slice(0, 4);

  return (
    <div className="mehfil min-h-screen mehfil-paper">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 px-5 md:px-6 overflow-hidden" data-testid="about-hero">
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
            <SectionTag>Our Story</SectionTag>
            <h1 className="font-royal text-4xl md:text-6xl text-brand-primary tracking-wide">
              About <span className="font-editorial italic mehfil-gold-gradient">{restaurantConfig.name}</span>
            </h1>
            <p className="font-editorial italic text-lg md:text-xl text-[#1A1106]/75 mt-6 max-w-3xl mx-auto leading-relaxed">
              {restaurantConfig.description}
            </p>
          </motion.div>
        </div>
      </section>

      {/* History Timeline */}
      <section className="py-14 md:py-24 px-5 md:px-6 max-w-6xl mx-auto" data-testid="about-history">
        <SectionTag>Since {restaurantConfig?.history?.[0]?.year || "2020"}</SectionTag>
        <motion.h2 
          initial="hidden" 
          whileInView="show" 
          viewport={{ once: true }} 
          variants={fadeUp} 
          className="font-royal text-4xl md:text-5xl text-center text-brand-primary tracking-wide"
        >
          A Legacy <span className="font-editorial italic mehfil-gold-gradient">of taste</span>
        </motion.h2>
        <p className="font-editorial text-lg text-[#1A1106]/75 text-center mt-6 max-w-3xl mx-auto italic leading-relaxed">
          {restaurantConfig.history_intro}
        </p>

        <div className="mt-20 relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-brand-secondary to-transparent hidden md:block" />
          
          {(restaurantConfig.history || DEFAULT_RESTAURANT.history).map((t: any, idx: number) => (
            <motion.div 
              key={t.year} 
              initial="hidden" 
              whileInView="show" 
              viewport={{ once: true, margin: "-80px" }} 
              variants={fadeUp} 
              className={`relative grid md:grid-cols-2 gap-10 items-center my-16 ${idx % 2 ? "md:[direction:rtl]" : ""}`}
            >
              <div className={`${idx % 2 ? "md:[direction:ltr] md:pl-12" : "md:pr-12"}`}>
                <div className="font-royal mehfil-gold-gradient text-6xl md:text-7xl tracking-tight">{t.year}</div>
                <h3 className="font-royal text-2xl md:text-3xl text-brand-primary mt-3">{t.title}</h3>
                <p className="font-editorial italic text-lg text-[#1A1106]/75 mt-4 leading-relaxed">{t.description}</p>
              </div>
              <div className={`${idx % 2 ? "md:[direction:ltr]" : ""}`}>
                <div className="aspect-[4/3] rounded-lg bg-cover bg-center shadow-2xl border border-brand-secondary/30" style={{ backgroundImage: `url(${t.img || t.image_url})` }} />
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-brand-secondary hidden md:block mehfil-glow" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why Us Section */}
      <section className="py-14 md:py-24 px-5 md:px-6 max-w-7xl mx-auto" data-testid="about-why">
        <SectionTag>Why choose us</SectionTag>
        <h2 className="font-royal text-4xl md:text-5xl text-center text-brand-primary">
          A table where memories are <span className="font-editorial italic mehfil-gold-gradient">cooked</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
          {(restaurantConfig.why_us || DEFAULT_RESTAURANT.why_us).map((f: any) => {
            const IconComponent = ICON_MAP[f.icon] || Sparkles;
            return (
              <motion.div 
                key={f.title} 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                transition={{ duration: 0.5 }} 
                className="mehfil-card rounded-lg p-6 hover:-translate-y-1 transition-all"
              >
                <IconComponent className="h-7 w-7 text-brand-secondary" />
                <h3 className="font-royal text-lg text-brand-primary mt-4">{f.title}</h3>
                <p className="font-editorial text-base text-[#1A1106]/75 mt-2 leading-relaxed">{f.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Specialties Section */}
      <section className="py-14 md:py-24 px-5 md:px-6 mehfil-royal-bg text-[#FAF5EC]" data-testid="about-specialties">
        <div className="max-w-5xl mx-auto">
          <SectionTag>Our Specialties</SectionTag>
          <h2 className="font-royal text-4xl md:text-5xl text-center">
            What makes us <span className="font-editorial italic mehfil-gold-gradient">unique</span>
          </h2>
          
          <div className="mt-14 grid md:grid-cols-2 gap-6">
            {(restaurantConfig.specialties || DEFAULT_RESTAURANT.specialties).map((s: string, idx: number) => (
              <motion.div 
                key={s}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="flex items-center gap-4 bg-[#FAF5EC]/10 rounded-lg p-5 border border-brand-secondary/20"
              >
                <div className="h-12 w-12 rounded-full bg-brand-secondary/20 flex items-center justify-center flex-shrink-0">
                  <Award className="h-6 w-6 text-brand-secondary" />
                </div>
                <div>
                  <h3 className="font-royal text-lg text-[#FAF5EC]">{s}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Famous Dishes Section */}
      {famousDishes.length > 0 && (
        <section className="py-14 md:py-24 px-5 md:px-6 max-w-7xl mx-auto" data-testid="about-famous">
          <SectionTag>Signature Dishes</SectionTag>
          <h2 className="font-royal text-4xl md:text-5xl text-center text-brand-primary">
            Our <span className="font-editorial italic mehfil-gold-gradient">famous</span> dishes
          </h2>
          
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {famousDishes.map((item) => {
              return (
                <motion.div 
                  key={item.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mehfil-card rounded-lg overflow-hidden group"
                >
                  <div className="aspect-[4/3] bg-cover bg-center group-hover:scale-105 transition-transform duration-500 relative" style={{ backgroundImage: `url(${item.image_url})` }}>
                    {item.popularity_badge && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-brand-secondary text-[#1A1106] text-[10px] font-royal tracking-wider uppercase shadow-md">
                        {item.popularity_badge}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-1 text-brand-secondary mb-2">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className="h-3 w-3 fill-current" />
                      ))}
                    </div>
                    <h3 className="font-royal text-lg text-brand-primary">{item.name}</h3>
                    <p className="font-editorial italic text-sm text-[#1A1106]/70 mt-2 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-end mt-4 pt-4 border-t border-[#E7DFCB]">
                      <Link href={`/r/${slug}/menu`} className="mehfil-btn-royal rounded-full px-4 py-2 text-[11px] font-royal tracking-wider uppercase">
                        View live menu
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Reviews Section */}
      <section className="py-14 md:py-24 px-5 md:px-6 max-w-6xl mx-auto" data-testid="about-reviews">
        <SectionTag>What people say</SectionTag>
        <h2 className="font-royal text-4xl md:text-5xl text-center text-brand-primary">
          Customer <span className="font-editorial italic mehfil-gold-gradient">reviews</span>
        </h2>
        
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {(restaurantConfig.reviews || DEFAULT_RESTAURANT.reviews).map((r: any) => (
            <motion.div 
              key={r.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mehfil-card rounded-lg p-6"
            >
              <Quote className="h-7 w-7 text-brand-secondary" />
              <p className="font-editorial italic text-base text-[#1A1106]/85 mt-4 leading-relaxed">&ldquo;{r.text}&rdquo;</p>
              <div className="mt-5 flex items-center gap-1 text-brand-secondary">
                {Array.from({ length: r.rating }, (_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <div className="mt-3 font-royal tracking-wider uppercase text-xs text-brand-primary">{r.name}</div>
              <div className="font-editorial italic text-xs text-[#1A1106]/60">{r.role}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-14 md:py-24 px-5 md:px-6 mehfil-royal-bg text-[#FAF5EC]" data-testid="about-cta">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-royal text-4xl md:text-5xl">
            Ready to <span className="font-editorial italic mehfil-gold-gradient">experience</span> {restaurantConfig?.name || "the restaurant"}?
          </h2>
          <p className="font-editorial italic text-lg text-[#FAF5EC]/80 mt-6 max-w-2xl mx-auto">
            Join us for a meal that tells a story, one plate at a time.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link href={`/r/${slug}/menu`} className="mehfil-btn-gold rounded-full px-8 py-3.5 text-sm tracking-[0.2em] uppercase font-royal inline-flex items-center gap-2">
              Explore Menu <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={`/r/${slug}/reserve`} className="rounded-full px-8 py-3.5 text-sm tracking-[0.2em] uppercase font-royal border border-brand-secondary/50 text-[#FAF5EC] hover:bg-brand-secondary/10 inline-flex items-center gap-2">
              Reserve a Table
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
