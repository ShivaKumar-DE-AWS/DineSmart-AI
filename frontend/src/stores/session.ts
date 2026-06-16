"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface SessionState {
  user: User | null;
  token: string | null;
  setSession: (user: User, token: string) => void;
  clear: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setSession: (user, token) => {
        if (typeof window !== "undefined") localStorage.setItem("sd_token", token);
        set({ user, token });
      },
      clear: () => {
        if (typeof window !== "undefined") localStorage.removeItem("sd_token");
        set({ user: null, token: null });
      },
    }),
    { name: "sd-session" }
  )
);
