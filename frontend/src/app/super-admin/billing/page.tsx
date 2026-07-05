"use client";
import { CreditCard, Download, TrendingUp, Filter } from "lucide-react";
import { useState } from "react";

export default function SuperAdminBillingPage() {
  const [timeRange, setTimeRange] = useState("this_month");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-brand" />
            Billing & Revenue
          </h1>
          <p className="text-stone text-sm">Platform subscription revenue and billing history.</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white border border-bone rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
            <option value="all_time">All Time</option>
          </select>
          <button className="flex items-center gap-2 bg-white text-stone border border-bone px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-sand transition shadow-sm">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-bone p-5">
          <div className="text-stone text-xs font-bold uppercase tracking-wider mb-1">Total MRR</div>
          <div className="text-3xl font-heading font-bold text-ink">₹1,24,500</div>
          <div className="text-emerald-600 text-sm mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="h-4 w-4" /> +12% from last month
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-bone p-5">
          <div className="text-stone text-xs font-bold uppercase tracking-wider mb-1">Active Subscriptions</div>
          <div className="text-3xl font-heading font-bold text-ink">142</div>
          <div className="text-emerald-600 text-sm mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="h-4 w-4" /> +8 this month
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-bone p-5">
          <div className="text-stone text-xs font-bold uppercase tracking-wider mb-1">Churn Rate</div>
          <div className="text-3xl font-heading font-bold text-ink">2.4%</div>
          <div className="text-stone text-sm mt-1 flex items-center gap-1 font-medium">
            4 restaurants cancelled
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-bone overflow-hidden">
        <div className="p-5 border-b border-bone flex justify-between items-center bg-sand/30">
          <h2 className="font-heading font-semibold text-lg">Recent Invoices</h2>
          <button className="text-sm font-medium text-brand hover:text-brand/80">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-sand text-stone font-medium border-b border-bone">
                <th className="py-3 px-4">Invoice ID</th>
                <th className="py-3 px-4">Restaurant</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bone">
              {[
                { id: "INV-2023-001", rest: "The Spice House", plan: "PRO", amount: "₹2,999", status: "paid", date: "Today, 10:42 AM" },
                { id: "INV-2023-002", rest: "Ocean View Cafe", plan: "STARTER", amount: "₹999", status: "paid", date: "Yesterday" },
                { id: "INV-2023-003", rest: "Burger Joint", plan: "ENTERPRISE", amount: "₹5,999", status: "pending", date: "2 days ago" },
                { id: "INV-2023-004", rest: "Sushi Master", plan: "PRO", amount: "₹2,999", status: "failed", date: "Oct 15, 2023" },
              ].map((inv) => (
                <tr key={inv.id} className="hover:bg-sand/50 transition">
                  <td className="py-3 px-4 font-mono text-xs font-medium text-ink">{inv.id}</td>
                  <td className="py-3 px-4 font-medium">{inv.rest}</td>
                  <td className="py-3 px-4 text-xs font-bold text-brand">{inv.plan}</td>
                  <td className="py-3 px-4">{inv.amount}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                      inv.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-stone text-xs">{inv.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
