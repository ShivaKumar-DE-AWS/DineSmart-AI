"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TableSession {
  id: string;
  table_id: string;
  table_number: number;
  started_at: string;
  expires_at: string;
  last_scan_at: string;
  status: "live" | "expired";
  customer_name?: string | null;
  customer_phone?: string | null;
}

interface TableState {
  session: TableSession | null;
  setSession: (s: TableSession | null) => void;
  clear: () => void;
}

export const useTable = create<TableState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (s) => set({ session: s }),
      clear: () => set({ session: null }),
    }),
    { name: "mehfil-table" }
  )
);
