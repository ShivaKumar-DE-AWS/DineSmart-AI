"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, Loader2 } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { ChatMessage } from "./ChatMessage";

interface Msg { id: string; role: "user" | "assistant"; content: string; }

function makeId(): string { return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function getSessionId(): string {
  if (typeof window === "undefined") return "anon";
  let sid = localStorage.getItem("sd_ai_session");
  if (!sid) {
    sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem("sd_ai_session", sid);
  }
  return sid;
}

const INITIAL_GREETING: Msg = {
  id: "greeting",
  role: "assistant",
  content: "Hi! I'm SmartWaiter. Tell me what you're craving and I'll find the perfect match from tonight's menu.",
};

/** Parses an SSE buffer and returns parsed payloads + leftover buffer. */
function parseSseChunk(buffer: string): { payloads: any[]; rest: string } {
  const lines = buffer.split("\n\n");
  const rest = lines.pop() || "";
  const payloads: any[] = [];
  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    try {
      payloads.push(JSON.parse(line.slice(5).trim()));
    } catch (parseErr) {
      console.warn("[ai-waiter] bad SSE payload:", line, parseErr);
    }
  }
  return { payloads, rest };
}

export function AIWaiterDock() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([INITIAL_GREETING]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listen for external "open" requests (e.g. hero CTA button on /customer)
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-ai-waiter", onOpen as EventListener);
    return () => window.removeEventListener("open-ai-waiter", onOpen as EventListener);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

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

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
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
          else if (payload.error) replaceLastAssistant(`Sorry, I couldn't think clearly there — ${payload.error}`);
        }
      }
    } catch (e: any) {
      console.error("[ai-waiter] stream failed:", e);
      replaceLastAssistant(`Connection issue: ${e.message}`);
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, appendAssistantDelta, replaceLastAssistant]);

  return (
    <>
      {!open && (
        <button
          data-testid="ai-waiter-dock-btn"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-clay text-white rounded-full pl-4 pr-5 py-3 shadow-2xl hover:bg-clay-dark transition-all hover:-translate-y-1 flex items-center gap-2 group"
        >
          <Sparkles className="h-5 w-5 group-hover:rotate-12 transition" />
          <span className="font-medium text-sm">Ask the AI Waiter</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6" data-testid="ai-waiter-panel">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full sm:w-[420px] sm:max-w-md h-[80vh] sm:h-[600px] bg-white sm:rounded-3xl border border-bone shadow-2xl flex flex-col overflow-hidden">
            <header className="flex items-center justify-between p-5 border-b border-bone bg-cream">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-clay flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-heading font-semibold">SmartWaiter</div>
                  <div className="text-xs text-stone">Claude Sonnet · Live</div>
                </div>
              </div>
              <button data-testid="ai-waiter-close" onClick={() => setOpen(false)} className="h-9 w-9 rounded-full hover:bg-ink/5 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin" data-testid="ai-waiter-messages">
              {messages.map((m, idx) => (
                <ChatMessage
                  key={m.id}
                  role={m.role}
                  content={m.content}
                  isStreaming={streaming && idx === messages.length - 1 && m.role === "assistant"}
                />
              ))}
            </div>

            <div className="p-4 border-t border-bone bg-white">
              <div className="flex items-center gap-2 bg-cream rounded-full border border-bone p-1.5">
                <input
                  data-testid="ai-waiter-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="What are you in the mood for?"
                  disabled={streaming}
                  className="flex-1 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-stone"
                />
                <button data-testid="ai-waiter-send" onClick={send} disabled={streaming || !input.trim()} className="h-9 w-9 rounded-full bg-clay text-white flex items-center justify-center disabled:opacity-40 hover:bg-clay-dark transition">
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
