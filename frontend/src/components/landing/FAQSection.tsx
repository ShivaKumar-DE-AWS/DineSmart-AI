"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does the AI Waiter work?",
      a: "Customers scan a QR code at their table which opens a chat interface on their phone. The AI Waiter converses with them naturally, answers menu questions, recommends dishes based on past preferences or popularity, and takes their order directly into your kitchen system.",
    },
    {
      q: "How long does setup take?",
      a: "You can be up and running in 15 minutes. Just create an account, upload your menu items (or we can import them for you), print the generated QR codes, and place them on your tables.",
    },
    {
      q: "Can I use my existing menu?",
      a: "Absolutely. Our platform allows you to easily input your existing menu, categorize items, set dynamic pricing, and upload images. The AI will learn your menu instantly.",
    },
    {
      q: "Do customers need to download an app?",
      a: "No! SmartDine AI works directly in the customer's mobile web browser. Scanning the QR code instantly opens the interface without any downloads or friction.",
    },
    {
      q: "Does it support UPI payments?",
      a: "Yes, we integrate with major payment gateways to support UPI, Credit/Debit Cards, and Net Banking directly from the customer's phone after they place an order.",
    },
    {
      q: "Can multiple branches use it?",
      a: "Yes. The ₹10,000/month plan covers a single restaurant location. If you own a franchise or multiple branches, our multi-tenant architecture allows you to manage all of them from a single master dashboard.",
    },
    {
      q: "What happens after the 14-day trial?",
      a: "Your account will remain active, but you'll need to enter payment details to continue accepting new orders. We do not require a credit card to start the trial, so there are no surprise charges.",
    },
  ];

  return (
    <section className="py-24 px-6 lg:px-24 max-w-[900px] mx-auto border-t border-white/5">
      <div className="text-center mb-16">
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">Frequently Asked Questions</h2>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div 
            key={i} 
            className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden transition-colors hover:bg-white/[0.04]"
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <span className="font-heading text-lg text-cream">{faq.q}</span>
              <ChevronDown 
                className={`w-5 h-5 text-stone transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`} 
              />
            </button>
            <AnimatePresence>
              {openIndex === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="px-6 pb-6 text-stone leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}
