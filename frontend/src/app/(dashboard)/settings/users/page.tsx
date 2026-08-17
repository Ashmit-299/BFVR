"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/lib/api";
import { User } from "@/types";

interface UserListResponse {
  users: User[];
}

export default function UsersPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("MANAGER");
  const [newPhone, setNewPhone] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [userRes, usersRes] = await Promise.all([
        apiRequest<User>("/api/auth/me"),
        apiRequest<UserListResponse>("/api/auth/users"),
      ]);
      setCurrentUser(userRes); setUsers(usersRes.users);
    } catch (err) { console.error("Failed to load data:", err); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess("");
    try {
      await apiRequest("/api/auth/register", {
        method: "POST",
        json: { name: newName, email: newEmail, password: newPassword, role: newRole, phone: newPhone || null },
      });
      setSuccess("User created successfully!"); setNewName(""); setNewEmail(""); setNewPassword(""); setNewPhone(""); setShowAdd(false); loadData();
    } catch (err: any) { setError(err.message); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between animate-fade-in">
          <h1 className="section-title text-lg sm:text-2xl">User Management</h1>
          {currentUser?.role === "OWNER" && (
            <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs sm:text-sm px-3 sm:px-5 py-2">+ Add User</button>
          )}
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
                <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Email</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="input-field" required />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" required minLength={6} />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Role</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="input-field">
                  <option value="MANAGER">Manager</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Phone</label>
                <input type="text" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="input-field" placeholder="Optional" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-xs sm:text-sm">Create User</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost text-xs sm:text-sm">Cancel</button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card-base border border-amber-100/60 overflow-hidden animate-fade-in-up opacity-0" style={{ animationDelay: "0.05s" }}>
            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-amber-50">
              {users.map((u) => (
                <div key={u.id} className="p-3 sm:p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">{u.name}</span>
                    <span className={`badge text-[10px] ${u.role === "OWNER" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>{u.role}</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-500">{u.email}</p>
                  {u.phone && <p className="text-[10px] sm:text-xs text-gray-500">{u.phone}</p>}
                  <span className={`badge text-[10px] ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-amber-50/80 border-b border-amber-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-50">
                  {users.map((u) => (
                    <tr key={u.id} className="table-row">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{u.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${u.role === "OWNER" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.phone || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="card-base p-3 sm:p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "0.15s" }}>
          <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-3">Role Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 bg-purple-50 rounded-xl">
              <h4 className="text-xs sm:text-sm font-semibold text-purple-700 mb-2">Owner</h4>
              <ul className="text-[10px] sm:text-xs text-purple-600 space-y-1">
                <li>Full access to all features</li>
                <li>Can manage users and categories</li>
                <li>Can view all reports and analytics</li>
                <li>Can correct transactions</li>
              </ul>
            </div>
            <div className="p-3 sm:p-4 bg-blue-50 rounded-xl">
              <h4 className="text-xs sm:text-sm font-semibold text-blue-700 mb-2">Manager</h4>
              <ul className="text-[10px] sm:text-xs text-blue-600 space-y-1">
                <li>Can add sales and expenses</li>
                <li>Can view daily dashboard</li>
                <li>Can perform daily closing</li>
                <li>Cannot manage users or categories</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
