"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Send, X, Loader2, Mic, MessageSquare, BookOpen, Plus, Minus, Square, Volume2, VolumeX, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { MenuItem } from "@/types";

type Mode = "explore" | "chat" | "voice";
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

interface Msg { id: string; role: "user" | "assistant"; content: string; recs?: MenuItem[] }

function makeId(): string { return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function getSessionId(): string {
  if (typeof window === "undefined") return "anon";
  let sid = localStorage.getItem("mehfil_ai_session");
  if (!sid) {
    sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem("mehfil_ai_session", sid);
  }
  return sid;
}

const INITIAL_GREETING: Msg = {
  id: "greeting",
  role: "assistant",
  content: "Welcome to Mehfil Exclusive! 🙏 I'm your personal waiter tonight. Tell me what you're craving — veg, non-veg, something spicy? Or just say 'surprise me' and I'll curate a perfect meal for you!",
};



function parseSseChunk(buffer: string): { payloads: { delta?: string; error?: string; done?: boolean }[]; rest: string } {
  const lines = buffer.split("\n\n");
  const rest = lines.pop() || "";
  const payloads: { delta?: string; error?: string; done?: boolean }[] = [];
  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    try {
      payloads.push(JSON.parse(line.slice(5).trim()));
    } catch (err) {
      // SSE frames can arrive mid-flush; log so we can debug if it keeps happening
      console.warn("[ai-waiter] dropped malformed SSE payload", err);
    }
  }
  return { payloads, rest };
}

function extractRecommendations(content: string): { clean: string; names: string[] } {
  const m = content.match(/<recommend>([^<]*)<\/recommend>\s*$/i);
  if (!m) return { clean: content, names: [] };
  const names = m[1].split("|").map((s) => s.trim()).filter(Boolean);
  return { clean: content.slice(0, m.index).trim(), names };
}

export function AIWaiterDock() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [language, setLanguage] = useState<Lang>("auto");
  const [tone, setTone] = useState<Tone>("friendly");
  const [messages, setMessages] = useState<Msg[]>([INITIAL_GREETING]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const cart = useCart();
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
    queryKey: ["menu"],
    queryFn: () => api<{ items: MenuItem[] }>("/api/menu"),
    staleTime: 30_000,
  });
  const menu = useMemo(() => (menuData?.items ?? []).filter((i) => i.available !== false), [menuData]);

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
    }
  }, [open]);

  const appendAssistantDelta = useCallback((delta: string) => {
    setMessages((m) => {
      const copy = [...m];
      const last = copy[copy.length - 1];
      copy[copy.length - 1] = { ...last, content: last.content + delta };
      return copy;
    });
  }, []);

  const replaceLastAssistant = useCallback((content: string) => {
    setMessages((m) => {
      const copy = [...m];
      copy[copy.length - 1] = { ...copy[copy.length - 1], content };
      return copy;
    });
  }, []);

  const speakText = useCallback(async (text: string) => {
    if (!ttsOn) return;
    try {
      const res = await fetch(apiUrl("/api/ai-waiter/speak"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "nova" }),
      });
      if (!res.ok) throw new Error(`TTS ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (ttsAudioRef.current) ttsAudioRef.current.pause();
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      audio.play().catch((err) => {
        // Autoplay policies can block before a user gesture — non-fatal, just log
        console.warn("[ai-waiter] TTS playback blocked:", err);
      });
      audio.onended = () => URL.revokeObjectURL(url);
    } catch (e) {
      console.warn("[ai-waiter] TTS failed:", e);
    }
  }, [ttsOn]);

  const finalizeLastAssistant = useCallback((doSpeak: boolean) => {
    setMessages((m) => {
      const copy = [...m];
      const last = copy[copy.length - 1];
      if (!last || last.role !== "assistant") return copy;
      const { clean, names } = extractRecommendations(last.content);
      const recs = resolveRecs(names);
      copy[copy.length - 1] = { ...last, content: clean, recs };
      if (doSpeak && clean) void speakText(clean);
      return copy;
    });
  }, [resolveRecs, speakText]);

  const sendText = useCallback(async (text: string, opts?: { speak?: boolean }) => {
    if (!text.trim() || streaming) return;
    const speak = !!opts?.speak;
    setInput("");
    setMessages((m) => [
      ...m,
      { id: makeId(), role: "user", content: text },
      { id: makeId(), role: "assistant", content: "" },
    ]);
    setStreaming(true);
    try {
      const res = await fetch(apiUrl("/api/ai-waiter/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: getSessionId(), message: text, language, tone }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { payloads, rest } = parseSseChunk(buffer);
        buffer = rest;
        for (const payload of payloads) {
          if (payload.delta) appendAssistantDelta(payload.delta);
          else if (payload.error) replaceLastAssistant(`Sorry, I couldn't think clearly — ${payload.error}`);
        }
      }
      finalizeLastAssistant(speak);
    } catch (e) {
      const err = e as Error;
      console.error("[ai-waiter] stream failed:", err);
      replaceLastAssistant(`Connection issue: ${err.message}`);
    } finally {
      setStreaming(false);
    }
  }, [streaming, appendAssistantDelta, replaceLastAssistant, finalizeLastAssistant, language, tone]);

  // Voice
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      audioChunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mime || "audio/webm" });
        if (blob.size < 800) { toast.info("Hold the mic a little longer."); return; }
        setVoiceProcessing(true);
        try {
          const fd = new FormData();
          fd.append("file", blob, "voice.webm");
          // Whisper language hint — only ISO codes work, "auto" means omit
          fd.append("language", language === "auto" ? "" : language);
          const r = await fetch(apiUrl("/api/ai-waiter/transcribe"), { method: "POST", body: fd });
          if (!r.ok) throw new Error(`STT ${r.status}`);
          const j = await r.json() as { text: string };
          const text = (j.text || "").trim();
          if (!text) { toast.info("Didn't catch that — try once more."); return; }
          await sendText(text, { speak: true });
        } catch (e) {
          const err = e as Error;
          toast.error(`Voice failed: ${err.message}`);
        } finally { setVoiceProcessing(false); }
      };
      rec.start();
      mediaRecorderRef.current = rec;
      setRecording(true);
    } catch (e) {
      const err = e as Error;
      toast.error(`Microphone unavailable: ${err.message}`);
    }
  }, [sendText, language]);

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    setRecording(false);
  }, []);

  const addToTray = (it: MenuItem) => { cart.add(it); toast.success(`${it.name} added to your tray`); };

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
        "Suggest a pairing",
        "Build me a meal for 2",
        "Something not too spicy",
      ];
    }
    const firstItem = items[0].name;
    return [
      `What goes well with ${firstItem}?`,
      "Suggest a dessert",
      "Add a refreshing drink",
      "That's all, bill please",
    ];
  }, [cart.items]);

  return (
    <>
      {!open && dockPos.x >= 0 && (
        <div
          data-testid="ai-waiter-dock-btn"
          className="fixed z-40 touch-none select-none cursor-grab active:cursor-grabbing"
          style={{ left: dockPos.x, top: dockPos.y }}
          onMouseDown={(e) => { e.preventDefault(); handleDragStart(e.clientX, e.clientY); }}
          onTouchStart={(e) => { const t = e.touches[0]; handleDragStart(t.clientX, t.clientY); }}
          onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
          onTouchMove={(e) => { const t = e.touches[0]; handleDragMove(t.clientX, t.clientY); }}
          onMouseUp={handleDragEnd}
          onMouseLeave={() => { if (dragRef.current.dragging) handleDragEnd(); }}
          onTouchEnd={handleDragEnd}
        >
          <div className="mehfil-btn-royal rounded-full pl-4 pr-5 py-3.5 shadow-2xl flex items-center gap-2 group hover:-translate-y-0.5 transition-transform">
            <Sparkles className="h-5 w-5 text-[#C9A348] group-hover:rotate-12 transition" />
            <span className="font-royal tracking-wider uppercase text-xs">MehfilAI Waiter</span>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6" data-testid="ai-waiter-panel">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full sm:w-[460px] sm:max-w-md h-[90vh] sm:h-[680px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border bg-[#FAF5EC] border-[#C9A348]/40">
            {/* Header */}
            <header className="px-5 py-4 flex items-center justify-between border-b mehfil-royal-bg text-[#FAF5EC] border-[#C9A348]/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#DDB85C] to-[#8A6A1B] flex items-center justify-center shadow-md">
                  <Sparkles className="h-5 w-5 text-[#5C0E1B]" />
                </div>
                <div>
                  <div className="font-royal tracking-wider uppercase text-sm">MehfilAI Concierge</div>
                  <div className="font-editorial italic text-[10px] text-[#FAF5EC]/80">Your personal sommelier · live</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {mode !== "explore" && (
                  <button data-testid="ai-tts-toggle" onClick={() => setTtsOn((v) => !v)} title={ttsOn ? "Mute voice" : "Unmute voice"} className="h-9 w-9 rounded-full hover:bg-[#C9A348]/15 flex items-center justify-center text-[#C9A348]">
                    {ttsOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </button>
                )}
                <button data-testid="ai-waiter-close" onClick={() => setOpen(false)} className="h-9 w-9 rounded-full hover:bg-[#C9A348]/15 flex items-center justify-center text-[#FAF5EC]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {/* Mode tabs */}
            <div className="flex border-b bg-[#FAF5EC] border-[#E7DFCB]" data-testid="ai-mode-tabs">
              {([
                { k: "explore", label: "Explore", icon: BookOpen },
                { k: "chat", label: "Chat", icon: MessageSquare },
                { k: "voice", label: "Talk", icon: Mic },
              ] as { k: Mode; label: string; icon: typeof BookOpen }[]).map((t) => {
                const active = mode === t.k;
                return (
                  <button
                    key={t.k}
                    data-testid={`ai-mode-${t.k}`}
                    onClick={() => setMode(t.k)}
                    className={`flex-1 py-3 text-[11px] font-royal tracking-[0.2em] uppercase border-b-2 transition flex items-center justify-center gap-1.5 ${
                      active
                        ? "border-[#8A1A2A] text-[#8A1A2A] bg-[#F3EBD8]"
                        : "border-transparent text-[#1A1106]/60 hover:text-[#8A1A2A]"
                    }`}
                  >
                    <t.icon className="h-3.5 w-3.5" /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* Body */}
            {mode === "explore" && (<ExploreList menu={menu} />)}

            {mode === "chat" && (
              <ChatPane
                language={language}
                setLanguage={setLanguage}
                tone={tone}
                setTone={setTone}
                messages={messages}
                streaming={streaming}
                scrollRef={scrollRef}
                input={input}
                setInput={setInput}
                sendText={sendText}
                trayChips={trayChips}
                onTapChip={addToTray}
              />
            )}

            {mode === "voice" && (
              <VoicePane
                messages={messages}
                streaming={streaming}
                scrollRef={scrollRef}
                onAdd={addToTray}
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
}: {
  language: Lang; setLanguage: (l: Lang) => void;
  tone: Tone; setTone: (t: Tone) => void;
  messages: Msg[];
  streaming: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  input: string;
  setInput: (v: string) => void;
  sendText: (t: string) => void;
  trayChips: MenuItem[];
  onTapChip: (it: MenuItem) => void;
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
            className="bg-white text-[#8A1A2A] text-[11px] font-royal tracking-[0.15em] uppercase border border-[#C9A348]/40 rounded-full px-3 py-1.5 outline-none cursor-pointer focus:border-[#8A1A2A]"
          >
            {TONES.map((t) => <option key={t.code} value={t.code} className="bg-white text-[#1A1106]">{t.label}</option>)}
          </select>
          <select
            data-testid="chat-language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Lang)}
            className="bg-white text-[#8A1A2A] text-[11px] font-royal tracking-[0.15em] uppercase border border-[#C9A348]/40 rounded-full px-3 py-1.5 outline-none cursor-pointer focus:border-[#8A1A2A]"
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
          <div className="font-royal text-[#8A1A2A] text-sm" data-testid="chat-tray-total">{cart.count()} · {formatCurrency(cart.subtotal())}</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3" data-testid="ai-waiter-messages">
        {messages.map((m, idx) => (
          <div key={m.id} className={`max-w-[88%] ${m.role === "user" ? "ml-auto" : ""}`}>
            <div
              className={`rounded-2xl px-4 py-3 font-editorial italic text-[15px] leading-relaxed shadow-sm ${
                m.role === "user"
                  ? "bg-[#8A1A2A] text-[#FAF5EC] rounded-br-sm"
                  : "bg-white text-[#1A1106] rounded-bl-sm border border-[#C9A348]/25"
              }`}
              data-testid={`msg-${m.role}-${idx}`}
            >
              {m.content || (streaming && idx === messages.length - 1 ? <span className="opacity-60">…</span> : "")}
              {streaming && idx === messages.length - 1 && m.role === "assistant" && m.content && (
                <span className="ml-1 inline-block w-1.5 h-4 bg-[#8A1A2A] align-middle animate-pulse" />
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
                className="group inline-flex items-center gap-1.5 rounded-full bg-white border border-[#8A1A2A]/40 px-3.5 py-1.5 text-[10px] font-royal tracking-[0.18em] uppercase text-[#8A1A2A] hover:bg-[#8A1A2A] hover:text-[#FAF5EC] hover:border-[#8A1A2A] transition"
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
              className="rounded-full border border-[#C9A348]/50 px-3.5 py-1.5 text-[10px] font-royal tracking-[0.18em] uppercase text-[#8A6A1B] hover:border-[#8A1A2A] hover:text-[#8A1A2A] hover:bg-white transition disabled:opacity-40"
            >
              {q}
            </button>
          ))}
          {cart.count() > 0 && (
            <button
              onClick={() => {
                setOpen(false);
                router.push("/customer/checkout");
              }}
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
        <div className="flex items-center gap-2 bg-white rounded-full border border-[#C9A348]/40 p-1.5 focus-within:border-[#8A1A2A]">
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
            disabled={streaming || !input.trim()}
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
  messages: Msg[]; streaming: boolean; scrollRef: React.RefObject<HTMLDivElement>;
  onAdd: (it: MenuItem) => void;
  recording: boolean; voiceProcessing: boolean;
  startRecording: () => void; stopRecording: () => void;
}) {
  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3" data-testid="ai-waiter-messages-voice">
        {messages.map((m, idx) => (
          <div key={m.id} className="space-y-2">
            <div className={`max-w-[88%] ${m.role === "user" ? "ml-auto" : ""} rounded-2xl px-4 py-3 font-editorial italic text-[15px] leading-relaxed ${
              m.role === "user" ? "bg-[#8A1A2A] text-[#FAF5EC] rounded-br-sm" : "bg-white text-[#1A1106] rounded-bl-sm border border-[#C9A348]/20"
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
                    className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#C9A348]/40 px-3 py-1.5 text-[10px] font-royal tracking-[0.18em] uppercase text-[#8A1A2A] hover:bg-[#8A1A2A] hover:text-[#FAF5EC] transition"
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
              recording ? "bg-[#8A1A2A] mehfil-glow" : "mehfil-btn-gold"
            } disabled:opacity-50`}
          >
            {voiceProcessing || streaming ? <Loader2 className="h-6 w-6 animate-spin text-[#FAF5EC]" /> :
              recording ? <Square className="h-6 w-6 text-[#FAF5EC] fill-current" /> :
              <Mic className="h-7 w-7 text-[#1A1106]" />}
          </button>
          <div className="font-royal tracking-[0.2em] uppercase text-[10px] text-[#8A1A2A]">
            {voiceProcessing ? "Transcribing…" : recording ? "Listening… tap to send" : streaming ? "MehfilAI is thinking…" : "Tap & speak to MehfilAI"}
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
  const categories = useMemo(() => Array.from(new Set(menu.map((m) => m.category))), [menu]);
  const [cat, setCat] = useState<string>("");
  useEffect(() => { if (!cat && categories.length) setCat(categories[0]); }, [categories, cat]);
  const filtered = menu.filter((m) =>
    (!cat || m.category === cat) && (!q.trim() || m.name.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="ai-explore">
      <div className="p-3 border-b border-[#E7DFCB] bg-[#FAF5EC]">
        <input
          data-testid="ai-explore-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the menu…"
          className="w-full bg-white border border-[#C9A348]/30 rounded-full px-4 py-2 text-sm outline-none font-editorial italic"
        />
        <div className="flex gap-1.5 overflow-x-auto mt-2 -mx-1 px-1 pb-1">
          {categories.map((c) => (
            <button
              key={c}
              data-testid={`ai-explore-cat-${c}`}
              onClick={() => setCat(c)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-royal tracking-wider uppercase border transition ${
                cat === c ? "bg-[#8A1A2A] text-[#FAF5EC] border-[#8A1A2A]" : "bg-white text-[#8A1A2A] border-[#C9A348]/30"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#FAF5EC]">
        {filtered.map((m) => {
          const line = cart.items.find((i) => i.item_id === m.id);
          return (
            <div key={m.id} className="flex items-center gap-3 bg-white border border-[#C9A348]/20 rounded-lg p-2.5" data-testid={`ai-explore-item-${m.id}`}>
              <div className="h-14 w-14 rounded-md bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${m.image_url})` }} />
              <div className="flex-1 min-w-0">
                <div className="font-royal text-[13px] text-[#8A1A2A] leading-tight line-clamp-1">{m.name}</div>
                <div className="font-editorial italic text-[11px] text-[#1A1106]/60 line-clamp-1">{m.description}</div>
                <div className="font-royal text-xs text-[#8A1A2A] mt-0.5">{formatCurrency(m.price)}</div>
              </div>
              {line ? (
                <div className="flex items-center gap-1 bg-[#5C0E1B] text-[#FAF5EC] rounded-full p-1 shadow shrink-0" data-testid={`ai-explore-qty-${m.id}`}>
                  <button
                    data-testid={`ai-explore-dec-${m.id}`}
                    onClick={() => cart.setQty(m.id, line.qty - 1)}
                    className="h-7 w-7 rounded-full hover:bg-[#8A1A2A] flex items-center justify-center"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="px-1 w-6 text-center font-royal text-sm font-semibold" data-testid={`ai-explore-qty-val-${m.id}`}>{line.qty}</span>
                  <button
                    data-testid={`ai-explore-inc-${m.id}`}
                    onClick={() => cart.setQty(m.id, line.qty + 1)}
                    className="h-7 w-7 rounded-full hover:bg-[#8A1A2A] flex items-center justify-center"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  data-testid={`ai-explore-add-${m.id}`}
                  onClick={() => { cart.add(m); toast.success(`${m.name} added to your tray`); }}
                  className="mehfil-btn-royal rounded-full p-2 shrink-0"
                  title="Tap to add"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-10 font-editorial italic text-[#1A1106]/50 text-sm">No matches in this chapter.</div>
        )}
      </div>
    </div>
  );
}
