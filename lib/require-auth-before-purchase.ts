import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { normalizeCallbackUrl } from "@/lib/authRedirect";
import { requestSessionStatus } from "@/lib/client/accountClient";

function buildCurrentUrl() {
    if (typeof globalThis.window === "undefined") {
        return "/";
    }

    const currentPath = `${globalThis.window.location.pathname}${globalThis.window.location.search}`;
    return normalizeCallbackUrl(currentPath || "/");
}

export async function requireAuthBeforePurchase(router: AppRouterInstance) {
    try {
        const { response, data } = await requestSessionStatus();

        if (!response.ok) {
            // Cannot tell: let the shopper through — the server still gates the
            // purchase — but say so, because a guest's cart is not stored.
            return { allowed: true, unverified: true } as const;
        }

        if (data.authenticated) {
            return { allowed: true } as const;
        }
    } catch {
        return { allowed: true, unverified: true } as const;
    }

    const callbackUrl = encodeURIComponent(buildCurrentUrl());
    router.push(`/register?callbackUrl=${callbackUrl}`);

    return { allowed: false } as const;
}
