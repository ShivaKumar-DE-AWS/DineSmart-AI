"use client";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Palette, Wand2, Download, QrCode, Sparkles } from "lucide-react";

export default function MarketingPage() {
  const qc = useQueryClient();
  const [theme, setTheme] = useState("luxury");
  const [tagline, setTagline] = useState("MULTI CUISINE RESTAURANT");
  const [logoSvg, setLogoSvg] = useState<string | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["admin_settings"],
    queryFn: async () => {
      const res = await api.get("/api/admin/settings");
      if (res.status === 200) {
        if (res.data.config?.theme) setTheme(res.data.config.theme);
        if (res.data.marketing_config) {
          setTheme(res.data.marketing_config.theme || "luxury");
          setTagline(res.data.marketing_config.tagline || "MULTI CUISINE RESTAURANT");
          setLogoSvg(res.data.marketing_config.logo_svg || null);
        }
        return res.data;
      }
      throw new Error("Failed to load settings");
    }
  });

  const generateLogo = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/admin/marketing/generate-logo", {
        restaurant_name: settings?.name || "Restaurant",
        theme,
        tagline
      });
      if (res.status === 200) {
        return res.data.svg;
      }
      throw new Error(res.data.detail || "Failed to generate logo");
    },
    onSuccess: (svg) => {
      setLogoSvg(svg);
      toast.success("AI Logo generated successfully!");
      saveConfig.mutate({ logo_svg: svg });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const saveConfig = useMutation({
    mutationFn: async (override?: any) => {
      const config = {
        theme,
        tagline,
        logo_svg: logoSvg,
        ...override
      };
      await api.put("/api/admin/settings", { marketing_config: config });
    },
    onSuccess: () => {
      toast.success("Marketing config saved!");
      qc.invalidateQueries({ queryKey: ["admin_settings"] });
    },
    onError: () => toast.error("Failed to save config")
  });

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">Marketing & QR Stand</h1>
          <p className="text-stone text-sm">Configure your brand identity and print your dynamic AI QR Stand.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-bone shadow-sm space-y-5">
              <h2 className="font-semibold text-lg flex items-center gap-2"><Palette className="w-5 h-5 text-accent" /> Brand Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-stone block mb-1">Brand Theme</label>
                  <select 
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full px-3 py-2 bg-cream border border-bone rounded-lg text-sm"
                  >
                    <option value="luxury">Luxury Gold (Premium)</option>
                    <option value="modern">Modern Minimalist</option>
                    <option value="vibrant">Vibrant & Playful</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-stone block mb-1">Tagline</label>
                  <input 
                    type="text" 
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full px-3 py-2 bg-cream border border-bone rounded-lg text-sm"
                    placeholder="e.g. MULTI CUISINE RESTAURANT"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-stone block mb-2">AI Logo</label>
                  <div className="flex gap-3 items-center">
                    <div className="w-16 h-16 rounded-xl border border-bone bg-cream flex items-center justify-center overflow-hidden flex-shrink-0">
                      {logoSvg ? (
                        <div dangerouslySetInnerHTML={{ __html: logoSvg }} className="w-12 h-12" />
                      ) : (
                        <span className="text-xs text-stone">None</span>
                      )}
                    </div>
                    <button 
                      onClick={() => generateLogo.mutate()}
                      disabled={generateLogo.isPending}
                      className="flex-1 bg-accent/10 text-accent font-medium text-sm py-2 px-3 rounded-lg flex justify-center items-center gap-2 hover:bg-accent/20 transition disabled:opacity-50"
                    >
                      {generateLogo.isPending ? "Generating..." : <><Wand2 className="w-4 h-4" /> Auto-Generate</>}
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => saveConfig.mutate()}
                  disabled={saveConfig.isPending}
                  className="w-full bg-ink text-white py-2.5 rounded-lg text-sm font-medium hover:bg-black transition"
                >
                  {saveConfig.isPending ? "Saving..." : "Save Brand Settings"}
                </button>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-bone shadow-sm space-y-4">
              <h2 className="font-semibold text-lg flex items-center gap-2"><Download className="w-5 h-5 text-accent" /> Downloads</h2>
              <button 
                onClick={() => {
                  const el = document.getElementById("qr-stand-preview");
                  if (el) {
                    import("html-to-image").then(htmlToImage => {
                      htmlToImage.toPng(el, { quality: 1, pixelRatio: 3 }).then(function (dataUrl) {
                        const link = document.createElement("a");
                        link.download = "smartdine-qr-stand.png";
                        link.href = dataUrl;
                        link.click();
                      });
                    });
                  }
                }}
                className="w-full bg-cream text-ink py-3 px-4 rounded-xl border border-bone text-sm font-medium hover:border-accent transition flex items-center justify-between"
              >
                <span>Download QR Stand (PNG)</span>
                <QrCode className="w-4 h-4 text-stone" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-clay p-8 rounded-3xl overflow-hidden flex items-center justify-center min-h-[600px]">
              <div 
                id="qr-stand-preview"
                className="bg-white shadow-2xl relative"
                style={{ width: "400px", height: "600px", overflow: "hidden" }}
              >
                {/* Dynamic QR Stand Template closely matching Reference 1 */}
                <div className="w-full h-full flex flex-col relative bg-[#FDFBF7]">
                  {/* Outer Gold Border */}
                  <div className="absolute inset-4 border-[3px] border-[#DDB85C] pointer-events-none" />
                  <div className="absolute inset-5 border border-[#DDB85C] pointer-events-none opacity-50" />
                  
                  {/* Top Dark Header */}
                  <div className="bg-[#121212] w-full pt-10 pb-6 px-8 flex flex-col items-center relative rounded-b-[40px] shadow-md z-10">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg overflow-hidden p-2">
                      {logoSvg ? (
                        <div dangerouslySetInnerHTML={{ __html: logoSvg }} className="w-full h-full" />
                      ) : (
                        <div className="w-full h-full bg-[#121212] rounded-full flex items-center justify-center text-white font-bold font-heading text-xl">
                          {settings?.name?.[0] || "R"}
                        </div>
                      )}
                    </div>
                    <h1 className="text-[#DDB85C] font-heading font-bold text-2xl text-center leading-tight">
                      {settings?.name?.toUpperCase() || "RESTAURANT"}
                    </h1>
                    <p className="text-white text-[10px] tracking-widest mt-2 uppercase opacity-80">
                      {tagline}
                    </p>
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center justify-center px-10 relative z-0">
                    <div className="text-center mb-6">
                      <h2 className="text-[#121212] font-bold text-2xl mb-1 tracking-tight">SCAN TO ORDER</h2>
                      <p className="text-stone text-xs font-medium uppercase tracking-wider">No waiting. Instant service.</p>
                    </div>
                    
                    <div className="bg-white p-3 rounded-2xl shadow-xl border border-[#DDB85C]/30 mb-8 relative">
                       {/* Mock QR for Preview */}
                       <div className="absolute inset-0 bg-[#DDB85C]/10 rounded-2xl" />
                       <QrCode className="w-48 h-48 text-[#121212]" strokeWidth={1} />
                    </div>
                    
                    <div className="flex items-center gap-3 w-full justify-center">
                      <div className="h-px bg-[#DDB85C] flex-1"></div>
                      <span className="text-[#DDB85C] font-bold text-sm tracking-widest">TABLE 01</span>
                      <div className="h-px bg-[#DDB85C] flex-1"></div>
                    </div>
                  </div>
                  
                  <div className="bg-[#121212] text-white py-5 px-8 text-center mt-auto border-t-[3px] border-[#DDB85C]">
                     <div className="flex items-center justify-center gap-2 mb-1">
                       <Sparkles className="w-4 h-4 text-[#DDB85C]" />
                       <span className="font-bold text-sm tracking-wider">SmartDine AI</span>
                     </div>
                     <p className="text-[9px] text-[#DDB85C] uppercase tracking-widest opacity-80">AI-Powered Dining Experience</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
