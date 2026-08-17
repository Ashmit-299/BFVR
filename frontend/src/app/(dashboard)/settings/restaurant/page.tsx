"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/lib/api";
import { RestaurantSetting } from "@/types";

export default function RestaurantSettingsPage() {
  const [settings, setSettings] = useState<RestaurantSetting>({ restaurant_name: "", tagline: "", currency_symbol: "₹" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const data = await apiRequest<RestaurantSetting>("/api/settings");
      setSettings(data);
    } catch (err) { console.error("Failed to load settings:", err); }
    finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const data = await apiRequest<RestaurantSetting>("/api/settings", { method: "PUT", json: settings });
      setSettings(data); setSuccess(true); setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) { setError(err.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <h1 className="section-title text-lg sm:text-2xl animate-fade-in">Restaurant Settings</h1>

        {success && <div className="p-3 sm:p-4 bg-green-50 text-green-700 rounded-xl border border-green-200 animate-scale-in text-sm">Settings saved successfully!</div>}
        {error && <div className="p-3 sm:p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 animate-scale-in text-sm">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="card-base p-4 sm:p-6 space-y-5 sm:space-y-6 animate-fade-in-up">
            <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-glow mb-3">
                <span className="text-xl sm:text-2xl">🍽️</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                {settings.restaurant_name || "My Restaurant"}
              </h2>
              <p className="text-xs text-gray-500 mt-1">{settings.tagline || "Financial Management"}</p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-2">Restaurant Name</label>
              <input type="text" value={settings.restaurant_name} onChange={(e) => setSettings({ ...settings, restaurant_name: e.target.value })}
                className="input-field text-base sm:text-lg font-semibold" placeholder="e.g., Sharma Ji Ka Dhaba" required />
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Appears on sidebar, dashboard, and browser tab</p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-2">Tagline</label>
              <input type="text" value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="input-field" placeholder="e.g., Since 1995" />
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Short subtitle below the restaurant name</p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-2">Currency Symbol</label>
              <input type="text" value={settings.currency_symbol} onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                className="input-field w-20 sm:w-24" placeholder="₹" maxLength={3} />
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Used throughout the app (default: ₹)</p>
            </div>

            <button type="submit" disabled={saving} className="w-full btn-primary py-3 text-sm sm:text-base disabled:opacity-50">
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...
                </span>
              ) : "Save Settings"}
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
