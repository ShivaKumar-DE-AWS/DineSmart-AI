"use client";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession } from "@/stores/session";
import { getRestaurantConfig } from "@/hooks/useRestaurantConfig";
import { toast } from "sonner";
import { Plus, QrCode, RefreshCw, Trash2, Download, Printer, Users, Clock, MapPin, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { generateQrHtml } from "@/lib/qr-template";

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

function tableQrUrl(slug: string, qrToken: string): string {
  const finalSlug = slug === "mehfil-hyderabad" ? "mehfil" : slug;
  if (typeof window !== "undefined" && window.location.hostname.includes("smartdineai.co.in")) {
    return `https://${finalSlug}.smartdineai.co.in?t=${qrToken}`;
  }
  return `${customerOrigin()}/r/${finalSlug}?t=${qrToken}`;
}

function takeawayMenuUrl(slug: string): string {
  const finalSlug = slug === "mehfil-hyderabad" ? "mehfil" : slug;
  if (typeof window !== "undefined" && window.location.hostname.includes("smartdineai.co.in")) {
    return `https://${finalSlug}.smartdineai.co.in?type=takeaway`;
  }
  return `${customerOrigin()}/r/${finalSlug}?type=takeaway`;
}

function serializeQrSvg(containerEl: HTMLElement | null): string {
  const svgEl = containerEl?.querySelector("svg");
  if (!svgEl) return "";
  return new XMLSerializer().serializeToString(svgEl);
}


export default function AdminTables() {
  const qc = useQueryClient();
  const slug = useRestaurantSlug();
  const restaurantName = useRestaurantName();
  const { user } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-tables", user?.restaurant_id],
    queryFn: () => api<{ tables: TableDoc[] }>("/api/tables"),
    refetchInterval: 10000,
  });
  const { data: floorMapData } = useQuery({
    queryKey: ["admin-floor-map", user?.restaurant_id],
    queryFn: () => api<{ tables: any[] }>("/api/tables/live-floor-map"),
    refetchInterval: 5000,
  });
  const liveFloorTables = floorMapData?.tables || [];
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

      {isLoading && <div className="text-stone">Loading tables...</div>}

      {/* Live Floor Map Section */}
      <div className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6 mb-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-500" /> Live Floor Management Map
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Real-time monitoring of active table sessions, bill requests, and overtime warnings (&gt; 20 mins).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-emerald-500"></span> Active (🟢)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-yellow-500"></span> Bill Req (🟡)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-red-500 animate-ping"></span> Overtime (🔴)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-zinc-600"></span> Empty</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {liveFloorTables.map((lt) => {
            let bgStyle = "bg-zinc-800/80 border-zinc-700 text-zinc-400";
            let statusText = "Empty";
            if (lt.color_code === "green") {
              bgStyle = "bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-lg shadow-emerald-500/10";
              statusText = "🟢 Active";
            } else if (lt.color_code === "yellow") {
              bgStyle = "bg-yellow-950/80 border-yellow-500/80 text-yellow-300 shadow-lg shadow-yellow-500/10";
              statusText = "🟡 Bill Req";
            } else if (lt.color_code === "red") {
              bgStyle = "bg-red-950/90 border-red-500 text-red-200 shadow-lg shadow-red-500/20 animate-pulse";
              statusText = "🔴 OVERTIME";
            }
            return (
              <div key={lt.id} className={`border rounded-2xl p-3 flex flex-col justify-between transition-all ${bgStyle}`}>
                <div className="flex justify-between items-start">
                  <span className="font-black text-lg text-white">T{lt.number}</span>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/30">
                    {statusText}
                  </span>
                </div>
                <div className="mt-2 text-xs opacity-80 truncate">
                  {lt.active_session?.customer_name || `${lt.capacity} seats`}
                </div>
                {lt.active_order && (
                  <div className="mt-1 font-mono font-bold text-xs">
                    ₹{lt.active_order.total}
                  </div>
                )}
              </div>
            );
          })}
          {liveFloorTables.length === 0 && (
            <div className="col-span-full py-8 text-center text-zinc-500 text-xs">
              No floor tables found. Add tables below to view the live map.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Takeaway QR card — always shown */}
        <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 border-2 border-emerald-400/30 rounded-2xl p-5 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 mt-2 mr-2">
            <span className="bg-emerald-500/20 text-emerald-600 border border-emerald-400/30 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">Takeaway</span>
          </div>
          <div className="flex items-center gap-2 mb-7">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <QrCode className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-heading font-semibold leading-tight">Takeaway Menu QR</h3>
              <p className="text-[10px] text-stone">All-orders takeaway link</p>
            </div>
          </div>
          <div data-testid="takeaway-qr-wrap" className="bg-cream rounded-xl p-4 flex items-center justify-center mb-3">
            <QRCodeSVG value={takeawayMenuUrl(slug)} size={180} bgColor="#FAF5EC" fgColor="#2D6A4F" level="M" includeMargin={false} />
          </div>
          <p className="text-[10px] text-stone text-center mb-3">Scan to browse menu &amp; place takeaway order</p>
          <div className="mt-auto flex gap-2">
            <button onClick={() => {
              const container = document.querySelector('[data-testid="takeaway-qr-wrap"]');
              const svgMarkup = serializeQrSvg(container as HTMLElement);
              if (!svgMarkup) { toast.error("QR not ready"); return; }
              const w = window.open("", "_blank");
              if (!w) { toast.error("Popup blocked"); return; }
              w.document.write(generateQrHtml("TAKEAWAY MENU", svgMarkup, restaurantName));
              w.document.close();
            }} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 text-white rounded-full py-2 text-xs font-medium hover:bg-emerald-700">
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
            <button onClick={async () => {
              try { await navigator.clipboard.writeText(takeawayMenuUrl(slug)); toast.success("Menu URL copied"); }
              catch { toast.error("Could not copy"); }
            }} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white border border-bone rounded-full py-2 text-xs font-medium hover:bg-cream">
              <QrCode className="h-3.5 w-3.5" /> Copy URL
            </button>
          </div>
        </div>
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
  const url = tableQrUrl(slug, t.qr_token);

  const downloadPng = async () => {
    const svgMarkup = serializeQrSvg(svgRef.current);
    if (!svgMarkup) { toast.error("QR not ready yet"); return; }
    const html = generateQrHtml(`TABLE ${t.number}`, svgMarkup, restaurantName);
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-9999px;width:900px;height:1400px;border:none;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open(); doc.write(html.replace(/<script[\s\S]*?<\/script>/gi, "")); doc.close();
    await new Promise(r => setTimeout(r, 1500));
    try {
      const { default: html2canvas } = await import("html2canvas");
      const card = doc.querySelector(".card") as HTMLElement;
      if (!card) { toast.error("Could not render"); return; }
      const canvas = await html2canvas(card, { scale: 2, backgroundColor: "#0D0D0D", useCORS: true });
      const link = document.createElement("a");
      link.download = `${slug}-table-${t.number}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      // Fallback: render QR SVG on simple canvas
      const svgEl = svgRef.current?.querySelector("svg");
      if (!svgEl) return;
      const xml = new XMLSerializer().serializeToString(svgEl);
      const svgUrl = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
      const img = new Image();
      img.onload = () => {
        const cw = 900, ch = 900;
        const canvas = document.createElement("canvas");
        canvas.width = cw; canvas.height = ch;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#FAF5EC"; ctx.fillRect(0, 0, cw, ch);
        const qrSize = 700;
        ctx.drawImage(img, (cw - qrSize) / 2, 30, qrSize, qrSize);
        ctx.fillStyle = "#0D0D0D"; ctx.textAlign = "center"; ctx.font = "bold 36px sans-serif";
        ctx.fillText(`${restaurantName} â€” Table ${t.number}`, cw / 2, qrSize + 70);
        ctx.font = "20px sans-serif"; ctx.fillStyle = "#666";
        ctx.fillText(url, cw / 2, qrSize + 110);
        const link = document.createElement("a");
        link.download = `${slug}-table-${t.number}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      };
      img.src = svgUrl;
    } finally {
      document.body.removeChild(iframe);
    }
  };

  const printQr = () => {
    const svgMarkup = serializeQrSvg(svgRef.current);
    if (!svgMarkup) { toast.error("QR not ready yet"); return; }
    const w = window.open("", "_blank");
    if (!w) { toast.error("Popup blocked — allow popups to print"); return; }
    w.document.write(generateQrHtml(`TABLE ${t.number}`, svgMarkup, restaurantName));
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

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button data-testid={`download-qr-${t.number}`} onClick={downloadPng} className="inline-flex items-center justify-center gap-1.5 bg-ink text-cream rounded-full py-2 text-xs font-medium hover:bg-clay">
          <Download className="h-3.5 w-3.5" /> PNG
        </button>
        <button data-testid={`print-qr-${t.number}`} onClick={printQr} className="inline-flex items-center justify-center gap-1.5 bg-white border border-bone rounded-full py-2 text-xs font-medium hover:bg-cream">
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
        <button data-testid={`card-qr-${t.number}`} onClick={() => window.open(`/r/${slug}/qr/${t.qr_token}`, '_blank')} className="inline-flex items-center justify-center gap-1.5 bg-white border border-bone rounded-full py-2 text-xs font-medium hover:bg-cream">
          <Eye className="h-3.5 w-3.5" /> Card
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
