"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/lib/api";
import { formatCurrency, getToday } from "@/lib/utils";
import { DailyClosing } from "@/types";

export default function ClosingPage() {
  const [date, setDate] = useState(getToday());
  const [actualCash, setActualCash] = useState("");
  const [upiSettled, setUpiSettled] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [existing, setExisting] = useState<DailyClosing | null>(null);

  useEffect(() => { checkExisting(); }, [date]);

  const checkExisting = async () => {
    try {
      const data = await apiRequest<DailyClosing>(`/api/closing/${date}`);
      setExisting(data);
    } catch { setExisting(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await apiRequest<DailyClosing>("/api/closing", {
        method: "POST",
        json: { closing_date: date, actual_cash_counted: actualCash ? parseFloat(actualCash) : null, upi_settled: upiSettled ? parseFloat(upiSettled) : null, notes: notes || null },
      });
      setExisting(data); setSuccess(true); setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) { setError(err.message || "Failed to create closing"); }
    finally { setLoading(false); }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <h1 className="section-title text-lg sm:text-2xl animate-fade-in">Daily Closing</h1>

        {success && <div className="p-3 sm:p-4 bg-green-50 text-green-700 rounded-xl border border-green-200 animate-scale-in text-sm">Daily closing recorded successfully!</div>}
        {error && <div className="p-3 sm:p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 animate-scale-in text-sm">{error}</div>}

        <div className="card-base p-3 sm:p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "0.05s" }}>
          <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-2">Select Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field w-full sm:w-auto" />
        </div>

        {existing ? (
          <div className="card-base p-4 sm:p-6 space-y-4 animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="badge bg-green-100 text-green-700 text-xs">Closing Already Recorded</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 bg-gray-50 rounded-xl">
                <p className="text-[10px] sm:text-xs text-gray-500">System Cash Total</p>
                <p className="text-sm sm:text-lg font-bold text-gray-800">{formatCurrency(existing.system_cash_total)}</p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 rounded-xl">
                <p className="text-[10px] sm:text-xs text-gray-500">Actual Cash Counted</p>
                <p className="text-sm sm:text-lg font-bold text-gray-800">{existing.actual_cash_counted != null ? formatCurrency(existing.actual_cash_counted) : "Not entered"}</p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 rounded-xl">
                <p className="text-[10px] sm:text-xs text-gray-500">System UPI Total</p>
                <p className="text-sm sm:text-lg font-bold text-gray-800">{formatCurrency(existing.system_upi_total)}</p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 rounded-xl">
                <p className="text-[10px] sm:text-xs text-gray-500">UPI Settled</p>
                <p className="text-sm sm:text-lg font-bold text-gray-800">{existing.upi_settled != null ? formatCurrency(existing.upi_settled) : "Not entered"}</p>
              </div>
            </div>

            {existing.cash_difference != null && (
              <div className={`p-3 rounded-xl text-xs sm:text-sm ${existing.cash_difference === 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                Cash Difference: {formatCurrency(existing.cash_difference)} {existing.cash_difference !== 0 && "⚠️"}
              </div>
            )}

            {existing.upi_difference != null && (
              <div className={`p-3 rounded-xl text-xs sm:text-sm ${existing.upi_difference === 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                UPI Difference: {formatCurrency(existing.upi_difference)} {existing.upi_difference !== 0 && "⚠️"}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-gray-200">
              <div className="p-3 sm:p-4 bg-red-50 rounded-xl">
                <p className="text-[10px] sm:text-xs text-red-500">Total Expenses</p>
                <p className="text-sm sm:text-lg font-bold text-red-600">{formatCurrency(existing.total_expenses)}</p>
              </div>
              <div className="p-3 sm:p-4 bg-amber-50 rounded-xl">
                <p className="text-[10px] sm:text-xs text-amber-500">Operating Result</p>
                <p className={`text-sm sm:text-lg font-bold ${existing.operating_result >= 0 ? "text-amber-600" : "text-red-600"}`}>
                  {formatCurrency(existing.operating_result)}
                </p>
              </div>
            </div>

            {existing.notes && (
              <div className="p-3 bg-gray-50 rounded-xl text-xs sm:text-sm text-gray-600">
                <p className="font-medium text-gray-700 mb-1">Notes:</p>
                {existing.notes}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card-base p-4 sm:p-6 space-y-5 sm:space-y-6 animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
            <div className="p-3 sm:p-4 bg-amber-50 text-amber-700 rounded-xl text-xs sm:text-sm border border-amber-100">
              Enter the actual cash counted and UPI settlement for reconciliation.
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-2">Actual Cash Counted (₹)</label>
              <input type="number" value={actualCash} onChange={(e) => setActualCash(e.target.value)}
                className="input-field" placeholder="Count cash and enter" step="0.01" />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-2">UPI Settled Amount (₹)</label>
              <input type="number" value={upiSettled} onChange={(e) => setUpiSettled(e.target.value)}
                className="input-field" placeholder="Check UPI statement and enter" step="0.01" />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Notes (Optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                className="input-field" rows={3} placeholder="Any notes about today..." />
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-sm sm:text-base disabled:opacity-50">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...
                </span>
              ) : "Submit Daily Closing"}
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
