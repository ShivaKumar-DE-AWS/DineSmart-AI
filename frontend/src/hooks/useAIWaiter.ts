import { useState, useEffect, useRef, useCallback } from 'react';
import { api, apiUrl } from "@/lib/api";
import { useTable } from "@/stores/table";
import { AIMessage, UserPreferences } from "@/types";

export type Message = AIMessage;

export function useAIWaiter({ restaurantId, mode, onOrderUpdate }: { restaurantId: string; mode: 'chat' | 'voice'; onOrderUpdate?: (orderData: any) => void }) {
    const { session } = useTable();
    const storageKey = session?.id ? `ai_waiter_chat_${session.id}` : null;
    
    const [messages, setMessages] = useState<Message[]>(() => {
        if (typeof window !== 'undefined' && storageKey) {
            try {
                const saved = sessionStorage.getItem(storageKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                }
            } catch (e) {}
        }
        return [{
            id: "greeting",
            role: "assistant",
            content: `Namaste! I'm your AI Waiter. I can help you explore the menu, recommend dishes based on your cravings, or add items to your cart. Feel free to type or tap the microphone to speak with me!`
        }];
    });
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [preferences, setPreferences] = useState<UserPreferences>({});
    const [ttsPlaying, setTtsPlaying] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Save messages to sessionStorage whenever they change
    useEffect(() => {
        if (typeof window !== 'undefined' && storageKey && messages.length > 0) {
            try {
                sessionStorage.setItem(storageKey, JSON.stringify(messages));
            } catch (e) {}
        }
    }, [messages, storageKey]);

    // Connect to WebSocket
    useEffect(() => {
        if (!session?.id || !restaurantId) return;

        // Build WebSocket URL
        let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!backendUrl) {
            const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
            backendUrl = isLocal ? 'http://localhost:3000' : 'https://api.smartdineai.co.in';
        }
        
        const wsUrlStr = backendUrl.replace("http://", "ws://").replace("https://", "wss://");
        const wsUrl = `${wsUrlStr}/api/ws/ai-waiter/${session.id}`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("[useAIWaiter] WebSocket connected");
            ws.send(JSON.stringify({
                type: "session_start",
                restaurant_id: restaurantId,
                table_id: session.table_id || "",
                qr_token: "",
                mode: mode
            }));
        };

        ws.onmessage = async (event) => {
            if (event.data instanceof Blob) {
                // Handle binary audio payload from Sarvam TTS
                if (!audioCtxRef.current) {
                    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                }
                if (audioCtxRef.current.state === 'suspended') {
                    try { await audioCtxRef.current.resume(); } catch (e) {}
                }
                const arrayBuffer = await event.data.arrayBuffer();
                try {
                    const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
                    const source = audioCtxRef.current.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(audioCtxRef.current.destination);
                    source.onended = () => {
                        setTtsPlaying(false);
                    };
                    setTtsPlaying(true);
                    source.start(0);
                } catch (e) {
                    console.error("[useAIWaiter] Error decoding audio:", e);
                    setTtsPlaying(false);
                }
                return;
            }

            try {
                const data = JSON.parse(event.data);
                if (data.type === "session_started") {
                    if (data.history && Array.isArray(data.history) && data.history.length > 0) {
                        setMessages(data.history);
                    }
                } else if (data.type === "assistant_text") {
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        role: "assistant",
                        content: data.text,
                        recs: data.recs,
                        quick_replies: data.quick_replies
                    }]);
                    setIsLoading(false);
                } else if (data.type === "partial_transcript") {
                    // console.log("Partial:", data.text);
                } else if (data.type === "final_transcript") {
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        role: "user",
                        content: data.text
                    }]);
                    setIsLoading(true);
                } else if (data.type === "order_update") {
                    if (onOrderUpdate) {
                        onOrderUpdate(data);
                    }
                } else if (data.type === "error") {
                    console.error("[useAIWaiter] Server error:", data.message);
                    if (data.message !== "Session not initialized. Send session_start first.") {
                        setMessages(prev => [...prev, {
                            id: Date.now().toString(),
                            role: "system",
                            content: data.message
                        }]);
                    }
                    setIsLoading(false);
                }
            } catch (e) {
                console.error("[useAIWaiter] Failed to parse message:", e);
            }
        };

        ws.onerror = (error) => {
            console.error("[useAIWaiter] WebSocket error:", error);
            setIsLoading(false);
        };

        ws.onclose = () => {
            console.log("[useAIWaiter] WebSocket disconnected");
            setIsLoading(false);
        };

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [session?.id, restaurantId, mode, onOrderUpdate]);

    const updatePreferencesFromText = useCallback((text: string) => {
        const lower = text.toLowerCase();
        setPreferences(prev => {
            const next = { ...prev };
            if (lower.includes("veg") || lower.includes("vegetarian")) next.dietary = "veg";
            if (lower.includes("non-veg") || lower.includes("non veg") || lower.includes("chicken") || lower.includes("mutton")) next.dietary = "non-veg";
            if (lower.includes("vegan")) next.dietary = "vegan";
            if (lower.includes("jain")) next.dietary = "jain";
            if (lower.includes("spicy") || lower.includes("hot")) next.spice = "spicy";
            if (lower.includes("mild") || lower.includes("less spice") || lower.includes("no spicy")) next.spice = "mild";
            const budgetMatch = lower.match(/under\s*(?:rs|₹)?\s*(\d+)|(\d+)\s*(?:rs|₹)?\s*budget/i);
            if (budgetMatch) {
                const b = parseInt(budgetMatch[1] || budgetMatch[2], 10);
                if (!isNaN(b)) next.budget = b;
            }
            const partyMatch = lower.match(/(?:for|people|party of|guests)\s*(\d+)/i);
            if (partyMatch) {
                const p = parseInt(partyMatch[1], 10);
                if (!isNaN(p)) next.partySize = p;
            }
            return next;
        });
    }, []);

    const append = useCallback((msg: { role: 'user', content: string }) => {
        setMessages(prev => [...prev, { id: Date.now().toString(), ...msg }]);
        setIsLoading(true);
        updatePreferencesFromText(msg.content);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            import("@/stores/cart").then(({ useCart }) => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        type: "user_text",
                        text: msg.content,
                        cart_state: useCart.getState().items
                    }));
                }
            });
        } else {
            console.error("[useAIWaiter] WebSocket is not open");
            setIsLoading(false);
        }
    }, [updatePreferencesFromText]);

    const sendAudio = useCallback((pcmBytes: ArrayBuffer) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(pcmBytes);
        }
    }, []);

    const startVoice = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "voice_start" }));
        }
    }, []);

    const stopVoice = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "voice_stop" }));
        }
    }, []);

    const speakText = useCallback((text: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "speak", text }));
        }
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([{
            id: "greeting",
            role: "assistant",
            content: `Namaste! I'm your AI Waiter. I can help you explore the menu, recommend dishes based on your cravings, or add items to your cart. Feel free to type or tap the microphone to speak with me!`
        }]);
    }, []);

    return {
        messages,
        input,
        setInput,
        append,
        sendAudio,
        startVoice,
        stopVoice,
        isLoading,
        preferences,
        setPreferences,
        clearMessages,
        ttsPlaying,
        speakText
    };
}
