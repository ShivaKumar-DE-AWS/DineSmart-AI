// @ts-nocheck
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Send, X, Loader2, Mic, MessageSquare, Plus, Minus, Square, Volume2, VolumeX, ArrowRight, RotateCcw, Utensils, Check, Flame, Star, Clock, ShoppingBag } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useAIWaiter } from "@/hooks/useAIWaiter";
import { useSession } from "@/stores/session";
import { useRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { api, apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/stores/cart";
import { useTable } from "@/stores/table";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { MenuItem } from "@/types";

type Mode = "chat" | "voice";
type Lang = "auto" | "en" | "hi" | "te" | "ur" | "ta" | "mr";
type Tone = "friendly" | "formal" | "playful" | "poetic";
const LANGS: { code: Lang; label: string }[] = [
  { code: "auto", label: "Auto" },
  { code: "en",   label: "English" },
  { code: "hi",   label: "हिन्दी" },
  { code: "ur",   label: "اردو" },
  { code: "te",   label: "తెలుగు" },
  { code: "ta",   label: "தமிழ்" },
  { code: "mr",   label: "मराठी" },
];
const TONES: { code: Tone; label: string }[] = [
  { code: "friendly", label: "Friendly" },
  { code: "formal",   label: "Formal" },
  { code: "playful",  label: "Playful" },
  { code: "poetic",   label: "Poetic" },
];

// Helper for clean image loading with fallback
function ItemImage({ src, alt }: { src?: string; alt: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-[#E7DFCB] to-[#DDB85C]/30 flex items-center justify-center shrink-0 border border-brand-secondary/20 shadow-inner">
        <Utensils className="h-7 w-7 text-brand-primary/50" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className="h-20 w-20 rounded-xl object-cover shrink-0 border border-brand-secondary/30 shadow-sm"
    />
  );
}

export function AIWaiterDock() {
  const params = useParams();
  const slug = params?.slug as string;
  const { config: restaurantConfig } = useRestaurantConfig();
  const restaurantName = restaurantConfig?.name || "our restaurant";

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [language, setLanguage] = useState<Lang>("auto");
  const [tone, setTone] = useState<Tone>("friendly");
  const [recording, setRecording] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const vadPausedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const hasGreetedRef = useRef(false);
  const cart = useCart();
  const { session } = useTable();
  const router = useRouter();

  const { data: menuData } = useQuery({
    queryKey: ["menu", restaurantConfig?.id],
    queryFn: () => api<{ items: MenuItem[] }>(`/api/menu?restaurant_id=${restaurantConfig?.id || ""}`),
    enabled: Boolean(restaurantConfig?.id),
    staleTime: 30_000,
  });
  const menu = useMemo(() => (menuData?.items ?? []).filter((i) => i.available !== false), [menuData]);

  const handleOrderUpdate = useCallback((orderData: any) => {
    toast.success("Order updated by AI Waiter!");
  }, []);

  const { messages, input, setInput, append, sendAudio, startVoice, stopVoice, isLoading: streaming, preferences, clearMessages, ttsPlaying: hookTtsPlaying, speakText: wsSpeakText } = useAIWaiter({
    restaurantId: restaurantConfig?.id || "",
    mode: mode,
    onOrderUpdate: handleOrderUpdate
  });

  const isPlayingAudio = hookTtsPlaying || ttsPlaying;

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { mode?: Mode } | undefined;
      if (detail?.mode) setMode(detail.mode);
      setOpen(true);
    };
    window.addEventListener("open-ai-waiter", onOpen as EventListener);
    return () => window.removeEventListener("open-ai-waiter", onOpen as EventListener);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (!open && ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
      setTtsPlaying(false);
    }
  }, [open]);

  // Auto-greet when switching to Talk mode
  useEffect(() => {
    if (open && mode === "voice" && !hasGreetedRef.current) {
      hasGreetedRef.current = true;
      const greetingMsg = `Namaste! Welcome to ${restaurantName}! I am your AI Waiter today. How can I delight you? What would you like to order today?`;
      wsSpeakText(greetingMsg);
    }
  }, [open, mode, wsSpeakText, restaurantName]);

  const speakText = useCallback((text: string) => {
    if (!ttsOn || !text) return;
    wsSpeakText(text);
  }, [ttsOn, wsSpeakText]);

  const sendText = useCallback((text?: string) => {
    const normalized = typeof text === "string" ? text.trim() : "";
    if (!normalized || streaming) return;
    append({ role: "user", content: normalized });
  }, [append, streaming]);

  useEffect(() => {
    vadPausedRef.current = !open || mode !== "voice" || streaming || voiceProcessing || isPlayingAudio;
  }, [open, mode, streaming, voiceProcessing, isPlayingAudio]);

  // Continuous Browser Speech Recognition
  useEffect(() => {
    if (!open || mode !== "voice") {
      const rec = (window as any).activeSpeechRec;
      if (rec) {
        rec.onend = null;
        rec.stop();
        (window as any).activeSpeechRec = null;
      }
      setRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice chat is not supported in this browser. Switching to chat mode.");
      setMode("chat");
      return;
    }

    let recognition: any;
    try {
      recognition = new SpeechRecognition();
    } catch (err) {
      console.error("[ai-waiter] SpeechRecognition init failed", err);
      toast.error("Voice chat is blocked or unsupported here. Switching to chat mode.");
      setMode("chat");
      return;
    }
    
    (window as any).activeSpeechRec = recognition;
    recognition.continuous = true;
    recognition.interimResults = false;
    
    let langCode = "en-IN";
    if (language === "hi") langCode = "hi-IN";
    if (language === "te") langCode = "te-IN";
    if (language === "ur") langCode = "ur-IN";
    if (language === "ta") langCode = "ta-IN";
    if (language === "mr") langCode = "mr-IN";
    recognition.lang = langCode;

    recognition.onresult = (event: any) => {
      if (vadPausedRef.current) return;
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript.trim()) {
        sendText(finalTranscript);
      }
    };

    recognition.onstart = () => {
      if (!vadPausedRef.current) setRecording(true);
    };

    recognition.onend = () => {
      setRecording(false);
      if (open && mode === "voice" && !vadPausedRef.current) {
        try { recognition.start(); } catch (e) {}
      }
    };
    
    if (!vadPausedRef.current) {
      try { recognition.start(); } catch (e) {}
    }

    return () => {
      recognition.onend = null;
      recognition.stop();
      (window as any).activeSpeechRec = null;
      setRecording(false);
    };
  }, [open, mode, language, sendText]);

  useEffect(() => {
    const rec = (window as any).activeSpeechRec;
    if (!rec) return;
    if (vadPausedRef.current) {
      rec.stop();
      setRecording(false);
    } else {
      try { rec.start(); } catch(e) {}
    }
  }, [ttsPlaying, streaming, voiceProcessing]);

  const startRecording = useCallback(() => {}, []);
  const stopRecording = useCallback(() => {
    const rec = (window as any).activeSpeechRec;
    if (rec) rec.stop();
    setRecording(false);
  }, []);

  return (
    <>
      {!open && (
        <div className="fixed bottom-6 right-4 md:right-8 z-50 flex flex-col items-end">
          <button
            type="button"
            aria-label="Open AI Waiter"
            data-testid="ai-waiter-dock-btn"
            onClick={() => setOpen(true)}
            className="flex items-center gap-2.5 bg-gradient-to-r from-[#5C0E1B] to-[#8A1A2A] text-white px-6 py-4 rounded-full shadow-2xl hover:shadow-[#5C0E1B]/60 hover:scale-105 transition-all group border border-[#DDB85C]/50"
          >
            <div className="relative flex items-center justify-center">
              <Mic className="w-5 h-5 text-[#DDB85C] group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <span className="font-royal text-[13px] tracking-widest uppercase font-bold pr-1 text-[#FAF5EC]">AI Waiter</span>
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6" data-testid="ai-waiter-panel">
          <button type="button" aria-label="Close AI Waiter" className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="ai-waiter-title" className="relative z-10 w-full sm:w-[480px] sm:max-w-lg h-[95vh] sm:h-[700px] sm:max-h-[88vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border bg-[#FAF5EC] border-brand-secondary/50 animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            {/* Header */}
            <header className="px-5 py-4 flex items-center justify-between border-b bg-gradient-to-r from-[#5C0E1B] via-[#7A1525] to-[#5C0E1B] text-[#FAF5EC] border-brand-secondary/40 shadow-md">
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 rounded-full bg-gradient-to-br from-[#DDB85C] to-[#8A6A1B] flex items-center justify-center shadow-lg border border-[#FAF5EC]/30">
                  <Sparkles className="h-5 w-5 text-[#5C0E1B] animate-pulse" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#5C0E1B]" title="Live & Ready" />
                </div>
                <div>
                  <div id="ai-waiter-title" className="font-royal tracking-wider uppercase text-sm font-bold flex items-center gap-1.5">
                    {restaurantConfig?.ai_waiter?.name || "AI Waiter"}
                    <span className="text-[9px] bg-[#DDB85C] text-[#1A1106] px-1.5 py-0.5 rounded font-sans uppercase font-extrabold">Live</span>
                  </div>
                  <div className="font-editorial italic text-[11px] text-[#FAF5EC]/85">Your personal dining concierge</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  aria-label="Reset conversation"
                  onClick={() => { clearMessages && clearMessages(); toast.info("Conversation reset"); }}
                  title="Reset Conversation"
                  className="h-10 w-10 rounded-full hover:bg-white/10 flex items-center justify-center text-[#DDB85C] transition"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  aria-label={ttsOn ? "Mute AI voice" : "Unmute AI voice"}
                  data-testid="ai-tts-toggle"
                  onClick={() => setTtsOn((v) => !v)}
                  title={ttsOn ? "Mute voice" : "Unmute voice"}
                  className="h-10 w-10 rounded-full hover:bg-white/10 flex items-center justify-center text-[#DDB85C] transition"
                >
                  {ttsOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <button
                  aria-label="Close AI Waiter"
                  data-testid="ai-waiter-close"
                  onClick={() => setOpen(false)}
                  className="h-10 w-10 rounded-full hover:bg-white/10 flex items-center justify-center text-[#FAF5EC] transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            {/* Context Pill Banner */}
            {preferences && (preferences.partySize || preferences.dietary || preferences.budget || preferences.spice) && (
              <div className="bg-[#F3EBD8] px-4 py-1.5 border-b border-[#E7DFCB] flex items-center justify-between text-[11px] font-royal tracking-wide text-[#5C0E1B]">
                <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap py-0.5">
                  <span className="font-bold flex items-center gap-1"><Sparkles className="w-3 h-3 text-[#8A6A1B]" /> Known Context:</span>
                  {preferences.partySize && <span>👥 Party of {preferences.partySize}</span>}
                  {preferences.dietary && <span>🌱 {preferences.dietary.toUpperCase()}</span>}
                  {preferences.spice && <span>🌶️ {preferences.spice}</span>}
                  {preferences.budget && <span>💰 Budget: ₹{preferences.budget}</span>}
                </div>
              </div>
            )}

            {/* Mode tabs */}
            <div className="flex border-b bg-[#FAF5EC] border-[#E7DFCB] shadow-sm" data-testid="ai-mode-tabs">
              {([
                { k: "chat", label: "Chat Assistant", icon: MessageSquare },
                { k: "voice", label: "Voice Sommelier", icon: Mic },
              ] as { k: Mode; label: string; icon: typeof MessageSquare }[]).map((t) => {
                const active = mode === t.k;
                return (
                  <button
                    key={t.k}
                    data-testid={`ai-mode-${t.k}`}
                    aria-pressed={active}
                    onClick={() => setMode(t.k)}
                    className={`flex-1 py-3 text-[11px] font-royal tracking-[0.2em] uppercase border-b-2 transition flex items-center justify-center gap-2 font-bold ${
                      active
                        ? "border-[#5C0E1B] text-[#5C0E1B] bg-[#F3EBD8]/60"
                        : "border-transparent text-[#1A1106]/60 hover:text-[#5C0E1B]"
                    }`}
                  >
                    <t.icon className={`h-4 w-4 ${active ? "text-[#5C0E1B]" : "text-gray-400"}`} /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* Body */}
            {mode === "chat" && (
              <ChatPane
                language={language}
                setLanguage={setLanguage}
                tone={tone}
                setTone={setTone}
                messages={messages}
                streaming={streaming}
                scrollRef={scrollRef}
                input={typeof input === "string" ? input : ""}
                setInput={setInput}
                sendText={sendText}
                onTapChip={(m) => { cart.add(m); toast.success(`${m.name} added to your tray`); }}
                onCheckout={() => { router.push(`/r/${slug}/checkout`); setOpen(false); }}
              />
            )}

            {mode === "voice" && (
              <VoicePane
                messages={messages}
                streaming={streaming}
                scrollRef={scrollRef}
                onAdd={(m) => { cart.add(m); toast.success(`${m.name} added to your tray`); }}
                recording={recording}
                voiceProcessing={voiceProcessing}
                startRecording={startRecording}
                stopRecording={stopRecording}
                ttsPlaying={ttsPlaying}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

// =====================================================================
// WELCOME SCREEN CHIPS
// =====================================================================
const WELCOME_CHIPS = [
  { icon: "👑", label: "What are today's Chef Specials?", text: "What are today's Chef Specials?" },
  { icon: "🌶️", label: "Spicy non-veg starters", text: "Show me spicy non-veg starters" },
  { icon: "🥗", label: "Best vegetarian options", text: "What are best vegetarian options?" },
  { icon: "🥟", label: "Craving crispy & fried", text: "I'm craving something crispy & fried" },
  { icon: "💰", label: "Meal under ₹500", text: "Recommend a meal under ₹500" },
  { icon: "👨‍👩‍👧‍👦", label: "Party of 4 feast", text: "We are a party of 4, what should we order?" },
  { icon: "🥤", label: "Drinks for Biryani", text: "What drinks go well with Biryani?" },
  { icon: "🍨", label: "Sweet desserts", text: "What desserts do you have?" },
  { icon: "⭐", label: "Top-rated bestsellers", text: "Show me your top-rated bestsellers" },
  { icon: "⚡", label: "Fast preparation dishes", text: "What's the fastest dish to prepare?" },
];

// =====================================================================
// CHAT PANE
// =====================================================================
function ChatPane({
  language, setLanguage, tone, setTone,
  messages, streaming, scrollRef, input, setInput, sendText, onTapChip,
  onCheckout
}: {
  language: Lang; setLanguage: (l: Lang) => void;
  tone: Tone; setTone: (t: Tone) => void;
  messages: any[];
  streaming: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  input: string;
  setInput: (v: string) => void;
  sendText: (t?: string) => void;
  onTapChip: (it: MenuItem) => void;
  onCheckout: () => void;
}) {
  const cart = useCart();
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const handleAddWithFeedback = (item: MenuItem) => {
    onTapChip(item);
    setAddedIds(prev => ({ ...prev, [item.id || item.name]: true }));
    setTimeout(() => {
      setAddedIds(prev => ({ ...prev, [item.id || item.name]: false }));
    }, 2000);
  };

  const isOnlyGreeting = messages.length === 1 && messages[0].role === "assistant";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#FAF5EC] text-[#1A1106]" data-testid="ai-chat-pane">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4" data-testid="ai-waiter-messages">
        {messages.map((m, idx) => (
          <div key={m.id || idx} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 font-editorial italic text-[15px] leading-relaxed shadow-sm ${
                m.role === "user"
                  ? "bg-gradient-to-r from-[#5C0E1B] to-[#7A1525] text-[#FAF5EC] rounded-br-sm"
                  : "bg-white text-[#1A1106] rounded-bl-sm border border-brand-secondary/30 shadow-md"
              }`}
              data-testid={`msg-${m.role}-${idx}`}
            >
              {m.content || (streaming && idx === messages.length - 1 ? <span className="opacity-60">…</span> : "")}
              {streaming && idx === messages.length - 1 && m.role === "assistant" && m.content && (
                <span className="ml-1.5 inline-block w-2 h-4 bg-[#5C0E1B] align-middle animate-pulse" />
              )}
            </div>

            {/* Rich Recommendation Cards */}
            {m.recs && m.recs.length > 0 && (
              <div className="mt-3 w-full space-y-2.5 pl-2 border-l-2 border-[#DDB85C]">
                <div className="font-royal text-[10px] tracking-widest uppercase text-[#8A6A1B] font-bold">Recommended Dishes</div>
                <div className="grid grid-cols-1 gap-2.5">
                  {m.recs.map((r: MenuItem, rIdx: number) => {
                    const isAdded = addedIds[r.id || r.name];
                    return (
                      <div key={r.id || rIdx} className="bg-white border border-brand-secondary/40 rounded-xl p-3 shadow-sm hover:shadow-md transition flex items-center justify-between gap-3 group">
                        <ItemImage src={r.image_url} alt={r.name} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-royal font-bold text-[14px] text-[#5C0E1B] truncate">{r.name}</span>
                            {r.tags && r.tags.includes("bestseller") && (
                              <span className="text-[9px] bg-[#DDB85C]/30 text-[#8A6A1B] px-1.5 py-0.5 rounded font-royal uppercase tracking-wider font-semibold">Bestseller</span>
                            )}
                          </div>
                          <p className="font-editorial italic text-[12px] text-gray-600 line-clamp-1 mt-0.5">{r.description || r.category}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] font-sans text-gray-500">
                            <span className="font-royal font-bold text-[#5C0E1B] text-sm">{formatCurrency(r.price)}</span>
                            {r.prep_time_min ? (
                              <span className="flex items-center gap-0.5"><Clock className="w-3 h-3 text-[#8A6A1B]" /> {r.prep_time_min}m</span>
                            ) : null}
                            {r.rating ? (
                              <span className="flex items-center gap-0.5 text-amber-600 font-semibold"><Star className="w-3 h-3 fill-amber-400 text-amber-500" /> {r.rating}</span>
                            ) : null}
                            {r.spice_level ? (
                              <span title={`Spice level ${r.spice_level}/3`}>{"🌶️".repeat(r.spice_level)}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => handleAddWithFeedback(r)}
                            disabled={isAdded}
                            className={`px-3 py-1.5 rounded-lg font-royal text-[11px] tracking-wider uppercase font-bold transition flex items-center justify-center gap-1 shadow-sm ${
                              isAdded
                                ? "bg-emerald-600 text-white"
                                : "bg-[#5C0E1B] text-[#FAF5EC] hover:bg-[#7A1525]"
                            }`}
                          >
                            {isAdded ? <Check className="w-3.5 h-3.5 animate-bounce" /> : <Plus className="w-3.5 h-3.5" />}
                            {isAdded ? "Added" : "Add"}
                          </button>
                          <button
                            onClick={() => sendText(`Modify ${r.name}: `)}
                            className="text-[10px] font-editorial italic text-gray-500 hover:text-[#5C0E1B] underline text-center"
                          >
                            Customize
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dynamic Quick Reply Chips */}
            {m.quick_replies && m.quick_replies.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 pl-2">
                {m.quick_replies.map((qr: string, qIdx: number) => (
                  <button
                    key={qIdx}
                    onClick={() => sendText(qr)}
                    disabled={streaming}
                    className="bg-white/80 hover:bg-white border border-[#DDB85C] hover:border-[#5C0E1B] text-[#5C0E1B] px-3 py-1 rounded-full text-[11px] font-royal tracking-wide transition shadow-xs flex items-center gap-1 disabled:opacity-50"
                  >
                    <span>✨</span> {qr}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Welcome Screen Suggestion Grid when fresh */}
        {isOnlyGreeting && (
          <div className="pt-2 pb-4 animate-in fade-in duration-300">
            <div className="text-center mb-3">
              <span className="font-royal text-[11px] tracking-[0.2em] uppercase text-[#8A6A1B] bg-[#F3EBD8] px-3 py-1 rounded-full border border-[#DDB85C]/40">
                How can I help you today?
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {WELCOME_CHIPS.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => sendText(chip.text)}
                  disabled={streaming}
                  className="bg-white/90 hover:bg-white border border-brand-secondary/30 hover:border-[#5C0E1B] p-2.5 rounded-xl text-left transition shadow-xs hover:shadow-md flex items-start gap-2 group disabled:opacity-50"
                >
                  <span className="text-lg shrink-0 group-hover:scale-110 transition-transform">{chip.icon}</span>
                  <span className="font-editorial italic text-[12px] text-[#1A1106] group-hover:text-[#5C0E1B] leading-tight line-clamp-2">
                    {chip.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Cart Preview Banner inside waiter panel */}
      {cart.count() > 0 && (
        <div className="mx-4 mb-2 p-3 bg-gradient-to-r from-[#5C0E1B] to-[#7A1525] text-white rounded-xl shadow-lg flex items-center justify-between border border-[#DDB85C]/40 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#DDB85C] text-[#1A1106] p-2 rounded-lg font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="font-royal text-[11px] tracking-wider uppercase text-[#DDB85C]">Your Dining Tray</div>
              <div className="font-editorial text-sm font-bold">{cart.count()} items • {formatCurrency(cart.subtotal())}</div>
            </div>
          </div>
          <button
            onClick={onCheckout}
            className="bg-[#DDB85C] hover:bg-[#c9a348] text-[#1A1106] px-4 py-2 rounded-lg font-royal text-xs uppercase font-extrabold tracking-wider transition flex items-center gap-1 shadow-sm"
          >
            <span>Checkout</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="px-4 pb-4 pt-2 bg-[#FAF5EC] border-t border-[#E7DFCB]">
        <div className="flex items-center gap-2 bg-white rounded-full border border-brand-secondary/50 p-1.5 focus-within:border-[#5C0E1B] shadow-sm">
          <input
            data-testid="ai-waiter-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendText(input)}
            placeholder="Ask for recommendations, specials, or add dishes…"
            disabled={streaming}
            className="flex-1 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-gray-400 text-[#1A1106] font-editorial italic"
          />
          <button
            data-testid="ai-waiter-send"
            onClick={() => sendText(input)}
            aria-label="Send message"
            disabled={streaming || !(input || "").trim()}
            className="h-10 w-10 rounded-full bg-gradient-to-r from-[#5C0E1B] to-[#7A1525] hover:from-[#7A1525] hover:to-[#5C0E1B] text-white flex items-center justify-center disabled:opacity-40 transition shadow-md"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// VOICE PANE
// =====================================================================
function VoicePane({
  messages, streaming, scrollRef, onAdd, recording, voiceProcessing, startRecording, stopRecording, ttsPlaying
}: {
  messages: any[]; streaming: boolean; scrollRef: React.RefObject<HTMLDivElement>;
  onAdd: (it: MenuItem) => void;
  recording: boolean; voiceProcessing: boolean;
  startRecording: () => void; stopRecording: () => void;
  ttsPlaying: boolean;
}) {
  const params = useParams();
  const slug = params?.slug as string;
  const { config: voiceConfig } = useRestaurantConfig();
  const aiName = voiceConfig?.ai_waiter?.name || "AI Waiter";

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#FAF5EC]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4" data-testid="ai-waiter-messages-voice">
        {messages.slice(-4).map((m, idx) => (
          <div key={m.id || idx} className="space-y-2 animate-in fade-in duration-200">
            <div className={`max-w-[88%] ${m.role === "user" ? "ml-auto" : ""} rounded-2xl px-4 py-3 font-editorial italic text-[15px] leading-relaxed shadow-sm ${
              m.role === "user" ? "bg-gradient-to-r from-[#5C0E1B] to-[#7A1525] text-[#FAF5EC] rounded-br-sm" : "bg-white text-[#1A1106] rounded-bl-sm border border-brand-secondary/30 shadow-md"
            }`}>
              {m.content || (streaming && idx === messages.length - 1 ? "…" : "")}
            </div>
            {m.recs && m.recs.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1" data-testid={`voice-recs-${m.id}`}>
                {m.recs.map((r: MenuItem, rIdx: number) => (
                  <button
                    key={r.id || rIdx}
                    data-testid={`voice-rec-add-${r.id}`}
                    onClick={() => onAdd(r)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#DDB85C] px-3.5 py-1.5 text-[11px] font-royal tracking-wider uppercase text-[#5C0E1B] hover:bg-[#5C0E1B] hover:text-[#FAF5EC] transition shadow-xs font-bold"
                  >
                    <Plus className="h-3 w-3" /> {r.name} • {formatCurrency(r.price)}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-6 border-t border-[#E7DFCB] bg-gradient-to-b from-[#FAF5EC] to-[#F3EBD8]">
        <div className="flex flex-col items-center gap-4" data-testid="ai-voice-controls">
          {/* Animated Waveform / Speaking Feedback */}
          <div className="h-8 flex items-center justify-center gap-1.5">
            {recording || ttsPlaying || streaming ? (
              <>
                <div className="mehfil-wave-bar" />
                <div className="mehfil-wave-bar" />
                <div className="mehfil-wave-bar" />
                <div className="mehfil-wave-bar" />
                <div className="mehfil-wave-bar" />
              </>
            ) : (
              <div className="font-royal text-[11px] tracking-[0.2em] uppercase text-gray-400">Ready to listen</div>
            )}
          </div>

          <button
            data-testid={recording ? "ai-voice-stop" : "ai-voice-start"}
            onClick={recording ? stopRecording : startRecording}
            disabled={voiceProcessing || streaming}
            className={`h-14 w-14 rounded-full flex items-center justify-center shadow-xl transition-all border-2 ${
              recording
                ? "bg-gradient-to-br from-[#5C0E1B] to-[#921E2F] border-red-300 scale-105 animate-pulse"
                : "bg-gradient-to-br from-[#DDB85C] to-[#8A6A1B] border-[#FAF5EC] hover:scale-105"
            } disabled:opacity-50`}
          >
            {voiceProcessing || streaming ? <Loader2 className="h-6 w-6 animate-spin text-white" /> :
              recording ? <Square className="h-5 w-5 text-white fill-current" /> :
              <Mic className="h-6 w-6 text-[#1A1106]" />}
          </button>

          <div className="text-center space-y-1">
            <div className="font-royal tracking-[0.2em] uppercase text-xs font-bold text-[#5C0E1B]">
              {voiceProcessing ? "Transcribing your order…" : recording ? "Listening… speak naturally" : streaming ? `${aiName} is replying…` : `Tap & speak to ${aiName}`}
            </div>
            <div className="font-editorial italic text-xs text-gray-500 max-w-xs text-center">
              Try: &ldquo;We are 4 people, recommend spicy mutton biryani under 1500 rupees&rdquo;
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
