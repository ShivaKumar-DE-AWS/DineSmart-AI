"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { QRCodeSVG } from "qrcode.react";
import { useRef, useCallback } from "react";
import { Download, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

function customerOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export default function TableQrCardPage() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const cardRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["table-by-token", token],
    queryFn: () => api<{ table: any; restaurant: any }>(`/api/tables/by-token/${token}`),
    enabled: !!token,
  });

  const table = data?.table;
  const restaurant = data?.restaurant;
  const name = restaurant?.name || slug?.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
  const url = `${customerOrigin()}/r/${slug}?t=${token}`;

  const downloadPng = useCallback(() => {
    const svgEl = cardRef.current?.querySelector("svg");
    if (!svgEl) return;
    const xml = new XMLSerializer().serializeToString(svgEl);
    const svgUrl = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.onload = () => {
      const w = 1200, h = 1600;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      // Background (Black)
      ctx.fillStyle = "#0B0B0B"; ctx.fillRect(0, 0, w, h);
      
      // Gold Border
      ctx.strokeStyle = "#A88B46"; ctx.lineWidth = 12;
      ctx.strokeRect(40, 40, w - 80, h - 80);
      
      // Header Text
      ctx.fillStyle = "#A88B46"; ctx.textAlign = "center";
      ctx.font = "bold 64px sans-serif";
      ctx.fillText(name.toUpperCase(), w / 2, 160);
      
      // Divider
      ctx.strokeStyle = "#A88B46"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w / 2 - 150, 200); ctx.lineTo(w / 2 + 150, 200); ctx.stroke();
      
      // Table Number Pill
      ctx.fillStyle = "#A88B46";
      const pillW = 360, pillH = 100;
      ctx.beginPath();
      ctx.roundRect(w / 2 - pillW / 2, 250, pillW, pillH, 50);
      ctx.fill();
      
      ctx.fillStyle = "#0B0B0B";
      ctx.font = "900 64px sans-serif";
      ctx.fillText(`TABLE ${table?.number || "?"}`, w / 2, 325);
      
      // QR Code Box (Green Border)
      const qrSize = 600, qrX = (w - qrSize) / 2, qrY = 420;
      ctx.fillStyle = "#FAF5EC";
      ctx.fillRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      ctx.strokeStyle = "#60B634"; ctx.lineWidth = 12;
      ctx.strokeRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
      
      // Scan to order text
      ctx.fillStyle = "#60B634";
      ctx.font = "900 84px sans-serif";
      ctx.fillText("SCAN TO ORDER", w / 2, 1220);
      
      // Tagline
      ctx.fillStyle = "#FAF5EC";
      ctx.font = "36px sans-serif";
      ctx.fillText("Talk. Order. Enjoy.", w / 2, 1290);
      
      // Footer
      ctx.fillStyle = "#A88B46";
      ctx.font = "28px sans-serif";
      ctx.fillText("Powered by SmartDine AI | smartdineai.co.in", w / 2, 1500);
      
      const link = document.createElement("a");
      link.download = `${slug}-table-${table?.number || "card"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = svgUrl;
  }, [slug, name, table?.number]);

  const printCard = useCallback(() => {
    const w = window.open("", "_blank");
    if (!w) return;
    const svgEl = cardRef.current?.querySelector("svg");
    const xml = svgEl ? new XMLSerializer().serializeToString(svgEl) : "";
    w.document.write(`<!doctype html><html><head><title>${name} — Table ${table?.number || "?"}</title>
      <style>
        @page { margin: 0; size: 1200px 1600px; }
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #0B0B0B; font-family: sans-serif; }
        .card { width: 1200px; height: 1600px; background: #0B0B0B; padding: 40px; box-sizing: border-box; position: relative; }
        .inner { border: 12px solid #A88B46; height: 100%; display: flex; flex-direction: column; align-items: center; padding: 80px 60px; box-sizing: border-box; }
        .name { font-size: 64px; font-weight: bold; color: #A88B46; text-transform: uppercase; letter-spacing: 2px; }
        .divider { width: 300px; height: 2px; background: #A88B46; margin: 30px auto 50px auto; }
        .table-pill { background: #A88B46; color: #0B0B0B; font-size: 64px; font-weight: 900; padding: 20px 60px; border-radius: 60px; margin-bottom: 70px; display: inline-block; }
        
        .qr-wrap { padding: 20px; background: #FAF5EC; border: 12px solid #60B634; width: fit-content; margin: 0 auto; }
        .qr-wrap svg { width: 600px; height: 600px; display: block; }
        
        .scan-title { font-size: 84px; font-weight: 900; color: #60B634; margin-top: 100px; letter-spacing: 2px; text-align: center; }
        .scan-sub { font-size: 36px; color: #FAF5EC; margin-top: 20px; text-align: center; }
        
        .footer-text { font-size: 28px; color: #A88B46; margin-top: auto; text-align: center; }
      </style></head><body>
      <div class="card">
        <div class="inner">
          <div class="name">${name}</div>
          <div class="divider"></div>
          
          <div class="table-pill">TABLE ${table?.number || "?"}</div>
          
          <div class="qr-wrap">${xml}</div>
          
          <div class="scan-title">SCAN TO ORDER</div>
          <div class="scan-sub">Talk. Order. Enjoy.</div>
          
          <div class="footer-text">Powered by SmartDine AI | smartdineai.co.in</div>
        </div>
      </div>
      <script>window.onload=()=>{setTimeout(()=>window.print(),300)};</script>
      </body></html>`);
    w.document.close();
  }, [name, table?.number]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
        <div className="text-[#A88B46] text-lg">Loading table info…</div>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-white text-2xl font-bold">Table not found</div>
        <p className="text-[#FAF5EC]">This QR token is invalid or the table was removed.</p>
        <Link href={`/r/${slug}`} className="text-[#A88B46] underline mt-4">Back to restaurant</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center p-4 md:p-8">
      <div className="max-w-2xl w-full">
        <Link href={`/admin/tables`} className="inline-flex items-center gap-1 text-[#A88B46] text-sm mb-6 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to tables
        </Link>
      </div>
      
      {/* On-screen Preview matching the new image layout */}
      <div ref={cardRef} className="bg-[#0B0B0B] p-2 max-w-xl w-full flex flex-col items-center shadow-2xl relative aspect-[3/4]" data-testid="qr-card">
        <div className="border-[6px] border-[#A88B46] w-full h-full p-8 md:p-12 flex flex-col items-center">
          
          <div className="text-center w-full">
            <div className="text-3xl md:text-5xl font-bold text-[#A88B46] uppercase tracking-wide">{name}</div>
            <div className="w-24 md:w-32 h-0.5 bg-[#A88B46] mx-auto my-4 md:my-6" />
          </div>
          
          <div className="bg-[#A88B46] text-[#0B0B0B] font-black text-3xl md:text-5xl px-8 md:px-12 py-3 rounded-full mb-8 md:mb-12">
            TABLE {table.number}
          </div>
          
          <div className="p-3 bg-[#FAF5EC] border-[6px] md:border-[8px] border-[#60B634] w-fit mx-auto aspect-square flex items-center justify-center">
            <QRCodeSVG value={url} size={240} bgColor="#FAF5EC" fgColor="#5C0E1B" level="M" />
          </div>
          
          <div className="text-center mt-10 md:mt-16 w-full">
            <div className="text-4xl md:text-6xl font-black text-[#60B634] tracking-wide whitespace-nowrap">SCAN TO ORDER</div>
            <div className="text-lg md:text-2xl text-[#FAF5EC] mt-3">Talk. Order. Enjoy.</div>
          </div>
          
          <div className="mt-auto pt-8">
            <p className="text-xs md:text-sm text-[#A88B46] text-center">Powered by SmartDine AI | smartdineai.co.in</p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex gap-4">
        <button onClick={downloadPng} className="inline-flex items-center gap-2 bg-[#A88B46] text-[#0B0B0B] rounded-full px-8 py-3.5 text-sm font-bold uppercase tracking-widest hover:bg-white transition-colors">
          <Download className="h-4 w-4" /> Download PNG
        </button>
        <button onClick={printCard} className="inline-flex items-center gap-2 bg-transparent border-2 border-[#A88B46] text-[#A88B46] rounded-full px-8 py-3.5 text-sm font-bold uppercase tracking-widest hover:bg-[#A88B46]/10 transition-colors">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>
    </div>
  );
}
