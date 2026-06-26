"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  TrendingUp,
  Leaf,
  Mic,
  Globe,
  Zap,
  Sparkles,
} from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  role: "ai" | "user";
  text: string;
}

interface ComboCard {
  emoji: string;
  title: string;
  subtitle: string;
}

interface Scenario {
  messages: ChatMessage[];
  combo?: ComboCard;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const FEATURES = [
  { icon: Clock, label: "24/7 Available" },
  { icon: TrendingUp, label: "Smart Upselling" },
  { icon: Leaf, label: "Dietary Filters" },
  { icon: Mic, label: "Voice Ready" },
  { icon: Globe, label: "Multi-language" },
  { icon: Zap, label: "Instant Response" },
] as const;

const SCENARIOS: Scenario[] = [
  {
    messages: [
      { role: "ai", text: "Welcome to Mehfil! 🎉 How can I help you today?" },
      { role: "user", text: "I want something spicy." },
      {
        role: "ai",
        text: "I recommend our Chef's Special Paneer Tikka — it's one of our most popular spicy dishes! Would you like to add our signature Hyderabadi Biryani?",
      },
    ],
    combo: {
      emoji: "🌶️",
      title: "Spice Combo",
      subtitle: "Save ₹80",
    },
  },
  {
    messages: [
      {
        role: "ai",
        text: "Hi there! Tell me your preferences and I'll find the perfect dish.",
      },
      { role: "user", text: "I'm vegan and gluten-free." },
      {
        role: "ai",
        text: "Perfect! Here are your top matches:\n🥗 Garden Bowl\n🍛 Dal Tadka\n🥘 Mushroom Masala\nAll 100% vegan and gluten-free!",
      },
    ],
  },
  {
    messages: [
      {
        role: "ai",
        text: "Welcome! Today's most popular orders are trending! 📈",
      },
      { role: "user", text: "What's popular right now?" },
      {
        role: "ai",
        text: "Right now, our guests love:\n1. Chicken Dum Biryani (ordered 42× today)\n2. Paneer Butter Masala\n3. Gulab Jamun\nShall I add any of these?",
      },
    ],
  },
];

const CYCLE_INTERVAL = 8000; // ms per scenario

/* ------------------------------------------------------------------ */
/*  Typing Indicator                                                   */
/* ------------------------------------------------------------------ */

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-2xl rounded-tl-sm px-4 py-3 w-fit"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-[6px] h-[6px] rounded-full bg-stone"
          animate={{ y: [0, -5, 0] }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chat Bubble                                                        */
/* ------------------------------------------------------------------ */

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isAi = msg.role === "ai";

  return (
    <motion.div
      initial={{ opacity: 0, x: isAi ? -16 : 16, y: 6 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={
        isAi
          ? "bg-white/10 text-cream p-3 px-4 rounded-2xl rounded-tl-sm w-[85%] backdrop-blur-md text-sm whitespace-pre-line"
          : "bg-electric-blue text-white p-3 px-4 rounded-2xl rounded-tr-sm w-[75%] ml-auto text-sm"
      }
    >
      {msg.text}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Combo Card                                                         */
/* ------------------------------------------------------------------ */

function ComboCardEl({ combo }: { combo: ComboCard }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="bg-white/[0.05] border border-white/10 p-3 rounded-xl w-[85%]"
    >
      <div className="flex gap-3 items-center">
        <div className="w-11 h-11 bg-clay/20 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-lg">{combo.emoji}</span>
        </div>
        <div>
          <div className="text-cream text-sm font-medium">{combo.title}</div>
          <div className="text-stone text-xs">{combo.subtitle}</div>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Phone Chat (autoplay loop)                                         */
/* ------------------------------------------------------------------ */

function PhoneChat() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [showCombo, setShowCombo] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scenario = SCENARIOS[scenarioIdx];

  /* Clear all timers */
  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (cycleRef.current) clearInterval(cycleRef.current);
  }, []);

  /* Sequentially reveal messages with typing delays */
  const playScenario = useCallback(
    (sc: Scenario) => {
      setVisibleCount(0);
      setIsTyping(false);
      setShowCombo(false);

      let step = 0;
      const totalMessages = sc.messages.length;

      const showNextMessage = () => {
        if (step >= totalMessages) {
          // After all messages, show combo if present
          if (sc.combo) {
            timerRef.current = setTimeout(() => {
              setShowCombo(true);
            }, 400);
          }
          return;
        }

        const msg = sc.messages[step];
        const typingDelay = msg.role === "ai" ? 900 : 500;
        const readDelay = msg.role === "ai" ? 600 : 400;

        // Show typing indicator for AI messages
        if (msg.role === "ai") {
          setIsTyping(true);
          timerRef.current = setTimeout(() => {
            setIsTyping(false);
            step++;
            setVisibleCount(step);
            timerRef.current = setTimeout(showNextMessage, readDelay);
          }, typingDelay);
        } else {
          // User messages appear after a short pause
          timerRef.current = setTimeout(() => {
            step++;
            setVisibleCount(step);
            timerRef.current = setTimeout(showNextMessage, readDelay);
          }, typingDelay);
        }
      };

      // Start with a small initial delay
      timerRef.current = setTimeout(showNextMessage, 300);
    },
    []
  );

  /* Kick off scenario + set up cycling */
  useEffect(() => {
    playScenario(SCENARIOS[scenarioIdx]);

    cycleRef.current = setInterval(() => {
      setScenarioIdx((prev) => {
        const next = (prev + 1) % SCENARIOS.length;
        return next;
      });
    }, CYCLE_INTERVAL);

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioIdx]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white/[0.05] p-4 pt-9 pb-3 flex items-center gap-3 border-b border-white/[0.08]">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-clay via-gold to-electric-blue flex items-center justify-center shadow-lg shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-cream font-medium text-sm">SmartDine AI</div>
          <div className="text-[11px] text-ready flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-ready inline-block" />
            Online
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-3 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={scenarioIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {scenario.messages.slice(0, visibleCount).map((msg, i) => (
              <ChatBubble key={`${scenarioIdx}-${i}`} msg={msg} />
            ))}

            {isTyping && <TypingIndicator />}

            {showCombo && scenario.combo && (
              <ComboCardEl combo={scenario.combo} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <div className="p-3 bg-white/[0.04] border-t border-white/[0.08] flex items-center gap-2">
        <div className="flex-1 bg-white/[0.06] rounded-full px-4 py-2.5 text-sm text-stone/60 border border-white/[0.08] select-none">
          Type a message…
        </div>
        <div className="w-10 h-10 rounded-full bg-electric-blue/20 flex items-center justify-center text-electric-blue shrink-0">
          <Mic className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function AIWaiterShowcase() {
  return (
    <section
      id="ai-waiter"
      className="relative py-24 px-6 lg:px-24 max-w-[1400px] mx-auto overflow-hidden"
      data-testid="ai-waiter-showcase"
    >
      {/* Ambient glow */}
      <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] bg-electric-blue/[0.08] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-clay/[0.06] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
        {/* ---- Left Column ---- */}
        <div className="flex-1 text-center lg:text-left">
          {/* Section label */}
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-block font-mono text-xs tracking-[0.3em] text-electric-blue uppercase mb-4"
          >
            AI-POWERED
          </motion.span>

          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading text-4xl md:text-5xl text-white mb-6 leading-[1.1]"
          >
            Your Best Waiter
            <br />
            Never Takes a Break
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-stone text-lg max-w-xl mx-auto lg:mx-0 mb-10"
          >
            Our AI understands complex requests, remembers preferences, and
            perfectly times recommendations to maximize every order.
          </motion.p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 justify-center lg:justify-start max-w-xl mx-auto lg:mx-0">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.label}
                  initial={{ opacity: 0, y: 14, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    delay: 0.3 + i * 0.08,
                    ease: "easeOut",
                  }}
                  className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-2 text-sm text-cream"
                  data-testid={`feature-pill-${i}`}
                >
                  <Icon className="w-4 h-4 text-electric-blue shrink-0" />
                  <span>{feat.label}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ---- Right Column — Phone Mockup ---- */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex-1 w-full max-w-[340px] relative"
        >
          {/* Glow behind phone */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] bg-electric-blue/[0.07] rounded-full blur-[120px] -z-10 pointer-events-none" />

          {/* Phone frame */}
          <div className="bg-ink border-[6px] border-bone rounded-[3rem] shadow-2xl relative overflow-hidden">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-[22px] bg-bone rounded-b-2xl z-20" />

            {/* Screen */}
            <div
              className="bg-coal rounded-[2.5rem] h-[580px] overflow-hidden flex flex-col relative"
              data-testid="phone-chat-screen"
            >
              <PhoneChat />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
