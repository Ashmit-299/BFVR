"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DailyClosing } from "@/types";

interface ClosingListResponse {
  closings: DailyClosing[];
  total: number;
  page: number;
  per_page: number;
}

export default function ClosingHistoryPage() {
  const [data, setData] = useState<ClosingListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => { loadHistory(); }, [page]);

  const loadHistory = async () => {
    try {
      const result = await apiRequest<ClosingListResponse>(`/api/closing?page=${page}&per_page=30`);
      setData(result);
    } catch (err) { console.error("Failed to load closing history:", err); }
    finally { setLoading(false); }
  };

  const closings = data?.closings || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 30);

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <h1 className="section-title text-lg sm:text-2xl animate-fade-in">Closing History</h1>

        <div className="card-base border border-amber-100/60 overflow-hidden animate-fade-in-up opacity-0" style={{ animationDelay: "0.05s" }}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
            </div>
          ) : closings.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No closing records found</div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="lg:hidden divide-y divide-amber-50">
                {closings.map((c) => (
                  <div key={c.id} className="p-3 sm:p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">{formatDate(c.closing_date)}</span>
                      <span className={`text-xs sm:text-sm font-semibold ${c.operating_result >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(c.operating_result)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs text-gray-500">
                      <div>Cash: {formatCurrency(c.system_cash_total)} / {c.actual_cash_counted != null ? formatCurrency(c.actual_cash_counted) : "-"}</div>
                      <div>UPI: {formatCurrency(c.system_upi_total)} / {c.upi_settled != null ? formatCurrency(c.upi_settled) : "-"}</div>
                      <div className="text-red-500">Expenses: {formatCurrency(c.total_expenses)}</div>
                      {c.cash_difference != null && (
                        <div className={c.cash_difference === 0 ? "text-green-500" : "text-amber-500"}>
                          Cash Diff: {formatCurrency(c.cash_difference)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-amber-50/80 border-b border-amber-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Cash (System)</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Cash (Actual)</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Cash Diff</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">UPI (System)</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">UPI (Settled)</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">UPI Diff</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Expenses</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50">
                    {closings.map((c) => (
                      <tr key={c.id} className="table-row">
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">{formatDate(c.closing_date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(c.system_cash_total)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{c.actual_cash_counted != null ? formatCurrency(c.actual_cash_counted) : "-"}</td>
                        <td className="px-4 py-3 text-center">
                          {c.cash_difference != null ? (
                            <span className={`badge ${c.cash_difference === 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{formatCurrency(c.cash_difference)}</span>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(c.system_upi_total)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{c.upi_settled != null ? formatCurrency(c.upi_settled) : "-"}</td>
                        <td className="px-4 py-3 text-center">
                          {c.upi_difference != null ? (
                            <span className={`badge ${c.upi_difference === 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{formatCurrency(c.upi_difference)}</span>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-red-600 text-right">{formatCurrency(c.total_expenses)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-semibold ${c.operating_result >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(c.operating_result)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-t border-amber-100">
              <p className="text-xs sm:text-sm text-gray-500">
                {(page - 1) * 30 + 1}-{Math.min(page * 30, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 text-xs sm:text-sm border border-gray-200 rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-all">Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1 text-xs sm:text-sm border border-gray-200 rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-all">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
