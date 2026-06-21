import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
    isAuthenticatedWithCsrf: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    db: {
        transaction: vi.fn(),
    },
    promoCodes: {
        code: "code",
        id: "id",
    },
    promoUsages: {
        promoCodeId: "promoCodeId",
        status: "status",
        userId: "userId",
    },
    users: {
        id: "id",
    },
}));

vi.mock("@/lib/rateLimit", () => ({
    checkPromoValidationRateLimit: vi.fn(() => ({ blocked: false, remainingAttempts: 5 })),
    clearPromoValidationAttempts: vi.fn(),
    getClientIp: vi.fn(() => "198.51.100.24"),
    recordFailedPromoValidation: vi.fn(),
}));

vi.mock("@/lib/security/pin", () => ({
    assertPinForProtectedAction: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
    and: vi.fn(),
    eq: vi.fn(),
    ne: vi.fn(),
    sql: vi.fn(),
}));

import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkPromoValidationRateLimit, recordFailedPromoValidation } from "@/lib/rateLimit";
import { assertPinForProtectedAction } from "@/lib/security/pin";

function createRedeemRequest(body: object) {
    return new NextRequest("http://localhost/api/promo-codes/redeem", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

describe("API: /api/promo-codes/redeem security", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (isAuthenticatedWithCsrf as any).mockResolvedValue({ success: true, userId: "u1" });
        (checkPromoValidationRateLimit as any).mockReturnValue({ blocked: false, remainingAttempts: 5 });
        (assertPinForProtectedAction as any).mockResolvedValue({ success: true });
    });

    it("rejects redeem attempts that fail CSRF-backed authentication before touching rate limits or PIN", async () => {
        (isAuthenticatedWithCsrf as any).mockResolvedValueOnce({
            success: false,
            error: "Invalid CSRF token",
        });

        const { POST } = await import("@/app/api/promo-codes/redeem/route");
        const response = await POST(createRedeemRequest({ code: "CREDIT100", pin: "123456" }));
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body).toEqual({ success: false, message: "Invalid CSRF token" });
        expect(checkPromoValidationRateLimit).not.toHaveBeenCalled();
        expect(assertPinForProtectedAction).not.toHaveBeenCalled();
        expect(db.transaction).not.toHaveBeenCalled();
    });

    it("rate limits authenticated redeem attempts before checking PIN or writing credit", async () => {
        (checkPromoValidationRateLimit as any).mockReturnValueOnce({
            blocked: true,
            remainingAttempts: 0,
            message: "กรอกโค้ดผิดบ่อยเกินไป กรุณารอ 15 นาที",
        });

        const { POST } = await import("@/app/api/promo-codes/redeem/route");
        const response = await POST(createRedeemRequest({ code: "CREDIT100", pin: "123456" }));
        const body = await response.json();

        expect(response.status).toBe(429);
        expect(body.success).toBe(false);
        expect(body.message).toContain("กรอกโค้ดผิดบ่อยเกินไป");
        expect(checkPromoValidationRateLimit).toHaveBeenCalledWith("198.51.100.24:u1");
        expect(assertPinForProtectedAction).not.toHaveBeenCalled();
        expect(db.transaction).not.toHaveBeenCalled();
    });

    it("records failed redeem attempts when PIN verification fails", async () => {
        (assertPinForProtectedAction as any).mockResolvedValueOnce({
            success: false,
            message: "PIN ไม่ถูกต้อง",
            status: 403,
        });

        const { POST } = await import("@/app/api/promo-codes/redeem/route");
        const response = await POST(createRedeemRequest({ code: "CREDIT100", pin: "000000" }));
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body).toEqual({ success: false, message: "PIN ไม่ถูกต้อง" });
        expect(recordFailedPromoValidation).toHaveBeenCalledWith("198.51.100.24:u1");
        expect(db.transaction).not.toHaveBeenCalled();
    });
});
