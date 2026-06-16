"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Send, X, Loader2, Mic, MessageSquare, BookOpen, Plus, Square, Volume2, VolumeX } from "lucide-react";
import { api, apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { ChatMessage } from "./ChatMessage";
import type { MenuItem } from "@/types";

type Mode = "explore" | "chat" | "voice";
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
  content: "Aadab. I am MehfilAI — your personal sommelier. Tell me what you're craving, ask for tonight's special, or simply say 'surprise me.'",
};

function parseSseChunk(buffer: string): { payloads: { delta?: string; error?: string; done?: boolean }[]; rest: string } {
  const lines = buffer.split("\n\n");
  const rest = lines.pop() || "";
  const payloads: { delta?: string; error?: string; done?: boolean }[] = [];
  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    try { payloads.push(JSON.parse(line.slice(5).trim())); } catch { /* swallow */ }
  }
  return { payloads, rest };
}

/** Extracts <recommend>name1|name2</recommend> at end of content. Returns {clean, names}. */
function extractRecommendations(content: string): { clean: string; names: string[] } {
  const m = content.match(/<recommend>([^<]*)<\/recommend>\s*$/i);
  if (!m) return { clean: content, names: [] };
  const names = m[1].split("|").map((s) => s.trim()).filter(Boolean);
  return { clean: content.slice(0, m.index).trim(), names };
}

export function AIWaiterDock() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
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

  const { data: menuData } = useQuery({
    queryKey: ["menu"],
    queryFn: () => api<{ items: MenuItem[] }>("/api/menu"),
    staleTime: 30_000,
  });
  const menu = useMemo(() => (menuData?.items ?? []).filter((i) => i.available !== false), [menuData]);

  // Build a lookup for tap-and-order parsing
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
      // exact
      let hit = menuByName.get(k);
      // fuzzy: any menu item whose name contains the rec or vice-versa
      if (!hit) hit = menu.find((it) => it.name.toLowerCase().includes(k) || k.includes(it.name.toLowerCase()));
      if (hit && !seen.has(hit.id)) { seen.add(hit.id); out.push(hit); }
    }
    return out.slice(0, 4);
  }, [menu, menuByName]);

  // Listen for external "open" requests
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

  // Cleanup TTS audio on close
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
  }, [resolveRecs]);

  const replaceLastAssistant = useCallback((content: string) => {
    setMessages((m) => {
      const copy = [...m];
      copy[copy.length - 1] = { ...copy[copy.length - 1], content };
      return copy;
    });
  }, []);

  /** Calls /api/ai-waiter/speak and plays the returned mp3. */
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
      if (ttsAudioRef.current) { ttsAudioRef.current.pause(); }
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      audio.play().catch(() => { /* user gesture issue, ignore */ });
      audio.onended = () => URL.revokeObjectURL(url);
    } catch (e) {
      console.warn("[ai-waiter] TTS failed:", e);
    }
  }, [ttsOn]);

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
        body: JSON.stringify({ session_id: getSessionId(), message: text }),
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
  }, [streaming, appendAssistantDelta, replaceLastAssistant, finalizeLastAssistant]);

  // -------- Voice (mic) ----------
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
        if (blob.size < 800) {
          toast.info("Hold the mic a little longer.");
          return;
        }
        setVoiceProcessing(true);
        try {
          const fd = new FormData();
          fd.append("file", blob, "voice.webm");
          fd.append("language", "en");
          const r = await fetch(apiUrl("/api/ai-waiter/transcribe"), { method: "POST", body: fd });
          if (!r.ok) throw new Error(`STT ${r.status}`);
          const j = await r.json() as { text: string };
          const text = (j.text || "").trim();
          if (!text) { toast.info("Didn't catch that — try once more."); return; }
          await sendText(text, { speak: true });
        } catch (e) {
          const err = e as Error;
          toast.error(`Voice failed: ${err.message}`);
        } finally {
          setVoiceProcessing(false);
        }
      };
      rec.start();
      mediaRecorderRef.current = rec;
      setRecording(true);
    } catch (e) {
      const err = e as Error;
      toast.error(`Microphone unavailable: ${err.message}`);
    }
  }, [sendText]);

  const stopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    setRecording(false);
  }, []);

  const addRec = (it: MenuItem) => { cart.add(it); toast.success(`${it.name} added to your thali`); };

  // ---------- UI ----------
  return (
    <>
      {!open && (
        <button
          data-testid="ai-waiter-dock-btn"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 mehfil-btn-royal rounded-full pl-4 pr-5 py-3.5 shadow-2xl flex items-center gap-2 group hover:-translate-y-1 transition-all"
        >
          <Sparkles className="h-5 w-5 text-[#C9A348] group-hover:rotate-12 transition" />
          <span className="font-royal tracking-wider uppercase text-xs">MehfilAI Waiter</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6" data-testid="ai-waiter-panel">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full sm:w-[460px] sm:max-w-md h-[85vh] sm:h-[640px] bg-[#FAF5EC] sm:rounded-2xl border border-[#C9A348]/40 shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <header className="mehfil-royal-bg text-[#FAF5EC] px-5 py-4 flex items-center justify-between border-b border-[#C9A348]/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#DDB85C] to-[#8A6A1B] flex items-center justify-center shadow-md">
                  <Sparkles className="h-5 w-5 text-[#5C0E1B]" />
                </div>
                <div>
                  <div className="font-royal tracking-wider uppercase text-sm">MehfilAI</div>
                  <div className="font-editorial italic text-[10px] text-[#FAF5EC]/70">Your personal sommelier · live</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  data-testid="ai-tts-toggle"
                  onClick={() => setTtsOn((v) => !v)}
                  title={ttsOn ? "Mute voice" : "Unmute voice"}
                  className="h-9 w-9 rounded-full hover:bg-[#C9A348]/15 flex items-center justify-center text-[#C9A348]"
                >
                  {ttsOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <button data-testid="ai-waiter-close" onClick={() => setOpen(false)} className="h-9 w-9 rounded-full hover:bg-[#C9A348]/15 flex items-center justify-center text-[#FAF5EC]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {/* Mode tabs */}
            <div className="flex border-b border-[#E7DFCB] bg-[#FAF5EC]" data-testid="ai-mode-tabs">
              {([
                { k: "explore", label: "Explore", icon: BookOpen },
                { k: "chat", label: "Chat", icon: MessageSquare },
                { k: "voice", label: "Talk", icon: Mic },
              ] as { k: Mode; label: string; icon: typeof BookOpen }[]).map((t) => (
                <button
                  key={t.k}
                  data-testid={`ai-mode-${t.k}`}
                  onClick={() => setMode(t.k)}
                  className={`flex-1 py-3 text-[11px] font-royal tracking-[0.2em] uppercase border-b-2 transition flex items-center justify-center gap-1.5 ${
                    mode === t.k ? "border-[#8A1A2A] text-[#8A1A2A] bg-[#F3EBD8]" : "border-transparent text-[#1A1106]/60 hover:text-[#8A1A2A]"
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              ))}
            </div>

            {/* Body */}
            {mode === "explore" ? (
              <ExploreList menu={menu} onAdd={addRec} />
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4" data-testid="ai-waiter-messages">
                  {messages.map((m, idx) => (
                    <div key={m.id} className="space-y-2">
                      <ChatMessage
                        role={m.role}
                        content={m.content || (streaming && idx === messages.length - 1 ? "…" : "")}
                        isStreaming={streaming && idx === messages.length - 1 && m.role === "assistant"}
                      />
                      {m.recs && m.recs.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2" data-testid={`ai-recs-${m.id}`}>
                          {m.recs.map((r) => (
                            <button
                              key={r.id}
                              data-testid={`ai-rec-add-${r.id}`}
                              onClick={() => addRec(r)}
                              className="group text-left bg-white border border-[#C9A348]/30 hover:border-[#8A1A2A] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
                            >
                              <div className="aspect-[5/3] bg-cover bg-center" style={{ backgroundImage: `url(${r.image_url})` }} />
                              <div className="p-2.5">
                                <div className="font-royal text-[11px] text-[#8A1A2A] leading-tight line-clamp-1">{r.name}</div>
                                <div className="flex items-center justify-between mt-1.5">
                                  <span className="font-royal text-xs text-[#8A1A2A]">{formatCurrency(r.price)}</span>
                                  <span className="mehfil-btn-gold rounded-full px-2.5 py-1 text-[9px] font-royal tracking-wider uppercase inline-flex items-center gap-1">
                                    <Plus className="h-2.5 w-2.5" /> Tap to add
                                  </span>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Composer */}
                <div className="p-4 border-t border-[#E7DFCB] bg-[#FAF5EC]">
                  {mode === "chat" ? (
                    <div className="flex items-center gap-2 bg-white rounded-full border border-[#C9A348]/30 p-1.5">
                      <input
                        data-testid="ai-waiter-input"
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendText(input)}
                        placeholder="What are you craving tonight?"
                        disabled={streaming}
                        className="flex-1 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-[#1A1106]/40 font-editorial italic"
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
                  ) : (
                    <div className="flex flex-col items-center gap-2" data-testid="ai-voice-controls">
                      <button
                        data-testid={recording ? "ai-voice-stop" : "ai-voice-start"}
                        onClick={recording ? stopRecording : startRecording}
                        disabled={voiceProcessing || streaming}
                        className={`h-16 w-16 rounded-full flex items-center justify-center shadow-2xl transition-all ${
                          recording ? "bg-[#8A1A2A] mehfil-glow" : "mehfil-btn-gold"
                        } disabled:opacity-50`}
                      >
                        {voiceProcessing || streaming ? (
                          <Loader2 className="h-6 w-6 animate-spin text-[#FAF5EC]" />
                        ) : recording ? (
                          <Square className="h-6 w-6 text-[#FAF5EC] fill-current" />
                        ) : (
                          <Mic className="h-7 w-7 text-[#1A1106]" />
                        )}
                      </button>
                      <div className="font-royal tracking-[0.2em] uppercase text-[10px] text-[#8A1A2A]">
                        {voiceProcessing ? "Transcribing…" : recording ? "Listening… tap to send" : streaming ? "MehfilAI is thinking…" : "Tap & speak to MehfilAI"}
                      </div>
                      <div className="font-editorial italic text-[10px] text-[#1A1106]/50 text-center px-4">
                        Try: &ldquo;Spicy biryani for two with a sweet finish&rdquo;
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ExploreList({ menu, onAdd }: { menu: MenuItem[]; onAdd: (it: MenuItem) => void }) {
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
              className={`whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-royal tracking-wider uppercase border ${
                cat === c ? "bg-[#8A1A2A] text-[#FAF5EC] border-[#8A1A2A]" : "bg-white text-[#8A1A2A] border-[#C9A348]/30"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.map((m) => (
          <div key={m.id} className="flex items-center gap-3 bg-white border border-[#C9A348]/20 rounded-lg p-2.5" data-testid={`ai-explore-item-${m.id}`}>
            <div className="h-14 w-14 rounded-md bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${m.image_url})` }} />
            <div className="flex-1 min-w-0">
              <div className="font-royal text-[13px] text-[#8A1A2A] leading-tight line-clamp-1">{m.name}</div>
              <div className="font-editorial italic text-[11px] text-[#1A1106]/60 line-clamp-1">{m.description}</div>
              <div className="font-royal text-xs text-[#8A1A2A] mt-0.5">{formatCurrency(m.price)}</div>
            </div>
            <button
              data-testid={`ai-explore-add-${m.id}`}
              onClick={() => onAdd(m)}
              className="mehfil-btn-royal rounded-full p-2 shrink-0"
              title="Tap to add"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 font-editorial italic text-[#1A1106]/50 text-sm">No matches in this chapter.</div>
        )}
      </div>
    </div>
  );
}
