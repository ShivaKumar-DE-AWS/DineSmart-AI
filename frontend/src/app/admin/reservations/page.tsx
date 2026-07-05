"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CalendarClock, Users, Phone, CheckCircle2, XCircle, Clock3, Calendar as CalendarIcon, LayoutGrid, ChevronLeft, ChevronRight, UserPlus, FileText } from "lucide-react";
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

const STATUS_FILTERS: Array<{ key: "today" | "all" | Reservation["status"]; label: string }> = [
  { key: "today", label: "Today" },
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
    refetchInterval: 10000,
  });
  
  const [filter, setFilter] = useState<"today" | "all" | Reservation["status"]>("today");
  const [viewMode, setViewMode] = useState<"cards" | "calendar">("cards");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().slice(0, 10));

  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    name: "", phone: "", guests: 2, time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
  });
  
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const patch = useMutation({
    mutationFn: ({ id, status, admin_note }: { id: string; status?: Reservation["status"]; admin_note?: string }) =>
      api(`/api/reservations/${id}/status`, { 
        method: "PATCH", 
        body: JSON.stringify(admin_note !== undefined ? { admin_note } : { status }) 
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reservations"] }); toast.success("Updated"); setEditingNoteId(null); },
  });

  const createWalkIn = useMutation({
    mutationFn: (body: any) => api("/api/reservations", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reservations"] });
      toast.success("Walk-in confirmed");
      setShowWalkIn(false);
      setWalkInForm({ ...walkInForm, name: "", phone: "" });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add walk-in"),
  });

  const reservations = data?.reservations || [];
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = reservations.filter((r) => r.date === today && r.status !== "cancelled").length;
  const pendingCount = reservations.filter((r) => r.status === "requested").length;

  const filtered = reservations.filter((r) => {
    if (filter === "today") return r.date === today;
    if (filter === "all") return true;
    return r.status === filter;
  });

  const handleWalkInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createWalkIn.mutate({
      ...walkInForm,
      date: today,
      status: "confirmed"
    });
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  // Calendar logic
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayRaw = new Date(year, month, 1).getDay();
  const firstDayMon = firstDayRaw === 0 ? 6 : firstDayRaw - 1;

  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDayMon + 1;
    if (day > 0 && day <= daysInMonth) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { day, dateStr, isCurrentMonth: true };
    }
    return { day: 0, dateStr: "", isCurrentMonth: false };
  });

  // Keep 42 days (6 rows) only if 6th row has days, else 35 (5 rows)
  const rowsNeeded = (firstDayMon + daysInMonth) > 35 ? 42 : 35;
  const visibleCalendarDays = calendarDays.slice(0, rowsNeeded);

  const getDayReservations = (dateStr: string) => {
    return reservations.filter((r) => r.date === dateStr && r.status !== "cancelled");
  };

  const renderReservationCards = (list: Reservation[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {list.map((r) => (
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

          <div className="mb-4">
            {editingNoteId === r.id ? (
              <div className="bg-cream border border-bone rounded-xl p-2 space-y-2">
                <textarea
                  value={adminNotes[r.id] ?? (r.admin_note || "")}
                  onChange={(e) => setAdminNotes({ ...adminNotes, [r.id]: e.target.value })}
                  placeholder="Internal notes..."
                  className="w-full bg-transparent text-sm text-ink outline-none resize-none"
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingNoteId(null)} className="text-xs text-stone hover:text-ink px-2 py-1">Cancel</button>
                  <button onClick={() => patch.mutate({ id: r.id, admin_note: adminNotes[r.id] ?? "" })} className="bg-ink text-cream rounded-lg px-3 py-1 text-xs font-medium hover:bg-clay">Save Note</button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setEditingNoteId(r.id);
                  if (adminNotes[r.id] === undefined) {
                    setAdminNotes(prev => ({ ...prev, [r.id]: r.admin_note || "" }));
                  }
                }}
                className={`text-xs flex items-start gap-1.5 ${r.admin_note ? 'text-ink' : 'text-stone hover:text-ink'} text-left w-full transition`}
              >
                <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{r.admin_note ? <><span className="font-medium">Note:</span> {r.admin_note}</> : "+ Add Admin Note"}</span>
              </button>
            )}
          </div>

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
  );

  return (
    <div data-testid="admin-reservations-page">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6 md:mb-8">
        <div>
          <p className="uppercase tracking-[0.3em] text-xs text-stone mb-2">Operations</p>
          <h1 className="font-heading text-3xl md:text-4xl tracking-tight">Reservations</h1>
          <p className="text-sm text-stone mt-1">{reservations.length} total · <span className="text-clay font-medium">{todayCount}</span> on the books today · <span className="text-warn font-medium">{pendingCount}</span> awaiting confirmation</p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowWalkIn(!showWalkIn)}
              className="inline-flex items-center gap-1.5 bg-electric-blue text-white hover:bg-electric-blue/90 px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              Walk-in
            </button>
            
            <div className="flex bg-cream border border-bone rounded-xl p-1">
              <button
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === "cards" ? "bg-white shadow-sm text-ink" : "text-stone hover:text-ink"}`}
              >
                <LayoutGrid className="h-4 w-4" /> Cards
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === "calendar" ? "bg-white shadow-sm text-ink" : "text-stone hover:text-ink"}`}
              >
                <CalendarIcon className="h-4 w-4" /> Calendar
              </button>
            </div>
          </div>

          {viewMode === "cards" && (
            <div className="flex flex-wrap justify-end gap-1.5">
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
          )}
        </div>
      </div>

      {showWalkIn && (
        <div className="mb-8 bg-white border border-bone rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-lg">Add Walk-in (Auto-Confirms)</h2>
            <button onClick={() => setShowWalkIn(false)} className="text-stone hover:text-ink"><XCircle className="h-5 w-5" /></button>
          </div>
          <form onSubmit={handleWalkInSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <label className="block">
              <span className="text-sm text-stone block mb-1">Name</span>
              <input required value={walkInForm.name} onChange={e => setWalkInForm({ ...walkInForm, name: e.target.value })} className="w-full bg-cream border border-bone rounded-xl px-3 py-2 text-ink outline-none" placeholder="John Doe" />
            </label>
            <label className="block">
              <span className="text-sm text-stone block mb-1">Phone</span>
              <input required value={walkInForm.phone} onChange={e => setWalkInForm({ ...walkInForm, phone: e.target.value })} className="w-full bg-cream border border-bone rounded-xl px-3 py-2 text-ink outline-none" placeholder="+91..." />
            </label>
            <label className="block">
              <span className="text-sm text-stone block mb-1">Guests</span>
              <input required type="number" min={1} value={walkInForm.guests} onChange={e => setWalkInForm({ ...walkInForm, guests: parseInt(e.target.value) })} className="w-full bg-cream border border-bone rounded-xl px-3 py-2 text-ink outline-none" />
            </label>
            <label className="block">
              <span className="text-sm text-stone block mb-1">Time</span>
              <input required type="time" value={walkInForm.time} onChange={e => setWalkInForm({ ...walkInForm, time: e.target.value })} className="w-full bg-cream border border-bone rounded-xl px-3 py-2 text-ink outline-none" />
            </label>
            <button type="submit" disabled={createWalkIn.isPending} className="bg-ink text-cream rounded-xl px-4 py-2 font-medium hover:bg-clay sm:col-span-4 transition">
              {createWalkIn.isPending ? "Adding..." : "Add & Confirm Walk-in"}
            </button>
          </form>
        </div>
      )}

      {isLoading && <div className="text-stone">Loading reservations…</div>}

      {viewMode === "cards" ? (
        <>
          {!isLoading && filtered.length === 0 && (
            <div className="bg-white border border-bone rounded-2xl p-12 text-center text-stone" data-testid="reservations-empty">
              No reservations match this filter.
            </div>
          )}
          {!isLoading && filtered.length > 0 && renderReservationCards(filtered)}
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-bone rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-semibold text-ink">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="p-2 border border-bone rounded-lg hover:bg-cream transition"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1.5 text-sm font-medium border border-bone rounded-lg hover:bg-cream transition">Today</button>
                <button onClick={nextMonth} className="p-2 border border-bone rounded-lg hover:bg-cream transition"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-bone border border-bone rounded-xl overflow-hidden">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="bg-cream p-2 text-center text-xs font-semibold uppercase tracking-wider text-stone">
                  {d}
                </div>
              ))}
              
              {visibleCalendarDays.map((d, i) => {
                if (!d.isCurrentMonth) {
                  return <div key={i} className="bg-white p-2 min-h-[100px] opacity-30" />;
                }
                const dayRes = getDayReservations(d.dateStr);
                const isSelected = selectedDate === d.dateStr;
                const isToday = today === d.dateStr;

                return (
                  <div 
                    key={d.dateStr} 
                    onClick={() => setSelectedDate(d.dateStr)}
                    className={`bg-white p-2 min-h-[100px] cursor-pointer transition-colors border-2 hover:border-clay/50 ${isSelected ? "border-clay bg-cream/30" : "border-transparent"}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? "bg-ink text-cream" : "text-ink"}`}>
                        {d.day}
                      </span>
                    </div>
                    {dayRes.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1">
                        <div className="inline-flex items-center gap-1.5 bg-clay/10 text-clay px-2 py-1 rounded-md text-xs font-semibold w-fit">
                          <div className="w-1.5 h-1.5 rounded-full bg-clay" />
                          {dayRes.length}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            <div className="bg-cream border border-bone rounded-2xl p-6">
              <h3 className="font-heading text-xl font-semibold mb-4">
                Reservations for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </h3>
              
              {getDayReservations(selectedDate).length === 0 ? (
                <p className="text-stone">No confirmed/pending reservations for this day.</p>
              ) : (
                renderReservationCards(getDayReservations(selectedDate))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
