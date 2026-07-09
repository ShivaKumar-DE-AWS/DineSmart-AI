import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AIWaiterState {
  sessionState: Record<string, any>;
  lastUpsellTime: number;
  setSessionState: (newState: Record<string, any>) => void;
  updateSessionState: (updates: Record<string, any>) => void;
  setLastUpsellTime: (time: number) => void;
  clearSessionState: () => void;
}

export const useAIWaiterStore = create<AIWaiterState>()(
  persist(
    (set) => ({
      sessionState: { stage: "welcome" },
      lastUpsellTime: 0,
      setSessionState: (newState) => set({ sessionState: newState }),
      updateSessionState: (updates) =>
        set((state) => ({ sessionState: { ...state.sessionState, ...updates } })),
      setLastUpsellTime: (time) => set({ lastUpsellTime: time }),
      clearSessionState: () => set({ sessionState: { stage: "welcome" }, lastUpsellTime: 0 }),
    }),
    {
      name: "sd-ai-waiter-session",
    }
  )
);
