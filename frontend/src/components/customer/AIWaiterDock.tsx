// @ts-nocheck
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Send, X, Loader2, Mic, MessageSquare, BookOpen, Plus, Minus, Square, Volume2, VolumeX, ArrowRight } from "lucide-react";
import { useRouter , useParams} from "next/navigation";
import Link from "next/link";
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
import { sortCategories } from "@/utils/categoryOrder";

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

export function AIWaiterDock() {
  const params = useParams();
  const slug = params?.slug as string;
  const { config: restaurantConfig } = useRestaurantConfig();
  const restaurantName = restaurantConfig?.name || "this restaurant";

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const vadCtxRef = useRef<AudioContext | null>(null);
  const vadStreamRef = useRef<MediaStream | null>(null);
  const hasGreetedRef = useRef(false);
  const cart = useCart();
  const { session } = useTable();
  const router = useRouter();

  // Draggable AI Waiter button state
  const [dockPos, setDockPos] = useState({ x: -1, y: -1 }); // -1 = use CSS default
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0, moved: false });

  useEffect(() => {
    // Initialize position to bottom-right on mount
    if (dockPos.x === -1) {
      setDockPos({ x: window.innerWidth - 200, y: window.innerHeight - 80 });
    }
  }, [dockPos.x]);

  const handleDragStart = (clientX: number, clientY: number) => {
    dragRef.current = { dragging: true, startX: clientX, startY: clientY, startPosX: dockPos.x, startPosY: dockPos.y, moved: false };
  };
  const handleDragMove = (clientX: number, clientY: number) => {
    if (!dragRef.current.dragging) return;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragRef.current.moved = true;
    if (!dragRef.current.moved) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 180, dragRef.current.startPosX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - 56, dragRef.current.startPosY + dy));
    setDockPos({ x: newX, y: newY });
  };
  const handleDragEnd = () => {
    const wasDrag = dragRef.current.moved;
    dragRef.current.dragging = false;
    dragRef.current.moved = false;
    if (!wasDrag) setOpen(true); // tap = open
  };

  const { data: menuData } = useQuery({
    queryKey: ["menu", restaurantConfig?.id],
    queryFn: () => api<{ items: MenuItem[] }>(`/api/menu?restaurant_id=${restaurantConfig?.id || ""}`),
    enabled: Boolean(restaurantConfig?.id),
    staleTime: 30_000,
  });
  const menu = useMemo(() => (menuData?.items ?? []).filter((i) => i.available !== false), [menuData]);
  const workletNodeRef = useRef<any>(null);

  const menuByName = useMemo(() => {
    const m = new Map<string, MenuItem>();
    for (const it of menu) m.set(it.name.toLowerCase(), it);
    return m;
  }, [menu]);

  const resolveRecs = useCallback((names: string[]): MenuItem[] => {
    const out: MenuItem[] = [];
    const seen = new Set<string>();
    for (const n of names) {
      const k = n.toLowerCase();
      let hit = menuByName.get(k);
      if (!hit) hit = menu.find((it) => it.name.toLowerCase().includes(k) || k.includes(it.name.toLowerCase()));
      if (hit && !seen.has(hit.id)) { seen.add(hit.id); out.push(hit); }
    }
    return out.slice(0, 4);
  }, [menu, menuByName]);

  // Default suggestion chips when conversation is fresh — picks 3 popular dishes
  const defaultRecChips = useMemo(() => {
    const bestsellers = menu.filter((m) => m.tags?.includes("bestseller"));
    const pool = bestsellers.length >= 3 ? bestsellers : menu;
    return pool.slice(0, 3);
  }, [menu]);

  const handleOrderUpdate = useCallback((orderData: any) => {
    // When the backend AI updates the order, we want to resync our local cart state.
    // We can just rely on the API polling, or directly mutate the cart.
    // For simplicity, we'll let the user see the visual toast and the cart poll will pick it up.
    toast.success("Order updated by AI Waiter!");
  }, []);

  const { messages, input, setInput, append, sendAudio, startVoice, stopVoice, isLoading: streaming } = useAIWaiter({
    restaurantId: restaurantConfig?.id || "",
    onOrderUpdate: handleOrderUpdate
  });


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
      void speakText(`Namaste! I'm your AI Waiter here at ${restaurantName}. I can help you explore the menu, recommend dishes based on your cravings, or add items to your cart. Feel free to type or tap the microphone to speak with me!`);
    }
  }, [open, mode]);

  const speakText = useCallback(async (text: string) => {
    if (!ttsOn || !text) return;
    try {
      const token = useSession.getState().token;
      const res = await fetch(apiUrl("/api/ai-waiter/speak"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ text, voice: "nova" }),
      });
      if (!res.ok) throw new Error(`TTS ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (ttsAudioRef.current) ttsAudioRef.current.pause();
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      setTtsPlaying(true);
      audio.play().catch((err) => {
        console.warn("[ai-waiter] TTS playback blocked:", err);
        setTtsPlaying(false);
      });
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setTtsPlaying(false);
      };
    } catch (e) {
      console.warn("[ai-waiter] TTS failed:", e);
      setTtsPlaying(false);
    }
  }, [ttsOn]);

  const sendText = useCallback((text?: string) => {
    const normalized = typeof text === "string" ? text.trim() : "";
    if (!normalized || streaming) return;
    append({ role: "user", content: normalized });
  }, [append, streaming]);

  // Update vadPausedRef whenever state changes
  useEffect(() => {
    vadPausedRef.current = !open || mode !== "voice" || streaming || voiceProcessing || ttsPlaying;
  }, [open, mode, streaming, voiceProcessing, ttsPlaying]);

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

    const recognition = new SpeechRecognition();
    (window as any).activeSpeechRec = recognition;
    recognition.continuous = true;
    recognition.interimResults = false;
    
    // Map language
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
        try { recognition.start(); } catch (e) {} // Auto-restart if still in voice mode
      }
    };
    
    // Start initial recognition
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

  // Pause recognition when TTS or streaming is active
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

  const addToTray = (it: MenuItem) => { 
    cart.add(it); 
    sendText(`I have added ${it.name} to my cart.`);
  };

  // Get the most recent recommendations across messages — used to show chips above input
  const latestRecs = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].recs && messages[i].recs!.length > 0) return messages[i].recs!;
    }
    return [] as MenuItem[];
  }, [messages]);

  const trayChips = latestRecs.length > 0 ? latestRecs : defaultRecChips;

  const dynamicPrompts = useMemo(() => {
    const items = cart.items || [];
    if (items.length === 0) {
      return [
        "What's your signature dish?",
        "Suggest a starter",
        "Build me a meal for 2",
        "Something not too spicy",
      ];
    }
    
    const hasStarter = items.some(i => {
        const cat = i.category?.toLowerCase() || "";
        return cat.includes('starter') || cat.includes('soup') || cat.includes('appetizer');
    });
    const hasMain = items.some(i => {
        const cat = i.category?.toLowerCase() || "";
        return cat.includes('main') || cat.includes('biryani') || cat.includes('curry') || cat.includes('bread');
    });
    const hasDessert = items.some(i => {
        const cat = i.category?.toLowerCase() || "";
        return cat.includes('dessert') || cat.includes('sweet') || cat.includes('ice');
    });

    if (hasMain && !hasDessert) {
       return [
         "Suggest a dessert",
         "Add a refreshing drink",
         "What's popular for sweets?",
         "That's all, bill please"
       ];
    }
    if (hasStarter && !hasMain) {
       return [
         "Suggest a main course",
         `What goes well with ${items[0].name}?`,
         "Add a refreshing drink",
         "That's all, bill please"
       ];
    }
    
    return [
      `What goes well with ${items[items.length - 1].name}?`,
      "Suggest a dessert",
      "Add a refreshing drink",
      "That's all, bill please",
    ];
  }, [cart.items]);

  return (
    <>
      {!open && (
        <div className="fixed bottom-6 right-4 md:right-8 z-50 flex flex-col items-end">
          <button
            type="button"
            aria-label={`Open AI Waiter`}
            data-testid="ai-waiter-dock-btn"
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 bg-brand-primary text-white px-6 py-4 rounded-full shadow-2xl hover:shadow-[#5C0E1B]/50 hover:scale-105 transition-all group"
          >
            <Mic className="w-5 h-5 group-hover:text-brand-secondary transition-colors" />
            <span className="font-royal text-[12px] tracking-widest uppercase font-bold pr-1">AI Waiter</span>
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6" data-testid="ai-waiter-panel">
          <button type="button" aria-label="Close AI Waiter" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="ai-waiter-title" className="relative z-10 w-full sm:w-[460px] sm:max-w-md h-[90vh] sm:h-[680px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border bg-[#FAF5EC] border-brand-secondary/40">
            {/* Header */}
            <header className="px-5 py-4 flex items-center justify-between border-b mehfil-royal-bg text-[#FAF5EC] border-brand-secondary/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#DDB85C] to-[#8A6A1B] flex items-center justify-center shadow-md">
                  <Sparkles className="h-5 w-5 text-[#5C0E1B]" />
                </div>
                <div>
                  <div id="ai-waiter-title" className="font-royal tracking-wider uppercase text-sm">{restaurantConfig?.ai_waiter?.name || "AI"} Concierge</div>
                  <div className="font-editorial italic text-[10px] text-[#FAF5EC]/80">Your personal sommelier · live</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button aria-label={ttsOn ? "Mute AI voice" : "Unmute AI voice"} data-testid="ai-tts-toggle" onClick={() => setTtsOn((v) => !v)} title={ttsOn ? "Mute voice" : "Unmute voice"} className="h-11 w-11 rounded-full hover:bg-brand-secondary/15 flex items-center justify-center text-brand-secondary">
                  {ttsOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <button aria-label="Close AI Waiter" data-testid="ai-waiter-close" onClick={() => setOpen(false)} className="h-11 w-11 rounded-full hover:bg-brand-secondary/15 flex items-center justify-center text-[#FAF5EC]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {/* Mode tabs */}
            <div className="flex border-b bg-[#FAF5EC] border-[#E7DFCB]" data-testid="ai-mode-tabs">
              {([
                { k: "chat", label: "Chat", icon: MessageSquare },
                { k: "voice", label: "Talk", icon: Mic },
              ] as { k: Mode; label: string; icon: typeof MessageSquare }[]).map((t) => {
                const active = mode === t.k;
                return (
                  <button
                    key={t.k}
                    data-testid={`ai-mode-${t.k}`}
                    aria-pressed={active}
                    onClick={() => setMode(t.k)}
                    className={`flex-1 py-3 text-[11px] font-royal tracking-[0.2em] uppercase border-b-2 transition flex items-center justify-center gap-1.5 ${
                      active
                        ? "border-brand-primary text-brand-primary bg-[#F3EBD8]"
                        : "border-transparent text-[#1A1106]/60 hover:text-brand-primary"
                    }`}
                  >
                    <t.icon className="h-3.5 w-3.5" /> {t.label}
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
                trayChips={trayChips}
                onTapChip={(m) => { cart.add(m); toast.success(`${m.name} added to your tray`); }}
                dynamicPrompts={dynamicPrompts}
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
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

// =====================================================================
// =====================================================================
// CHAT PANE — Mehfil cream/maroon (consistent with rest of customer site)
// =====================================================================
function ChatPane({
  language, setLanguage, tone, setTone,
  messages, streaming, scrollRef, input, setInput, sendText, trayChips, onTapChip,
  dynamicPrompts, onCheckout
}: {
  language: Lang; setLanguage: (l: Lang) => void;
  tone: Tone; setTone: (t: Tone) => void;
  messages: any[];
  streaming: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  input: string;
  setInput: (v: string) => void;
  sendText: (t?: string) => void;
  trayChips: MenuItem[];
  onTapChip: (it: MenuItem) => void;
  dynamicPrompts: string[];
  onCheckout: () => void;
}) {
  const cart = useCart();
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#FAF5EC] text-[#1A1106]" data-testid="ai-chat-pane">
      {/* Tone + Language selectors */}
      <div className="px-4 pt-3 flex items-center gap-2 border-b border-[#E7DFCB] pb-3" data-testid="chat-controls">
        <div className="flex-1 grid grid-cols-2 gap-2">
          <select
            data-testid="chat-tone-select"
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className="bg-white text-brand-primary text-[11px] font-royal tracking-[0.15em] uppercase border border-brand-secondary/40 rounded-full px-3 py-1.5 outline-none cursor-pointer focus:border-brand-primary"
          >
            {TONES.map((t) => <option key={t.code} value={t.code} className="bg-white text-[#1A1106]">{t.label}</option>)}
          </select>
          <select
            data-testid="chat-language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Lang)}
            className="bg-white text-brand-primary text-[11px] font-royal tracking-[0.15em] uppercase border border-brand-secondary/40 rounded-full px-3 py-1.5 outline-none cursor-pointer focus:border-brand-primary"
          >
            {LANGS.map((l) => <option key={l.code} value={l.code} className="bg-white text-[#1A1106]">{l.label}</option>)}
          </select>
        </div>
      </div>

      {/* Your tray ribbon */}
      <div className="px-5 pt-3 pb-3 border-b border-[#E7DFCB] flex items-center justify-between bg-[#F3EBD8]/60" data-testid="chat-tray-ribbon">
        <div>
          <div className="font-royal tracking-[0.3em] uppercase text-[10px] text-[#8A6A1B]">Your tray</div>
          <div className="font-editorial italic text-[11px] text-[#1A1106]/65 mt-1">
            {cart.count() === 0 ? "Nothing yet — say \u201Cadd the mutton biryani\u201D or tap a chip below." : `${cart.count()} item${cart.count() > 1 ? "s" : ""} · ${formatCurrency(cart.subtotal())}`}
          </div>
        </div>
        <div className="text-right">
          <div className="font-royal text-brand-primary text-sm" data-testid="chat-tray-total">{cart.count()} · {formatCurrency(cart.subtotal())}</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3" data-testid="ai-waiter-messages">
        {messages.map((m, idx) => (
          <div key={m.id} className={`max-w-[88%] ${m.role === "user" ? "ml-auto" : ""}`}>
            <div
              className={`rounded-2xl px-4 py-3 font-editorial italic text-[15px] leading-relaxed shadow-sm ${
                m.role === "user"
                  ? "bg-brand-primary text-[#FAF5EC] rounded-br-sm"
                  : "bg-white text-[#1A1106] rounded-bl-sm border border-brand-secondary/25"
              }`}
              data-testid={`msg-${m.role}-${idx}`}
            >
              {m.content || (streaming && idx === messages.length - 1 ? <span className="opacity-60">…</span> : "")}
              {streaming && idx === messages.length - 1 && m.role === "assistant" && m.content && (
                <span className="ml-1 inline-block w-1.5 h-4 bg-brand-primary align-middle animate-pulse" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Suggestion chips */}
      <div className="border-t border-[#E7DFCB] px-5 pt-3 pb-2 space-y-2 bg-[#FAF5EC]" data-testid="chat-chips">
        {trayChips.length > 0 && (
          <div className="flex flex-wrap gap-2" data-testid="chat-tap-and-order-chips">
            {trayChips.map((r) => (
              <button
                key={r.id}
                data-testid={`chip-tap-add-${r.id}`}
                onClick={() => onTapChip(r)}
                className="group inline-flex items-center gap-1.5 rounded-full bg-white border border-brand-primary/40 px-3.5 py-1.5 text-[10px] font-royal tracking-[0.18em] uppercase text-brand-primary hover:bg-brand-primary hover:text-[#FAF5EC] hover:border-brand-primary transition"
              >
                <Plus className="h-3 w-3" /> {r.name}
                <span className="opacity-70 normal-case font-editorial italic text-[10px] tracking-normal ml-1">{formatCurrency(r.price)}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {dynamicPrompts.map((q) => (
            <button
              key={q}
              data-testid={`chip-quick-${q.replace(/\W+/g, "-").toLowerCase()}`}
              onClick={() => sendText(q)}
              disabled={streaming}
              className="rounded-full border border-brand-secondary/50 px-3.5 py-1.5 text-[10px] font-royal tracking-[0.18em] uppercase text-[#8A6A1B] hover:border-brand-primary hover:text-brand-primary hover:bg-white transition disabled:opacity-40"
            >
              {q}
            </button>
          ))}
          {cart.count() > 0 && (
            <button
              onClick={onCheckout}
              data-testid="chip-checkout"
              className="inline-flex items-center gap-1.5 rounded-full mehfil-btn-gold px-4 py-1.5 text-[10px] font-royal tracking-[0.18em] uppercase cursor-pointer"
            >
              <ArrowRight className="h-3 w-3" /> Checkout
            </button>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="px-4 pb-4 pt-2 bg-[#FAF5EC] border-t border-[#E7DFCB]">
        <div className="flex items-center gap-2 bg-white rounded-full border border-brand-secondary/40 p-1.5 focus-within:border-brand-primary">
          <input
            data-testid="ai-waiter-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendText(input)}
            placeholder="Ask in any language…"
            disabled={streaming}
            className="flex-1 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-[#1A1106]/40 text-[#1A1106] font-editorial italic"
          />
          <button
            data-testid="ai-waiter-send"
            onClick={() => sendText(input)}
            aria-label="Send message"
            disabled={streaming || !(input || "").trim()}
            className="h-9 w-9 rounded-full mehfil-btn-royal flex items-center justify-center disabled:opacity-40"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// VOICE PANE — recommendation cards still appear after voice replies
// =====================================================================
function VoicePane({
  messages, streaming, scrollRef, onAdd, recording, voiceProcessing, startRecording, stopRecording,
}: {
  messages: any[]; streaming: boolean; scrollRef: React.RefObject<HTMLDivElement>;
  onAdd: (it: MenuItem) => void;
  recording: boolean; voiceProcessing: boolean;
  startRecording: () => void; stopRecording: () => void;
}) {
  const params = useParams();
  const slug = params?.slug as string;
  const { config: voiceConfig } = useRestaurantConfig();
  const aiName = voiceConfig?.ai_waiter?.name || "AI";
  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3" data-testid="ai-waiter-messages-voice">
        {messages.map((m, idx) => (
          <div key={m.id} className="space-y-2">
            <div className={`max-w-[88%] ${m.role === "user" ? "ml-auto" : ""} rounded-2xl px-4 py-3 font-editorial italic text-[15px] leading-relaxed ${
              m.role === "user" ? "bg-brand-primary text-[#FAF5EC] rounded-br-sm" : "bg-white text-[#1A1106] rounded-bl-sm border border-brand-secondary/20"
            }`}>
              {m.content || (streaming && idx === messages.length - 1 ? "…" : "")}
            </div>
            {m.recs && m.recs.length > 0 && (
              <div className="flex flex-wrap gap-2" data-testid={`voice-recs-${m.id}`}>
                {m.recs.map((r) => (
                  <button
                    key={r.id}
                    data-testid={`voice-rec-add-${r.id}`}
                    onClick={() => onAdd(r)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white border border-brand-secondary/40 px-3 py-1.5 text-[10px] font-royal tracking-[0.18em] uppercase text-brand-primary hover:bg-brand-primary hover:text-[#FAF5EC] transition"
                  >
                    <Plus className="h-3 w-3" /> {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="p-5 border-t border-[#E7DFCB] bg-[#FAF5EC]">
        <div className="flex flex-col items-center gap-2" data-testid="ai-voice-controls">
          <button
            data-testid={recording ? "ai-voice-stop" : "ai-voice-start"}
            onClick={recording ? stopRecording : startRecording}
            disabled={voiceProcessing || streaming}
            className={`h-16 w-16 rounded-full flex items-center justify-center shadow-2xl transition-all ${
              recording ? "bg-brand-primary mehfil-glow" : "mehfil-btn-gold"
            } disabled:opacity-50`}
          >
            {voiceProcessing || streaming ? <Loader2 className="h-6 w-6 animate-spin text-[#FAF5EC]" /> :
              recording ? <Square className="h-6 w-6 text-[#FAF5EC] fill-current" /> :
              <Mic className="h-7 w-7 text-[#1A1106]" />}
          </button>
          <div className="font-royal tracking-[0.2em] uppercase text-[10px] text-brand-primary">
            {voiceProcessing ? "Transcribing…" : recording ? "Listening… tap to send" : streaming ? `${aiName} is thinking…` : `Tap & speak to ${aiName}`}
          </div>
          <div className="font-editorial italic text-[10px] text-[#1A1106]/50 text-center px-4">Try: &ldquo;Spicy biryani for two with a sweet finish&rdquo;</div>
        </div>
      </div>
    </>
  );
}

// =====================================================================
// EXPLORE PANE — list with qty controls when item is in cart
// =====================================================================
function ExploreList({ menu }: { menu: MenuItem[] }) {
  const cart = useCart();
  const [q, setQ] = useState("");
  const categories = useMemo(() => ["All", ...sortCategories(Array.from(new Set(menu.map((m) => m.category))))], [menu]);
  const [cat, setCat] = useState<string>("All");
  
  const filtered = menu.filter((m) =>
    (!q.trim() || (m.name || "").toLowerCase().includes(q.toLowerCase()) || (m.description || "").toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="ai-explore">
      <div className="p-3 border-b border-[#E7DFCB] bg-[#FAF5EC]">
        <input
          data-testid="ai-explore-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the menu…"
          className="w-full bg-white border border-brand-secondary/30 rounded-full px-4 py-2 text-sm outline-none font-editorial italic"
        />
        <div className="flex gap-1.5 overflow-x-auto mt-2 -mx-1 px-1 pb-1 custom-scrollbar">
          {categories.map((c) => (
            <button
              key={c}
              data-testid={`ai-explore-cat-${c}`}
              onClick={() => setCat(c)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-royal tracking-wider uppercase border transition ${
                cat === c ? "bg-[#5C0E1B] text-[#FAF5EC] border-[#5C0E1B]" : "bg-white text-brand-primary border-brand-secondary/30"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-[#FAF5EC]">
        {categories.filter(c => c !== "All").map(c => {
           if (cat !== "All" && cat !== c) return null;
           const catItems = filtered.filter(m => m.category === c);
           if (catItems.length === 0) return null;
           
           return (
             <div key={c} className="mb-6 last:mb-2">
               <h3 className="font-royal text-lg text-brand-primary mb-3 border-b border-brand-secondary/30 pb-1">{c}</h3>
               <div className="space-y-3">
                 {catItems.map(m => {
                   const line = cart.items.find((i) => i.item_id === m.id);
                   return (
                     <div key={m.id} className="flex items-center gap-3 bg-white border border-brand-secondary/20 rounded-lg p-2.5 shadow-sm" data-testid={`ai-explore-item-${m.id}`}>
                       <div className="h-16 w-16 rounded-md bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${m.image_url})` }} />
                       <div className="flex-1 min-w-0">
                         <div className="font-royal text-[13px] text-brand-primary leading-tight line-clamp-1">{m.name}</div>
                         <div className="font-editorial italic text-[11px] text-[#1A1106]/60 line-clamp-1 mt-0.5">{m.description}</div>
                         <div className="font-royal text-xs text-brand-primary mt-1">{formatCurrency(m.price)}</div>
                       </div>
                       {line ? (
                         <div className="flex items-center gap-1 bg-[#5C0E1B] text-[#FAF5EC] rounded-full p-1 shadow shrink-0" data-testid={`ai-explore-qty-${m.id}`}>
                           <button
                             data-testid={`ai-explore-dec-${m.id}`}
                             onClick={() => cart.setQty(m.id, line.qty - 1)}
                             className="h-6 w-6 rounded-full hover:bg-brand-secondary flex items-center justify-center"
                           >
                             <Minus className="h-3 w-3" />
                           </button>
                           <span className="px-1 w-4 text-center font-royal text-sm font-semibold" data-testid={`ai-explore-qty-val-${m.id}`}>{line.qty}</span>
                           <button
                             data-testid={`ai-explore-inc-${m.id}`}
                             onClick={() => cart.setQty(m.id, line.qty + 1)}
                             className="h-6 w-6 rounded-full hover:bg-brand-secondary flex items-center justify-center"
                           >
                             <Plus className="h-3 w-3" />
                           </button>
                         </div>
                       ) : (
                         <button
                           data-testid={`ai-explore-add-${m.id}`}
                           onClick={() => { cart.add(m); toast.success(`${m.name} added to your tray`); }}
                           className="bg-[#5C0E1B] text-white hover:bg-brand-primary rounded px-3 py-1.5 text-[9px] font-royal font-bold uppercase transition shadow-sm border border-[#5C0E1B] shrink-0"
                           title="Tap to add"
                         >
                           Add
                         </button>
                       )}
                     </div>
                   );
                 })}
               </div>
             </div>
           );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-10 font-editorial italic text-[#1A1106]/50 text-sm">No matches found.</div>
        )}
      </div>
    </div>
  );
}
