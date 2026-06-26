"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { LifeBuoy, Plus, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminSupportPage() {
  const qc = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-tickets"],
    queryFn: () => api<{ tickets: any[] }>("/api/tickets"),
  });

  const submitMut = useMutation({
    mutationFn: (payload: any) => api("/api/tickets", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
    onSuccess: () => {
      toast.success("Support ticket submitted!");
      setTitle("");
      setDescription("");
      setPriority("normal");
      setIsCreating(false);
      qc.invalidateQueries({ queryKey: ["tenant-tickets"] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const deleteMut = useMutation({
    mutationFn: (ticketId: string) => api(`/api/tickets/${ticketId}`, {
      method: "DELETE"
    }),
    onSuccess: () => {
      toast.success("Ticket deleted");
      qc.invalidateQueries({ queryKey: ["tenant-tickets"] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-ink" />
            Help & Support
          </h1>
          <p className="text-stone text-sm">Need help? Open a support ticket with SmartDine HQ.</p>
        </div>
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-ink hover:bg-clay text-cream font-medium py-2 px-4 rounded-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Open Ticket
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-bone">
          <h2 className="font-heading font-semibold text-lg border-b border-bone pb-4 mb-4">New Support Ticket</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            submitMut.mutate({ title, description, priority });
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Issue Summary</label>
              <input 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border border-bone rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand/30 outline-none" 
                placeholder="Brief summary of your issue..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Description</label>
              <textarea 
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full border border-bone rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand/30 outline-none h-32" 
                placeholder="Please describe the issue in detail..."
              />
            </div>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-ink mb-1">Priority</label>
                <select 
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-full border border-bone rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand/30 outline-none bg-white"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="bg-sand hover:bg-bone text-stone font-medium py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitMut.isPending}
                  className="bg-ink hover:bg-clay text-cream font-medium py-2 px-6 rounded-lg transition flex items-center justify-center gap-2"
                >
                  Submit Ticket
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="font-heading font-semibold text-lg text-ink">Your Tickets</h2>
        {isLoading ? (
          <div className="p-8 text-center text-stone bg-white rounded-xl border border-bone">Loading tickets...</div>
        ) : data?.tickets?.length === 0 ? (
          <div className="p-12 text-center text-stone bg-white rounded-xl border border-bone">
            <LifeBuoy className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>You haven't opened any support tickets yet.</p>
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
                      ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-ink/10 text-ink'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  <div className="text-sm text-ink/80 mt-2 whitespace-pre-wrap">{ticket.description}</div>
                </div>
                {ticket.status !== 'resolved' && (
                  <button 
                    onClick={() => { if(confirm("Delete this ticket?")) deleteMut.mutate(ticket.id) }}
                    disabled={deleteMut.isPending}
                    className="p-2 text-stone hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete ticket"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-bone flex items-center gap-6 text-xs text-stone">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Opened: {new Date(ticket.created_at).toLocaleString()}</span>
                {ticket.resolved_at && (
                  <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Resolved by HQ at {new Date(ticket.resolved_at).toLocaleString()}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
