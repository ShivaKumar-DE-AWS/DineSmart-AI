"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { useTable } from "@/stores/table";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, X } from "lucide-react";

/**
 * Watches for ?t=<qr_token> on any customer route. When present:
 *  - captures token and renders a name entry modal
 *  - calls /api/tables/scan with the name
 *  - stores the session in zustand
 *  - strips the param from the URL
 *  - shows a live "Table N · MM:SS remaining" banner that counts down
 */
export function TableSessionGuard() {
  const search = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const { session, setSession, clear } = useTable();
  const [remaining, setRemaining] = useState<string>("");

  const [qrToken, setQrToken] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [scanning, setScanning] = useState(false);

  // Effect 1: capture QR token from URL
  useEffect(() => {
    const t = search.get("t");
    if (t) setQrToken(t);
  }, [search]);

  const handleJoin = async () => {
    if (!qrToken) return;
    if (!guestName.trim()) { toast.error("Please enter your name — every mehfil starts with a name."); return; }
    
    setScanning(true);
    try {
      const res = await api<{ table: { number: number }; session: import("@/stores/table").TableSession }>(
        "/api/tables/scan",
        { method: "POST", body: JSON.stringify({ qr_token: qrToken, customer_name: guestName.trim() }) }
      );
      setSession(res.session);
      toast.success(`Welcome to Table ${res.table.number}, ${guestName.trim()}!`);
      setQrToken(null);
      router.replace(path || "/r/mehfil-hyderabad", { scroll: false });
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Invalid table QR");
      setQrToken(null);
      router.replace(path || "/r/mehfil-hyderabad", { scroll: false });
    } finally {
      setScanning(false);
    }
  };

  // Effect 2: countdown
  useEffect(() => {
    if (!session) { setRemaining(""); return; }
    const tick = () => {
      const exp = new Date(session.expires_at).getTime();
      const left = exp - Date.now();
      if (left <= 0) {
        setRemaining("");
        clear();
        toast.info("Your table hold expired — scan again to reserve.");
        return;
      }
      const min = Math.floor(left / 60000);
      const sec = Math.floor((left % 60000) / 1000);
      setRemaining(`${min}:${String(sec).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session, clear]);

  return (
    <>
      <AnimatePresence>
        {session && remaining && (
          <motion.div
            key="table-banner"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="sticky top-0 z-30 mehfil-royal-bg text-[#FAF5EC] px-5 py-2.5 flex items-center justify-between gap-3 shadow-lg"
            data-testid="table-banner"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-full bg-[#C9A348]/20 border border-[#C9A348]/50 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-[#C9A348]" />
              </div>
              <div className="min-w-0">
                <div className="font-royal tracking-[0.25em] uppercase text-[10px] text-[#C9A348]">Seated at</div>
                <div className="font-royal text-sm leading-tight">Table {session.table_number}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 bg-[#C9A348]/10 border border-[#C9A348]/40 rounded-full px-3 py-1" data-testid="table-countdown">
                <Clock className="h-3 w-3 text-[#C9A348]" />
                <span className="font-royal text-xs text-[#C9A348] tabular-nums">{remaining}</span>
              </div>
              <button
                data-testid="table-banner-close"
                onClick={() => { clear(); toast.info("Table released."); }}
                className="h-7 w-7 rounded-full hover:bg-[#C9A348]/10 flex items-center justify-center"
                title="Release table"
              >
                <X className="h-3.5 w-3.5 text-[#FAF5EC]/70" />
              </button>
            </div>
          </motion.div>
        )}
        
        {qrToken && (
          <motion.div
            key="name-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1106]/80 backdrop-blur-sm p-4"
          >
            <div className="bg-[#FAF5EC] rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-[#C9A348]/20">
              <h2 className="font-royal text-2xl text-[#8A1A2A] mb-2 text-center">Welcome to Mehfil</h2>
              <p className="text-sm font-editorial text-zinc-600 mb-6 text-center italic">Every grand feast begins with a name.</p>
              
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  className="w-full bg-white border border-[#E7DFCB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C9A348] focus:ring-1 focus:ring-[#C9A348] transition-shadow text-[#1A1106]"
                  autoFocus
                />
              </div>
              
              <button
                onClick={handleJoin}
                disabled={scanning}
                className="w-full bg-[#8A1A2A] text-[#FAF5EC] rounded-xl px-4 py-3 text-sm font-bold tracking-widest uppercase hover:bg-[#A32034] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {scanning ? "Joining..." : "Join Table"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
