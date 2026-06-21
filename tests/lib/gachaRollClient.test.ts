import { describe, expect, it, vi } from "vitest";
import { fetchWithCsrf } from "@/lib/csrf-client";
import {
    buildGachaRollPayload,
    parseGachaRollResponse,
    requestGachaRoll,
} from "@/lib/client/gachaRollClient";
import { API_ROUTES } from "@/lib/constants/apiRoutes";

vi.mock("@/lib/csrf-client", () => ({
    fetchWithCsrf: vi.fn(async () => Response.json({ success: true })),
}));

function getRequestInit(fetcher: ReturnType<typeof vi.fn>) {
    return fetcher.mock.calls[0]?.[1] as RequestInit;
}

describe("lib/client/gachaRollClient", () => {
    it("builds the existing gacha roll payload shape", () => {
        expect(buildGachaRollPayload(1, "machine-1")).toEqual({
            spin: 1,
            machineId: "machine-1",
        });
    });

    it("omits empty machine id to preserve JSON request contract", () => {
        expect(JSON.stringify(buildGachaRollPayload(2, undefined))).toBe(
            JSON.stringify({ spin: 2 }),
        );
    });

    it("posts roll requests to the shared gacha roll endpoint", async () => {
        const responseBody = {
            success: true,
            data: { lLabel: "A" },
        };
        const fetcher = vi.fn(async () => Response.json(responseBody));
        const payload = buildGachaRollPayload(1, "machine-1");

        const result = await requestGachaRoll(payload, { fetcher });

        expect(result).toEqual(responseBody);
        expect(fetcher).toHaveBeenCalledWith(API_ROUTES.GACHA_ROLL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        expect(JSON.parse(String(getRequestInit(fetcher).body))).toEqual(payload);
    });

    it("uses the CSRF-aware fetcher by default for roll requests", async () => {
        const payload = buildGachaRollPayload(1, "machine-1");

        await requestGachaRoll(payload);

        expect(fetchWithCsrf).toHaveBeenCalledWith(API_ROUTES.GACHA_ROLL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    });

    it("parses roll responses without changing fields", async () => {
        const response = Response.json({
            success: false,
            message: "สุ่มไม่สำเร็จ",
            data: { reason: "daily-limit" },
        });

        await expect(parseGachaRollResponse(response)).resolves.toEqual({
            success: false,
            message: "สุ่มไม่สำเร็จ",
            data: { reason: "daily-limit" },
        });
    });

    it("keeps the existing login fallback when response JSON parsing fails with 401", async () => {
        const response = new Response("", { status: 401 });

        await expect(parseGachaRollResponse(response)).resolves.toEqual({
            success: false,
            message: "กรุณาเข้าสู่ระบบก่อน",
        });
    });

    it("keeps the existing generic fallback when response JSON parsing fails", async () => {
        const response = new Response("", { status: 500 });

        await expect(parseGachaRollResponse(response)).resolves.toEqual({
            success: false,
            message: "เกิดข้อผิดพลาด",
        });
    });
});
