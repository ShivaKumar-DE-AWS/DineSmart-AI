"use client";
import { useState } from "react";
import { useRouter , useParams} from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Calendar, Clock, Users, Phone, User2, MessageSquare, Sparkles, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getRestaurantConfig } from "@/hooks/useRestaurantConfig";

export default function ReservePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const [date, setDate] = useState(todayISO);
  const [time, setTime] = useState("20:00");
  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<{ id: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Please share your name and phone");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ ok: boolean; reservation_id: string; status: string }>("/api/reservations", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), date, time, guests, notes: notes.trim() || undefined, restaurant_id: getRestaurantConfig(slug).id }),
      });
      setConfirmation({ id: res.reservation_id });
      toast.success("Reservation requested — we&apos;ll confirm shortly");
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Could not submit. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (confirmation) {
    return (
      <div className="max-w-2xl mx-auto px-5 md:px-10 py-20 text-center" data-testid="reserve-confirmed">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="inline-flex h-16 w-16 rounded-full bg-brand-secondary/20 ring-4 ring-brand-secondary/30 items-center justify-center mb-5">
          <CheckCircle2 className="h-8 w-8 text-brand-primary" />
        </motion.div>
        <div className="mehfil-divider mb-3 max-w-xs mx-auto"><span className="font-royal tracking-[0.4em] text-[10px] uppercase">Reservation requested</span></div>
        <h1 className="font-royal text-4xl md:text-5xl text-brand-primary tracking-wide">
          A table for <span className="font-editorial italic mehfil-gold-gradient">{guests}</span>
        </h1>
        <p className="font-editorial italic text-[#1A1106]/70 mt-4 leading-relaxed">
          {name}, we&apos;ve received your request for <span className="font-royal text-brand-primary">{date} · {time}</span>. Our team will call you within 30 minutes to confirm your reservation.
        </p>
        <div className="mt-6 inline-block bg-[#FAF5EC] border border-brand-secondary/40 rounded-full px-5 py-2 font-royal tracking-wider uppercase text-[11px] text-[#1A1106]/70">
          Reservation # {confirmation.id.slice(0, 8)}
        </div>
        <div className="flex justify-center gap-3 mt-8">
          <button onClick={() => router.push(`/r/${slug}/menu`)} className="mehfil-btn-royal rounded-full px-6 py-3 font-royal tracking-[0.2em] uppercase text-xs inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" /> Preview the menu
          </button>
          <button onClick={() => setConfirmation(null)} className="rounded-full border border-brand-primary/30 text-brand-primary px-6 py-3 font-royal tracking-[0.2em] uppercase text-xs hover:bg-brand-primary/5">
            Reserve again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-10 py-14" data-testid="reserve-page">
      <div className="text-center mb-10">
        <div className="mehfil-divider mb-4 max-w-xs mx-auto"><span className="font-royal tracking-[0.4em] text-[10px] uppercase">Reserve a table</span></div>
        <h1 className="font-royal text-4xl md:text-5xl text-brand-primary tracking-wide">
          Be our <span className="font-editorial italic mehfil-gold-gradient">mehmaan</span>
        </h1>
        <p className="font-editorial italic text-sm md:text-base text-[#1A1106]/75 mt-4 max-w-xl mx-auto leading-relaxed">
          Tell us when, who, and how many — we&apos;ll set the table and prepare for your arrival.
        </p>
      </div>

      <form onSubmit={submit} className="mehfil-card rounded-2xl p-7 md:p-9 space-y-5">
        <div className="grid md:grid-cols-2 gap-5">
          <Field icon={User2} label="Your name *">
            <input data-testid="reserve-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aisha Khan" className="reserve-input" required />
          </Field>
          <Field icon={Phone} label="Phone *">
            <input data-testid="reserve-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 90000 12345" type="tel" className="reserve-input" required />
          </Field>
          <Field icon={Calendar} label="Date">
            <input data-testid="reserve-date" type="date" min={todayISO} value={date} onChange={(e) => setDate(e.target.value)} className="reserve-input" />
          </Field>
          <Field icon={Clock} label="Time">
            <select data-testid="reserve-time" value={time} onChange={(e) => setTime(e.target.value)} className="reserve-input cursor-pointer">
              {generateSlots().map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        <div>
          <label className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B] flex items-center gap-1.5 mb-2"><Users className="h-3 w-3" /> Guests · {guests}</label>
          <div className="flex flex-wrap gap-2" data-testid="reserve-guests-pills">
            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
              <button
                type="button"
                key={n}
                data-testid={`reserve-guest-${n}`}
                onClick={() => setGuests(n)}
                className={`h-10 w-10 rounded-full font-royal text-sm tracking-wider transition border ${
                  guests === n ? "bg-brand-primary text-[#FAF5EC] border-brand-primary shadow-md" : "bg-white text-brand-primary border-brand-secondary/40 hover:border-brand-primary"
                }`}
              >
                {n}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={30}
              data-testid="reserve-guests-input"
              value={guests}
              onChange={(e) => setGuests(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
              className="h-10 w-16 rounded-full bg-white border border-brand-secondary/40 text-center font-royal text-sm outline-none"
            />
          </div>
        </div>

        <Field icon={MessageSquare} label="A special request (optional)">
          <textarea
            data-testid="reserve-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Birthday cake at 9pm, allergy to nuts, window seat preferred…"
            rows={3}
            className="reserve-input resize-none"
          />
        </Field>

        <AnimatePresence>
          <motion.button
            type="submit"
            data-testid="reserve-submit"
            disabled={busy}
            whileTap={{ scale: 0.98 }}
            className="w-full mehfil-btn-royal rounded-full py-3.5 font-royal tracking-[0.2em] uppercase text-xs disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {busy ? "Sending request…" : <>Request my table <Sparkles className="h-4 w-4" /></>}
          </motion.button>
        </AnimatePresence>
        <p className="text-center font-editorial italic text-[11px] text-[#1A1106]/55">
          We confirm by phone within 30 minutes. No deposit needed.
        </p>
      </form>

      <style jsx>{`
        .reserve-input {
          width: 100%;
          background: white;
          border: 1px solid rgba(201, 163, 72, 0.3);
          border-radius: 12px;
          padding: 12px 14px;
          font-family: var(--font-editorial, ui-serif);
          font-size: 14px;
          color: #1A1106;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .reserve-input:focus {
          border-color: var(--brand-primary);
          box-shadow: 0 0 0 3px rgba(138, 26, 42, 0.1);
        }
      `}</style>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-royal tracking-wider uppercase text-[10px] text-[#8A6A1B] flex items-center gap-1.5 mb-2">
        <Icon className="h-3 w-3" /> {label}
      </span>
      {children}
    </label>
  );
}

function generateSlots(): string[] {
  const out: string[] = [];
  const ranges: [number, number][] = [[12, 15], [18, 23]]; // lunch & dinner windows
  for (const [start, end] of ranges) {
    for (let h = start; h < end; h++) {
      for (const m of [0, 30]) {
        out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
  }
  return out;
}
