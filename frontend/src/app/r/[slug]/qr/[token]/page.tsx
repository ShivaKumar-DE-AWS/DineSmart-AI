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
      const w = 1200, h = 1800;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      // Background
      ctx.fillStyle = "#1A1106"; ctx.fillRect(0, 0, w, h);
      
      // Border
      ctx.strokeStyle = "#8A6A1B"; ctx.lineWidth = 12;
      ctx.strokeRect(40, 40, w - 80, h - 80);
      ctx.strokeStyle = "#DDB85C"; ctx.lineWidth = 4;
      ctx.strokeRect(52, 52, w - 104, h - 104);
      
      // Header
      ctx.fillStyle = "#DDB85C"; ctx.textAlign = "center";
      ctx.font = "bold 64px Georgia, serif";
      ctx.fillText(name.toUpperCase(), w / 2, 180);
      ctx.font = "italic 28px Georgia, serif";
      ctx.fillStyle = "#FAF5EC";
      ctx.fillText("MULTI CUISINE RESTAURANT", w / 2, 230);
      
      ctx.strokeStyle = "#8A6A1B"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w / 2 - 250, 260); ctx.lineTo(w / 2 + 250, 260); ctx.stroke();
      
      // Scan to order text
      ctx.fillStyle = "#4ADE80";
      ctx.font = "bold 72px sans-serif";
      ctx.fillText("SCAN TO ORDER", w / 2, 360);
      ctx.fillStyle = "#FAF5EC";
      ctx.font = "32px sans-serif";
      ctx.fillText(`Talk. Order. Enjoy. (Table ${table?.number || "?"})`, w / 2, 420);
      
      // QR Code
      const qrSize = 500, qrX = (w - qrSize) / 2, qrY = 500;
      ctx.fillStyle = "#FAF5EC";
      ctx.fillRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      ctx.strokeStyle = "#4ADE80"; ctx.lineWidth = 6;
      ctx.strokeRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
      
      // Icons below QR
      ctx.fillStyle = "#DDB85C";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("We serve, you enjoy! ♥", w / 2, 1100);
      
      // Caution Box
      ctx.fillStyle = "#2D1A1A";
      ctx.fillRect(w / 2 - 350, 1160, 700, 160);
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 4;
      ctx.strokeRect(w / 2 - 350, 1160, 700, 160);
      ctx.fillStyle = "#EF4444";
      ctx.fillRect(w / 2 - 350, 1160, 200, 160);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("CAUTION", w / 2 - 250, 1260);
      ctx.fillStyle = "#FAF5EC";
      ctx.font = "26px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Preview the QR Link Generator", w / 2 - 120, 1220);
      ctx.fillText("before clicking the link", w / 2 - 120, 1260);
      ctx.fillText("to avoid QR scams.", w / 2 - 120, 1300);
      
      // Footer
      ctx.textAlign = "center";
      ctx.fillStyle = "#DDB85C";
      ctx.font = "italic 36px Georgia, serif";
      ctx.fillText("Thank you for dining with us!", w / 2, 1420);
      
      ctx.strokeStyle = "#8A6A1B"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w / 2 - 300, 1460); ctx.lineTo(w / 2 + 300, 1460); ctx.stroke();
      
      ctx.font = "24px sans-serif";
      const domain = name.toLowerCase().replace(/ /g, "");
      ctx.fillText(`www.${domain}.com   |   @${domain}`, w / 2, 1520);
      
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
    const domain = name.toLowerCase().replace(/ /g, "");
    w.document.write(`<!doctype html><html><head><title>${name} — Table ${table?.number || "?"}</title>
      <style>
        @page { margin: 0; size: 1200px 1800px; }
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1A1106; font-family: sans-serif; }
        .card { width: 1200px; height: 1800px; background: #1A1106; border: 12px solid #8A6A1B; box-sizing: border-box; position: relative; padding: 20px; overflow: hidden; }
        .inner { border: 4px solid #DDB85C; height: 100%; display: flex; flex-direction: column; align-items: center; padding: 60px; box-sizing: border-box; }
        .name { font-size: 64px; font-weight: bold; color: #DDB85C; font-family: Georgia, serif; text-transform: uppercase; }
        .subname { font-size: 28px; color: #FAF5EC; font-family: Georgia, serif; font-style: italic; margin-top: 10px; }
        .divider { width: 500px; height: 2px; background: #8A6A1B; margin: 30px auto; }
        
        .scan-title { font-size: 72px; font-weight: bold; color: #4ADE80; margin-top: 20px; text-align: center; }
        .scan-sub { font-size: 32px; color: #FAF5EC; margin-top: 10px; text-align: center; }
        
        .qr-wrap { margin: 60px auto; padding: 20px; background: #FAF5EC; border: 6px solid #4ADE80; border-radius: 20px; width: fit-content; }
        .qr-wrap svg { width: 500px; height: 500px; display: block; }
        
        .enjoy { font-size: 32px; color: #DDB85C; font-style: italic; font-family: Georgia, serif; margin: 40px 0; text-align: center; }
        
        .caution { display: flex; width: 700px; height: 160px; border: 4px solid #EF4444; background: #2D1A1A; margin: 0 auto; border-radius: 12px; overflow: hidden; }
        .caution-left { background: #EF4444; width: 200px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; }
        .caution-right { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0 40px; color: #FAF5EC; font-size: 24px; line-height: 1.5; }
        
        .footer-text { font-size: 36px; color: #DDB85C; font-family: Georgia, serif; font-style: italic; margin-top: auto; text-align: center; }
        .footer-div { width: 600px; height: 2px; background: #8A6A1B; margin: 30px auto; }
        .footer-social { font-size: 24px; color: #DDB85C; text-align: center; }
      </style></head><body>
      <div class="card">
        <div class="inner">
          <div class="name">${name}</div>
          <div class="subname">MULTI CUISINE RESTAURANT</div>
          <div class="divider"></div>
          
          <div class="scan-title">SCAN TO ORDER</div>
          <div class="scan-sub">Talk. Order. Enjoy. (Table ${table?.number || "?"})</div>
          
          <div class="qr-wrap">${xml}</div>
          
          <div class="enjoy">We serve, you enjoy! ♥</div>
          
          <div class="caution">
            <div class="caution-left">
              <div style="font-size: 60px;">⚠</div>
              <div style="font-size: 28px; font-weight: bold;">CAUTION</div>
            </div>
            <div class="caution-right">
              <div>Preview the QR Link Generator</div>
              <div>before clicking the link</div>
              <div style="color: #EF4444;">to avoid QR scams.</div>
            </div>
          </div>
          
          <div class="footer-text">Thank you for dining with us!</div>
          <div class="footer-div"></div>
          <div class="footer-social">www.${domain}.com &nbsp;&nbsp;|&nbsp;&nbsp; @${domain}</div>
        </div>
      </div>
      <script>window.onload=()=>{setTimeout(()=>window.print(),300)};</script>
      </body></html>`);
    w.document.close();
  }, [name, table?.number]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1106] flex items-center justify-center">
        <div className="text-[#DDB85C] text-lg">Loading table info…</div>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="min-h-screen bg-[#1A1106] flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-[#EF4444] text-2xl font-bold">Table not found</div>
        <p className="text-[#FAF5EC]">This QR token is invalid or the table was removed.</p>
        <Link href={`/r/${slug}`} className="text-[#DDB85C] underline mt-4">Back to restaurant</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0704] flex flex-col items-center p-4 md:p-8">
      <div className="max-w-3xl w-full">
        <Link href={`/admin/tables`} className="inline-flex items-center gap-1 text-[#DDB85C] text-sm mb-6 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to tables
        </Link>
      </div>
      <div ref={cardRef} className="bg-[#1A1106] border-[12px] border-[#8A6A1B] p-2 max-w-2xl w-full flex flex-col items-center shadow-2xl relative" data-testid="qr-card">
        <div className="border-[4px] border-[#DDB85C] w-full p-8 md:p-12 flex flex-col items-center">
          <div className="text-center">
            <div className="text-3xl md:text-5xl font-bold text-[#DDB85C] font-serif uppercase tracking-widest mb-2">{name}</div>
            <div className="text-sm text-[#FAF5EC] font-serif italic mb-6">MULTI CUISINE RESTAURANT</div>
            <div className="w-48 h-0.5 bg-[#8A6A1B] mx-auto my-6" />
            
            <div className="text-4xl md:text-5xl font-bold text-[#4ADE80] mt-6 tracking-wide">SCAN TO ORDER</div>
            <div className="text-lg md:text-xl text-[#FAF5EC] mt-2">Talk. Order. Enjoy. (Table {table.number})</div>
          </div>
          
          <div className="my-10 p-4 bg-[#FAF5EC] border-4 border-[#4ADE80] rounded-xl">
            <QRCodeSVG value={url} size={280} bgColor="#FAF5EC" fgColor="#1A1106" level="M" />
          </div>
          
          <div className="text-xl italic text-[#DDB85C] font-serif mb-10">We serve, you enjoy! ♥</div>
          
          <div className="flex w-full max-w-lg border-2 border-[#EF4444] rounded-lg overflow-hidden bg-[#2D1A1A]">
            <div className="bg-[#EF4444] text-white p-4 flex flex-col items-center justify-center w-32 shrink-0">
              <span className="text-4xl">⚠</span>
              <span className="font-bold tracking-wider text-sm mt-1">CAUTION</span>
            </div>
            <div className="p-4 text-[#FAF5EC] text-sm flex flex-col justify-center leading-relaxed">
              <span>Preview the QR Link Generator</span>
              <span>before clicking the link</span>
              <span className="text-[#EF4444]">to avoid QR scams.</span>
            </div>
          </div>
          
          <div className="w-64 h-px bg-[#8A6A1B] mx-auto mt-12 mb-6" />
          <p className="text-xl text-[#DDB85C] font-serif italic mb-6">Thank you for dining with us!</p>
          <div className="text-xs text-[#DDB85C] tracking-widest flex gap-4">
            <span>www.{name.toLowerCase().replace(/ /g, "")}.com</span>
            <span>|</span>
            <span>@{name.toLowerCase().replace(/ /g, "")}</span>
          </div>
        </div>
      </div>
      <div className="mt-8 flex gap-4">
        <button onClick={downloadPng} className="inline-flex items-center gap-2 bg-[#DDB85C] text-[#1A1106] rounded-full px-8 py-3.5 text-sm font-bold uppercase tracking-widest hover:bg-white transition-colors shadow-[0_0_20px_rgba(221,184,92,0.3)]">
          <Download className="h-4 w-4" /> Download PNG
        </button>
        <button onClick={printCard} className="inline-flex items-center gap-2 bg-transparent border-2 border-[#DDB85C] text-[#DDB85C] rounded-full px-8 py-3.5 text-sm font-bold uppercase tracking-widest hover:bg-[#DDB85C]/10 transition-colors">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>
    </div>
  );
}
