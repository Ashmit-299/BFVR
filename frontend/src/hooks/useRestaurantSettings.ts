"use client";

import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { RestaurantSetting } from "@/types";

const defaultSettings: RestaurantSetting = {
  restaurant_name: "My Restaurant",
  tagline: "Financial Management",
  currency_symbol: "₹",
};

export function useRestaurantSettings() {
  const [settings, setSettings] = useState<RestaurantSetting>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await apiRequest<RestaurantSetting>("/api/settings");
      setSettings(data);
    } catch {
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, refetch: fetchSettings };
}
