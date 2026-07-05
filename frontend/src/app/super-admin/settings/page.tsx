"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Settings, Megaphone, Check, Trash2, PowerOff, Clock, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SuperAdminSettingsPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [isActive, setIsActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");

  const { data: currentAnn, isLoading: isCurrentLoading } = useQuery({
    queryKey: ["current-announcement"],
    queryFn: () => api<{ announcement: any }>("/api/announcements"),
  });

  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["all-announcements"],
    queryFn: () => api<{ announcements: any[] }>("/api/super-admin/announcements"),
  });

  const postMut = useMutation({
    mutationFn: (payload: any) => api("/api/super-admin/announcements", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
    onSuccess: () => {
      toast.success("Announcement posted successfully!");
      setTitle("");
      setMessage("");
      setExpiresAt("");
      qc.invalidateQueries({ queryKey: ["current-announcement"] });
      qc.invalidateQueries({ queryKey: ["all-announcements"] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => api(`/api/super-admin/announcements/${id}/deactivate`, { method: "PATCH" }),
    onSuccess: () => {
      toast.success("Announcement deactivated!");
      qc.invalidateQueries({ queryKey: ["current-announcement"] });
      qc.invalidateQueries({ queryKey: ["all-announcements"] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/api/super-admin/announcements/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Announcement deleted!");
      qc.invalidateQueries({ queryKey: ["current-announcement"] });
      qc.invalidateQueries({ queryKey: ["all-announcements"] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const getTypeStyle = (t: string) => {
    switch(t) {
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'warning': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'success': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'feature': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-brand" />
          Platform Settings
        </h1>
        <p className="text-stone text-sm">Global configurations for SmartDine.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Create Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-bone space-y-6 h-fit">
          <div className="flex items-center gap-2 border-b border-bone pb-4">
            <Megaphone className="h-5 w-5 text-brand" />
            <h2 className="font-heading font-semibold text-lg">New Announcement</h2>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            const payload: any = { title, message, type, is_active: isActive };
            if (expiresAt) {
              payload.expires_at = new Date(expiresAt).toISOString();
            }
            postMut.mutate(payload);
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Title</label>
              <input 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border border-bone rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand/30 outline-none" 
                placeholder="e.g. Scheduled Maintenance"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Message</label>
              <textarea 
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full border border-bone rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand/30 outline-none h-24 resize-y" 
                placeholder="Details of the announcement..."
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-ink mb-1">Type</label>
                <select 
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full border border-bone rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand/30 outline-none bg-white"
                >
                  <option value="info">Info (Blue)</option>
                  <option value="warning">Warning (Yellow)</option>
                  <option value="success">Success (Green)</option>
                  <option value="error">Error (Red)</option>
                  <option value="feature">New Feature (Purple)</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-ink mb-1">Expires At (Optional)</label>
                <input 
                  type="datetime-local"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  className="w-full border border-bone rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand/30 outline-none" 
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="is_active"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="rounded border-bone text-brand focus:ring-brand/30 h-4 w-4 cursor-pointer"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-ink cursor-pointer">
                Set as Active immediately
              </label>
            </div>
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={postMut.isPending || !title || !message}
                className="w-full flex items-center justify-center gap-2 bg-brand text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand/90 transition disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> Publish Announcement
              </button>
            </div>
          </form>
          
          {/* Live Preview */}
          <div className="mt-8">
            <h3 className="text-xs font-semibold text-stone uppercase tracking-wider mb-3">Live Preview</h3>
            <div className={`p-4 rounded-xl border-l-4 ${getTypeStyle(type).split(' ')[0].replace('bg-', 'border-')} ${getTypeStyle(type)} bg-opacity-30`}>
               <h4 className="font-semibold text-ink flex items-center gap-2">
                 {type === 'warning' ? <AlertTriangle className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                 {title || "Announcement Title"}
               </h4>
               <p className="text-sm text-ink/80 mt-1 whitespace-pre-wrap">{message || "Your announcement message will appear here."}</p>
            </div>
          </div>
        </div>
        
        {/* History List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-bone flex flex-col h-[calc(100vh-140px)] min-h-[600px]">
          <div className="flex items-center gap-2 border-b border-bone pb-4 mb-4 shrink-0">
            <Clock className="h-5 w-5 text-stone" />
            <h2 className="font-heading font-semibold text-lg">Announcement History</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
             {isHistoryLoading ? (
               <div className="text-center py-8 text-stone">Loading history...</div>
             ) : history?.announcements?.length === 0 ? (
               <div className="text-center py-8 text-stone bg-sand/30 rounded-lg border border-dashed border-bone">No announcements yet.</div>
             ) : (
               history?.announcements?.map((ann: any) => {
                 const isExpired = ann.expires_at && new Date(ann.expires_at) < new Date();
                 const isActuallyActive = ann.is_active && !isExpired;
                 
                 return (
                   <div key={ann.id} className={`p-4 rounded-xl border transition ${isActuallyActive ? 'border-brand/30 shadow-sm ring-1 ring-brand/10' : 'border-bone bg-stone-50/50'}`}>
                     <div className="flex justify-between items-start mb-2">
                       <h3 className="font-semibold text-ink">{ann.title}</h3>
                       <div className="flex items-center gap-2 shrink-0">
                         {isActuallyActive ? (
                           <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-full tracking-wider">Live</span>
                         ) : ann.is_active && isExpired ? (
                           <span className="px-2 py-0.5 bg-stone-200 text-stone-600 text-[10px] font-bold uppercase rounded-full tracking-wider">Expired</span>
                         ) : (
                           <span className="px-2 py-0.5 bg-stone-100 text-stone-500 text-[10px] font-bold uppercase rounded-full tracking-wider border border-stone-200">Inactive</span>
                         )}
                       </div>
                     </div>
                     
                     <div className="text-sm text-ink/80 line-clamp-2 mb-3">{ann.message}</div>
                     
                     <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-3 border-t border-bone/50 text-xs">
                       <div className="flex flex-wrap items-center gap-2">
                         <span className={`px-2 py-0.5 rounded-full capitalize font-medium border ${getTypeStyle(ann.type)}`}>{ann.type}</span>
                         <span className="text-stone">By {ann.created_by?.split('@')[0]}</span>
                       </div>
                       
                       <div className="flex items-center gap-1">
                         {ann.is_active && (
                           <button 
                             onClick={() => deactivateMut.mutate(ann.id)}
                             disabled={deactivateMut.isPending}
                             className="p-1.5 text-stone hover:text-amber-600 hover:bg-amber-50 rounded transition"
                             title="Deactivate"
                           >
                             <PowerOff className="h-4 w-4" />
                           </button>
                         )}
                         <button 
                           onClick={() => {
                             if(confirm("Delete this announcement permanently?")) deleteMut.mutate(ann.id);
                           }}
                           disabled={deleteMut.isPending}
                           className="p-1.5 text-stone hover:text-red-600 hover:bg-red-50 rounded transition"
                           title="Delete"
                         >
                           <Trash2 className="h-4 w-4" />
                         </button>
                       </div>
                     </div>
                   </div>
                 );
               })
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
