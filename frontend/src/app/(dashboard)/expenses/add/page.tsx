"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/lib/api";
import { Category } from "@/types";

export default function AddExpensePage() {
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [vendorName, setVendorName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      const cats = await apiRequest<Category[]>("/api/categories");
      setCategories(cats.filter((c) => c.type === "EXPENSE"));
    } catch (err) { console.error("Failed to load categories:", err); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { setError("Please enter a valid amount"); return; }
    if (!categoryId) { setError("Please select a category"); return; }
    setError(""); setLoading(true);
    try {
      await apiRequest("/api/expenses", {
        method: "POST",
        json: { amount: parseFloat(amount), category_id: categoryId, payment_method: paymentMethod, vendor_name: vendorName || null, description: description || null, expense_date: date },
      });
      setSuccess(true); setAmount(""); setVendorName(""); setDescription(""); setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) { setError(err.message || "Failed to add expense"); }
    finally { setLoading(false); }
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-4 sm:space-y-6">
        <h1 className="section-title text-lg sm:text-2xl animate-fade-in">Add Expense</h1>

        {success && <div className="p-3 sm:p-4 bg-green-50 text-green-700 rounded-xl border border-green-200 animate-scale-in text-sm">Expense added successfully!</div>}
        {error && <div className="p-3 sm:p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 animate-scale-in text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="card-base p-4 sm:p-6 space-y-5 sm:space-y-6 animate-fade-in-up opacity-0" style={{ animationDelay: "0.05s" }}>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-2">Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 text-xl sm:text-2xl font-bold border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400/50 focus:border-red-400 outline-none transition-all duration-200"
              placeholder="0" min="1" step="0.01" required autoFocus />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-2">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-field" required>
              <option value="">Select category</option>
              {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-2">Payment Method</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: "CASH", label: "💵 Cash", color: "bg-green-50 border-green-300 text-green-700 shadow-sm" },
                { value: "UPI", label: "📱 UPI", color: "bg-blue-50 border-blue-300 text-blue-700 shadow-sm" },
                { value: "CARD", label: "💳 Card", color: "bg-purple-50 border-purple-300 text-purple-700 shadow-sm" },
                { value: "OTHER", label: "🔄 Other", color: "bg-gray-50 border-gray-300 text-gray-700 shadow-sm" },
              ].map((method) => (
                <button key={method.value} type="button" onClick={() => setPaymentMethod(method.value)}
                  className={`py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium border-2 transition-all duration-200 active:scale-95 ${
                    paymentMethod === method.value ? method.color : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}>
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Vendor (Optional)</label>
            <input type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)}
              className="input-field" placeholder="e.g., ABC Vegetable Supplier" />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Note (Optional)</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className="input-field" placeholder="e.g., Daily vegetable purchase" />
          </div>

          <button type="submit" disabled={loading} className="w-full btn-danger py-3 text-sm sm:text-base disabled:opacity-50">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...
              </span>
            ) : "Save Expense"}
          </button>
        </form>

        <button onClick={() => router.back()} className="w-full btn-ghost text-center text-sm">← Go Back</button>
      </div>
    </DashboardLayout>
  );
}
