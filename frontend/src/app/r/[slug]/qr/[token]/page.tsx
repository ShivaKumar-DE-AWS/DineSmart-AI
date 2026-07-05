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

  const printCard = useCallback(() => {
    const w = window.open("", "_blank");
    if (!w) return;
    const svgEl = cardRef.current?.querySelector("svg");
    const xml = svgEl ? new XMLSerializer().serializeToString(svgEl) : "";
    const domain = name.toLowerCase().replace(/ /g, "");
    w.document.write(`<!doctype html><html><head><title>${name} — Table ${table?.number || "?"}</title>
      <style>
        @page { margin: 0; size: 1200px 1800px; }
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #0A0A0A; font-family: sans-serif; }
        .card { width: 1200px; height: 1800px; background: #0A0A0A; border: 8px solid #DDB85C; box-sizing: border-box; position: relative; padding: 40px; overflow: hidden; color: #FAF5EC; }
        
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .logo-left { text-align: left; }
        .logo-left h1 { font-family: Georgia, serif; font-size: 56px; color: #DDB85C; margin: 0; letter-spacing: 2px; text-transform: uppercase; }
        .logo-left p { font-family: Georgia, serif; font-size: 18px; color: #FAF5EC; margin: 5px 0 0 0; font-style: italic; letter-spacing: 4px; }
        .logo-right { text-align: right; font-size: 36px; font-weight: bold; color: #FAF5EC; display: flex; align-items: center; gap: 10px; }
        
        .scan-title { font-size: 56px; font-weight: 900; color: #60B634; text-align: center; margin-top: 20px; }
        .scan-sub { font-size: 28px; color: #FAF5EC; text-align: center; margin-top: 10px; }
        
        .main-content { display: flex; justify-content: space-between; margin-top: 60px; }
        
        .column { width: 280px; }
        .col-title { background: #DDB85C; color: #0A0A0A; font-weight: 900; font-size: 20px; padding: 10px 0; text-align: center; border-radius: 8px; margin-bottom: 30px; letter-spacing: 1px; }
        .step { display: flex; align-items: flex-start; gap: 15px; margin-bottom: 40px; }
        .step-icon { width: 50px; height: 50px; border: 2px solid #60B634; border-radius: 12px; display: flex; justify-content: center; align-items: center; font-size: 24px; color: #60B634; flex-shrink: 0; }
        .step-text h4 { margin: 0 0 5px 0; color: #60B634; font-size: 20px; }
        .step-text p { margin: 0; font-size: 16px; color: #AAA; line-height: 1.4; }
        
        .center-col { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 0 20px; }
        .qr-wrap { background: #FAF5EC; padding: 20px; border-radius: 20px; margin-bottom: 40px; }
        .qr-wrap svg { width: 440px; height: 440px; display: block; }
        
        .action-icons { display: flex; gap: 30px; justify-content: center; width: 100%; margin-bottom: 50px; }
        .action-item { display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .action-icon { width: 70px; height: 70px; border: 2px solid #60B634; border-radius: 16px; display: flex; justify-content: center; align-items: center; font-size: 32px; }
        .action-text { font-size: 18px; color: #FAF5EC; font-weight: bold; }
        
        .enjoy-text { font-family: Georgia, serif; font-size: 48px; color: #60B634; font-style: italic; text-align: center; margin-bottom: 50px; border-top: 1px solid #333; border-bottom: 1px solid #333; padding: 20px 0; width: 80%; }
        
        .caution { display: flex; width: 800px; height: 140px; background: #FAF5EC; border-radius: 16px; overflow: hidden; margin: 0 auto; }
        .caution-left { background: #B91C1C; width: 180px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white; }
        .caution-right { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0 40px; color: #0A0A0A; font-size: 22px; line-height: 1.4; font-weight: 500; }
        
        .footer { margin-top: auto; text-align: center; padding-top: 40px; }
        .footer-text { font-family: Georgia, serif; font-size: 24px; color: #DDB85C; font-style: italic; margin-bottom: 20px; }
        .footer-social { font-size: 20px; color: #60B634; display: flex; justify-content: center; gap: 40px; align-items: center; }
        
        .table-pill { position: absolute; top: 380px; left: 50%; transform: translateX(-50%); background: #0A0A0A; border: 4px solid #FAF5EC; color: #FAF5EC; padding: 10px 40px; border-radius: 40px; font-size: 32px; font-weight: bold; z-index: 10; }
      </style></head><body>
      <div class="card">
        <div class="header">
          <div class="logo-left">
            <h1>${name}</h1>
            <p>MULTI CUISINE RESTAURANT</p>
          </div>
          <div class="logo-right">
            <span>SmartDine AI</span>
          </div>
        </div>
        
        <div class="scan-title">SCAN TO ORDER</div>
        <div class="scan-sub">Talk. Order. Enjoy.</div>
        
        <div class="main-content">
          <!-- Left Column -->
          <div class="column">
            <div class="col-title">HOW TO ORDER</div>
            
            <div class="step">
              <div class="step-icon">📱</div>
              <div class="step-text">
                <h4>1. Scan</h4>
                <p>Scan the QR your mobile to view menu</p>
              </div>
            </div>
            
            <div class="step">
              <div class="step-icon">💬</div>
              <div class="step-text">
                <h4>2. Chat / Talk</h4>
                <p>Chat or talk with AI Waiter for order</p>
              </div>
            </div>
            
            <div class="step">
              <div class="step-icon">📋</div>
              <div class="step-text">
                <h4>3. Explore Menu</h4>
                <p>Browse full menu and add items to cart</p>
              </div>
            </div>
            
            <div class="step">
              <div class="step-icon">💳</div>
              <div class="step-text">
                <h4>4. Pay Securely</h4>
                <p>Pay online or pay at counter later</p>
              </div>
            </div>
            
            <div class="step">
              <div class="step-icon">🕒</div>
              <div class="step-text">
                <h4>5. Track & Enjoy</h4>
                <p>Track order status and enjoy your meal</p>
              </div>
            </div>
          </div>
          
          <!-- Center Column -->
          <div class="center-col">
            <div class="table-pill">Table ${table?.number || "?"}</div>
            <div class="qr-wrap">${xml}</div>
            
            <div class="action-icons">
              <div class="action-item"><div class="action-icon">📱</div><div class="action-text">SCAN</div></div>
              <div class="action-item"><div class="action-icon">🛎️</div><div class="action-text">ORDER</div></div>
              <div class="action-item"><div class="action-icon">💳</div><div class="action-text">PAY</div></div>
              <div class="action-item"><div class="action-icon">🍽️</div><div class="action-text">ENJOY</div></div>
            </div>
            
            <div class="enjoy-text">We serve, you enjoy! ♥</div>
          </div>
          
          <!-- Right Column -->
          <div class="column">
            <div class="col-title">WHY CHOOSE US?</div>
            
            <div class="step">
              <div class="step-icon">✨</div>
              <div class="step-text">
                <h4>Personalized</h4>
                <p>Recommendations based on your taste</p>
              </div>
            </div>
            
            <div class="step">
              <div class="step-icon">⚡</div>
              <div class="step-text">
                <h4>Faster Service</h4>
                <p>No waiting for the waiter to take order</p>
              </div>
            </div>
            
            <div class="step">
              <div class="step-icon">🛡️</div>
              <div class="step-text">
                <h4>Hygienic</h4>
                <p>Contactless ordering and payment</p>
              </div>
            </div>
            
            <div class="step">
              <div class="step-icon">🌟</div>
              <div class="step-text">
                <h4>Better Dining</h4>
                <p>Enhance your dining experience with AI</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="caution">
          <div class="caution-left">
            <div style="font-size: 50px; margin-bottom: 5px;">⚠</div>
            <div style="font-size: 24px; font-weight: 900; letter-spacing: 1px;">CAUTION</div>
          </div>
          <div class="caution-right">
            <div style="color: #666; font-size: 16px; margin-bottom: 5px;">Preview domain & link generator before scanning:</div>
            <div>Please ensure the URL matches:</div>
            <div style="color: #B91C1C; font-weight: bold; font-size: 24px; margin-top: 5px;">${customerOrigin()}</div>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-text">Thank you for dining with us!</div>
          <div class="footer-social">
            <span>🌐 www.${domain}.com</span>
            <span>📸 @${domain}</span>
          </div>
        </div>
      </div>
      <script>window.onload=()=>{setTimeout(()=>window.print(),300)};</script>
      </body></html>`);
    w.document.close();
  }, [name, table?.number]);

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
    <div className="min-h-screen bg-[#000000] flex flex-col items-center p-4 md:p-8">
      <div className="max-w-7xl w-full">
        <Link href={`/admin/tables`} className="inline-flex items-center gap-1 text-[#DDB85C] text-sm mb-6 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to tables
        </Link>
      </div>
      
      {/* On-screen Preview matching the detailed layout */}
      <div ref={cardRef} className="bg-[#0A0A0A] border-[4px] border-[#DDB85C] p-4 md:p-8 max-w-5xl w-full flex flex-col shadow-2xl relative text-[#FAF5EC]" data-testid="qr-card">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-serif text-3xl md:text-5xl text-[#DDB85C] uppercase tracking-widest">{name}</h1>
            <p className="font-serif text-xs md:text-sm italic tracking-widest mt-1">MULTI CUISINE RESTAURANT</p>
          </div>
          <div className="text-xl md:text-3xl font-bold">SmartDine AI</div>
        </div>
        
        <div className="text-center mt-4">
          <div className="text-4xl md:text-5xl font-black text-[#60B634] tracking-wider">SCAN TO ORDER</div>
          <div className="text-lg md:text-xl mt-2">Talk. Order. Enjoy.</div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8 mt-12">
          {/* Left Col */}
          <div className="w-full lg:w-64 shrink-0">
            <div className="bg-[#DDB85C] text-[#0A0A0A] font-black text-center py-2 rounded mb-8 tracking-wider">HOW TO ORDER</div>
            {[
              { icon: '📱', title: '1. Scan', desc: 'Scan the QR your mobile to view menu' },
              { icon: '💬', title: '2. Chat / Talk', desc: 'Chat or talk with AI Waiter for order' },
              { icon: '📋', title: '3. Explore Menu', desc: 'Browse full menu and add items to cart' },
              { icon: '💳', title: '4. Pay Securely', desc: 'Pay online or pay at counter later' },
              { icon: '🕒', title: '5. Track & Enjoy', desc: 'Track order status and enjoy your meal' }
            ].map((s, i) => (
              <div key={i} className="flex gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg border border-[#60B634] flex items-center justify-center text-xl shrink-0 text-[#60B634]">{s.icon}</div>
                <div>
                  <h4 className="text-[#60B634] font-bold mb-1">{s.title}</h4>
                  <p className="text-xs text-gray-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Center Col */}
          <div className="flex-1 flex flex-col items-center">
            <div className="relative mb-10">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#0A0A0A] border-2 border-[#FAF5EC] text-[#FAF5EC] font-bold text-xl px-6 py-1 rounded-full z-10 whitespace-nowrap">
                TABLE {table.number}
              </div>
              <div className="bg-[#FAF5EC] p-4 rounded-2xl relative z-0">
                <QRCodeSVG value={url} size={280} bgColor="#FAF5EC" fgColor="#5C0E1B" level="M" />
              </div>
            </div>
            
            <div className="flex gap-4 md:gap-8 mb-10">
              {[
                { icon: '📱', label: 'SCAN' },
                { icon: '🛎️', label: 'ORDER' },
                { icon: '💳', label: 'PAY' },
                { icon: '🍽️', label: 'ENJOY' }
              ].map((a, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl border border-[#60B634] flex items-center justify-center text-2xl md:text-3xl">{a.icon}</div>
                  <span className="text-xs md:text-sm font-bold">{a.label}</span>
                </div>
              ))}
            </div>
            
            <div className="font-serif italic text-2xl md:text-4xl text-[#60B634] border-y border-gray-800 py-4 w-full text-center mb-10">
              We serve, you enjoy! ♥
            </div>
          </div>
          
          {/* Right Col */}
          <div className="w-full lg:w-64 shrink-0">
            <div className="bg-[#DDB85C] text-[#0A0A0A] font-black text-center py-2 rounded mb-8 tracking-wider">WHY CHOOSE US?</div>
            {[
              { icon: '✨', title: 'Personalized', desc: 'Recommendations based on your taste' },
              { icon: '⚡', title: 'Faster Service', desc: 'No waiting for the waiter to take order' },
              { icon: '🛡️', title: 'Hygienic', desc: 'Contactless ordering and payment' },
              { icon: '🌟', title: 'Better Dining', desc: 'Enhance your dining experience with AI' }
            ].map((s, i) => (
              <div key={i} className="flex gap-4 mb-8">
                <div className="w-12 h-12 rounded-lg border border-[#60B634] flex items-center justify-center text-xl shrink-0 text-[#60B634]">{s.icon}</div>
                <div>
                  <h4 className="text-[#60B634] font-bold mb-1">{s.title}</h4>
                  <p className="text-xs text-gray-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="w-full max-w-4xl mx-auto flex rounded-xl overflow-hidden bg-[#FAF5EC] mt-4 mb-8">
          <div className="bg-[#B91C1C] text-white w-24 md:w-32 flex flex-col items-center justify-center shrink-0 py-4">
            <span className="text-4xl">⚠</span>
            <span className="font-black text-sm tracking-widest mt-1">CAUTION</span>
          </div>
          <div className="p-4 md:px-8 text-[#0A0A0A] flex flex-col justify-center">
            <span className="text-xs text-gray-600 mb-1">Preview domain & link generator before scanning:</span>
            <span className="text-sm font-medium">Please ensure the URL matches:</span>
            <span className="text-lg md:text-xl font-bold text-[#B91C1C]">{customerOrigin()}</span>
          </div>
        </div>
        
        <div className="text-center mt-4">
          <p className="font-serif italic text-xl md:text-2xl text-[#DDB85C] mb-4">Thank you for dining with us!</p>
          <div className="flex justify-center gap-6 text-[#60B634] text-sm md:text-base">
            <span>🌐 www.{name.toLowerCase().replace(/ /g, "")}.com</span>
            <span>📸 @{name.toLowerCase().replace(/ /g, "")}</span>
          </div>
        </div>
        
      </div>
      
      <div className="mt-8 flex gap-4">
        <button onClick={printCard} className="inline-flex items-center gap-2 bg-[#DDB85C] text-[#0A0A0A] rounded-full px-8 py-3.5 text-sm font-bold uppercase tracking-widest hover:bg-white transition-colors">
          <Printer className="h-4 w-4" /> Print HD Stand
        </button>
      </div>
    </div>
  );
}
