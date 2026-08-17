"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRestaurantSettings } from "@/hooks/useRestaurantSettings";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { settings } = useRestaurantSettings();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (settings.restaurant_name) {
      document.title = `${settings.restaurant_name} - ${settings.tagline}`;
    }
  }, [settings]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-glow animate-float">
            <span className="text-2xl">🍽️</span>
          </div>
          <div className="w-8 h-8 border-3 border-amber-300 border-t-amber-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-amber-50/30 to-orange-50/30">
      <Sidebar role={user.role} restaurantSettings={settings} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} onLogout={logout} restaurantName={settings.restaurant_name} onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
