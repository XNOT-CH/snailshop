import { describe, expect, it, vi } from "vitest";
import {
    requestProfile,
    requestSessionStatus,
} from "@/lib/client/accountClient";
import { API_ROUTES } from "@/lib/constants/apiRoutes";

describe("lib/client/accountClient", () => {
    it("requests session status with the existing no-store same-origin contract", async () => {
        const responseBody = { authenticated: true };
        const fetcher = vi.fn(async () => Response.json(responseBody));

        const result = await requestSessionStatus({ fetcher });

        expect(result.data).toEqual(responseBody);
        expect(result.response.ok).toBe(true);
        expect(fetcher).toHaveBeenCalledWith(API_ROUTES.SESSION, {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
        });
    });

    it("requests profile with caller-provided init to preserve existing call sites", async () => {
        const responseBody = {
            success: true,
            data: { hasPin: true },
        };
        const fetcher = vi.fn(async () => Response.json(responseBody));

        const result = await requestProfile<{ hasPin: boolean }>({
            fetcher,
            init: { cache: "no-store" },
        });

        expect(result.data).toEqual(responseBody);
        expect(result.data.data?.hasPin).toBe(true);
        expect(fetcher).toHaveBeenCalledWith(API_ROUTES.PROFILE, { cache: "no-store" });
    });

    it("keeps response status available for callers that handle fallback themselves", async () => {
        const fetcher = vi.fn(async () =>
            Response.json({ success: false, message: "ไม่พบผู้ใช้" }, { status: 404 }),
        );

        const result = await requestProfile({ fetcher });

        expect(result.response.ok).toBe(false);
        expect(result.response.status).toBe(404);
        expect(result.data).toEqual({ success: false, message: "ไม่พบผู้ใช้" });
    });
});
