"use client";

import { useEffect, useState } from "react";

type MaintenanceEntry = {
    enabled: boolean;
    message: string;
    retryAfterSeconds?: number;
};

type MaintenanceMap = {
    gacha?: MaintenanceEntry;
    purchase?: MaintenanceEntry;
    topup?: MaintenanceEntry;
};

export type { MaintenanceEntry, MaintenanceMap };

export function useMaintenanceStatus(initialData?: MaintenanceMap) {
    const [data, setData] = useState<MaintenanceMap>(initialData ?? {});

    useEffect(() => {
        if (initialData) {
            return;
        }

        let cancelled = false;

        async function load() {
            try {
                const response = await fetch("/api/system/maintenance", {
                    cache: "no-store",
                });
                const json = await response.json() as { success?: boolean; data?: MaintenanceMap };
                if (!cancelled && json.success && json.data) {
                    setData(json.data);
                }
            } catch {
                // Keep default values if the read-only status endpoint is unavailable.
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, [initialData]);

    return data;
}
