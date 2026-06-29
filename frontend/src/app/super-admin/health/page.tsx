"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Activity, Database, BrainCircuit, CreditCard, AlertCircle, CheckCircle2 } from "lucide-react";

export default function SuperAdminHealthPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-health"],
    queryFn: async () => {
      const [health, usage] = await Promise.all([
        api<any>("/api/super-admin/health"),
        api<any>("/api/super-admin/ai-usage")
      ]);
      return { health, usage };
    },
    refetchInterval: 30000,
  });

  const getStatusIcon = (status: string) => {
    if (status === "online" || status === "configured" || status === "mock") {
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-rose-500" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === "online" || status === "configured" || status === "mock") {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Healthy</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">Action Required</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-brand" />
          System Health & API Usage
        </h1>
        <p className="text-stone text-sm">Monitor platform services and AI token usage across tenants.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* MongoDB */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-bone">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Database className="h-5 w-5" /></div>
            <h3 className="font-semibold">MongoDB Core</h3>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-stone">Connection</div>
            <div className="flex items-center gap-1.5">
              {getStatusIcon(data?.health?.services?.database?.status || "")}
              {getStatusBadge(data?.health?.services?.database?.status || "")}
            </div>
          </div>
        </div>

        {/* Gemini AI */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-bone">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><BrainCircuit className="h-5 w-5" /></div>
            <h3 className="font-semibold">Gemini AI API</h3>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-stone">API Key</div>
            <div className="flex items-center gap-1.5">
              {getStatusIcon(data?.health?.services?.ai?.status || "")}
              {getStatusBadge(data?.health?.services?.ai?.status || "")}
            </div>
          </div>
        </div>

        {/* Stripe */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-bone">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><CreditCard className="h-5 w-5" /></div>
            <h3 className="font-semibold">Stripe Billing</h3>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-stone">API Key</div>
            <div className="flex items-center gap-1.5">
              {getStatusIcon(data?.health?.services?.billing?.status || "")}
              {getStatusBadge(data?.health?.services?.billing?.status || "")}
            </div>
          </div>
        </div>
      </div>

      {/* AI Usage Leaderboard */}
      <div className="bg-white rounded-xl shadow-sm border border-bone overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-bone bg-sand">
          <h2 className="font-heading font-semibold text-ink flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-indigo-600" />
            AI Usage Leaderboard
          </h2>
          <p className="text-xs text-stone mt-1">Top restaurants by total AI waiter and generation requests.</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bone bg-white">
              <th className="text-left py-3 px-6 font-medium text-stone">Restaurant</th>
              <th className="text-left py-3 px-6 font-medium text-stone">Slug</th>
              <th className="text-right py-3 px-6 font-medium text-stone">Total AI Requests</th>
              <th className="text-right py-3 px-6 font-medium text-stone">Last Used</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="text-center py-8 text-stone">Loading usage stats...</td></tr>
            ) : data?.usage?.usage?.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-stone">No AI usage recorded yet.</td></tr>
            ) : (
              data?.usage?.usage?.map((stat: any) => (
                <tr key={stat.restaurant_id} className="border-b border-bone last:border-0 hover:bg-sand/50">
                  <td className="py-3 px-6 font-medium text-ink">{stat.restaurant_name}</td>
                  <td className="py-3 px-6 text-stone font-mono text-xs">{stat.restaurant_slug}</td>
                  <td className="py-3 px-6 text-right font-medium text-indigo-600">
                    {stat.total_requests.toLocaleString()}
                  </td>
                  <td className="py-3 px-6 text-right text-stone text-xs">
                    {new Date(stat.last_used).toLocaleString()}
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
