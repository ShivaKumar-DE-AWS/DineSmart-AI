"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { MenuItem } from "@/types";

export default function AdminMenu() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-menu"], queryFn: () => api<{ items: MenuItem[] }>("/api/menu") });
  const toggle = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) => api(`/api/menu/${id}`, { method: "PATCH", body: JSON.stringify({ available }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-menu"] }); toast.success("Updated"); },
  });

  return (
    <div>
      <p className="uppercase tracking-[0.3em] text-xs text-stone mb-2">Menu</p>
      <h1 className="font-heading text-4xl tracking-tight mb-8">Manage menu</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="admin-menu-grid">
        {(data?.items ?? []).map((m) => (
          <div key={m.id} className="bg-white border border-bone rounded-2xl overflow-hidden" data-testid={`admin-menu-card-${m.id}`}>
            <div className="aspect-[5/3] bg-cover bg-center" style={{ backgroundImage: `url(${m.image_url})` }} />
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-heading font-semibold">{m.name}</h3>
                <span className="font-heading font-semibold text-clay">{formatCurrency(m.price)}</span>
              </div>
              <p className="text-xs text-stone mt-1 line-clamp-2">{m.description}</p>
              <div className="flex items-center justify-between mt-4">
                <Badge variant={m.available ? "ready" : "alert"}>{m.available ? "Available" : "Hidden"}</Badge>
                <button data-testid={`toggle-${m.id}`} onClick={() => toggle.mutate({ id: m.id, available: !m.available })} className="text-xs font-medium underline">
                  {m.available ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
