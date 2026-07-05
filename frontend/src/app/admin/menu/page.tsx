"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiUrl } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, ImageIcon, Upload, Link2, Loader2, Sparkles, CheckCircle2, Search } from "lucide-react";
import { useSession } from "@/stores/session";
import type { MenuItem } from "@/types";

interface MenuForm {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  available: boolean;
  prep_time_min: number;
  tags: string;
  is_veg: boolean;
  is_bestseller: boolean;
}

const empty: MenuForm = {
  name: "", description: "", price: 0, category: "Biryani", image_url: "",
  available: true, prep_time_min: 10, tags: "", is_veg: true, is_bestseller: false,
};

function resolveImageUrl(u: string): string {
  if (!u) return "";
  if (u.startsWith("http") || u.startsWith("data:")) return u;
  // server-relative upload path
  return apiUrl(u);
}

export default function AdminMenu() {
  const qc = useQueryClient();
  const { user } = useSession();
  const rid = user?.restaurant_id || "";
  const { data, isLoading } = useQuery({ queryKey: ["admin-menu", rid], queryFn: () => api<{ items: MenuItem[] }>(`/api/menu${rid ? `?restaurant_id=${rid}` : ""}`) });
  
  const [editing, setEditing] = useState<MenuForm | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MenuItem | null>(null);
  const [showAiImport, setShowAiImport] = useState(false);
  
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Name");

  const items = data?.items ?? [];
  const categories = Array.from(new Set(items.map((i) => i.category))).sort();

  const toggle = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) => api(`/api/menu/${id}`, { method: "PATCH", body: JSON.stringify({ available }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-menu"] }); qc.invalidateQueries({ queryKey: ["menu"] }); toast.success("Updated"); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/menu/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-menu"] }); qc.invalidateQueries({ queryKey: ["menu"] }); toast.success("Dish removed"); setConfirmDelete(null); },
  });

  const filteredItems = useMemo(() => {
    let result = items;
    if (activeCategory !== "All") {
      result = result.filter(i => i.category === activeCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q) || (i.tags && i.tags.join(" ").toLowerCase().includes(q)));
    }
    result = [...result].sort((a, b) => {
      if (sortBy === "Name") return a.name.localeCompare(b.name);
      if (sortBy === "Price ↑") return a.price - b.price;
      if (sortBy === "Price ↓") return b.price - a.price;
      if (sortBy === "Prep Time") return a.prep_time_min - b.prep_time_min;
      return 0;
    });
    return result;
  }, [items, activeCategory, searchQuery, sortBy]);

  return (
    <div data-testid="admin-menu-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <p className="uppercase tracking-[0.3em] text-xs text-stone mb-2">Menu</p>
          <h1 className="font-heading text-3xl md:text-4xl tracking-tight">Manage menu</h1>
          <p className="text-sm text-stone mt-1">{items.length} dishes · changes reflect live on the customer site within seconds.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowAiImport(true)}
            className="bg-cream text-brand-primary border border-brand-primary/30 rounded-full px-5 py-2.5 text-sm font-medium hover:bg-[#F3EBD8] transition inline-flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" /> Import via AI
          </button>
          <button
            data-testid="add-dish-btn"
            onClick={() => setEditing({ ...empty })}
            className="bg-ink text-cream rounded-full px-5 py-2.5 text-sm font-medium hover:bg-clay transition inline-flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add dish
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar max-w-full w-full md:w-auto">
          <button 
            onClick={() => setActiveCategory("All")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition border ${activeCategory === "All" ? "bg-ink text-white border-ink" : "bg-white text-stone hover:border-ink border-bone"}`}
          >
            All
          </button>
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition border ${activeCategory === cat ? "bg-ink text-white border-ink" : "bg-white text-stone hover:border-ink border-bone"}`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone" />
            <Input 
              placeholder="Search dishes or tags..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-full h-10 border-bone"
            />
          </div>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="h-10 rounded-full border border-bone bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-brand"
          >
            {["Name", "Price ↑", "Price ↓", "Prep Time"].map(s => <option key={s} value={s}>Sort: {s}</option>)}
          </select>
        </div>
      </div>

      {isLoading && <div className="text-stone">Loading menu…</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="admin-menu-grid">
        {filteredItems.map((m) => {
          const isBestseller = m.tags?.includes("bestseller");
          const isVeg = !m.tags?.includes("non-veg");
          
          return (
            <div key={m.id} className="bg-white border border-bone rounded-2xl overflow-hidden flex flex-col relative" data-testid={`admin-menu-card-${m.id}`}>
              {isBestseller && (
                <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded shadow-sm z-10 flex items-center gap-1">
                  ⭐ Bestseller
                </div>
              )}
              <div className="aspect-[5/3] bg-cover bg-center bg-cream relative" style={{ backgroundImage: m.image_url ? `url(${resolveImageUrl(m.image_url)})` : undefined }}>
                <div className="absolute top-2 left-2 bg-white/90 p-1 rounded backdrop-blur shadow-sm">
                  <div className={`w-3 h-3 rounded-full ${isVeg ? "bg-green-500" : "bg-red-500"} border border-white`} title={isVeg ? "Veg" : "Non-Veg"} />
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading font-semibold leading-tight">{m.name}</h3>
                  <span className="font-heading font-semibold text-clay shrink-0">{formatCurrency(m.price)}</span>
                </div>
                <div className="text-[11px] uppercase tracking-wider text-stone mt-1">{m.category} · {m.prep_time_min} min</div>
                <p className="text-xs text-stone mt-2 line-clamp-2 flex-1">{m.description}</p>
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-bone">
                  <Badge variant={m.available ? "ready" : "alert"}>{m.available ? "Available" : "Hidden"}</Badge>
                  <div className="flex items-center gap-1">
                    <button
                      data-testid={`toggle-${m.id}`}
                      onClick={() => toggle.mutate({ id: m.id, available: !m.available })}
                      className="text-xs font-medium px-2 py-1 hover:bg-cream rounded"
                    >
                      {m.available ? "Hide" : "Show"}
                    </button>
                    <button
                      data-testid={`edit-${m.id}`}
                      onClick={() => {
                        const tagsList = m.tags || [];
                        const isB = tagsList.includes("bestseller");
                        const isV = !tagsList.includes("non-veg");
                        setEditing({
                          id: m.id, name: m.name, description: m.description, price: m.price,
                          category: m.category, image_url: m.image_url, available: m.available,
                          prep_time_min: m.prep_time_min, 
                          tags: tagsList.filter(t => t !== "bestseller" && t !== "non-veg" && t !== "veg").join(", "),
                          is_veg: isV,
                          is_bestseller: isB,
                        })
                      }}
                      className="p-1.5 hover:bg-cream rounded"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      data-testid={`delete-${m.id}`}
                      onClick={() => setConfirmDelete(m)}
                      className="p-1.5 hover:bg-cream rounded text-alert"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <DishEditorModal
          form={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["admin-menu"] }); qc.invalidateQueries({ queryKey: ["menu"] }); setEditing(null); }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this dish?"
          body={`"${confirmDelete.name}" will be removed from the menu permanently. Customers won't see it anymore.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => remove.mutate(confirmDelete.id)}
          loading={remove.isPending}
        />
      )}

      {showAiImport && (
        <AiImportModal 
          onClose={() => setShowAiImport(false)} 
          onImported={() => { qc.invalidateQueries({ queryKey: ["admin-menu"] }); qc.invalidateQueries({ queryKey: ["menu"] }); setShowAiImport(false); }} 
        />
      )}
    </div>
  );
}

function AiImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsedItems, setParsedItems] = useState<any[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = useSession.getState().token;
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(apiUrl("/api/restaurants/onboard-menu"), {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(j.detail || `HTTP ${res.status}`);
      }
      const j = await res.json();
      setParsedItems(j.items || []);
      toast.success(`Extracted ${j.items?.length || 0} items`);
    } catch (e) {
      toast.error((e as Error).message || "AI extraction failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const confirmImport = async () => {
    if (!parsedItems || parsedItems.length === 0) return;
    setSaving(true);
    try {
      const token = useSession.getState().token;
      // We process sequentially so we don't hammer the DB or hit API rate limits if the list is huge
      for (const item of parsedItems) {
        const payload = {
          name: item.name || "Unknown",
          description: item.description || "",
          price: Number(item.price) || 0,
          category: item.category || "Uncategorized",
          image_url: item.image_url || "",
          available: true,
          prep_time_min: 15,
          tags: []
        };
        await fetch(apiUrl("/api/menu"), {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        });
      }
      toast.success(`Successfully imported ${parsedItems.length} dishes`);
      onImported();
    } catch (e) {
      toast.error("Failed to import some dishes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <header className="flex items-center justify-between p-5 border-b border-bone sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-brand-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-brand-primary" />
            </div>
            <h2 className="font-heading text-xl font-semibold">AI Menu Import</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-cream flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-6 flex-1">
          {!parsedItems ? (
            <div className="text-center py-10">
              <p className="text-sm text-stone mb-6 max-w-sm mx-auto">Upload a clear photo or PDF of your physical menu. Our AI will automatically extract the dishes, categories, and prices for you.</p>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={onFileChange} className="hidden" />
              <button 
                onClick={() => fileRef.current?.click()} 
                disabled={uploading} 
                className="mx-auto w-full max-w-sm py-10 border-2 border-dashed border-bone rounded-xl flex flex-col items-center gap-3 hover:border-brand-primary hover:bg-cream transition disabled:opacity-50 disabled:hover:bg-transparent"
              >
                {uploading ? <Loader2 className="h-8 w-8 animate-spin text-brand-primary" /> : <Upload className="h-8 w-8 text-stone" />}
                <div className="text-sm font-medium">{uploading ? "Analyzing menu with AI..." : "Click to upload menu image/PDF"}</div>
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Found {parsedItems.length} dishes
                </h3>
                <button onClick={() => setParsedItems(null)} className="text-xs text-brand-primary hover:underline">Upload different file</button>
              </div>
              <div className="border border-bone rounded-lg overflow-hidden divide-y divide-bone max-h-[50vh] overflow-y-auto">
                {parsedItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-cream/30 flex justify-between gap-4">
                    {item.image_url && (
                      <div className="h-16 w-16 bg-cover bg-center rounded" style={{ backgroundImage: `url(${resolveImageUrl(item.image_url)})` }} />
                    )}
                    <div className="flex-1">
                      <div className="text-xs uppercase tracking-wider text-stone mb-1">{item.category}</div>
                      <div className="font-medium text-sm">{item.name}</div>
                      {item.description && <div className="text-xs text-stone mt-1 line-clamp-2">{item.description}</div>}
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <div className="font-medium">{formatCurrency(item.price)}</div>
                      <button 
                        onClick={() => setParsedItems(prev => prev ? prev.filter((_, i) => i !== idx) : null)}
                        className="text-stone hover:text-alert p-1.5 rounded hover:bg-cream transition-colors mt-2"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {parsedItems && parsedItems.length > 0 && (
          <footer className="flex justify-end gap-3 p-5 border-t border-bone sticky bottom-0 bg-white">
            <button onClick={onClose} className="px-5 py-2.5 rounded-full text-sm font-medium border border-bone hover:bg-cream">Cancel</button>
            <button 
              disabled={saving} 
              onClick={confirmImport} 
              className="px-5 py-2.5 rounded-full text-sm font-medium bg-brand-primary text-white hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {saving ? "Importing..." : "Confirm & Import to Live Menu"}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

function DishEditorModal({ form, categories, onClose, onSaved }: { form: MenuForm; categories: string[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<MenuForm>(form);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgTab, setImgTab] = useState<"url" | "upload">(form.image_url?.startsWith("/api/uploads") ? "upload" : "url");
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = !!form.id;

  const save = async () => {
    if (!f.name.trim() || !f.category.trim()) { toast.error("Name & category are required"); return; }
    if (f.price <= 0) { toast.error("Price must be greater than zero"); return; }
    setSaving(true);
    try {
      const parsedTags = f.tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (f.is_bestseller && !parsedTags.includes("bestseller")) parsedTags.push("bestseller");
      if (!f.is_veg && !parsedTags.includes("non-veg")) parsedTags.push("non-veg");

      const payload = {
        name: f.name.trim(),
        description: f.description.trim(),
        price: Number(f.price),
        category: f.category.trim(),
        image_url: f.image_url.trim(),
        available: f.available,
        prep_time_min: Number(f.prep_time_min) || 10,
        tags: parsedTags,
      };
      if (isEdit && f.id) {
        await api(`/api/menu/${f.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success(`${f.name} updated`);
      } else {
        await api(`/api/menu`, { method: "POST", body: JSON.stringify(payload) });
        toast.success(`${f.name} added`);
      }
      onSaved();
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = useSession.getState().token;
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(apiUrl("/api/upload/image"), {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(j.detail || `HTTP ${res.status}`);
      }
      const j = await res.json() as { url: string };
      setF((s) => ({ ...s, image_url: j.url }));
      toast.success("Image uploaded");
    } catch (e) {
      const err = e as Error;
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" data-testid="dish-editor-modal">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <header className="flex items-center justify-between p-5 border-b border-bone sticky top-0 bg-white">
          <h2 className="font-heading text-xl font-semibold">{isEdit ? "Edit dish" : "Add new dish"}</h2>
          <button data-testid="editor-close" onClick={onClose} className="h-9 w-9 rounded-full hover:bg-cream flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-stone">Name *</label>
              <Input data-testid="dish-name" value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} placeholder="Chicken Dum Biryani" className="mt-1.5" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-stone">Category *</label>
              <Input data-testid="dish-category" list="dish-cat-list" value={f.category} onChange={(e) => setF((s) => ({ ...s, category: e.target.value }))} placeholder="Biryani" className="mt-1.5" />
              <datalist id="dish-cat-list">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-stone">Price (₹) *</label>
              <Input data-testid="dish-price" type="number" min="0" step="1" value={f.price} onChange={(e) => setF((s) => ({ ...s, price: Number(e.target.value) }))} className="mt-1.5" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-stone">Prep time (min)</label>
              <Input data-testid="dish-prep" type="number" min="1" value={f.prep_time_min} onChange={(e) => setF((s) => ({ ...s, prep_time_min: Number(e.target.value) }))} className="mt-1.5" />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-stone">Description</label>
            <Textarea data-testid="dish-description" value={f.description} onChange={(e) => setF((s) => ({ ...s, description: e.target.value }))} rows={3} placeholder="Slow-cooked basmati layered with kashmiri masala chicken…" className="mt-1.5" />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-stone">Tags (comma-separated)</label>
            <Input data-testid="dish-tags" value={f.tags} onChange={(e) => setF((s) => ({ ...s, tags: e.target.value }))} placeholder="bestseller, spicy, signature" className="mt-1.5" />
          </div>

          {/* Image */}
          <div>
            <label className="text-xs uppercase tracking-wider text-stone">Image</label>
            <div className="mt-2 flex gap-1.5 mb-3">
              <button data-testid="img-tab-url" onClick={() => setImgTab("url")} className={`flex-1 py-1.5 rounded-md text-xs font-medium border ${imgTab === "url" ? "bg-ink text-cream border-ink" : "bg-cream border-bone"}`}>
                <Link2 className="h-3 w-3 inline mr-1" /> Paste URL
              </button>
              <button data-testid="img-tab-upload" onClick={() => setImgTab("upload")} className={`flex-1 py-1.5 rounded-md text-xs font-medium border ${imgTab === "upload" ? "bg-ink text-cream border-ink" : "bg-cream border-bone"}`}>
                <Upload className="h-3 w-3 inline mr-1" /> Upload file
              </button>
            </div>

            {imgTab === "url" ? (
              <Input data-testid="dish-image-url" value={f.image_url} onChange={(e) => setF((s) => ({ ...s, image_url: e.target.value }))} placeholder="https://images.unsplash.com/…" />
            ) : (
              <div>
                <input ref={fileRef} data-testid="dish-image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onFileChange} className="hidden" />
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full py-3 border-2 border-dashed border-bone rounded-lg flex flex-col items-center gap-1 hover:border-ink/40 disabled:opacity-50">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-stone" />}
                  <span className="text-xs text-stone">{uploading ? "Uploading…" : "Click to upload (max 5MB)"}</span>
                </button>
                {f.image_url && f.image_url.startsWith("/api/uploads") && (
                  <div className="mt-2 text-xs text-stone truncate">Saved: <code>{f.image_url}</code></div>
                )}
              </div>
            )}

            {f.image_url && (
              <div className="mt-3 aspect-[5/3] bg-cover bg-center bg-cream rounded-lg border border-bone" style={{ backgroundImage: `url(${resolveImageUrl(f.image_url)})` }} data-testid="dish-image-preview" />
            )}
            {!f.image_url && (
              <div className="mt-3 aspect-[5/3] bg-cream rounded-lg border-2 border-dashed border-bone flex items-center justify-center text-stone text-xs">
                <ImageIcon className="h-4 w-4 mr-1" /> No image yet
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 py-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input data-testid="dish-available" type="checkbox" checked={f.available} onChange={(e) => setF((s) => ({ ...s, available: e.target.checked }))} className="h-4 w-4" />
              <span className="text-sm font-medium">Available — visible on customer menu</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input data-testid="dish-veg" type="checkbox" checked={f.is_veg} onChange={(e) => setF((s) => ({ ...s, is_veg: e.target.checked }))} className="h-4 w-4" />
              <span className="text-sm">Vegetarian (shows green dot instead of red)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input data-testid="dish-bestseller" type="checkbox" checked={f.is_bestseller} onChange={(e) => setF((s) => ({ ...s, is_bestseller: e.target.checked }))} className="h-4 w-4" />
              <span className="text-sm">Mark as Bestseller (adds ⭐ badge)</span>
            </label>
          </div>
        </div>

        <footer className="flex justify-end gap-3 p-5 border-t border-bone sticky bottom-0 bg-white">
          <button data-testid="editor-cancel" onClick={onClose} className="px-5 py-2.5 rounded-full text-sm font-medium border border-bone hover:bg-cream">Cancel</button>
          <button data-testid="editor-save" disabled={saving} onClick={save} className="px-5 py-2.5 rounded-full text-sm font-medium bg-ink text-cream hover:bg-clay disabled:opacity-50 inline-flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : (isEdit ? "Save changes" : "Add dish")}
          </button>
        </footer>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, body, onCancel, onConfirm, loading }: { title: string; body: string; onCancel: () => void; onConfirm: () => void; loading?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" data-testid="confirm-dialog">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h3 className="font-heading text-lg font-semibold">{title}</h3>
        <p className="text-sm text-stone mt-2">{body}</p>
        <div className="flex justify-end gap-3 mt-6">
          <button data-testid="confirm-cancel" onClick={onCancel} className="px-5 py-2 rounded-full text-sm border border-bone hover:bg-cream">Cancel</button>
          <button data-testid="confirm-delete" disabled={loading} onClick={onConfirm} className="px-5 py-2 rounded-full text-sm bg-alert text-white hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
