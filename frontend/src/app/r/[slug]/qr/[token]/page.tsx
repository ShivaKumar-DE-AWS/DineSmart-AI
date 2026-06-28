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
      ctx.fillStyle = "#FAF5EC"; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#5C0E1B"; ctx.lineWidth = 8;
      ctx.strokeRect(40, 40, w - 80, h - 80);
      ctx.fillStyle = "#5C0E1B"; ctx.textAlign = "center";
      ctx.font = "bold 48px Georgia, serif";
      ctx.fillText(name, w / 2, 160);
      ctx.strokeStyle = "#5C0E1B"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w / 2 - 120, 190); ctx.lineTo(w / 2 + 120, 190); ctx.stroke();
      ctx.font = "bold 96px Georgia, serif";
      ctx.fillText(`Table ${table?.number || "?"}`, w / 2, 310);
      const qrSize = 540, qrX = (w - qrSize) / 2, qrY = 400;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
      ctx.strokeStyle = "#5C0E1B"; ctx.lineWidth = 3;
      ctx.strokeRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16);
      ctx.fillStyle = "#5C0E1B";
      ctx.font = "italic 28px Georgia, serif";
      ctx.fillText("Scan to order from your seat", w / 2, 1040);
      ctx.font = "22px Georgia, serif";
      ctx.fillStyle = "#8A6A1B";
      ctx.fillText("No app. No signup. Just scan and enjoy.", w / 2, 1090);
      ctx.font = "18px Georgia, serif";
      ctx.fillStyle = "#8A6A1B";
      ctx.fillText("Powered by SmartDine AI", w / 2, h - 100);
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
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #FAF5EC; font-family: Georgia, serif; }
        .card { width: 1200px; height: 1600px; background: #FAF5EC; border: 8px solid #5C0E1B; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; }
        .name { font-size: 48px; font-weight: bold; color: #5C0E1B; margin-bottom: 10px; }
        .divider { width: 240px; height: 2px; background: #5C0E1B; margin: 10px auto; }
        .table-num { font-size: 96px; font-weight: bold; color: #5C0E1B; margin: 20px 0; }
        .qr-wrap { margin: 40px 0; }
        .qr-wrap svg { width: 540px; height: 540px; }
        .instruction { font-size: 28px; font-style: italic; color: #5C0E1B; margin-top: 20px; }
        .sub { font-size: 22px; color: #8A6A1B; margin-top: 8px; }
        .footer { font-size: 18px; color: #8A6A1B; margin-top: auto; }
      </style></head><body>
      <div class="card">
        <div class="name">${name}</div>
        <div class="divider"></div>
        <div class="table-num">Table ${table?.number || "?"}</div>
        <div class="qr-wrap">${xml}</div>
        <div class="instruction">Scan to order from your seat</div>
        <div class="sub">No app. No signup. Just scan and enjoy.</div>
        <div class="footer">Powered by SmartDine AI</div>
      </div>
      <script>window.onload=()=>{setTimeout(()=>window.print(),300)};</script>
      </body></html>`);
    w.document.close();
  }, [name, table?.number]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF5EC] flex items-center justify-center">
        <div className="text-[#5C0E1B] text-lg">Loading table info…</div>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="min-h-screen bg-[#FAF5EC] flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-[#5C0E1B] text-2xl font-bold">Table not found</div>
        <p className="text-[#8A6A1B]">This QR token is invalid or the table was removed.</p>
        <Link href={`/r/${slug}`} className="text-[#5C0E1B] underline mt-4">Back to restaurant</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF5EC] flex flex-col items-center p-4 md:p-8">
      <div className="max-w-2xl w-full">
        <Link href={`/admin/tables`} className="inline-flex items-center gap-1 text-[#5C0E1B] text-sm mb-6 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to tables
        </Link>
      </div>
      <div ref={cardRef} className="bg-[#FAF5EC] border-8 border-[#5C0E1B] rounded-2xl p-8 md:p-12 max-w-lg w-full flex flex-col items-center shadow-2xl" data-testid="qr-card">
        <div className="text-center">
          <div className="text-3xl md:text-4xl font-bold text-[#5C0E1B] font-serif mb-1">{name}</div>
          <div className="w-48 h-0.5 bg-[#5C0E1B] mx-auto my-3" />
          <div className="text-6xl md:text-7xl font-bold text-[#5C0E1B] font-serif">Table {table.number}</div>
        </div>
        <div className="my-6 p-4 bg-white rounded-xl">
          <QRCodeSVG value={url} size={260} bgColor="#FAF5EC" fgColor="#5C0E1B" level="M" />
        </div>
        <p className="text-lg italic text-[#5C0E1B] font-serif">Scan to order from your seat</p>
        <p className="text-base text-[#8A6A1B] mt-1">No app. No signup. Just scan and enjoy.</p>
        <p className="text-sm text-[#8A6A1B] mt-8">Powered by SmartDine AI</p>
      </div>
      <div className="mt-6 flex gap-3">
        <button onClick={downloadPng} className="inline-flex items-center gap-2 bg-[#5C0E1B] text-white rounded-full px-6 py-3 text-sm font-medium hover:opacity-90">
          <Download className="h-4 w-4" /> Download PNG
        </button>
        <button onClick={printCard} className="inline-flex items-center gap-2 bg-white border-2 border-[#5C0E1B] text-[#5C0E1B] rounded-full px-6 py-3 text-sm font-medium hover:bg-[#5C0E1B]/5">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>
    </div>
  );
}
