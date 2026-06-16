"use client";
import { Loader2 } from "lucide-react";
import { memo } from "react";

export interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;   // only true for the last assistant message while tokens arrive
}

function ChatMessageImpl({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? "bg-ink text-cream rounded-br-sm" : "bg-cream text-ink rounded-bl-sm"
        }`}
      >
        {content || (isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : null)}
      </div>
    </div>
  );
}

export const ChatMessage = memo(ChatMessageImpl);
