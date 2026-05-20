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

const MAINTENANCE_CACHE_TTL_MS = 30_000;

let cachedMaintenance: { data: MaintenanceMap; expiresAt: number } | null = null;
let pendingMaintenanceRequest: Promise<MaintenanceMap | null> | null = null;

function getCachedMaintenanceData() {
    if (!cachedMaintenance || cachedMaintenance.expiresAt <= Date.now()) {
        return null;
    }

    return cachedMaintenance.data;
}

async function fetchMaintenanceStatus() {
    const cached = getCachedMaintenanceData();
    if (cached) {
        return cached;
    }

    if (pendingMaintenanceRequest) {
        return pendingMaintenanceRequest;
    }

    pendingMaintenanceRequest = fetch("/api/system/maintenance", {
        cache: "no-store",
    })
        .then(async (response) => {
            const json = await response.json() as { success?: boolean; data?: MaintenanceMap };
            if (!json.success || !json.data) {
                return null;
            }

            cachedMaintenance = {
                data: json.data,
                expiresAt: Date.now() + MAINTENANCE_CACHE_TTL_MS,
            };

            return json.data;
        })
        .catch(() => null)
        .finally(() => {
            pendingMaintenanceRequest = null;
        });

    return pendingMaintenanceRequest;
}

export function useMaintenanceStatus(initialData?: MaintenanceMap) {
    const [data, setData] = useState<MaintenanceMap>(() => initialData ?? getCachedMaintenanceData() ?? {});

    useEffect(() => {
        if (initialData) {
            return;
        }

        let cancelled = false;
        const cached = getCachedMaintenanceData();
        const statusPromise = cached ? Promise.resolve(cached) : fetchMaintenanceStatus();

        void statusPromise.then((nextData) => {
            if (!cancelled && nextData) {
                setData(nextData);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [initialData]);

    return data;
}
