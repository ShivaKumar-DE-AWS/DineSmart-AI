"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Megaphone, Mail, MessageSquare, Bell } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Filter = "All" | "Push" | "Email" | "SMS";

export default function AdminCampaignsPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [filter, setFilter] = useState<Filter>("All");

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => api<{ campaigns: any[] }>("/api/campaigns"),
  });

  const sendMut = useMutation({
    mutationFn: (payload: any) => api("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    onSuccess: (res: any) => {
      toast.success(`Campaign sent to ${res.sent_count} subscriber(s)`);
      setTitle("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMut.mutate({ title, body, type: "push" });
  };

  const filters: { label: Filter; icon: any }[] = [
    { label: "All", icon: Megaphone },
    { label: "Push", icon: Bell },
    { label: "Email", icon: Mail },
    { label: "SMS", icon: MessageSquare },
  ];

  const filteredCampaigns = (data?.campaigns || []).filter((c: any) => filter === "All" || (c.type || "push").toLowerCase() === filter.toLowerCase());

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <p className="uppercase tracking-[0.3em] text-[10px] text-stone mb-1">Marketing</p>
        <h1 className="text-3xl font-heading font-bold tracking-tight flex items-center gap-2 mb-2">
          Campaigns
        </h1>
        <p className="text-stone text-sm">Create and send targeted campaigns to your loyal customers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-bone sticky top-6">
            <h2 className="font-heading font-bold text-lg border-b border-bone pb-4 mb-4">New Campaign</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-2">Title</label>
                <input
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full border border-bone rounded-xl p-3 text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none transition-all"
                  placeholder="E.g., Weekend Special!"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone mb-2">Message</label>
                <textarea
                  required
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  className="w-full border border-bone rounded-xl p-3 text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none h-32 resize-none transition-all"
                  placeholder="Get 20% off all Biryanis this weekend..."
                />
              </div>
              <button
                type="submit"
                disabled={sendMut.isPending}
                className="w-full bg-ink hover:bg-clay text-cream font-medium py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sendMut.isPending ? "Sending..." : "Send Campaign Now"}
              </button>
            </form>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-bone pb-4">
            <h2 className="font-heading font-bold text-lg text-ink">Campaign History</h2>
            <div className="flex bg-cream border border-bone rounded-lg p-1">
              {filters.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.label}
                    onClick={() => setFilter(f.label)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filter === f.label ? "bg-white shadow-sm text-ink border-bone" : "text-stone hover:text-ink"}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center text-stone bg-white rounded-2xl border border-bone">Loading campaigns...</div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center text-stone bg-white rounded-2xl border border-bone">
              <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No {filter !== "All" ? filter : ""} campaigns found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-bone overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-cream border-b border-bone text-ink text-left text-xs uppercase tracking-wider">
                    <th className="px-5 py-4 font-semibold">Campaign</th>
                    <th className="px-5 py-4 font-semibold">Status / Sent</th>
                    <th className="px-5 py-4 font-semibold text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((c: any) => (
                    <tr key={c.id} className="border-b border-bone/50 last:border-0 hover:bg-cream/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-ink">{c.title}</div>
                        <div className="text-stone text-xs mt-1 max-w-[250px] truncate">{c.body}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Delivered
                          </span>
                          <span className="text-xs text-stone font-medium">to {c.sent_count} users</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right text-stone text-xs font-medium">
                        {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
