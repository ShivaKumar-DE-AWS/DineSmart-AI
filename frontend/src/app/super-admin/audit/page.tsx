"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ScrollText, Clock, User, Target, Info, Search, Download, Filter } from "lucide-react";
import { useState } from "react";

interface AuditLog {
  id: string;
  timestamp: string;
  user_email: string | null;
  action: string;
  target: string;
  details: any;
}

export default function SuperAdminAuditPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [limit, setLimit] = useState(100);

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-audit", actionFilter, targetFilter, limit],
    queryFn: () => {
      const params = new URLSearchParams();
      if (actionFilter) params.append("action", actionFilter);
      if (targetFilter) params.append("target", targetFilter);
      params.append("limit", limit.toString());
      return api<{ logs: AuditLog[] }>(`/api/super-admin/audit?${params.toString()}`);
    }
  });

  const getActionBadge = (action: string) => {
    if (action.includes("deleted")) return "bg-red-100 text-red-800 border-red-200";
    if (action.includes("created")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (action.includes("updated")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (action.includes("suspended")) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-stone-100 text-stone-800 border-stone-200";
  };

  const exportCSV = () => {
    if (!data?.logs) return;
    const headers = ["Time", "User", "Action", "Target", "Details"];
    const csvContent = [
      headers.join(","),
      ...data.logs.map(l => [
        new Date(l.timestamp).toISOString(),
        l.user_email || "System",
        l.action,
        l.target,
        `"${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueActions = Array.from(new Set(data?.logs?.map(l => l.action) || []));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-brand" />
            Audit Logs
          </h1>
          <p className="text-stone text-sm">Platform-wide security and access logs.</p>
        </div>
        <button 
          onClick={exportCSV}
          disabled={!data?.logs?.length}
          className="flex items-center gap-2 bg-white text-stone border border-bone px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-sand transition shadow-sm"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>
      
      <div className="bg-white p-4 rounded-xl shadow-sm border border-bone flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">Filter by Target</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone" />
            <input 
              type="text" 
              placeholder="e.g. restaurant ID..." 
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              className="w-full bg-sand/50 border border-bone rounded-lg py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </div>
        <div className="w-full sm:w-64">
           <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">Filter by Action</label>
           <select 
             className="w-full bg-sand/50 border border-bone rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
             value={actionFilter}
             onChange={(e) => setActionFilter(e.target.value)}
           >
             <option value="">All Actions</option>
             {uniqueActions.map(a => (
               <option key={a} value={a}>{a}</option>
             ))}
           </select>
        </div>
        <div className="w-full sm:w-32">
           <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">Limit</label>
           <select 
             className="w-full bg-sand/50 border border-bone rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
             value={limit}
             onChange={(e) => setLimit(Number(e.target.value))}
           >
             <option value="50">50</option>
             <option value="100">100</option>
             <option value="500">500</option>
           </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-bone overflow-x-auto w-full">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bone bg-sand">
              <th className="text-left py-3 px-4 font-medium text-stone"><Clock className="w-4 h-4 inline mr-1" />Time</th>
              <th className="text-left py-3 px-4 font-medium text-stone"><User className="w-4 h-4 inline mr-1" />User</th>
              <th className="text-left py-3 px-4 font-medium text-stone">Action</th>
              <th className="text-left py-3 px-4 font-medium text-stone"><Target className="w-4 h-4 inline mr-1" />Target</th>
              <th className="text-left py-3 px-4 font-medium text-stone"><Info className="w-4 h-4 inline mr-1" />Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-8 text-stone">Loading logs...</td></tr>
            ) : data?.logs?.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-stone">No audit logs found.</td></tr>
            ) : (
              data?.logs?.map((log) => (
                <tr key={log.id} className="border-b border-bone last:border-0 hover:bg-sand/50 transition">
                  <td className="py-3 px-4 text-stone font-mono text-xs whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-ink font-medium whitespace-nowrap">{log.user_email || "System"}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${getActionBadge(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-stone text-xs font-mono whitespace-nowrap">{log.target}</td>
                  <td className="py-3 px-4 text-stone text-xs">
                    <pre className="max-w-xs md:max-w-md lg:max-w-xl overflow-x-auto text-[10px] bg-sand p-2 rounded border border-bone">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
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
