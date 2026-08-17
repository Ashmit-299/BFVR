"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, setTokens } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const data = await apiRequest<{ access_token: string; refresh_token: string }>(
        "/api/auth/login", { method: "POST", json: { email, password } }
      );
      setTokens(data.access_token, data.refresh_token); router.push("/dashboard");
    } catch (err: any) { setError(err.message || "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 relative overflow-hidden px-4">
      <div className="absolute top-20 left-10 w-48 sm:w-72 h-48 sm:h-72 bg-amber-200/30 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-64 sm:w-96 h-64 sm:h-96 bg-orange-200/30 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-amber-100/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6 sm:mb-8 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-glow mb-4 animate-bounce-in">
            <span className="text-2xl sm:text-3xl">🍽️</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Restaurant MS
          </h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm">Financial Management System</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-5 sm:p-8 border border-amber-100/60 animate-fade-in-up">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-5 sm:mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs sm:text-sm border border-red-100 animate-scale-in">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-field" placeholder="owner@restaurant.com" required />
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="input-field" placeholder="Enter password" required />
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-primary py-3 text-sm sm:text-base disabled:opacity-50 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...
                </span>
              ) : "Sign In"}
            </button>
          </form>

          <div className="mt-5 sm:mt-6 p-3 sm:p-4 bg-amber-50/80 rounded-xl border border-amber-100/50 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
            <p className="text-[10px] sm:text-xs text-amber-600 font-semibold mb-2">Demo Credentials:</p>
            <p className="text-[10px] sm:text-xs text-gray-600">Owner: owner@restaurant.com / owner123</p>
            <p className="text-[10px] sm:text-xs text-gray-600">Manager: manager@restaurant.com / manager123</p>
          </div>

          <div className="mt-4 text-center animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <p className="text-[10px] sm:text-xs text-gray-400">Only existing users can create new accounts (Owner only)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
