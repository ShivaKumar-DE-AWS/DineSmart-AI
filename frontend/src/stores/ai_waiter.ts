import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AIWaiterState {
  sessionState: Record<string, any>;
  setSessionState: (newState: Record<string, any>) => void;
  updateSessionState: (updates: Record<string, any>) => void;
  clearSessionState: () => void;
}

export const useAIWaiterStore = create<AIWaiterState>()(
  persist(
    (set) => ({
      sessionState: { stage: "welcome" },
      setSessionState: (newState) => set({ sessionState: newState }),
      updateSessionState: (updates) =>
        set((state) => ({ sessionState: { ...state.sessionState, ...updates } })),
      clearSessionState: () => set({ sessionState: { stage: "welcome" } }),
    }),
    {
      name: "sd-ai-waiter-session",
    }
  )
);
