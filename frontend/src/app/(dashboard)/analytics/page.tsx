"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/lib/api";
import { formatCurrency, getDaysAgo } from "@/lib/utils";
import { TrendData, BestDay, BestMonth, ExpenseAlert } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

const COLORS = ["#22c55e", "#f59e0b", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4"];

export default function AnalyticsPage() {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [bestDays, setBestDays] = useState<BestDay[]>([]);
  const [bestMonths, setBestMonths] = useState<BestMonth[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<ExpenseAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    try {
      const [t, bd, bm, pm, ea] = await Promise.allSettled([
        apiRequest<{ data: TrendData[] }>("/api/analytics/trends?months=12"),
        apiRequest<{ data: BestDay[] }>("/api/analytics/best-days?start_date=" + getDaysAgo(90)),
        apiRequest<{ data: BestMonth[] }>("/api/analytics/best-months?year=" + new Date().getFullYear()),
        apiRequest<{ data: any[] }>("/api/analytics/payment-methods?start_date=" + getDaysAgo(30)),
        apiRequest<{ alerts: ExpenseAlert[] }>("/api/analytics/expense-alerts"),
      ]);
      if (t.status === "fulfilled") setTrends(t.value.data);
      if (bd.status === "fulfilled") setBestDays(bd.value.data);
      if (bm.status === "fulfilled") setBestMonths(bm.value.data);
      if (pm.status === "fulfilled") setPaymentMethods(pm.value.data);
      if (ea.status === "fulfilled") setAlerts(ea.value.alerts);
    } catch (err) { console.error("Analytics load error:", err); }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <div className="w-10 h-10 border-3 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <h1 className="section-title text-lg sm:text-2xl animate-fade-in">Analytics</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="card-base p-3 sm:p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "0.05s" }}>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-3">Best Day of the Week (Last 90 Days)</h3>
            {bestDays.length > 0 ? (
              <div className="space-y-2">
                {bestDays.slice(0, 3).map((d, i) => (
                  <div key={d.day} className="flex items-center justify-between p-2 rounded-xl hover:bg-amber-50/50 transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                      <span className="text-xs sm:text-sm font-medium text-gray-700">{d.day}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-gray-600">{formatCurrency(d.total_sales)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400 text-xs sm:text-sm">No data available</p>}
          </div>

          <div className="card-base p-3 sm:p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-3">Best Month ({new Date().getFullYear()})</h3>
            {bestMonths.length > 0 ? (
              <div className="space-y-2">
                {bestMonths.sort((a, b) => b.total_sales - a.total_sales).slice(0, 3).map((m, i) => (
                  <div key={m.month} className="flex items-center justify-between p-2 rounded-xl hover:bg-amber-50/50 transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                      <span className="text-xs sm:text-sm font-medium text-gray-700">{m.month}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-gray-600">{formatCurrency(m.total_sales)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400 text-xs sm:text-sm">No data available</p>}
          </div>
        </div>

        {bestDays.length > 0 && (
          <div className="card-base p-3 sm:p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "0.15s" }}>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-4">Revenue by Day of Week</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bestDays}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: "12px", border: "1px solid #fde68a" }} />
                <Bar dataKey="total_sales" fill="#f59e0b" name="Total Sales" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {trends.length > 0 && (
          <div className="card-base p-3 sm:p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "0.2s" }}>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-4">Revenue vs Expenses (Monthly)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: "12px", border: "1px solid #fde68a" }} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="card-base p-3 sm:p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "0.25s" }}>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-4">Payment Methods (Last 30 Days)</h3>
            {paymentMethods.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={paymentMethods} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={85} innerRadius={40} paddingAngle={3}
                    label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}>
                    {paymentMethods.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: "12px", border: "1px solid #fde68a" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-sm text-center py-8">No payment data</p>}
          </div>

          <div className="card-base p-3 sm:p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "0.3s" }}>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-3">Expense Alerts</h3>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert, i) => (
                  <div key={i} className={`p-3 rounded-xl text-xs sm:text-sm transition-all duration-200 hover:scale-[1.01] ${
                    alert.alert_type === "INCREASE" ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-green-50 text-green-800 border border-green-200"
                  }`}>
                    <p className="font-medium">{alert.category}</p>
                    <p className="text-[10px] sm:text-xs mt-1">{alert.message}</p>
                    <p className="text-[10px] sm:text-xs mt-1">Current: {formatCurrency(alert.current)} | Previous: {formatCurrency(alert.previous)}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400 text-sm text-center py-8">No alerts</p>}
          </div>
        </div>

        {bestMonths.length > 0 && (
          <div className="card-base p-3 sm:p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "0.35s" }}>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-4">Monthly Sales Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-amber-100">
                  <tr>
                    <th className="px-3 sm:px-4 py-2 text-left text-[10px] sm:text-xs font-semibold text-gray-600">Month</th>
                    <th className="px-3 sm:px-4 py-2 text-right text-[10px] sm:text-xs font-semibold text-gray-600">Total Sales</th>
                    <th className="px-3 sm:px-4 py-2 text-right text-[10px] sm:text-xs font-semibold text-gray-600 hidden sm:table-cell">Transactions</th>
                    <th className="px-3 sm:px-4 py-2 text-right text-[10px] sm:text-xs font-semibold text-gray-600">Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-50">
                  {bestMonths.map((m) => (
                    <tr key={m.month} className="table-row">
                      <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700">{m.month}</td>
                      <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-600 text-right">{formatCurrency(m.total_sales)}</td>
                      <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600 text-right hidden sm:table-cell">{m.count}</td>
                      <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600 text-right">{formatCurrency(m.count > 0 ? m.total_sales / m.count : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
