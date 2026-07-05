"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { LifeBuoy, Plus, CheckCircle2, Clock, Trash2, Image as ImageIcon, MessageSquare, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

function TicketReplyThread({ ticketId, status }: { ticketId: string, status: string }) {
  const qc = useQueryClient();
  const [replyMsg, setReplyMsg] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["ticket-replies", ticketId],
    queryFn: () => api<{ replies: any[] }>(`/api/tickets/${ticketId}/replies`).catch((err) => {
      if (err.message.includes("404")) return { replies: [] };
      throw err;
    }),
  });

  const replyMut = useMutation({
    mutationFn: (message: string) => api(`/api/tickets/${ticketId}/replies`, {
      method: "POST",
      body: JSON.stringify({ message })
    }),
    onSuccess: () => {
      toast.success("Reply sent!");
      setReplyMsg("");
      qc.invalidateQueries({ queryKey: ["ticket-replies", ticketId] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  return (
    <div className="mt-4 pt-4 border-t border-bone">
      <h4 className="font-semibold text-sm text-ink mb-3 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-clay" /> Conversation
      </h4>
      <div className="space-y-4 mb-4">
        {isLoading ? (
          <div className="text-stone text-sm">Loading replies...</div>
        ) : !data?.replies || data.replies.length === 0 ? (
          <div className="text-stone text-sm italic">No replies yet.</div>
        ) : (
          data.replies.map((reply: any) => (
            <div key={reply.id} className={`flex flex-col ${reply.sender === 'HQ' ? 'items-start' : 'items-end'}`}>
              <div className={`max-w-[80%] rounded-xl p-3 text-sm ${reply.sender === 'HQ' ? 'bg-sand text-ink' : 'bg-clay text-white'}`}>
                <div className="font-semibold text-xs opacity-70 mb-1">{reply.sender === 'HQ' ? 'SmartDine HQ' : 'You'}</div>
                <div className="whitespace-pre-wrap">{reply.message}</div>
              </div>
              <div className="text-[10px] text-stone mt-1">
                {new Date(reply.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
      
      {status !== 'resolved' && (
        <form onSubmit={(e) => {
          e.preventDefault();
          if (replyMsg.trim()) replyMut.mutate(replyMsg);
        }} className="flex gap-2">
          <textarea
            value={replyMsg}
            onChange={(e) => setReplyMsg(e.target.value)}
            placeholder="Type your reply..."
            className="flex-1 border border-bone rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand/30 outline-none resize-none h-10 min-h-[40px] bg-white"
          />
          <button
            type="submit"
            disabled={replyMut.isPending || !replyMsg.trim()}
            className="bg-ink hover:bg-clay text-cream font-medium px-4 rounded-lg transition disabled:opacity-50"
          >
            Reply
          </button>
        </form>
      )}
    </div>
  );
}

function TicketCard({ ticket, deleteMut }: { ticket: any, deleteMut: any }) {
  const [expanded, setExpanded] = useState(false);

  // Status timeline logic
  const statuses = ['opened', 'in_progress', 'resolved'];
  const currentIndex = statuses.indexOf(ticket.status === 'in_progress' ? 'in_progress' : ticket.status === 'resolved' ? 'resolved' : 'opened');
  
  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 ${ticket.status === 'resolved' ? 'border-bone opacity-75' : 'border-brand/20'}`}>
      <div 
        className="flex items-start justify-between cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-lg text-ink group-hover:text-clay transition-colors">{ticket.title}</h3>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
              ticket.priority === 'critical' ? 'bg-rose-100 text-rose-700' :
              ticket.priority === 'high' ? 'bg-amber-100 text-amber-700' :
              'bg-stone/10 text-stone'
            }`}>
              {ticket.priority}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
              ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 
              ticket.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
              'bg-ink/10 text-ink'
            }`}>
              {ticket.status}
            </span>
          </div>
          <div className="text-sm text-ink/80 mt-2 whitespace-pre-wrap">{ticket.description}</div>
          
          {ticket.screenshot_url && (
            <div className="mt-3">
              <a href={ticket.screenshot_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1.5 text-xs text-clay bg-clay/10 px-2 py-1 rounded hover:bg-clay/20 transition">
                <ImageIcon className="w-3.5 h-3.5" /> View Attachment
              </a>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
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
          <button className="p-2 text-stone hover:bg-sand rounded-lg transition-colors" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-bone flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-xs text-stone">
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Opened: {new Date(ticket.created_at).toLocaleString()}</span>
          {ticket.resolved_at && (
            <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Resolved at {new Date(ticket.resolved_at).toLocaleString()}</span>
          )}
        </div>
        
        {/* Status Timeline */}
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-3 h-3 rounded-full ${currentIndex >= 0 ? 'bg-clay' : 'bg-bone'}`} title="Opened" />
          <div className={`w-8 h-0.5 ${currentIndex >= 1 ? 'bg-clay' : 'bg-bone'}`} />
          <div className={`w-3 h-3 rounded-full ${currentIndex >= 1 ? 'bg-amber-500' : 'bg-bone'}`} title="In Progress" />
          <div className={`w-8 h-0.5 ${currentIndex >= 2 ? 'bg-amber-500' : 'bg-bone'}`} />
          <div className={`w-3 h-3 rounded-full ${currentIndex >= 2 ? 'bg-emerald-500' : 'bg-bone'}`} title="Resolved" />
        </div>
      </div>

      {expanded && (
        <TicketReplyThread ticketId={ticket.id} status={ticket.status} />
      )}
    </div>
  );
}

export default function AdminSupportPage() {
  const qc = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setScreenshot(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setScreenshot(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const faqs = [
    { q: "How do I add a new menu item?", a: "Go to Menu section and click Add Dish button." },
    { q: "How do I print QR codes?", a: "Go to Tables & QR, select a table, and click Print." },
    { q: "Why is my restaurant in sandbox mode?", a: "Go to Settings and complete OTP verification." },
    { q: "How do I change my UPI ID?", a: "Go to Settings > Payment Options." },
    { q: "How do I bulk import my menu?", a: "Go to Menu and use the AI Import feature." }
  ];

  const [faqExpanded, setFaqExpanded] = useState(false);

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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-bone animate-in slide-in-from-top-4 fade-in">
          <h2 className="font-heading font-semibold text-lg border-b border-bone pb-4 mb-4">New Support Ticket</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            submitMut.mutate({ title, description, priority, screenshot_url: screenshot });
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Issue Summary</label>
              <input 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border border-bone rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand/30 outline-none bg-white" 
                placeholder="Brief summary of your issue..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Description</label>
              <textarea 
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full border border-bone rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand/30 outline-none h-32 bg-white" 
                placeholder="Please describe the issue in detail..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Attachment (Optional)</label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-sand hover:bg-bone text-stone text-sm font-medium py-2 px-4 rounded-lg transition flex items-center gap-2 border border-bone"
                >
                  <ImageIcon className="w-4 h-4" /> Attach Screenshot
                </button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                {screenshot && (
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" /> Image attached
                    <button type="button" onClick={() => setScreenshot(null)} className="ml-2 text-emerald-700 hover:text-red-600">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 items-end mt-4">
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
            <TicketCard key={ticket.id} ticket={ticket} deleteMut={deleteMut} />
          ))
        )}
      </div>

      {/* Quick FAQ Section */}
      <div className="mt-12 bg-white rounded-xl border border-bone overflow-hidden shadow-sm">
        <button 
          className="w-full flex items-center justify-between p-5 bg-sand/30 hover:bg-sand transition"
          onClick={() => setFaqExpanded(!faqExpanded)}
        >
          <div className="flex items-center gap-2 font-heading font-semibold text-lg text-ink">
            <HelpCircle className="w-5 h-5 text-clay" /> Quick FAQ
          </div>
          {faqExpanded ? <ChevronUp className="w-5 h-5 text-stone" /> : <ChevronDown className="w-5 h-5 text-stone" />}
        </button>
        
        {faqExpanded && (
          <div className="p-5 divide-y divide-bone">
            {faqs.map((faq, i) => (
              <div key={i} className={i !== 0 ? "pt-4 mt-4" : ""}>
                <h4 className="font-medium text-ink mb-1 text-sm">{faq.q}</h4>
                <p className="text-sm text-stone">{faq.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
