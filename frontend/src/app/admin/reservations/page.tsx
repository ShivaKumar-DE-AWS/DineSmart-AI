"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CalendarClock, Users, Phone, CheckCircle2, XCircle, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Reservation {
  id: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  notes?: string | null;
  status: "requested" | "confirmed" | "seated" | "cancelled";
  admin_note?: string | null;
  created_at: string;
  updated_at?: string;
}

const STATUS_FILTERS: Array<{ key: "all" | Reservation["status"]; label: string }> = [
  { key: "all", label: "All" },
  { key: "requested", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "seated", label: "Seated" },
  { key: "cancelled", label: "Cancelled" },
];

function statusBadge(status: Reservation["status"]) {
  switch (status) {
    case "requested": return <Badge variant="warn">Pending</Badge>;
    case "confirmed": return <Badge variant="ready">Confirmed</Badge>;
    case "seated":    return <Badge variant="default">Seated</Badge>;
    case "cancelled": return <Badge variant="alert">Cancelled</Badge>;
  }
}

export default function AdminReservationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reservations"],
    queryFn: () => api<{ reservations: Reservation[] }>("/api/reservations"),
    refetchInterval: 15_000,
  });
  const [filter, setFilter] = useState<"all" | Reservation["status"]>("all");

  const patch = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Reservation["status"] }) =>
      api(`/api/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reservations"] }); toast.success("Updated"); },
  });

  const reservations = data?.reservations || [];
  const filtered = filter === "all" ? reservations : reservations.filter((r) => r.status === filter);
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = reservations.filter((r) => r.date === today && r.status !== "cancelled").length;
  const pendingCount = reservations.filter((r) => r.status === "requested").length;

  return (
    <div data-testid="admin-reservations-page">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <p className="uppercase tracking-[0.3em] text-xs text-stone mb-2">Operations</p>
          <h1 className="font-heading text-3xl md:text-4xl tracking-tight">Reservations</h1>
          <p className="text-sm text-stone mt-1">{reservations.length} total · <span className="text-clay font-medium">{todayCount}</span> on the books today · <span className="text-warn font-medium">{pendingCount}</span> awaiting confirmation</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.key}
              data-testid={`reservations-filter-${s.key}`}
              onClick={() => setFilter(s.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                filter === s.key ? "bg-ink text-cream border-ink" : "bg-white border-bone text-ink hover:bg-cream"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="text-stone">Loading reservations…</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="bg-white border border-bone rounded-2xl p-12 text-center text-stone" data-testid="reservations-empty">
          No reservations match this filter.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((r) => (
          <div key={r.id} className="bg-white border border-bone rounded-2xl p-5 flex flex-col" data-testid={`res-card-${r.id}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-heading text-lg font-semibold leading-tight">{r.name}</h3>
                <div className="text-xs text-stone mt-1 flex items-center gap-1"><Phone className="h-3 w-3" /> {r.phone}</div>
              </div>
              {statusBadge(r.status)}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div className="bg-cream rounded-lg p-2">
                <CalendarClock className="h-3.5 w-3.5 text-clay mx-auto mb-1" />
                <div className="text-[10px] uppercase tracking-wider text-stone">Date</div>
                <div className="font-heading font-semibold text-sm">{r.date.slice(5)}</div>
              </div>
              <div className="bg-cream rounded-lg p-2">
                <Clock3 className="h-3.5 w-3.5 text-clay mx-auto mb-1" />
                <div className="text-[10px] uppercase tracking-wider text-stone">Time</div>
                <div className="font-heading font-semibold text-sm">{r.time}</div>
              </div>
              <div className="bg-cream rounded-lg p-2">
                <Users className="h-3.5 w-3.5 text-clay mx-auto mb-1" />
                <div className="text-[10px] uppercase tracking-wider text-stone">Guests</div>
                <div className="font-heading font-semibold text-sm">{r.guests}</div>
              </div>
            </div>

            {r.notes && (
              <div className="bg-warn/10 border border-warn/30 text-stone text-xs rounded px-2 py-1.5 mb-3" data-testid={`res-notes-${r.id}`}>
                <span className="font-medium text-clay">Request:</span> {r.notes}
              </div>
            )}

            <div className="mt-auto flex items-center gap-2 pt-3 border-t border-bone">
              {r.status !== "confirmed" && r.status !== "cancelled" && (
                <button
                  data-testid={`res-confirm-${r.id}`}
                  onClick={() => patch.mutate({ id: r.id, status: "confirmed" })}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-ready/15 text-ready border border-ready/30 hover:bg-ready hover:text-white rounded-full py-2 text-xs font-medium transition"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                </button>
              )}
              {r.status === "confirmed" && (
                <button
                  data-testid={`res-seat-${r.id}`}
                  onClick={() => patch.mutate({ id: r.id, status: "seated" })}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-ink text-cream rounded-full py-2 text-xs font-medium hover:bg-clay transition"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark seated
                </button>
              )}
              {r.status !== "cancelled" && (
                <button
                  data-testid={`res-cancel-${r.id}`}
                  onClick={() => patch.mutate({ id: r.id, status: "cancelled" })}
                  className="inline-flex items-center justify-center gap-1.5 bg-white border border-bone text-alert hover:bg-alert hover:text-white rounded-full px-3 py-2 text-xs font-medium transition"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
