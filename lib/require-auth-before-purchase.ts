import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { normalizeCallbackUrl } from "@/lib/authRedirect";

function buildCurrentUrl() {
    if (typeof window === "undefined") {
        return "/";
    }

    const currentPath = `${window.location.pathname}${window.location.search}`;
    return normalizeCallbackUrl(currentPath || "/");
}

export async function requireAuthBeforePurchase(router: AppRouterInstance) {
    try {
        const response = await fetch("/api/session", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
        });

        if (!response.ok) {
            return { allowed: true } as const;
        }

        const data = (await response.json()) as { authenticated?: boolean };
        if (data.authenticated) {
            return { allowed: true } as const;
        }
    } catch {
        return { allowed: true } as const;
    }

    const callbackUrl = encodeURIComponent(buildCurrentUrl());
    router.push(`/register?callbackUrl=${callbackUrl}`);

    return { allowed: false } as const;
}
