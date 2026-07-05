"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { LifeBuoy, CheckCircle2, Clock, Store, Mail, MessageSquare, Send, RotateCcw, User } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface TicketReply {
  id: string;
  message: string;
  created_by: string;
  created_at: string;
  is_hq: boolean;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  restaurant_slug: string;
  created_by_email: string;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  replies?: TicketReply[];
}

export default function SuperAdminTicketsPage() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-tickets", filterStatus, filterPriority],
    queryFn: () => {
      const p = new URLSearchParams();
      if (filterStatus) p.append("status", filterStatus);
      if (filterPriority) p.append("priority", filterPriority);
      return api<{ tickets: Ticket[] }>(`/api/super-admin/tickets?${p.toString()}`);
    },
    refetchInterval: 30000,
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => api(`/api/super-admin/tickets/${id}/resolve`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Ticket resolved");
      qc.invalidateQueries({ queryKey: ["super-admin-tickets"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  
  const reopenMut = useMutation({
    mutationFn: (id: string) => api(`/api/super-admin/tickets/${id}/reopen`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Ticket reopened");
      qc.invalidateQueries({ queryKey: ["super-admin-tickets"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const replyMut = useMutation({
    mutationFn: ({ id, message }: { id: string, message: string }) => 
      api(`/api/super-admin/tickets/${id}/reply`, { method: "POST", body: JSON.stringify({ message }) }),
    onSuccess: (_, v) => {
      toast.success("Reply sent");
      setReplyText(prev => ({...prev, [v.id]: ""}));
      qc.invalidateQueries({ queryKey: ["super-admin-tickets"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getPriorityWeight = (p: string) => {
    switch(p) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'normal': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };

  // Sort: open first, then by priority (critical -> low), then by date
  const sortedTickets = [...(data?.tickets || [])].sort((a, b) => {
    if (a.status === 'open' && b.status !== 'open') return -1;
    if (a.status !== 'open' && b.status === 'open') return 1;
    
    if (a.status === 'open') {
       const pa = getPriorityWeight(a.priority);
       const pb = getPriorityWeight(b.priority);
       if (pa !== pb) return pb - pa;
    }
    
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-brand" />
            Support Tickets
          </h1>
          <p className="text-stone text-sm">Manage issues submitted by restaurant partners.</p>
        </div>
        
        <div className="flex gap-2">
           <select 
             className="bg-white border border-bone rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
             value={filterStatus}
             onChange={(e) => setFilterStatus(e.target.value)}
           >
             <option value="">All Statuses</option>
             <option value="open">Open</option>
             <option value="resolved">Resolved</option>
           </select>
           
           <select 
             className="bg-white border border-bone rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
             value={filterPriority}
             onChange={(e) => setFilterPriority(e.target.value)}
           >
             <option value="">All Priorities</option>
             <option value="critical">Critical</option>
             <option value="high">High</option>
             <option value="normal">Normal</option>
             <option value="low">Low</option>
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <div className="p-8 text-center text-stone bg-white rounded-xl border border-bone">Loading tickets...</div>
        ) : sortedTickets.length === 0 ? (
          <div className="p-12 text-center text-stone bg-white rounded-xl border border-bone">
            <LifeBuoy className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No support tickets match your filters.</p>
          </div>
        ) : (
          sortedTickets.map((ticket) => (
            <div key={ticket.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${ticket.status === 'resolved' ? 'border-bone' : 'border-brand/30 ring-1 ring-brand/10'}`}>
              <div className={`p-5 ${ticket.status === 'resolved' ? 'opacity-75 bg-sand/30' : ''}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-lg text-ink">{ticket.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                        ticket.priority === 'critical' ? 'bg-rose-100 text-rose-700' :
                        ticket.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                        'bg-stone-100 text-stone-700'
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
                  <div className="shrink-0 flex gap-2">
                    {ticket.status === 'open' ? (
                      <button
                        onClick={() => resolveMut.mutate(ticket.id)}
                        disabled={resolveMut.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-medium transition"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Resolve
                      </button>
                    ) : (
                      <button
                        onClick={() => reopenMut.mutate(ticket.id)}
                        disabled={reopenMut.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-sm font-medium transition"
                      >
                        <RotateCcw className="w-4 h-4" /> Re-open
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-bone/50 flex flex-wrap items-center gap-4 md:gap-6 text-xs text-stone">
                  <span className="flex items-center gap-1.5 font-medium"><Store className="w-3.5 h-3.5" /> {ticket.restaurant_slug}</span>
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {ticket.created_by_email}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Opened: {new Date(ticket.created_at).toLocaleString()}</span>
                  {ticket.resolved_at && (
                    <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Resolved by {ticket.resolved_by}</span>
                  )}
                </div>
              </div>
              
              {/* Replies Section */}
              <div className="bg-sand/30 border-t border-bone p-5 space-y-4">
                 {ticket.replies && ticket.replies.length > 0 && (
                   <div className="space-y-3 mb-4">
                     {ticket.replies.map(r => (
                       <div key={r.id} className={`flex gap-3 p-3 rounded-lg text-sm ${r.is_hq ? 'bg-brand/5 border border-brand/10 ml-8' : 'bg-white border border-bone mr-8'}`}>
                         <div className="mt-0.5">
                           {r.is_hq ? <User className="w-4 h-4 text-brand" /> : <Store className="w-4 h-4 text-stone" />}
                         </div>
                         <div className="flex-1">
                           <div className="flex justify-between items-center mb-1">
                             <span className="font-semibold text-xs text-ink">{r.is_hq ? `SmartDine HQ (${r.created_by})` : r.created_by}</span>
                             <span className="text-[10px] text-stone">{new Date(r.created_at).toLocaleString()}</span>
                           </div>
                           <div className="text-ink/90 whitespace-pre-wrap">{r.message}</div>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
                 
                 {ticket.status === 'open' && (
                   <div className="flex gap-2">
                     <textarea 
                       className="flex-1 border border-bone rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 min-h-[40px] resize-y"
                       placeholder="Type a reply..."
                       value={replyText[ticket.id] || ""}
                       onChange={e => setReplyText(prev => ({...prev, [ticket.id]: e.target.value}))}
                     />
                     <button 
                       disabled={!replyText[ticket.id]?.trim() || replyMut.isPending}
                       onClick={() => replyMut.mutate({ id: ticket.id, message: replyText[ticket.id] })}
                       className="shrink-0 bg-brand text-white px-3 rounded-lg hover:bg-brand/90 transition disabled:opacity-50 flex items-center justify-center"
                     >
                       <Send className="w-4 h-4" />
                     </button>
                   </div>
                 )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
