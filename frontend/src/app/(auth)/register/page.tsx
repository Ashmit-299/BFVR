"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("MANAGER");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await apiRequest("/api/auth/register", {
        method: "POST",
        json: { name, email, password, role, phone: phone || null },
      });
      setSuccess(true); setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) { setError(err.message || "Registration failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 relative overflow-hidden px-4">
      <div className="absolute top-20 right-10 w-48 sm:w-72 h-48 sm:h-72 bg-amber-200/30 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-10 w-64 sm:w-96 h-64 sm:h-96 bg-orange-200/30 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6 sm:mb-8 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-glow mb-4 animate-bounce-in">
            <span className="text-2xl sm:text-3xl">🍽️</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Restaurant MS
          </h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm">Create New Account</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-5 sm:p-8 border border-amber-100/60 animate-fade-in-up">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-5 sm:mb-6">Register</h2>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs sm:text-sm border border-red-100 animate-scale-in">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl text-xs sm:text-sm border border-green-100 animate-scale-in">Account created! Redirecting to login...</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required />
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" required minLength={6} />
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field">
                <option value="MANAGER">Manager</option>
                <option value="OWNER">Owner</option>
              </select>
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Phone (Optional)</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full btn-primary py-3 text-sm sm:text-base disabled:opacity-50 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...
                </span>
              ) : "Create Account"}
            </button>
          </form>

          <div className="mt-4 text-center animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
            <button onClick={() => router.push("/login")} className="text-xs sm:text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors">
              Already have an account? Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
