import { useState, useEffect, useRef, useCallback } from 'react';
import { api, apiUrl } from "@/lib/api";
import { useTable } from "@/stores/table";

export type Message = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
};

export function useAIWaiter({ restaurantId, onOrderUpdate }: { restaurantId: string; onOrderUpdate?: (orderData: any) => void }) {
    const { session } = useTable();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Initial greeting
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: "greeting",
                role: "assistant",
                content: `Namaste! I'm your AI Waiter. I can help you explore the menu, recommend dishes based on your cravings, or add items to your cart. Feel free to type or tap the microphone to speak with me!`
            }]);
        }
    }, [messages.length]);

    // Connect to WebSocket
    useEffect(() => {
        if (!session?.id || !restaurantId) return;

        // Build WebSocket URL
        let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        
        // If not explicitly provided, we must fallback smartly.
        // Vercel Serverless (production) DOES NOT proxy WebSockets via rewrites. We must connect directly to the backend.
        // Local Next.js dev server DOES proxy WebSockets.
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
                mode: "text"
            }));
        };

        ws.onmessage = async (event) => {
            if (event.data instanceof Blob) {
                // Handle binary audio payload
                if (!audioCtxRef.current) {
                    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                }
                const arrayBuffer = await event.data.arrayBuffer();
                try {
                    // Sarvam TTS gives a WAV or MP3 usually, but our code assumes decodeAudioData can handle it
                    const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
                    const source = audioCtxRef.current.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(audioCtxRef.current.destination);
                    source.start(0);
                } catch (e) {
                    console.error("[useAIWaiter] Error decoding audio:", e);
                }
                return;
            }

            try {
                const data = JSON.parse(event.data);
                if (data.type === "assistant_text") {
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        role: "assistant",
                        content: data.text
                    }]);
                    setIsLoading(false);
                } else if (data.type === "partial_transcript") {
                    // We could expose partials, but for now we just log them
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
                    // Hide the initial handshake requirement from the user
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
            ws.close();
        };
    }, [session?.id, restaurantId, onOrderUpdate]);

    const append = useCallback((msg: { role: 'user', content: string }) => {
        setMessages(prev => [...prev, { id: Date.now().toString(), ...msg }]);
        setIsLoading(true);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            // Using useCart.getState().items to get the latest cart state without reactivity issues in useCallback
            const { useCart } = require("@/stores/cart");
            wsRef.current.send(JSON.stringify({
                type: "user_text",
                text: msg.content,
                cart_state: useCart.getState().items
            }));
        } else {
            console.error("[useAIWaiter] WebSocket is not open");
            setIsLoading(false);
        }
    }, []);

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

    return {
        messages,
        input,
        setInput,
        append,
        sendAudio,
        startVoice,
        stopVoice,
        isLoading
    };
}
