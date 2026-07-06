"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { QRCodeSVG } from "qrcode.react";
import { useRef, useCallback, useEffect, useState } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { generateQrHtml } from "@/lib/qr-template";

function customerOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export default function TableQrCardPage() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [htmlContent, setHtmlContent] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["table-by-token", token],
    queryFn: () => api<{ table: any; restaurant: any }>(`/api/tables/by-token/${token}`),
    enabled: !!token,
  });

  const table = data?.table;
  const restaurant = data?.restaurant;
  const name = restaurant?.name || slug?.toString().replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
  const url = `${customerOrigin()}/r/${slug}?t=${token}`;

  useEffect(() => {
    if (table && name) {
      // Temporarily render QR to string for the template
      const tempDiv = document.createElement("div");
      // Import ReactDOMServer dynamically to avoid client-side issues, or simply build SVG manually
      // Since qrcode.react renders a standard SVG, we can just build an SVG string easily, or use a hidden ref.
      // But it's easier to just construct the SVG markup manually for qrcode since qrcode.react just builds path data.
      // Actually, we can use qrcode-generator or similar if we wanted, but let's just let the hidden iframe render a manual path, NO wait...
      // The easiest way is to use a hidden div with React DOM.
    }
  }, [table, name, url]);
  
  // Wait, I can just use a hidden ref and update state when ready
  const svgRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (table && name && svgRef.current) {
      const svgEl = svgRef.current.querySelector("svg");
      if (svgEl) {
        const xml = new XMLSerializer().serializeToString(svgEl);
        const generated = generateQrHtml(`TABLE ${table.number}`, xml, name, false);
        setHtmlContent(generated);
      }
    }
  }, [table, name, isLoading]); // triggers when table loads and ref mounts

  const printCard = useCallback(() => {
    if (!htmlContent) return;
    const w = window.open("", "_blank");
    if (!w) return;
    
    // Inject print script for the print window
    const printHtml = htmlContent.replace("</body>", "<script>window.onload=()=>{setTimeout(()=>window.print(),500)};</script></body>");
    w.document.write(printHtml);
    w.document.close();
  }, [htmlContent]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#DDB85C] text-lg">Loading table info…</div>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-[#B91C1C] text-2xl font-bold">Table not found</div>
        <p className="text-[#FAF5EC]">This QR token is invalid or the table was removed.</p>
        <Link href={`/r/${slug}`} className="text-[#DDB85C] underline mt-4">Back to restaurant</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center p-4 md:p-8">
      <div className="max-w-[900px] w-full">
        <Link href={`/admin/tables`} className="inline-flex items-center gap-1 text-[#DDB85C] text-sm mb-6 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to tables
        </Link>
      </div>
      
      {/* Hidden QR to serialize */}
      <div ref={svgRef} style={{ display: "none" }}>
        <QRCodeSVG value={url} size={320} bgColor="#FAF5EC" fgColor="#5C0E1B" level="M" includeMargin={false} />
      </div>
      
      {/* Scaled iframe preview */}
      <div className="w-full flex justify-center overflow-hidden">
        <div style={{ width: '900px', height: '1400px', transform: 'scale(0.8)', transformOrigin: 'top center', marginBottom: '-280px' }}>
          {htmlContent && (
            <iframe
              srcDoc={htmlContent}
              style={{ width: '100%', height: '100%', border: 'none', background: 'transparent' }}
              title="QR Card Preview"
            />
          )}
        </div>
      </div>
      
      <div className="mt-8 flex gap-4 relative z-10 pb-20">
        <button onClick={printCard} disabled={!htmlContent} className="inline-flex items-center gap-2 bg-[#B5943A] text-[#0D0D0D] rounded-full px-8 py-3.5 text-sm font-bold uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50">
          <Printer className="h-4 w-4" /> Print HD Stand
        </button>
      </div>
    </div>
  );
}
