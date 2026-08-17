"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useRestaurantSettings } from "@/hooks/useRestaurantSettings";
import { apiRequest } from "@/lib/api";
import { formatCurrency, getPaymentMethodColor, getDaysAgo } from "@/lib/utils";
import { DailySummary, TrendData, ExpenseAlert } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area,
} from "recharts";

const COLORS = ["#22c55e", "#f59e0b", "#a855f7", "#94a3b8"];

const statCards = [
  { key: "revenue", label: "Today's Revenue", gradient: "from-emerald-500 to-green-600", icon: "💰" },
  { key: "expenses", label: "Today's Expenses", gradient: "from-red-500 to-rose-600", icon: "📤" },
  { key: "result", label: "Operating Result", gradient: "from-amber-500 to-orange-600", icon: "📊" },
  { key: "transactions", label: "Transactions Today", gradient: "from-blue-500 to-indigo-600", icon: "🧾" },
];

export default function DashboardPage() {
  const { settings } = useRestaurantSettings();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [alerts, setAlerts] = useState<ExpenseAlert[]>([]);
  const [weekRevenue, setWeekRevenue] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [summaryData, trendsData, alertsData, revenueData, paymentData] = await Promise.allSettled([
        apiRequest<DailySummary>("/api/dashboard/today"),
        apiRequest<{ data: TrendData[] }>("/api/analytics/trends?months=6"),
        apiRequest<{ alerts: ExpenseAlert[] }>("/api/analytics/expense-alerts"),
        apiRequest<{ data: any[] }>("/api/analytics/revenue?period=day&start_date=" + getDaysAgo(7)),
        apiRequest<{ data: any[] }>("/api/analytics/payment-methods"),
      ]);

      if (summaryData.status === "fulfilled") setSummary(summaryData.value);
      if (trendsData.status === "fulfilled") setTrends(trendsData.value.data);
      if (alertsData.status === "fulfilled") setAlerts(alertsData.value.alerts);
      if (revenueData.status === "fulfilled") setWeekRevenue(revenueData.value.data);
      if (paymentData.status === "fulfilled") setPaymentMethods(paymentData.value.data);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <div className="w-10 h-10 border-3 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const getValues = () => {
    return [
      formatCurrency(summary?.total_revenue || 0),
      formatCurrency(summary?.total_expenses || 0),
      formatCurrency(summary?.operating_result || 0),
      String(summary?.transaction_count || 0),
    ];
  };
  const values = getValues();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="section-title">Welcome to {settings.restaurant_name}</h1>
          <p className="text-sm text-gray-500 mt-1">{settings.tagline}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((card, i) => (
            <div key={card.key} className="stat-card animate-fade-in-up opacity-0" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{card.label}</p>
                  <p className={`text-lg sm:text-2xl font-bold mt-1 sm:mt-2 ${
                    card.key === "revenue" ? "text-emerald-600" :
                    card.key === "expenses" ? "text-red-600" :
                    card.key === "result" ? ((summary?.operating_result || 0) >= 0 ? "text-amber-600" : "text-red-600") :
                    "text-gray-800"
                  }`}>
                    {values[i]}
                  </p>
                </div>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white text-sm sm:text-lg shadow-md shrink-0`}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="card-base p-3 sm:p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "0.35s" }}>
          <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-3 sm:mb-4">Payment Methods (Today)</h3>
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {[
              { label: "Cash", value: summary?.payment_methods?.cash || 0, method: "CASH", emoji: "💵" },
              { label: "UPI", value: summary?.payment_methods?.upi || 0, method: "UPI", emoji: "📱" },
              { label: "Card", value: summary?.payment_methods?.card || 0, method: "CARD", emoji: "💳" },
              { label: "Other", value: summary?.payment_methods?.other || 0, method: "OTHER", emoji: "🔄" },
            ].map((item, i) => (
              <div key={item.method} className="text-center p-2 sm:p-3 rounded-xl bg-gray-50/80 hover:bg-amber-50/50 transition-all duration-200 group">
                <span className="text-lg sm:text-2xl group-hover:scale-110 transition-transform duration-200 inline-block">{item.emoji}</span>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1 font-medium">{item.label}</p>
                <p className="text-sm sm:text-lg font-bold text-gray-800 mt-0.5">{formatCurrency(item.value)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Revenue Trend */}
          <div className="card-base p-3 sm:p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "0.4s" }}>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-3 sm:mb-4">Revenue - Last 7 Days</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={weekRevenue}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #fde68a", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#f59e0b" fill="url(#revenueGradient)" strokeWidth={2.5} dot={{ fill: "#f59e0b", strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: "#d97706" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Method Pie */}
          <div className="card-base p-3 sm:p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "0.45s" }}>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-3 sm:mb-4">Payment Methods (Month)</h3>
            {paymentMethods.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    dataKey="total"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={40}
                    paddingAngle={3}
                    label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}
                  >
                    {paymentMethods.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #fde68a" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
                No payment data yet
              </div>
            )}
          </div>
        </div>

        {/* Monthly Trends */}
        {trends.length > 0 && (
          <div className="card-base p-3 sm:p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "0.5s" }}>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-3 sm:mb-4">Monthly Revenue vs Expenses</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #fde68a" }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#22c55e" name="Revenue" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Expense Alerts */}
        {alerts.length > 0 && (
          <div className="card-base p-3 sm:p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "0.55s" }}>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-3">Expense Alerts</h3>
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl text-sm transition-all duration-200 hover:scale-[1.01] ${
                    alert.alert_type === "INCREASE"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-green-50 text-green-800 border border-green-200"
                  }`}
                >
                  {alert.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
