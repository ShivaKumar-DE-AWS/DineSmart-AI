"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Megaphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminCampaignsPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

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
    sendMut.mutate({ title, body });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-ink" />
          Marketing Campaigns
        </h1>
        <p className="text-stone text-sm">Create and send push notification campaigns to your subscribers.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-bone">
        <h2 className="font-heading font-semibold text-lg border-b border-bone pb-4 mb-4">Create Campaign</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Title</label>
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-bone rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand/30 outline-none"
              placeholder="Campaign title..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Body</label>
            <textarea
              required
              value={body}
              onChange={e => setBody(e.target.value)}
              className="w-full border border-bone rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand/30 outline-none h-32"
              placeholder="Push notification message..."
            />
          </div>
          <button
            type="submit"
            disabled={sendMut.isPending}
            className="bg-ink hover:bg-clay text-cream font-medium py-2 px-6 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sendMut.isPending ? "Sending..." : "Send Campaign"}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading font-semibold text-lg text-ink">Campaign History</h2>
        {isLoading ? (
          <div className="p-8 text-center text-stone bg-white rounded-xl border border-bone">Loading campaigns...</div>
        ) : data?.campaigns?.length === 0 ? (
          <div className="p-12 text-center text-stone bg-white rounded-xl border border-bone">
            <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No campaigns sent yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-bone overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream border-b border-bone text-ink text-left">
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Message</th>
                  <th className="px-4 py-3 font-semibold">Sent</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.campaigns?.map((c: any) => (
                  <tr key={c.id} className="border-b border-bone/50 last:border-0 hover:bg-cream/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{c.title}</td>
                    <td className="px-4 py-3 text-stone max-w-xs truncate">{c.body}</td>
                    <td className="px-4 py-3">{c.sent_count}</td>
                    <td className="px-4 py-3 text-stone">{new Date(c.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
