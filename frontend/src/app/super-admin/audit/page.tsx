"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ScrollText, Clock, User, Target, Info } from "lucide-react";

interface AuditLog {
  id: string;
  timestamp: string;
  user_email: string | null;
  action: string;
  target: string;
  details: any;
}

export default function SuperAdminAuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-audit"],
    queryFn: () => api<{ logs: AuditLog[] }>("/api/super-admin/audit"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-brand" />
          Audit Logs
        </h1>
        <p className="text-stone text-sm">Platform-wide security and access logs.</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-bone overflow-hidden">
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
                  <td className="py-3 px-4 text-ink font-medium">{log.user_email || "System"}</td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded bg-brand/10 text-brand text-xs font-semibold">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-stone text-xs font-mono">{log.target}</td>
                  <td className="py-3 px-4 text-stone text-xs">
                    {JSON.stringify(log.details)}
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
