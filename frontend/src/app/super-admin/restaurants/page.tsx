"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Store, Search, UserCircle2, Ban, Play } from "lucide-react";
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
  order_count: number;
  created_at?: string;
}

export default function SuperAdminRestaurantsPage() {
  const [search, setSearch] = useState("");
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

  const impersonateMut = useMutation({
    mutationFn: (id: string) => api<{ token: string; user: any }>(`/api/super-admin/restaurants/${id}/impersonate`, { method: "POST" }),
    onSuccess: (data) => {
      setSession(data.user, data.token);
      toast.success(`Impersonating ${data.user.restaurant_slug}`);
      router.push(`/r/${data.user.restaurant_slug}/admin`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const restaurants = (data?.restaurants ?? []).filter((r) =>
    !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.slug?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Store className="h-6 w-6 text-brand" />
            Restaurants
          </h1>
          <p className="text-stone text-sm">All registered restaurants on the platform.</p>
        </div>
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

      <div className="bg-white rounded-xl shadow-sm border border-bone overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bone bg-sand">
              <th className="text-left py-3 px-4 font-medium text-stone">Name</th>
              <th className="text-left py-3 px-4 font-medium text-stone">Slug</th>
              <th className="text-left py-3 px-4 font-medium text-stone hidden md:table-cell">Status</th>
              <th className="text-left py-3 px-4 font-medium text-stone">Orders</th>
              <th className="text-left py-3 px-4 font-medium text-stone hidden md:table-cell">Created</th>
              <th className="text-right py-3 px-4 font-medium text-stone">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-8 text-stone">Loading...</td></tr>
            ) : restaurants.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-stone">No restaurants found.</td></tr>
            ) : (
              restaurants.map((r) => (
                <tr key={r.id || r.slug} className="border-b border-bone last:border-0 hover:bg-sand/50 transition">
                  <td className="py-3 px-4 font-medium text-ink">{r.name}</td>
                  <td className="py-3 px-4 text-stone font-mono text-xs">{r.slug}</td>
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
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button 
                      onClick={() => impersonateMut.mutate(r.id)}
                      disabled={impersonateMut.isPending}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition text-xs font-medium"
                      title="Impersonate Admin"
                    >
                      <UserCircle2 className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Login As</span>
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
