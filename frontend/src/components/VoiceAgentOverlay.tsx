"use client";

import React, { useEffect, useState, useRef } from "react";
import { VoiceClient } from "@/lib/voice_client";
import { useCart } from "@/stores/cart";
import { getOrCreateAnonID } from "@/lib/notify";

export default function VoiceAgentOverlay({ restaurantId }: { restaurantId: string }) {
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const clientRef = useRef<VoiceClient | null>(null);

  // Subscribe to cart changes to trigger manual events
  const cartItems = useCart((state) => state.items);
  const previousCartRef = useRef(cartItems);

  useEffect(() => {
    // If the cart grew, the user added an item. Notify the Voice Agent!
    if (cartItems.length > previousCartRef.current.length) {
      if (clientRef.current && isActive) {
        clientRef.current.sendManualEvent("ITEM_ADDED");
      }
    }
    previousCartRef.current = cartItems;
  }, [cartItems, isActive]);

  const toggleVoiceAgent = async () => {
    if (isActive && clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
      setIsActive(false);
      setTranscript("Voice agent disconnected.");
      return;
    }

    try {
      setTranscript("Connecting to AI Waiter...");
      const deviceId = getOrCreateAnonID();
      
      const client = new VoiceClient(
        restaurantId,
        deviceId,
        (text) => {
          setTranscript(text);
          setIsSpeaking(true);
          setTimeout(() => setIsSpeaking(false), 3000); // Simple visual indicator
        },
        (actionData) => {
          console.log("[Voice Overlay] Action received:", actionData);
          if (actionData.action === "ADD" && actionData.item_id) {
            // Add to cart via store
            // Note: In real app, we'd lookup the full item from menu store. 
            // We assume backend handles the basic mapping or we use the menu store here.
            useCart.getState().add(
              { id: actionData.item_id, name: "Voice Item", price: 0 } as any, 
              actionData.qty || 1
            );
          }
        }
      );

      await client.connect();
      await client.startRecording();
      
      clientRef.current = client;
      setIsActive(true);
      setTranscript("Listening...");
    } catch (err) {
      console.error(err);
      setTranscript("Failed to connect microphone.");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
      {isActive && (
        <div className="bg-black/80 backdrop-blur-md text-white text-xs px-3 py-2 rounded-xl shadow-xl max-w-[200px] border border-white/10 animate-fade-in-up">
          <p className="font-editorial leading-tight">
            {isSpeaking ? "🗣️ " : "🎙️ "} 
            {transcript}
          </p>
          {isSpeaking && (
            <div className="flex gap-1 mt-1">
              <span className="w-1 h-1 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-1 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-1 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>
      )}
      
      <button
        onClick={toggleVoiceAgent}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          isActive 
            ? "bg-red-500 hover:bg-red-600 scale-110 animate-pulse-soft" 
            : "bg-[#1A1106] hover:bg-[#8A6A1B]"
        }`}
      >
        <span className="text-2xl" aria-hidden="true">
          {isActive ? "🛑" : "🎙️"}
        </span>
      </button>
    </div>
  );
}
