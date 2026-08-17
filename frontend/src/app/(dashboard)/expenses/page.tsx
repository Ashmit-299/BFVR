"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/lib/api";
import { formatCurrency, formatDate, getPaymentMethodColor } from "@/lib/utils";
import { Expense, ExpenseListResponse, Category } from "@/types";
import Link from "next/link";

export default function ExpensesPage() {
  const [data, setData] = useState<ExpenseListResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { loadExpenses(); }, [page, startDate, endDate, categoryFilter]);

  const loadCategories = async () => {
    try {
      const cats = await apiRequest<Category[]>("/api/categories");
      setCategories(cats.filter((c) => c.type === "EXPENSE"));
    } catch (err) { console.error("Failed to load categories:", err); }
  };

  const loadExpenses = async () => {
    setLoading(true);
    try {
      let url = `/api/expenses?page=${page}&per_page=20`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      if (categoryFilter) url += `&category_id=${categoryFilter}`;
      const result = await apiRequest<ExpenseListResponse>(url);
      setData(result);
    } catch (err) { console.error("Failed to load expenses:", err); }
    finally { setLoading(false); }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt("Enter cancellation reason:");
    if (!reason) return;
    try {
      await apiRequest(`/api/expenses/${id}/cancel`, { method: "POST", json: { reason } });
      loadExpenses();
    } catch (err: any) { alert(err.message); }
  };

  const getCategoryName = (catId: string) => categories.find((c) => c.id === catId)?.name || "Unknown";

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between animate-fade-in">
          <h1 className="section-title text-lg sm:text-2xl">Expenses History</h1>
          <Link href="/expenses/add" className="btn-danger text-xs sm:text-sm px-3 sm:px-5 py-2">+ Add Expense</Link>
        </div>

        <div className="card-base p-3 sm:p-4 animate-fade-in-up opacity-0" style={{ animationDelay: "0.05s" }}>
          <div className="flex flex-wrap gap-2 sm:gap-4 items-end">
            <div className="flex-1 min-w-[120px] sm:flex-none">
              <label className="block text-[10px] sm:text-xs font-medium text-gray-500 mb-1">From</label>
              <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="input-field !py-1.5 !px-2 sm:!px-3 !text-xs sm:!text-sm w-full sm:w-auto" />
            </div>
            <div className="flex-1 min-w-[120px] sm:flex-none">
              <label className="block text-[10px] sm:text-xs font-medium text-gray-500 mb-1">To</label>
              <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="input-field !py-1.5 !px-2 sm:!px-3 !text-xs sm:!text-sm w-full sm:w-auto" />
            </div>
            <div className="flex-1 min-w-[120px] sm:flex-none">
              <label className="block text-[10px] sm:text-xs font-medium text-gray-500 mb-1">Category</label>
              <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                className="input-field !py-1.5 !px-2 sm:!px-3 !text-xs sm:!text-sm w-full sm:w-auto">
                <option value="">All Categories</option>
                {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
              </select>
            </div>
            <button onClick={() => { setStartDate(""); setEndDate(""); setCategoryFilter(""); setPage(1); }}
              className="btn-ghost text-xs sm:text-sm">Clear</button>
          </div>
        </div>

        <div className="card-base border border-amber-100/60 overflow-hidden animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
            </div>
          ) : !data || data.expenses.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No expenses found</div>
          ) : (
            <>
              <div className="lg:hidden divide-y divide-amber-50">
                {data.expenses.map((exp) => (
                  <div key={exp.id} className="p-3 sm:p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="badge text-[10px]">{getCategoryName(exp.category_id)}</span>
                        <span className={`badge text-[10px] ${getPaymentMethodColor(exp.payment_method)}`}>{exp.payment_method}</span>
                      </div>
                      {exp.status === "ACTIVE" && (
                        <button onClick={() => handleCancel(exp.id)} className="text-[10px] text-red-500 hover:text-red-700 px-2 py-0.5 rounded-lg">Cancel</button>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-red-600">{formatCurrency(exp.amount)}</span>
                      <span className="text-[10px] text-gray-400">{formatDate(exp.expense_date)}</span>
                    </div>
                    {exp.vendor_name && <p className="text-xs text-gray-500">Vendor: {exp.vendor_name}</p>}
                    {exp.description && <p className="text-xs text-gray-500">{exp.description}</p>}
                  </div>
                ))}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-amber-50/80 border-b border-amber-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Amount</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Vendor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Note</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50">
                    {data.expenses.map((exp) => (
                      <tr key={exp.id} className="table-row">
                        <td className="px-4 py-3 text-sm text-gray-700">{formatDate(exp.expense_date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{getCategoryName(exp.category_id)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-red-600 text-right">{formatCurrency(exp.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`badge ${getPaymentMethodColor(exp.payment_method)}`}>{exp.payment_method}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{exp.vendor_name || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{exp.description || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`badge ${exp.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{exp.status}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {exp.status === "ACTIVE" && (
                            <button onClick={() => handleCancel(exp.id)}
                              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-all duration-200">Cancel</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {data && data.total > 20 && (
            <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-t border-amber-100">
              <p className="text-xs sm:text-sm text-gray-500">
                {(page - 1) * 20 + 1}-{Math.min(page * 20, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 text-xs sm:text-sm border border-gray-200 rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-all">Prev</button>
                <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= data.total}
                  className="px-3 py-1 text-xs sm:text-sm border border-gray-200 rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-all">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
