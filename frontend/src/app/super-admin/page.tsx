"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { LayoutDashboard, Store, ShoppingBag, DollarSign } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function SuperAdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: () => api<{ total_restaurants: number; total_orders: number; total_gmv: number }>("/api/super-admin/stats"),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-brand" />
            Global Dashboard
          </h1>
          <p className="text-stone text-sm">Platform-wide overview and key metrics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-none shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone">Total Restaurants</CardTitle>
            <Store className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-heading font-bold text-ink">
              {isLoading ? "..." : stats?.total_restaurants ?? 0}
            </div>
            <p className="text-xs text-stone mt-1">Active businesses on platform</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone">Total Orders Processed</CardTitle>
            <ShoppingBag className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-heading font-bold text-ink">
              {isLoading ? "..." : stats?.total_orders ?? 0}
            </div>
            <p className="text-xs text-stone mt-1">Across all restaurants</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone">Global GMV</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-heading font-bold text-ink">
              ₹{isLoading ? "..." : (stats?.total_gmv ?? 0).toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-stone mt-1">Total revenue processed</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="font-heading font-semibold text-lg mb-4">Platform Activity Trends</h2>
        <div className="h-64 flex flex-col items-center justify-center bg-sand rounded-lg border border-dashed border-bone text-stone">
          <svg className="h-8 w-8 mb-2 opacity-50" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
          </svg>
          <p>Detailed charts available in V2</p>
        </div>
      </div>
    </div>
  );
}
