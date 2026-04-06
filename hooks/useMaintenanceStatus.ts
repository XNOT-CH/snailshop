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

export function useMaintenanceStatus() {
    const [data, setData] = useState<MaintenanceMap>({});

    useEffect(() => {
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
    }, []);

    return data;
}
