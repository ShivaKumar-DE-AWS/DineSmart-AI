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

function generateQrHtml(titleText: string, subtitleText: string, qrUrl: string, restaurantName: string, isTakeaway: boolean): string {
  return `<!doctype html><html><head><title>${restaurantName} — QR</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Playfair+Display:ital,wght@0,700;1,600&display=swap" rel="stylesheet">
    <style>
      @page { margin: 0; size: 1200px 1800px; }
      body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #000; font-family: 'Inter', sans-serif; color: #fff; }
      .card { width: 1100px; height: 1700px; background: #080808; border: 4px solid #B58A43; box-sizing: border-box; display: flex; flex-direction: column; padding: 60px; position: relative; border-radius: 40px; box-shadow: inset 0 0 40px rgba(181, 138, 67, 0.1); }
      .table-badge { position: absolute; top: 0; left: 50%; transform: translate(-50%, -50%); background: #B58A43; color: #000; font-size: 42px; font-weight: 900; padding: 15px 50px; border-radius: 50px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
      .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
      .logo-left { font-family: 'Playfair Display', serif; font-size: 52px; font-weight: 700; color: #B58A43; text-align: center; line-height: 1.1; }
      .logo-left span { font-size: 18px; font-family: 'Inter', sans-serif; font-weight: 400; color: #aaa; letter-spacing: 6px; display: block; margin-top: 10px; text-transform: uppercase; }
      .logo-right { font-size: 44px; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 15px; }
      .logo-right span { color: #6BAF36; }
      .title { text-align: center; margin-bottom: 50px; position: relative; }
      .title::before, .title::after { content: ''; position: absolute; top: 50%; width: 250px; height: 2px; background: rgba(181, 138, 67, 0.3); }
      .title::before { left: 0; } .title::after { right: 0; }
      .title h1 { color: #6BAF36; font-size: 64px; margin: 0; font-weight: 900; letter-spacing: 2px; text-shadow: 0 0 20px rgba(107, 175, 54, 0.3); }
      .title p { color: #ccc; font-size: 28px; margin: 10px 0 0 0; }
      .main-content { display: flex; justify-content: space-between; flex: 1; }
      .col { width: 260px; }
      .col-title { background: #B58A43; color: #000; font-weight: 700; font-size: 18px; padding: 8px 16px; text-align: center; border-radius: 8px; margin-bottom: 40px; display: inline-block; }
      .step { margin-bottom: 35px; }
      .step-icon { width: 50px; height: 50px; border: 2px solid #6BAF36; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #6BAF36; font-size: 24px; margin-bottom: 12px; }
      .step h3 { font-size: 16px; color: #B58A43; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 1px; }
      .step p { font-size: 14px; color: #aaa; margin: 0; line-height: 1.5; }
      .qr-center { display: flex; flex-direction: column; align-items: center; width: 420px; }
      .qr-box { background: #fff; padding: 25px; border-radius: 30px; box-shadow: 0 0 50px rgba(107, 175, 54, 0.2); margin-bottom: 40px; position: relative; border: 6px solid #6BAF36; }
      .icons-row { display: flex; justify-content: space-between; width: 100%; margin-bottom: 40px; color: #6BAF36; font-size: 14px; text-align: center; font-weight: 600; }
      .icon-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
      .icon-item span { font-size: 28px; }
      .slogan { font-family: 'Playfair Display', serif; font-style: italic; font-size: 42px; color: #fff; text-align: center; line-height: 1.3; }
      .slogan span { color: #6BAF36; }
      .caution { background: #FAF5EC; border-radius: 12px; padding: 15px 25px; display: flex; align-items: center; gap: 20px; width: 100%; box-sizing: border-box; margin-bottom: 30px; margin-top: auto; border: 2px solid #B58A43; }
      .caution-icon { background: #D32F2F; color: #fff; width: 70px; height: 70px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; flex-shrink: 0; }
      .caution-icon span { font-size: 32px; line-height: 1; margin-bottom: -2px; }
      .caution-text { color: #000; font-size: 18px; flex: 1; font-weight: 500; }
      .caution-text strong { color: #D32F2F; font-weight: 900; }
      .caution-domain { border: 2px dashed #000; border-radius: 8px; padding: 10px 15px; color: #000; font-weight: 800; font-size: 16px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .caution-domain .url { color: #6BAF36; }
      .footer { display: flex; justify-content: space-between; align-items: center; font-size: 20px; color: #B58A43; font-weight: 600; letter-spacing: 1px; }
    </style></head><body>
    <div class="card">
      <div class="table-badge">${titleText}</div>
      <div class="header">
        <div class="logo-left">${restaurantName.toUpperCase()}<br><span>Exclusive</span></div>
        <div class="logo-right">🍽️ SmartDine <span>AI</span></div>
      </div>
      <div class="title">
        <h1>SCAN TO ORDER</h1>
        <p>${subtitleText}</p>
      </div>
      <div class="main-content">
        <div class="col" style="text-align: left;">
          <div class="col-title">HOW TO ORDER</div>
          <div class="step"><div class="step-icon">📱</div><h3>1. Scan</h3><p>Scan the QR code from your table.</p></div>
          <div class="step"><div class="step-icon">💬</div><h3>2. Chat or Talk</h3><p>Chat or talk with our AI Waiter.</p></div>
          <div class="step"><div class="step-icon">📖</div><h3>3. Explore & Order</h3><p>Explore the menu, get recommendations and add to cart.</p></div>
          <div class="step"><div class="step-icon">💳</div><h3>4. Pay Securely</h3><p>Make secure payment and place your order.</p></div>
        </div>
        <div class="qr-center">
          <div class="qr-box">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=380x380&data=${encodeURIComponent(qrUrl)}&color=000000&bgcolor=ffffff&qzone=1" alt="QR" style="display:block;" />
          </div>
          <div class="icons-row">
            <div class="icon-item"><span>📱</span>SCAN</div>
            <div class="icon-item"><span>🛎️</span>ORDER</div>
            <div class="icon-item"><span>💳</span>PAY</div>
            <div class="icon-item"><span>✨</span>ENJOY</div>
          </div>
          <div class="slogan">We serve,<br><span>you enjoy! ♥</span></div>
        </div>
        <div class="col" style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
          <div class="col-title">WHY CHOOSE US?</div>
          <div class="step" style="display:flex; flex-direction:column; align-items:flex-end;"><div class="step-icon">⭐</div><p>Personalized<br>Recommendations</p></div>
          <div class="step" style="display:flex; flex-direction:column; align-items:flex-end;"><div class="step-icon">⚡</div><p>Faster<br>Service</p></div>
          <div class="step" style="display:flex; flex-direction:column; align-items:flex-end;"><div class="step-icon">🛡️</div><p>Hygienic &<br>Contactless</p></div>
          <div class="step" style="display:flex; flex-direction:column; align-items:flex-end;"><div class="step-icon">😊</div><p>Better Dining<br>Experience</p></div>
        </div>
      </div>
      <div class="caution">
        <div class="caution-icon"><span>!</span>CAUTION</div>
        <div class="caution-text">Preview the QR Link Generator before clicking the link to <strong>avoid QR scams.</strong></div>
        <div class="caution-domain"><span>✅ Verify Link</span><span class="url">smartdineai.co.in</span></div>
      </div>
      <div class="footer">
        <div>🌐 www.smartdineai.co.in</div>
        <div>Thank you for dining with us!</div>
        <div>📸 @smartdine.ai</div>
      </div>
    </div>
    <script>window.onload=()=>{setTimeout(()=>window.print(),800)};</script>
    </body></html>`;
}

function printTakeawayMenuQr(slug: string, restaurantName: string) {
  let menuUrl = takeawayMenuUrl(slug);
  const w = window.open("", "_blank");
  if (!w) { toast.error("Popup blocked — allow popups to print"); return; }
  w.document.write(generateQrHtml("TAKEAWAY MENU", "Order from anywhere.", menuUrl, restaurantName, true));
  w.document.close();
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

      {isLoading && <div className="text-stone">Loading tables…</div>}

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
          <div className="bg-cream rounded-xl p-4 flex items-center justify-center mb-3">
            <QRCodeSVG value={takeawayMenuUrl(slug)} size={180} bgColor="#FAF5EC" fgColor="#2D6A4F" level="M" includeMargin={false} />
          </div>
          <p className="text-[10px] text-stone text-center mb-3">Scan to browse menu &amp; place takeaway order</p>
          <div className="mt-auto flex gap-2">
            <button onClick={() => printTakeawayMenuQr(slug, restaurantName)} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 text-white rounded-full py-2 text-xs font-medium hover:bg-emerald-700">
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
    const svgEl = svgRef.current?.querySelector("svg");
    if (!svgEl) return;
    const xml = new XMLSerializer().serializeToString(svgEl);
    const svgUrl = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.onload = () => {
      const w = 1200, h = 1800;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      // Background
      ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, w, h);
      
      // Inner Card
      ctx.fillStyle = "#080808";
      ctx.beginPath(); ctx.roundRect(40, 40, w - 80, h - 80, 40); ctx.fill();
      ctx.strokeStyle = "#B58A43"; ctx.lineWidth = 4; ctx.stroke();
      
      // Table Badge
      ctx.fillStyle = "#B58A43";
      ctx.beginPath(); ctx.roundRect(w / 2 - 160, 15, 320, 80, 40); ctx.fill();
      ctx.fillStyle = "#000000"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "900 36px sans-serif";
      ctx.fillText(`TABLE ${t.number}`, w / 2, 55);
      
      // Header
      ctx.fillStyle = "#B58A43"; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.font = "bold 52px serif";
      ctx.fillText((restaurantName || "RESTAURANT").toUpperCase(), 100, 120);
      ctx.fillStyle = "#AAAAAA"; ctx.font = "400 18px sans-serif";
      ctx.fillText("E X C L U S I V E", 100, 180);
      
      ctx.textAlign = "right"; ctx.fillStyle = "#FFFFFF"; ctx.font = "900 44px sans-serif";
      ctx.fillText("🍽️ SmartDine ", w - 160, 120);
      ctx.fillStyle = "#6BAF36";
      ctx.fillText("AI", w - 100, 120);
      
      // Title
      ctx.textAlign = "center";
      ctx.fillStyle = "#6BAF36"; ctx.font = "900 64px sans-serif";
      ctx.fillText("SCAN TO ORDER", w / 2, 280);
      ctx.fillStyle = "#CCCCCC"; ctx.font = "28px sans-serif";
      ctx.fillText("Talk. Order. Enjoy.", w / 2, 350);
      
      // QR Code Box
      const qrSize = 360, qrX = (w - qrSize) / 2, qrY = 460;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath(); ctx.roundRect(qrX - 25, qrY - 25, qrSize + 50, qrSize + 50, 30); ctx.fill();
      ctx.strokeStyle = "#6BAF36"; ctx.lineWidth = 6; ctx.stroke();
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      
      // Slogan
      ctx.fillStyle = "#FFFFFF"; ctx.font = "italic 42px serif";
      ctx.fillText("We serve,", w / 2, 920);
      ctx.fillStyle = "#6BAF36";
      ctx.fillText("you enjoy! ♥", w / 2, 970);
      
      // Left Column (HOW TO ORDER)
      ctx.textAlign = "left";
      ctx.fillStyle = "#B58A43";
      ctx.beginPath(); ctx.roundRect(100, 480, 200, 40, 8); ctx.fill();
      ctx.fillStyle = "#000000"; ctx.font = "bold 18px sans-serif"; ctx.textBaseline = "middle";
      ctx.fillText("HOW TO ORDER", 125, 500);
      
      const leftSteps = [
        { i: "📱", t: "1. Scan", d: "Scan the QR code from your table." },
        { i: "💬", t: "2. Chat or Talk", d: "Chat or talk with our AI Waiter." },
        { i: "📖", t: "3. Explore & Order", d: "Explore the menu, get recommendations." },
        { i: "💳", t: "4. Pay Securely", d: "Make secure payment and place order." }
      ];
      ctx.textBaseline = "top";
      leftSteps.forEach((s, idx) => {
        const y = 560 + idx * 130;
        ctx.fillStyle = "#6BAF36"; ctx.font = "40px sans-serif"; ctx.fillText(s.i, 100, y);
        ctx.fillStyle = "#B58A43"; ctx.font = "16px sans-serif"; ctx.fillText(s.t, 100, y + 55);
        ctx.fillStyle = "#AAAAAA"; ctx.font = "14px sans-serif"; ctx.fillText(s.d, 100, y + 75);
      });
      
      // Right Column (WHY CHOOSE US?)
      ctx.textAlign = "right";
      ctx.fillStyle = "#B58A43";
      ctx.beginPath(); ctx.roundRect(w - 300, 480, 200, 40, 8); ctx.fill();
      ctx.fillStyle = "#000000"; ctx.font = "bold 18px sans-serif"; ctx.textBaseline = "middle";
      ctx.fillText("WHY CHOOSE US?", w - 115, 500);
      
      const rightSteps = [
        { i: "⭐", t: "Personalized", d: "Recommendations" },
        { i: "⚡", t: "Faster", d: "Service" },
        { i: "🛡️", t: "Hygienic &", d: "Contactless" },
        { i: "😊", t: "Better Dining", d: "Experience" }
      ];
      ctx.textBaseline = "top";
      rightSteps.forEach((s, idx) => {
        const y = 560 + idx * 130;
        ctx.fillStyle = "#6BAF36"; ctx.font = "40px sans-serif"; ctx.fillText(s.i, w - 100, y);
        ctx.fillStyle = "#B58A43"; ctx.font = "16px sans-serif"; ctx.fillText(s.t, w - 100, y + 55);
        ctx.fillStyle = "#AAAAAA"; ctx.font = "14px sans-serif"; ctx.fillText(s.d, w - 100, y + 75);
      });
      
      // Caution Box
      ctx.textAlign = "left";
      ctx.fillStyle = "#FAF5EC";
      ctx.beginPath(); ctx.roundRect(100, 1550, w - 200, 90, 12); ctx.fill();
      ctx.strokeStyle = "#B58A43"; ctx.lineWidth = 2; ctx.stroke();
      
      ctx.fillStyle = "#D32F2F";
      ctx.beginPath(); ctx.roundRect(100, 1550, 100, 90, 8); ctx.fill();
      ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "bold 14px sans-serif"; ctx.fillText("CAUTION", 150, 1595);
      
      ctx.fillStyle = "#000000"; ctx.textAlign = "left"; ctx.font = "500 18px sans-serif";
      ctx.fillText("Preview the QR Link Generator before clicking the link to avoid QR scams.", 220, 1595);
      
      // Footer
      ctx.fillStyle = "#B58A43"; ctx.textAlign = "center"; ctx.font = "600 20px sans-serif";
      ctx.fillText("🌐 www.smartdineai.co.in", 250, 1720);
      ctx.fillText("Thank you for dining with us!", w / 2, 1720);
      ctx.fillText("📸 @smartdine.ai", w - 250, 1720);
      
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
    w.document.write(generateQrHtml(`TABLE ${t.number}`, "Talk. Order. Enjoy.", url, restaurantName, false));
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
