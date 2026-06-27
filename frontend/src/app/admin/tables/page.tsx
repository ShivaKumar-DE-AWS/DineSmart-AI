"use client";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import { getRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { toast } from "sonner";
import { Plus, QrCode, RefreshCw, Trash2, Download, Printer, Users, Clock, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";

interface TableDoc {
  id: string;
  number: number;
  capacity: number;
  qr_token: string;
  is_active: boolean;
  created_at: string;
  live_session?: { id: string; expires_at: string; customer_name?: string | null } | null;
}

function customerOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function useRestaurantSlug(): string {
  const { user } = useSession();
  return user?.restaurant_slug || "";
}

function useRestaurantName(): string {
  const { user } = useSession();
  if (!user?.restaurant_id) return "Restaurant";
  const config = getRestaurantConfig(user.restaurant_slug || "");
  return config?.name || "Restaurant";
}

function tableQrUrl(slug: string, tableNumber: string): string {
  return `${customerOrigin()}/r/${slug}?table=${tableNumber}`;
}

export default function AdminTables() {
  const qc = useQueryClient();
  const slug = useRestaurantSlug();
  const restaurantName = useRestaurantName();
  const { user } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-tables", user?.restaurant_id],
    queryFn: () => api<{ tables: TableDoc[] }>("/api/tables"),
    refetchInterval: 15_000,
  });
  const [newNumber, setNewNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState("4");
  const [adding, setAdding] = useState(false);

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/tables/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tables", user?.restaurant_id] }); toast.success("Table removed"); },
  });
  const regen = useMutation({
    mutationFn: (id: string) => api(`/api/tables/${id}/regenerate-qr`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tables", user?.restaurant_id] }); toast.success("New QR generated"); },
  });

  const addTable = async () => {
    const n = parseInt(newNumber, 10);
    if (!Number.isFinite(n) || n <= 0) { toast.error("Enter a positive table number"); return; }
    const cap = parseInt(newCapacity, 10) || 4;
    setAdding(true);
    try {
      await api("/api/tables", { method: "POST", body: JSON.stringify({ number: n, capacity: cap }) });
      toast.success(`Table ${n} added`);
      setNewNumber("");
      qc.invalidateQueries({ queryKey: ["admin-tables", user?.restaurant_id] });
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Could not add table");
    } finally {
      setAdding(false);
    }
  };

  const tables = data?.tables || [];
  const liveCount = tables.filter((t) => t.live_session).length;

  return (
    <div data-testid="admin-tables-page">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <p className="uppercase tracking-[0.3em] text-xs text-stone mb-2">Operations</p>
          <h1 className="font-heading text-3xl md:text-4xl tracking-tight">Tables &amp; QR codes</h1>
          <p className="text-sm text-stone mt-1">
            {tables.length} tables · <span className="text-clay font-medium">{liveCount}</span> currently seated · scans hold the table for 10 minutes.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 bg-white border border-bone rounded-2xl p-3" data-testid="add-table-form">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-stone block mb-1">Number</label>
            <Input data-testid="new-table-number" type="number" min="1" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} className="h-9 w-20" placeholder="7" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-stone block mb-1">Seats</label>
            <Input data-testid="new-table-capacity" type="number" min="1" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} className="h-9 w-20" />
          </div>
          <button
            data-testid="add-table-btn"
            onClick={addTable}
            disabled={adding}
            className="h-9 px-4 rounded-full bg-ink text-cream text-xs font-medium hover:bg-clay disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add table
          </button>
        </div>
      </div>

      {isLoading && <div className="text-stone">Loading tables…</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tables.map((t) => <TableCard key={t.id} t={t} onRegen={(id) => regen.mutate(id)} onDelete={(id) => remove.mutate(id)} slug={slug} restaurantName={restaurantName} />)}
      </div>

      {!isLoading && tables.length === 0 && (
        <div className="bg-white border border-bone rounded-2xl p-12 text-center text-stone" data-testid="tables-empty">
          No tables yet — add your first one above. Each table gets a unique QR.
        </div>
      )}
    </div>
  );
}

function TableCard({ t, onRegen, onDelete, slug, restaurantName }: { t: TableDoc; onRegen: (id: string) => void; onDelete: (id: string) => void; slug: string; restaurantName: string }) {
  const svgRef = useRef<HTMLDivElement>(null);
  const url = tableQrUrl(slug, t.number);

  const downloadPng = async () => {
    const svgEl = svgRef.current?.querySelector("svg");
    if (!svgEl) return;
    const xml = new XMLSerializer().serializeToString(svgEl);
    const svgUrl = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.onload = () => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const link = document.createElement("a");
      link.download = `${slug}-table-${t.number}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = svgUrl;
  };

  const printQr = () => {
    const w = window.open("", "_blank");
    if (!w) { toast.error("Popup blocked — allow popups to print"); return; }
    const svgEl = svgRef.current?.querySelector("svg");
    if (!svgEl) return;
    const xml = new XMLSerializer().serializeToString(svgEl);
    w.document.write(`<!doctype html><html><head><title>${restaurantName} — Table ${t.number}</title>
      <style>
        @page { margin: 18mm; }
        body { font-family: Georgia, serif; text-align: center; padding: 40px; color: #1A1106; }
        .frame { border: 2px solid var(--brand-secondary); padding: 28px 36px; max-width: 460px; margin: 0 auto; background: #FAF5EC; }
        .brand { letter-spacing: 0.4em; text-transform: uppercase; color: var(--brand-primary); font-size: 12px; }
        h1 { font-size: 48px; margin: 6px 0 0; color: var(--brand-primary); }
        .sub { font-style: italic; color: #8A6A1B; margin-top: 10px; font-size: 14px; }
        .qr { margin: 26px auto 12px; }
        .qr svg { width: 320px; height: 320px; }
        .url { font-size: 11px; color: #8A6A1B; word-break: break-all; margin-top: 6px; }
        .footer { font-size: 11px; color: #8A6A1B; margin-top: 16px; letter-spacing: 0.2em; text-transform: uppercase; }
      </style></head><body>
      <div class="frame">
        <div class="brand">${restaurantName}</div>
        <h1>Table ${t.number}</h1>
        <div class="sub">Scan to order from your seat</div>
        <div class="qr">${xml}</div>
        <div class="url">${url}</div>
        <div class="footer">Held for 10 minutes per scan</div>
      </div>
      <script>window.onload=()=>{setTimeout(()=>window.print(),300)};</script>
      </body></html>`);
    w.document.close();
  };

  const copyUrl = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("URL copied"); }
    catch { toast.error("Could not copy"); }
  };

  const live = t.live_session;
  const liveExp = live ? new Date(live.expires_at).getTime() : 0;
  const mins = live ? Math.max(0, Math.floor((liveExp - Date.now()) / 60000)) : 0;

  return (
    <div className="bg-white border border-bone rounded-2xl p-5 flex flex-col" data-testid={`table-card-${t.number}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-clay" />
            <h3 className="font-heading text-2xl font-semibold leading-none">Table {t.number}</h3>
          </div>
          <div className="text-xs text-stone mt-1.5 inline-flex items-center gap-1"><Users className="h-3 w-3" /> Seats {t.capacity}</div>
        </div>
        {live ? (
          <div className="text-right" data-testid={`table-live-${t.number}`}>
            <span className="inline-flex items-center gap-1 bg-ready/15 text-ready border border-ready/40 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              <span className="h-1.5 w-1.5 bg-ready rounded-full animate-pulse" /> Live
            </span>
            <div className="text-[10px] text-stone mt-1 inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {mins} min left</div>
          </div>
        ) : (
          <span className="bg-cream text-stone rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider">Free</span>
        )}
      </div>

      <div ref={svgRef} className="bg-cream rounded-xl p-4 flex items-center justify-center" data-testid={`qr-${t.number}`}>
        <QRCodeSVG value={url} size={180} bgColor="#FAF5EC" fgColor="#5C0E1B" level="M" includeMargin={false} />
      </div>

      <div className="mt-3 text-[10px] text-stone font-mono break-all" data-testid={`qr-url-${t.number}`}>{url}</div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button data-testid={`download-qr-${t.number}`} onClick={downloadPng} className="inline-flex items-center justify-center gap-1.5 bg-ink text-cream rounded-full py-2 text-xs font-medium hover:bg-clay">
          <Download className="h-3.5 w-3.5" /> PNG
        </button>
        <button data-testid={`print-qr-${t.number}`} onClick={printQr} className="inline-flex items-center justify-center gap-1.5 bg-white border border-bone rounded-full py-2 text-xs font-medium hover:bg-cream">
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
        <button data-testid={`copy-url-${t.number}`} onClick={copyUrl} className="inline-flex items-center justify-center gap-1.5 bg-white border border-bone rounded-full py-2 text-xs font-medium hover:bg-cream">
          <QrCode className="h-3.5 w-3.5" /> Copy URL
        </button>
        <button data-testid={`regen-qr-${t.number}`} onClick={() => onRegen(t.id)} className="inline-flex items-center justify-center gap-1.5 bg-white border border-bone rounded-full py-2 text-xs font-medium hover:bg-cream text-stone">
          <RefreshCw className="h-3.5 w-3.5" /> Rotate
        </button>
      </div>
      <button
        data-testid={`delete-table-${t.number}`}
        onClick={() => { if (confirm(`Remove table ${t.number}? This invalidates its QR.`)) onDelete(t.id); }}
        className="mt-3 self-end inline-flex items-center gap-1 text-xs text-alert hover:underline"
      >
        <Trash2 className="h-3 w-3" /> Delete
      </button>
    </div>
  );
}
