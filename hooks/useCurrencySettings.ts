"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_CURRENCY_SETTINGS,
  normalizeCurrencySettings,
  type PublicCurrencySettings,
} from "@/lib/currencySettings";

export function useCurrencySettings(initialSettings?: PublicCurrencySettings | null) {
  const [settings, setSettings] = useState<PublicCurrencySettings>(
    normalizeCurrencySettings(initialSettings),
  );

  useEffect(() => {
    if (initialSettings) {
      return;
    }

    let isMounted = true;

    async function fetchCurrencySettings() {
      try {
        const response = await fetch("/api/currency-settings", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (isMounted) {
          setSettings(normalizeCurrencySettings(data));
        }
      } catch (error) {
        console.error("Failed to load currency settings:", error);
        if (isMounted) {
          setSettings(DEFAULT_CURRENCY_SETTINGS);
        }
      }
    }

    void fetchCurrencySettings();

    return () => {
      isMounted = false;
    };
  }, [initialSettings]);

  return settings;
}
