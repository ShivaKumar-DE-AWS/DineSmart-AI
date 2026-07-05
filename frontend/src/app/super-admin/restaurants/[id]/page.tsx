"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  Store, UserCircle2, Ban, Play, Trash2, Clock, MapPin, CheckCircle2, 
  AlertTriangle, Save, Edit2, History, Banknote, Users, Activity, FileText 
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/stores/session";
import { motion } from "framer-motion";

export default function RestaurantProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const setSession = useSession((s) => s.setSession);
  
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ owner_name: "", owner_phone: "", owner_whatsapp: "", admin_notes: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-restaurant-profile", id],
    queryFn: () => api<any>(`/api/super-admin/restaurants/${id}`)
  });

  useEffect(() => {
    if (data?.restaurant && !isEditingContact) {
      setContactForm({
        owner_name: data.restaurant.owner_name || "",
        owner_phone: data.restaurant.owner_phone || "",
        owner_whatsapp: data.restaurant.owner_whatsapp || "",
        admin_notes: data.restaurant.admin_notes || ""
      });
    }
  }, [data, isEditingContact]);

  const updateMut = useMutation({
    mutationFn: (body: any) => api<{ message: string }>(`/api/super-admin/restaurants/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (data) => {
      toast.success(data.message);
      setIsEditingContact(false);
      qc.invalidateQueries({ queryKey: ["super-admin-restaurant-profile", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  
  const suspendMut = useMutation({
    mutationFn: () => api<{ message: string; new_status: string }>(`/api/super-admin/restaurants/${id}/suspend`, { method: "POST" }),
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["super-admin-restaurant-profile", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => api<{ message: string }>(`/api/super-admin/restaurants/${id}`, { method: "DELETE" }),
    onSuccess: (data) => {
      toast.success(data.message);
      router.push("/super-admin/restaurants");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const impersonateMut = useMutation({
    mutationFn: () => api<{ token: string; user: any }>(`/api/super-admin/restaurants/${id}/impersonate`, { method: "POST" }),
    onSuccess: (data) => {
      toast.success(`Impersonating ${data.user.restaurant_slug}`);
      const host = window.location.host;
      const isLocal = host.includes("localhost");
      const baseDomain = isLocal ? "localhost:3000" : "smartdineai.co.in";
      const protocol = isLocal ? "http" : "https";
      
      const userStr = encodeURIComponent(JSON.stringify(data.user));
      const url = `${protocol}://${data.user.restaurant_slug}.${baseDomain}/auth/impersonate?token=${data.token}&user=${userStr}`;
      
      window.location.href = url;
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <div className="p-10 text-center text-stone">Loading profile...</div>;
  if (!data?.restaurant) return <div className="p-10 text-center text-red-500">Restaurant not found</div>;

  const { restaurant: r, stats, recent_orders } = data;
  
  const statusBadge = {
    active: "bg-emerald-100 text-emerald-800 border-emerald-200",
    trial: "bg-amber-100 text-amber-800 border-amber-200",
    suspended: "bg-red-100 text-red-800 border-red-200",
    deleted: "bg-zinc-100 text-zinc-800 border-zinc-200"
  }[r.subscription_status] || "bg-zinc-100 text-zinc-800 border-zinc-200";

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/super-admin/restaurants")} className="text-stone hover:text-brand transition">← Back</button>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            {r.name}
          </h1>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge}`}>
            {r.subscription_status?.toUpperCase()}
          </span>
          <span className="bg-brand-secondary/20 text-brand px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border border-brand-secondary/30">
            {r.plan_tier || "STARTER"}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button onClick={() => impersonateMut.mutate()} disabled={impersonateMut.isPending} className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-2">
            <Play className="h-4 w-4" /> Impersonate
          </button>
          <button onClick={() => suspendMut.mutate()} disabled={suspendMut.isPending} className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1.5 rounded-xl font-medium text-sm transition flex items-center gap-2">
            <Ban className="h-4 w-4" /> {r.subscription_status === "suspended" ? "Unsuspend" : "Suspend"}
          </button>
          <button 
            onClick={() => { if(confirm("Permanently delete this restaurant and all its data? This cannot be undone.")) deleteMut.mutate(); }}
            disabled={deleteMut.isPending}
            className="bg-red-100 hover:bg-red-200 text-red-900 px-3 py-1.5 rounded-xl font-medium text-sm transition flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Contact & Notes */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white rounded-2xl border border-stone-light p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-brand flex items-center gap-2">
                <UserCircle2 className="h-5 w-5" />
                Owner Contact
              </h3>
              {!isEditingContact ? (
                <button onClick={() => setIsEditingContact(true)} className="text-brand-secondary hover:text-brand p-1"><Edit2 className="h-4 w-4" /></button>
              ) : (
                <button onClick={() => updateMut.mutate(contactForm)} disabled={updateMut.isPending} className="text-emerald-600 hover:text-emerald-700 p-1"><Save className="h-4 w-4" /></button>
              )}
            </div>
            
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-1">Email</label>
                <div className="text-brand-dark">{r.owner_email}</div>
              </div>
              
              {isEditingContact ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-1">Name</label>
                    <input className="input-field py-1 px-2 text-sm" value={contactForm.owner_name} onChange={e => setContactForm(prev => ({...prev, owner_name: e.target.value}))} placeholder="Owner Name" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-1">Phone</label>
                    <input className="input-field py-1 px-2 text-sm" value={contactForm.owner_phone} onChange={e => setContactForm(prev => ({...prev, owner_phone: e.target.value}))} placeholder="+91..." />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-1">WhatsApp</label>
                    <input className="input-field py-1 px-2 text-sm" value={contactForm.owner_whatsapp} onChange={e => setContactForm(prev => ({...prev, owner_whatsapp: e.target.value}))} placeholder="+91..." />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-1">Name</label>
                    <div className="text-brand-dark">{r.owner_name || "—"}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-1">Phone</label>
                    <div className="text-brand-dark">{r.owner_phone || "—"}</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-stone uppercase tracking-wider block mb-1">WhatsApp</label>
                    <div className="text-brand-dark">{r.owner_whatsapp || "—"}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-light p-5 shadow-sm">
             <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-brand flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Admin Notes
              </h3>
            </div>
            {isEditingContact ? (
              <textarea 
                className="input-field text-sm min-h-[120px] resize-y" 
                value={contactForm.admin_notes} 
                onChange={e => setContactForm(prev => ({...prev, admin_notes: e.target.value}))} 
                placeholder="Internal notes about this restaurant..."
              />
            ) : (
              <div className="text-sm text-stone whitespace-pre-wrap">{r.admin_notes || "No notes."}</div>
            )}
          </div>
        </div>

        {/* Right Column: Stats & Recent Orders */}
        <div className="space-y-6 lg:col-span-2">
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-stone-light p-4 shadow-sm">
              <div className="text-stone text-xs font-bold uppercase tracking-wider mb-1">Total Orders</div>
              <div className="text-2xl font-heading font-bold text-brand">{stats.total_orders.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-2xl border border-stone-light p-4 shadow-sm">
              <div className="text-stone text-xs font-bold uppercase tracking-wider mb-1">Total GMV</div>
              <div className="text-2xl font-heading font-bold text-emerald-600">₹{stats.total_gmv.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-2xl border border-stone-light p-4 shadow-sm">
              <div className="text-stone text-xs font-bold uppercase tracking-wider mb-1">Orders Today</div>
              <div className="text-2xl font-heading font-bold text-brand">{stats.orders_today}</div>
            </div>
            <div className="bg-white rounded-2xl border border-stone-light p-4 shadow-sm">
              <div className="text-stone text-xs font-bold uppercase tracking-wider mb-1">Rev Today</div>
              <div className="text-2xl font-heading font-bold text-emerald-600">₹{stats.revenue_today.toLocaleString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white rounded-2xl border border-stone-light p-4 flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-stone text-xs font-bold uppercase tracking-wider mb-1">Menu Items</div>
                  <div className="text-xl font-heading font-bold text-brand">{stats.menu_items}</div>
                </div>
                <Activity className="h-8 w-8 text-brand/20" />
             </div>
             <div className="bg-white rounded-2xl border border-stone-light p-4 flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-stone text-xs font-bold uppercase tracking-wider mb-1">Tables</div>
                  <div className="text-xl font-heading font-bold text-brand">{stats.tables}</div>
                </div>
                <Users className="h-8 w-8 text-brand/20" />
             </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-light shadow-sm overflow-hidden">
            <div className="p-5 border-b border-stone-light flex justify-between items-center bg-stone-light/20">
              <h3 className="font-heading font-bold text-brand flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Orders
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-light/30 text-stone-dark font-semibold">
                  <tr>
                    <th className="p-4">Token</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-light">
                  {recent_orders.length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-center text-stone">No orders yet</td></tr>
                  ) : (
                    recent_orders.map((o: any) => (
                      <tr key={o.id} className="hover:bg-stone-light/10 transition-colors">
                        <td className="p-4 font-bold text-brand">{o.token}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            o.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                            o.status === "cancelled" ? "bg-red-100 text-red-800" :
                            "bg-amber-100 text-amber-800"
                          }`}>
                            {o.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-emerald-600">₹{o.total}</td>
                        <td className="p-4 text-stone">{new Date(o.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
