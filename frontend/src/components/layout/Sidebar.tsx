"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { RestaurantSetting } from "@/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/sales", label: "Sales", icon: "💰" },
  { href: "/sales/add", label: "Add Sale", icon: "➕" },
  { href: "/expenses", label: "Expenses", icon: "📤" },
  { href: "/expenses/add", label: "Add Expense", icon: "➕" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/closing", label: "Daily Closing", icon: "🧾" },
  { href: "/closing/history", label: "Closing History", icon: "📋" },
];

const settingsItems = [
  { href: "/settings/restaurant", label: "Restaurant", icon: "🏪" },
  { href: "/settings/categories", label: "Categories", icon: "🏷️" },
  { href: "/settings/users", label: "Users", icon: "👥" },
];

interface SidebarProps {
  role?: string;
  restaurantSettings?: RestaurantSetting;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ role, restaurantSettings, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const name = restaurantSettings?.restaurant_name || "My Restaurant";
  const tagline = restaurantSettings?.tagline || "Financial Management";

  const navContent = (
    <>
      <div className="p-5 pr-12 border-b border-amber-100/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white text-lg shadow-glow animate-float shrink-0">
            🍽️
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent truncate">
              {name}
            </h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-wider truncate">{tagline}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                "transition-all duration-200 group",
                isActive
                  ? "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 shadow-sm border border-amber-200/50"
                  : "text-gray-500 hover:bg-gray-50/80 hover:text-gray-800"
              )}
            >
              <span className={cn(
                "text-base transition-transform duration-200 shrink-0",
                isActive ? "scale-110" : "group-hover:scale-110"
              )}>
                {item.icon}
              </span>
              {item.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-glow shrink-0" />
              )}
            </Link>
          );
        })}

        {role === "OWNER" && (
          <>
            <div className="pt-5 pb-2 px-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Settings</p>
            </div>
            {settingsItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                    "transition-all duration-200 group",
                    isActive
                      ? "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 shadow-sm border border-amber-200/50"
                      : "text-gray-500 hover:bg-gray-50/80 hover:text-gray-800"
                  )}
                >
                  <span className={cn(
                    "text-base transition-transform duration-200 shrink-0",
                    isActive ? "scale-110" : "group-hover:scale-110"
                  )}>
                    {item.icon}
                  </span>
                  {item.label}
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-glow shrink-0" />
                  )}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-amber-100/60">
        <p className="text-[10px] text-gray-400 font-medium tracking-wider text-center">v1.0.0</p>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-white/80 backdrop-blur-xl border-r border-amber-100/60 min-h-screen flex-col shrink-0">
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white/95 backdrop-blur-xl shadow-2xl flex flex-col animate-slide-in-left">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors z-10"
            >
              ✕
            </button>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
