"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Store, Search, UserCircle2, Ban, Play, Trash2, Plus, Clock, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "@/stores/session";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  owner_email?: string;
  subscription_status?: string;
  trial_ends_at?: string;
  plan_tier?: string;
  plan?: string;
  order_count: number;
  created_at?: string;
}

export default function SuperAdminRestaurantsPage() {
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", slug: "", owner_email: "" });
  
  const qc = useQueryClient();
  const router = useRouter();
  const setSession = useSession((s) => s.setSession);

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-restaurants"],
    queryFn: () => api<{ restaurants: Restaurant[] }>("/api/super-admin/restaurants"),
  });

  const suspendMut = useMutation({
    mutationFn: (id: string) => api<{ message: string; new_status: string }>(`/api/super-admin/restaurants/${id}/suspend`, { method: "POST" }),
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["super-admin-restaurants"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api<{ message: string }>(`/api/super-admin/restaurants/${id}`, { method: "DELETE" }),
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["super-admin-restaurants"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const extendTrialMut = useMutation({
    mutationFn: (id: string) => api<{ message: string }>(`/api/super-admin/restaurants/${id}/extend-trial`, { method: "POST", body: JSON.stringify({ days: 7 }) }),
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["super-admin-restaurants"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addMut = useMutation({
    mutationFn: (body: typeof addForm) => api<{ message: string }>(`/api/super-admin/restaurants`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (data) => {
      toast.success(data.message);
      setShowAddModal(false);
      setAddForm({ name: "", slug: "", owner_email: "" });
      qc.invalidateQueries({ queryKey: ["super-admin-restaurants"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const impersonateMut = useMutation({
    mutationFn: (id: string) => api<{ token: string; user: any }>(`/api/super-admin/restaurants/${id}/impersonate`, { method: "POST" }),
    onSuccess: (data) => {
      setSession(data.user, data.token);
      toast.success(`Impersonating ${data.user.restaurant_slug}`);
      router.push(`/admin`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const restaurants = (data?.restaurants ?? []).filter((r) =>
    !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.slug?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Store className="h-6 w-6 text-brand" />
            Restaurants
          </h1>
          <p className="text-stone text-sm">All registered restaurants on the platform.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand/90 transition shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Restaurant
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-bone rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          placeholder="Search restaurants..."
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-bone overflow-x-auto w-full">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bone bg-sand">
              <th className="text-left py-3 px-4 font-medium text-stone">Name</th>
              <th className="text-left py-3 px-4 font-medium text-stone">Slug</th>
              <th className="text-left py-3 px-4 font-medium text-stone hidden md:table-cell">Plan</th>
              <th className="text-left py-3 px-4 font-medium text-stone hidden md:table-cell">Status</th>
              <th className="text-left py-3 px-4 font-medium text-stone">Orders</th>
              <th className="text-left py-3 px-4 font-medium text-stone hidden md:table-cell">Trial Ends</th>
              <th className="text-right py-3 px-4 font-medium text-stone">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-stone">Loading...</td></tr>
            ) : restaurants.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-stone">No restaurants found.</td></tr>
            ) : (
              restaurants.map((r) => (
                <tr key={r.id || r.slug} className="border-b border-bone last:border-0 hover:bg-sand/50 transition">
                  <td className="py-3 px-4 font-medium text-ink">{r.name}</td>
                  <td className="py-3 px-4 text-stone font-mono text-xs">{r.slug}</td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-xs font-medium capitalize">
                      {r.plan_tier || r.plan || "starter"}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.subscription_status === "active" ? "bg-emerald-100 text-emerald-700" :
                      r.subscription_status === "trial" ? "bg-amber-100 text-amber-700" :
                      "bg-stone/10 text-stone"
                    }`}>
                      {r.subscription_status || "unknown"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-ink">{r.order_count}</td>
                  <td className="py-3 px-4 text-stone text-xs hidden md:table-cell">
                    {r.subscription_status === "trial" && r.trial_ends_at 
                      ? new Date(r.trial_ends_at).toLocaleDateString() 
                      : (r.subscription_status === "trial" ? "No Date Set" : "—")}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                    {r.subscription_status === "trial" && (
                      <button 
                        onClick={() => {
                          if (confirm(`Extend trial by 7 days for ${r.name}?`)) {
                            extendTrialMut.mutate(r.id);
                          }
                        }}
                        disabled={extendTrialMut.isPending}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition text-xs font-medium"
                        title="Extend Trial"
                      >
                        <Clock className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button 
                      onClick={() => impersonateMut.mutate(r.id)}
                      disabled={impersonateMut.isPending}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition text-xs font-medium"
                      title="Impersonate Admin"
                    >
                      <UserCircle2 className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm(`Are you sure you want to ${r.subscription_status === 'suspended' ? 'activate' : 'suspend'} ${r.name}?`)) {
                          suspendMut.mutate(r.id);
                        }
                      }}
                      disabled={suspendMut.isPending}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone/10 text-stone hover:bg-stone/20 transition text-xs font-medium"
                      title={r.subscription_status === 'suspended' ? 'Activate' : 'Suspend'}
                    >
                      {r.subscription_status === 'suspended' ? <Play className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm(`Are you sure you want to PERMANENTLY DELETE ${r.name}? This action cannot be undone.`)) {
                          deleteMut.mutate(r.id);
                        }
                      }}
                      disabled={deleteMut.isPending}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition text-xs font-medium"
                      title="Delete Restaurant"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-xl font-heading font-bold text-ink">Add Restaurant</h2>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-stone hover:text-ink transition p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  addMut.mutate(addForm);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Restaurant Name</label>
                  <input 
                    type="text" 
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({...addForm, name: e.target.value})}
                    className="w-full border border-bone rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                    placeholder="e.g. The Golden Dragon"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Slug</label>
                  <input 
                    type="text" 
                    required
                    value={addForm.slug}
                    onChange={(e) => setAddForm({...addForm, slug: e.target.value})}
                    className="w-full border border-bone rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                    placeholder="e.g. golden-dragon"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Owner Email</label>
                  <input 
                    type="email" 
                    required
                    value={addForm.owner_email}
                    onChange={(e) => setAddForm({...addForm, owner_email: e.target.value})}
                    className="w-full border border-bone rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                    placeholder="owner@example.com"
                  />
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 bg-sand text-ink rounded-lg text-sm font-medium hover:bg-bone transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={addMut.isPending}
                    className="flex-1 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition flex justify-center items-center"
                  >
                    {addMut.isPending ? "Creating..." : "Create Restaurant"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
