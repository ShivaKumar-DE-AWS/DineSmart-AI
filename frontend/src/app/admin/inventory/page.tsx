"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import type { InventoryItem } from "@/types";

interface InvForm { id?: string; name: string; unit: string; qty: number; reorder_level: number }
const empty: InvForm = { name: "", unit: "kg", qty: 0, reorder_level: 0 };

export default function AdminInventory() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["inventory"], queryFn: () => api<{ items: InventoryItem[] }>("/api/inventory") });
  const [editing, setEditing] = useState<InvForm | null>(null);
  const [confirmDel, setConfirmDel] = useState<InventoryItem | null>(null);

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<InventoryItem> }) => api(`/api/inventory/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); toast.success("Updated"); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/inventory/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); toast.success("Item removed"); setConfirmDel(null); },
  });

  const items = data?.items ?? [];
  const lowCount = items.filter((i) => i.qty <= i.reorder_level).length;

  return (
    <div data-testid="admin-inventory-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <p className="uppercase tracking-[0.3em] text-xs text-stone mb-2">Operations</p>
          <h1 className="font-heading text-3xl md:text-4xl tracking-tight">Inventory</h1>
          <p className="text-sm text-stone mt-1">{items.length} ingredients · {lowCount > 0 ? <span className="text-alert font-medium">{lowCount} below reorder level</span> : "all healthy"}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={async () => {
              try {
                await api("/api/inventory/seed-demo", { method: "POST" });
                qc.invalidateQueries({ queryKey: ["inventory"] });
                toast.success("Demo data seeded!");
              } catch (e) {
                toast.error("Failed to seed demo data");
              }
            }}
            className="bg-stone/20 text-ink rounded-full px-5 py-2.5 text-sm font-medium hover:bg-stone/30 transition inline-flex items-center justify-center gap-2"
          >
            Seed Demo Data
          </button>
          <button
            data-testid="add-inv-btn"
            onClick={() => setEditing({ ...empty })}
            className="bg-ink text-cream rounded-full px-5 py-2.5 text-sm font-medium hover:bg-clay transition inline-flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add ingredient
          </button>
        </div>
      </div>

      {isLoading && <div className="text-stone">Loading inventory…</div>}

      <div className="bg-white border border-bone rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm" data-testid="inventory-table">
          <thead className="bg-cream border-b border-bone text-stone uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Item</th>
              <th className="text-left px-4 py-3">Qty on hand</th>
              <th className="text-left px-4 py-3">Unit</th>
              <th className="text-left px-4 py-3">Reorder at</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3 w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const low = i.qty <= i.reorder_level;
              return (
                <tr key={i.id} className="border-b border-bone last:border-0 hover:bg-cream/40" data-testid={`inv-row-${i.id}`}>
                  <td className="px-4 py-3 font-medium">{i.name}</td>
                  <td className="px-4 py-3">
                    <Input
                      data-testid={`inv-qty-${i.id}`}
                      type="number"
                      defaultValue={i.qty}
                      className="h-9 w-24"
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!Number.isNaN(v) && v !== i.qty) patch.mutate({ id: i.id, body: { qty: v } });
                      }}
                    />
                  </td>
                  <td className="px-4 py-3 text-stone">{i.unit}</td>
                  <td className="px-4 py-3">{i.reorder_level}</td>
                  <td className="px-4 py-3">
                    <Badge variant={low ? "alert" : "ready"}>{low ? "Low" : "OK"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      data-testid={`inv-edit-${i.id}`}
                      onClick={() => setEditing({ id: i.id, name: i.name, unit: i.unit, qty: i.qty, reorder_level: i.reorder_level })}
                      className="p-1.5 hover:bg-cream rounded inline-flex"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      data-testid={`inv-del-${i.id}`}
                      onClick={() => setConfirmDel(i)}
                      className="p-1.5 hover:bg-cream rounded text-alert inline-flex"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <InvEditor
          form={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["inventory"] }); setEditing(null); }}
        />
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" data-testid="inv-confirm-dialog">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="font-heading text-lg font-semibold">Delete &ldquo;{confirmDel.name}&rdquo;?</h3>
            <p className="text-sm text-stone mt-2">This ingredient will be removed from the inventory list.</p>
            <div className="flex justify-end gap-3 mt-6">
              <button data-testid="inv-confirm-cancel" onClick={() => setConfirmDel(null)} className="px-5 py-2 rounded-full text-sm border border-bone hover:bg-cream">Cancel</button>
              <button data-testid="inv-confirm-delete" disabled={remove.isPending} onClick={() => remove.mutate(confirmDel.id)} className="px-5 py-2 rounded-full text-sm bg-alert text-white hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2">
                {remove.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InvEditor({ form, onClose, onSaved }: { form: InvForm; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<InvForm>(form);
  const [saving, setSaving] = useState(false);
  const isEdit = !!form.id;

  const save = async () => {
    if (!f.name.trim() || !f.unit.trim()) { toast.error("Name & unit are required"); return; }
    if (f.qty < 0 || f.reorder_level < 0) { toast.error("Quantities cannot be negative"); return; }
    setSaving(true);
    try {
      const body = { name: f.name.trim(), unit: f.unit.trim(), qty: Number(f.qty), reorder_level: Number(f.reorder_level) };
      if (isEdit && f.id) {
        await api(`/api/inventory/${f.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast.success(`${f.name} updated`);
      } else {
        await api(`/api/inventory`, { method: "POST", body: JSON.stringify(body) });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" data-testid="inv-editor-modal">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <header className="flex items-center justify-between p-5 border-b border-bone">
          <h2 className="font-heading text-xl font-semibold">{isEdit ? "Edit ingredient" : "Add ingredient"}</h2>
          <button data-testid="inv-editor-close" onClick={onClose} className="h-9 w-9 rounded-full hover:bg-cream flex items-center justify-center"><X className="h-4 w-4" /></button>
        </header>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-stone">Name *</label>
            <Input data-testid="inv-name" value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} placeholder="Basmati Rice" className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-stone">Unit *</label>
              <Input data-testid="inv-unit" value={f.unit} onChange={(e) => setF((s) => ({ ...s, unit: e.target.value }))} placeholder="kg / L / g" className="mt-1.5" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-stone">Qty on hand</label>
              <Input data-testid="inv-qty" type="number" min="0" step="0.1" value={f.qty} onChange={(e) => setF((s) => ({ ...s, qty: Number(e.target.value) }))} className="mt-1.5" />
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-stone">Reorder level</label>
            <Input data-testid="inv-reorder" type="number" min="0" step="0.1" value={f.reorder_level} onChange={(e) => setF((s) => ({ ...s, reorder_level: Number(e.target.value) }))} className="mt-1.5" />
          </div>
        </div>
        <footer className="flex justify-end gap-3 p-5 border-t border-bone">
          <button data-testid="inv-editor-cancel" onClick={onClose} className="px-5 py-2.5 rounded-full text-sm font-medium border border-bone hover:bg-cream">Cancel</button>
          <button data-testid="inv-editor-save" disabled={saving} onClick={save} className="px-5 py-2.5 rounded-full text-sm font-medium bg-ink text-cream hover:bg-clay disabled:opacity-50 inline-flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : (isEdit ? "Save changes" : "Add ingredient")}
          </button>
        </footer>
      </div>
    </div>
  );
}
