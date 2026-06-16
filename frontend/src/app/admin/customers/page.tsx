"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export default function AdminCustomers() {
  const { data } = useQuery({ queryKey: ["customers"], queryFn: () => api<any>("/api/analytics/customers") });

  return (
    <div>
      <p className="uppercase tracking-[0.3em] text-xs text-stone mb-2">Analytics</p>
      <h1 className="font-heading text-4xl tracking-tight mb-8">Customers</h1>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="border border-bone bg-white rounded-2xl p-6" data-testid="cust-total">
          <div className="text-xs uppercase tracking-wider text-stone">Total customers</div>
          <div className="font-heading text-4xl mt-2">{data?.total_customers ?? "—"}</div>
        </div>
        <div className="border border-bone bg-white rounded-2xl p-6" data-testid="cust-repeat">
          <div className="text-xs uppercase tracking-wider text-stone">Repeat customers</div>
          <div className="font-heading text-4xl mt-2">{data?.repeat_customers ?? "—"}</div>
        </div>
        <div className="border border-bone bg-white rounded-2xl p-6" data-testid="cust-rate">
          <div className="text-xs uppercase tracking-wider text-stone">Repeat rate</div>
          <div className="font-heading text-4xl mt-2">{data ? `${data.repeat_rate}%` : "—"}</div>
        </div>
      </div>

      <div className="bg-white border border-bone rounded-2xl overflow-hidden">
        <h2 className="font-heading text-xl p-6 pb-4">Top customers by revenue</h2>
        <table className="w-full text-sm">
          <thead className="bg-cream border-y border-bone text-stone uppercase text-xs tracking-wider">
            <tr><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Orders</th><th className="text-left px-4 py-3">Revenue</th></tr>
          </thead>
          <tbody>
            {(data?.top_customers ?? []).map((c: any) => (
              <tr key={c.name} className="border-b border-bone last:border-0" data-testid={`cust-row-${c.name}`}>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.orders}</td>
                <td className="px-4 py-3 text-clay font-medium">{formatCurrency(c.revenue)}</td>
              </tr>
            ))}
            {data && data.top_customers.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-stone">No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
