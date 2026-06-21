"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { QueryClient } from "@tanstack/react-query";
import type { User } from "@/types";

let sharedQueryClient: QueryClient | null = null;
export function setSharedQueryClient(qc: QueryClient) { sharedQueryClient = qc; }

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
        set({ user, token });
        sharedQueryClient?.clear();
      },
      clear: () => {
        set({ user: null, token: null });
        sharedQueryClient?.clear();
      },
    }),
    { name: "sd-session" }
  )
);
