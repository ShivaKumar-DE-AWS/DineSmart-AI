"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { LifeBuoy, CheckCircle2, Clock, Store } from "lucide-react";
import { toast } from "sonner";

export default function SuperAdminTicketsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-tickets"],
    queryFn: () => api<{ tickets: any[] }>("/api/super-admin/tickets"),
    refetchInterval: 15000,
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => api(`/api/super-admin/tickets/${id}/resolve`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Ticket resolved");
      qc.invalidateQueries({ queryKey: ["super-admin-tickets"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-brand" />
          Support Tickets
        </h1>
        <p className="text-stone text-sm">Manage issues submitted by restaurant partners.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="p-8 text-center text-stone bg-white rounded-xl border border-bone">Loading tickets...</div>
        ) : data?.tickets?.length === 0 ? (
          <div className="p-12 text-center text-stone bg-white rounded-xl border border-bone">
            <LifeBuoy className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No support tickets yet. You're all caught up!</p>
          </div>
        ) : (
          data?.tickets?.map((ticket) => (
            <div key={ticket.id} className={`bg-white rounded-xl shadow-sm border p-5 ${ticket.status === 'resolved' ? 'border-bone opacity-75' : 'border-brand/20'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-lg text-ink">{ticket.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                      ticket.priority === 'critical' ? 'bg-rose-100 text-rose-700' :
                      ticket.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                      'bg-stone/10 text-stone'
                    }`}>
                      {ticket.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                      ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-brand/10 text-brand'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  <div className="text-sm text-ink/80 mt-2 whitespace-pre-wrap">{ticket.description}</div>
                </div>
                {ticket.status === 'open' && (
                  <button
                    onClick={() => resolveMut.mutate(ticket.id)}
                    disabled={resolveMut.isPending}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-medium transition"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Resolve
                  </button>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-bone flex items-center gap-6 text-xs text-stone">
                <span className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> {ticket.restaurant_slug}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Opened: {new Date(ticket.created_at).toLocaleString()}</span>
                {ticket.resolved_at && (
                  <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Resolved by {ticket.resolved_by}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
