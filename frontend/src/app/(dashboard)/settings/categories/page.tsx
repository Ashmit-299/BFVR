"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/lib/api";
import { Category } from "@/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("EXPENSE");
  const [newDesc, setNewDesc] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      const data = await apiRequest<Category[]>("/api/categories");
      setCategories(data);
    } catch (err) { console.error("Failed to load categories:", err); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess("");
    try {
      await apiRequest("/api/categories", { method: "POST", json: { name: newName, type: newType, description: newDesc || null } });
      setSuccess("Category added successfully!"); setNewName(""); setNewDesc(""); setShowAdd(false); loadCategories();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    setError(""); setSuccess("");
    try {
      await apiRequest(`/api/categories/${id}`, { method: "DELETE" });
      setSuccess("Category deleted successfully!"); loadCategories();
    } catch (err: any) { setError(err.message); }
  };

  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between animate-fade-in">
          <h1 className="section-title text-lg sm:text-2xl">Categories</h1>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs sm:text-sm px-3 sm:px-5 py-2">+ Add</button>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs sm:text-sm border border-red-100 animate-scale-in">{error}</div>}
        {success && <div className="p-3 bg-green-50 text-green-700 rounded-xl text-xs sm:text-sm border border-green-100 animate-scale-in">{success}</div>}

        {showAdd && (
          <form onSubmit={handleAdd} className="card-base p-3 sm:p-5 space-y-4 animate-fade-in-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="input-field" required />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Type</label>
                <select value={newType} onChange={(e) => setNewType(e.target.value)} className="input-field">
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Description</label>
              <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="input-field" placeholder="Optional" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-xs sm:text-sm">Save</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost text-xs sm:text-sm">Cancel</button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="card-base p-3 sm:p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "0.05s" }}>
              <h3 className="text-xs sm:text-sm font-semibold text-emerald-600 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" /> Income Categories
              </h3>
              {incomeCategories.length === 0 ? (
                <p className="text-gray-400 text-xs sm:text-sm">No income categories</p>
              ) : (
                <div className="space-y-2">
                  {incomeCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-emerald-50/80 rounded-xl hover:bg-emerald-50 transition-all duration-200 group">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-700">{cat.name}</p>
                        {cat.description && <p className="text-[10px] sm:text-xs text-gray-500 truncate">{cat.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {cat.is_default && <span className="badge bg-emerald-100 text-emerald-600 text-[10px]">Default</span>}
                        {!cat.is_default && (
                          <button onClick={() => handleDelete(cat.id)}
                            className="text-[10px] sm:text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200">Delete</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card-base p-3 sm:p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
              <h3 className="text-xs sm:text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full" /> Expense Categories
              </h3>
              {expenseCategories.length === 0 ? (
                <p className="text-gray-400 text-xs sm:text-sm">No expense categories</p>
              ) : (
                <div className="space-y-2">
                  {expenseCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-red-50/80 rounded-xl hover:bg-red-50 transition-all duration-200 group">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-700">{cat.name}</p>
                        {cat.description && <p className="text-[10px] sm:text-xs text-gray-500 truncate">{cat.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {cat.is_default && <span className="badge bg-red-100 text-red-600 text-[10px]">Default</span>}
                        {!cat.is_default && (
                          <button onClick={() => handleDelete(cat.id)}
                            className="text-[10px] sm:text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200">Delete</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
