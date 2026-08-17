"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, setTokens, clearTokens, getAccessToken } from "@/lib/api";
import { User } from "@/types";

let cachedUser: User | null = null;
let cachedToken: string | null = null;

export function useAuth() {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);
  const fetchedRef = useRef(false);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      cachedUser = null;
      setLoading(false);
      return;
    }
    if (cachedUser && cachedToken === token && fetchedRef.current) {
      setLoading(false);
      return;
    }
    try {
      const userData = await apiRequest<User>("/api/auth/me");
      cachedUser = userData;
      cachedToken = token;
      setUser(userData);
    } catch {
      clearTokens();
      cachedUser = null;
      cachedToken = null;
      setUser(null);
    } finally {
      fetchedRef.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const data = await apiRequest<{ access_token: string; refresh_token: string }>(
      "/api/auth/login",
      { method: "POST", json: { email, password } }
    );
    setTokens(data.access_token, data.refresh_token);
    cachedUser = null;
    cachedToken = null;
    fetchedRef.current = false;
    await fetchUser();
    router.push("/dashboard");
  };

  const register = async (name: string, email: string, password: string, role: string = "MANAGER") => {
    await apiRequest<User>("/api/auth/register", {
      method: "POST",
      json: { name, email, password, role },
    });
  };

  const logout = () => {
    clearTokens();
    cachedUser = null;
    cachedToken = null;
    fetchedRef.current = false;
    setUser(null);
    router.push("/login");
  };

  return { user, loading, login, register, logout, fetchUser };
}
