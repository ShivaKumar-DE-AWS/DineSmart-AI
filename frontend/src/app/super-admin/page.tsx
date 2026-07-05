"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { LayoutDashboard, Store, ShoppingBag, DollarSign, Activity, Users, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRouter } from "next/navigation";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: () => api<any>("/api/super-admin/stats"),
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <CardTitle className="text-sm font-medium text-stone">New This Week</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-heading font-bold text-ink">
              {isLoading ? "..." : stats?.new_this_week ?? 0}
            </div>
            <p className="text-xs text-stone mt-1">Signups in last 7 days</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-stone">Active Today</CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-heading font-bold text-ink">
              {isLoading ? "..." : stats?.active_today ?? 0}
            </div>
            <p className="text-xs text-stone mt-1">Restaurants with orders today</p>
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GMV Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-bone">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand" />
                7-Day GMV Trend
              </h2>
              <p className="text-sm text-stone">Daily total order value across all restaurants.</p>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-stone">Loading chart...</div>
            ) : stats?.gmv_7d?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.gmv_7d} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
                    }}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#78716c' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#78716c' }}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, "Revenue"]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#f97316" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-stone bg-sand/30 rounded-lg border border-dashed border-bone">
                No revenue data in the last 7 days.
              </div>
            )}
          </div>
        </div>
        
        {/* Top Restaurants Leaderboard */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-bone flex flex-col">
          <div className="mb-6">
            <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
              <Store className="h-5 w-5 text-emerald-600" />
              Top Restaurants
            </h2>
            <p className="text-sm text-stone">By all-time gross merchandise value.</p>
          </div>
          
          <div className="flex-1">
            {isLoading ? (
              <div className="py-8 text-center text-stone">Loading...</div>
            ) : stats?.top_restaurants?.length > 0 ? (
              <div className="space-y-4">
                {stats.top_restaurants.map((tr: any, idx: number) => (
                  <div 
                    key={tr.id} 
                    onClick={() => router.push(`/super-admin/restaurants/${tr.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-sand/50 transition cursor-pointer border border-transparent hover:border-bone"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0 ? 'bg-amber-100 text-amber-700' :
                        idx === 1 ? 'bg-slate-100 text-slate-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-stone-100 text-stone-600'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-ink text-sm">{tr.name}</div>
                        <div className="text-xs text-stone">{tr.orders} orders</div>
                      </div>
                    </div>
                    <div className="font-bold text-emerald-600 text-sm">
                      ₹{tr.revenue.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
               <div className="py-8 text-center text-stone">No data available.</div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
