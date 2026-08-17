"use client";

import { User } from "@/types";

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  restaurantName?: string;
  onMenuToggle?: () => void;
}

export default function Header({ user, onLogout, onMenuToggle }: HeaderProps) {
  return (
    <header className="h-14 sm:h-16 bg-white/70 backdrop-blur-xl border-b border-amber-100/60 flex items-center justify-between px-3 sm:px-6 animate-fade-in-down">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden w-9 h-9 rounded-xl bg-amber-50 hover:bg-amber-100 flex items-center justify-center text-amber-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <h2 className="text-xs sm:text-sm font-semibold text-gray-500">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {user && (
          <>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-700">{user.name}</p>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{user.role}</p>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-glow shrink-0">
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
            <button
              onClick={onLogout}
              className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 font-medium active:scale-95"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
