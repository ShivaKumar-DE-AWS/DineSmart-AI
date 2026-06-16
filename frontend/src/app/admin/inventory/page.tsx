"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { InventoryItem } from "@/types";

export default function AdminInventory() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["inventory"], queryFn: () => api<{ items: InventoryItem[] }>("/api/inventory") });
  const mut = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => api(`/api/inventory/${id}`, { method: "PATCH", body: JSON.stringify({ qty }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); toast.success("Updated"); },
  });

  return (
    <div>
      <p className="uppercase tracking-[0.3em] text-xs text-stone mb-2">Operations</p>
      <h1 className="font-heading text-4xl tracking-tight mb-8">Inventory</h1>
      <div className="bg-white border border-bone rounded-2xl overflow-hidden">
        <table className="w-full text-sm" data-testid="inventory-table">
          <thead className="bg-cream border-b border-bone text-stone uppercase text-xs tracking-wider">
            <tr><th className="text-left px-4 py-3">Item</th><th className="text-left px-4 py-3">Qty</th><th className="text-left px-4 py-3">Unit</th><th className="text-left px-4 py-3">Reorder at</th><th className="text-left px-4 py-3">Status</th></tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((i) => {
              const low = i.qty <= i.reorder_level;
              return (
                <tr key={i.id} className="border-b border-bone last:border-0" data-testid={`inv-row-${i.id}`}>
                  <td className="px-4 py-3 font-medium">{i.name}</td>
                  <td className="px-4 py-3">
                    <Input data-testid={`inv-qty-${i.id}`} type="number" defaultValue={i.qty} className="h-9 w-24" onBlur={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!Number.isNaN(v) && v !== i.qty) mut.mutate({ id: i.id, qty: v });
                    }} />
                  </td>
                  <td className="px-4 py-3 text-stone">{i.unit}</td>
                  <td className="px-4 py-3">{i.reorder_level}</td>
                  <td className="px-4 py-3">{low ? <span className="text-alert font-medium">Low</span> : <span className="text-ready font-medium">OK</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
