"use client";

import React, { useEffect, useState, useRef } from "react";
import { VoiceClient } from "@/lib/voice_client";
import { useCart } from "@/stores/cart";
import { useMenuStore } from "@/stores/menu";
import { getOrCreateAnonID } from "@/lib/notify";

export default function VoiceAgentOverlay({ restaurantId }: { restaurantId: string }) {
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const clientRef = useRef<VoiceClient | null>(null);

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let reconnectTimer: any;

    const connectClient = () => {
      const deviceId = getOrCreateAnonID();
      const client = new VoiceClient(
        restaurantId,
        deviceId,
        (text) => {
          setTranscript(text);
          setIsSpeaking(true);
          setTimeout(() => setIsSpeaking(false), 3000);
        },
        (actionData) => {
          if (!actionData.item_id) return;

          if (actionData.action === "REMOVE") {
            useCart.getState().remove(actionData.item_id);
            return;
          }

          if (actionData.action === "ADD") {
            const menuStore = useMenuStore.getState();
            const addedItem = menuStore.findItem(actionData.item_id);

            if (!addedItem) {
              setTranscript("I could not find that item on this menu.");
              import("sonner").then(({ toast }) => {
                toast.error("Voice waiter could not find that menu item.");
              });
              return;
            }

            useCart.getState().add(addedItem, actionData.qty || 1);

            if (actionData.notes) {
              useCart.getState().setNote(addedItem.id, actionData.notes);
            }
            
            import("@/lib/ai_waiter_client").then(({ sendAIWaiterEvent }) => {
              sendAIWaiterEvent({
                event_type: "ITEM_ADDED",
                restaurant_id: restaurantId,
                cart_state: useCart.getState().items,
                added_item: {
                  item_id: addedItem.id,
                  name: addedItem.name,
                  price: addedItem.price,
                  qty: actionData.qty || 1,
                  category: addedItem.category
                }
              });
            });
          }
        }
      );

      client.onClose = () => {
        setIsConnected(false);
        reconnectTimer = setTimeout(connectClient, 3000);
      };

      client.connect().then(() => setIsConnected(true)).catch((e) => {
        console.error(e);
        reconnectTimer = setTimeout(connectClient, 5000);
      });
      clientRef.current = client;

      const handleFirstClick = () => {
        if (clientRef.current) clientRef.current.resumeContext();
      };
      window.addEventListener("click", handleFirstClick, { capture: true, once: true });
      window.addEventListener("touchstart", handleFirstClick, { capture: true, once: true });
    };

    connectClient();

    return () => {
      clearTimeout(reconnectTimer);
      if (clientRef.current) {
        clientRef.current.onClose = undefined; // prevent reconnect loop
        clientRef.current.disconnect();
      }
    };
  }, [restaurantId]);

  useEffect(() => {
    const handleSpeakEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (clientRef.current && customEvent.detail?.text) {
        clientRef.current.resumeContext();
        clientRef.current.speakText(customEvent.detail.text);
      }
    };

    const handleUiSyncEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (clientRef.current && customEvent.detail) {
        clientRef.current.syncUiState(customEvent.detail);
      }
    };

    window.addEventListener("ai-voice-speak", handleSpeakEvent);
    window.addEventListener("ai-ui-sync", handleUiSyncEvent);
    return () => {
      window.removeEventListener("ai-voice-speak", handleSpeakEvent);
      window.removeEventListener("ai-ui-sync", handleUiSyncEvent);
    };
  }, [isConnected]);

  // Subscribe to cart changes to trigger manual events
  const cartItems = useCart((state) => state.items);
  const previousCartRef = useRef(cartItems);

  useEffect(() => {
    // Intentionally left blank, we now rely on ai-voice-speak for cart interactions
    previousCartRef.current = cartItems;
  }, [cartItems, isConnected]);

  const startWalkieTalkie = async (e: React.PointerEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent default mobile touch behaviors
    if (!clientRef.current || !isConnected) return;
    try {
      setTranscript("Listening...");
      await clientRef.current.startRecording();
      setIsActive(true);
    } catch (err) {
      console.error(err);
      setTranscript("Failed to connect microphone.");
    }
  };

  const stopWalkieTalkie = (e: React.PointerEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!clientRef.current || !isActive) return;
    clientRef.current.stopRecording();
    setIsActive(false);
    setTranscript("Processing...");
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
      {(isActive || transcript) && (
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
        onPointerDown={startWalkieTalkie}
        onPointerUp={stopWalkieTalkie}
        onPointerLeave={(e) => isActive && stopWalkieTalkie(e)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 select-none ${
          isActive 
            ? "bg-red-500 hover:bg-red-600 scale-110 animate-pulse-soft" 
            : "bg-[#1A1106] hover:bg-[#8A6A1B]"
        }`}
      >
        <span className="text-2xl pointer-events-none" aria-hidden="true">
          {isActive ? "🛑" : "🎙️"}
        </span>
      </button>
    </div>
  );
}
