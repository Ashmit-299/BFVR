"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/lib/api";
import { formatCurrency, formatDate, formatTime, getPaymentMethodColor, getToday } from "@/lib/utils";
import { Transaction, TransactionListResponse } from "@/types";
import Link from "next/link";

export default function SalesPage() {
  const [data, setData] = useState<TransactionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  useEffect(() => { loadTransactions(); }, [page, startDate, endDate, paymentFilter]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      let url = `/api/transactions?page=${page}&per_page=20`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      if (paymentFilter) url += `&payment_method=${paymentFilter}`;
      const result = await apiRequest<TransactionListResponse>(url);
      setData(result);
    } catch (err) { console.error("Failed to load transactions:", err); }
    finally { setLoading(false); }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt("Enter cancellation reason:");
    if (!reason) return;
    try {
      await apiRequest(`/api/transactions/${id}/cancel`, { method: "POST", json: { reason } });
      loadTransactions();
    } catch (err: any) { alert(err.message); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between animate-fade-in">
          <h1 className="section-title text-lg sm:text-2xl">Sales History</h1>
          <Link href="/sales/add" className="btn-success text-xs sm:text-sm px-3 sm:px-5 py-2">+ Add Sale</Link>
        </div>

        {/* Filters */}
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
              <label className="block text-[10px] sm:text-xs font-medium text-gray-500 mb-1">Payment</label>
              <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
                className="input-field !py-1.5 !px-2 sm:!px-3 !text-xs sm:!text-sm w-full sm:w-auto">
                <option value="">All</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <button onClick={() => { setStartDate(""); setEndDate(""); setPaymentFilter(""); setPage(1); }}
              className="btn-ghost text-xs sm:text-sm">Clear</button>
          </div>
        </div>

        {/* Data */}
        <div className="card-base border border-amber-100/60 overflow-hidden animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
            </div>
          ) : !data || data.transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No transactions found</div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="lg:hidden divide-y divide-amber-50">
                {data.transactions.map((txn) => (
                  <div key={txn.id} className="p-3 sm:p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`badge text-[10px] ${getPaymentMethodColor(txn.payment_method)}`}>{txn.payment_method}</span>
                        <span className={`badge text-[10px] ${txn.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{txn.status}</span>
                      </div>
                      {txn.status === "ACTIVE" && (
                        <button onClick={() => handleCancel(txn.id)} className="text-[10px] text-red-500 hover:text-red-700 px-2 py-0.5 rounded-lg">Cancel</button>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-emerald-600">{formatCurrency(txn.amount)}</span>
                      <span className="text-[10px] text-gray-400">{formatDate(txn.transaction_date)} {formatTime(txn.transaction_time)}</span>
                    </div>
                    {txn.description && <p className="text-xs text-gray-500">{txn.description}</p>}
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-amber-50/80 border-b border-amber-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Time</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Amount</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Description</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50">
                    {data.transactions.map((txn) => (
                      <tr key={txn.id} className="table-row">
                        <td className="px-4 py-3 text-sm text-gray-700">{formatDate(txn.transaction_date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatTime(txn.transaction_time)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-600 text-right">{formatCurrency(txn.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`badge ${getPaymentMethodColor(txn.payment_method)}`}>{txn.payment_method}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{txn.description || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`badge ${txn.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{txn.status}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {txn.status === "ACTIVE" && (
                            <button onClick={() => handleCancel(txn.id)}
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
