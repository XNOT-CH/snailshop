import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    authMock,
    claimSeasonPassMock,
    isAuthenticatedWithCsrfMock,
    purchaseSeasonPassMock,
} = vi.hoisted(() => ({
    authMock: vi.fn(),
    claimSeasonPassMock: vi.fn(),
    isAuthenticatedWithCsrfMock: vi.fn(),
    purchaseSeasonPassMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
    auth: authMock,
}));

vi.mock("@/lib/auth", () => ({
    isAuthenticatedWithCsrf: isAuthenticatedWithCsrfMock,
}));

vi.mock("@/lib/seasonPassTransactions", () => ({
    claimSeasonPass: claimSeasonPassMock,
    purchaseSeasonPass: purchaseSeasonPassMock,
}));

const request = (url: string, method = "POST") => new Request(url, { method });

describe("public season-pass route response contracts", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it("preserves purchase unauthenticated fallback and CSRF-auth error contracts", async () => {
        authMock.mockResolvedValue(null);
        const { POST } = await import("@/app/api/season-pass/purchase/route");

        const noRequestResponse = await POST();

        expect(noRequestResponse.status).toBe(401);
        await expect(noRequestResponse.json()).resolves.toEqual({
            success: false,
            message: "กรุณาเข้าสู่ระบบก่อน",
        });
        expect(purchaseSeasonPassMock).not.toHaveBeenCalled();

        vi.resetModules();
        isAuthenticatedWithCsrfMock.mockResolvedValue({
            success: false,
            error: "Invalid CSRF token",
        });
        const { POST: postWithRequest } = await import("@/app/api/season-pass/purchase/route");
        const csrfResponse = await postWithRequest(request("http://localhost/api/season-pass/purchase"));

        expect(csrfResponse.status).toBe(401);
        await expect(csrfResponse.json()).resolves.toEqual({
            success: false,
            message: "Invalid CSRF token",
        });
        expect(purchaseSeasonPassMock).not.toHaveBeenCalled();
    });

    it("preserves purchase service error and success contracts", async () => {
        isAuthenticatedWithCsrfMock.mockResolvedValue({
            success: true,
            userId: "user-1",
        });
        purchaseSeasonPassMock.mockResolvedValueOnce({
            ok: false,
            status: 400,
            message: "เครดิตคงเหลือไม่พอสำหรับซื้อ Season Pass",
        });
        const { POST } = await import("@/app/api/season-pass/purchase/route");

        const errorResponse = await POST(request("http://localhost/api/season-pass/purchase"));

        expect(errorResponse.status).toBe(400);
        await expect(errorResponse.json()).resolves.toEqual({
            success: false,
            message: "เครดิตคงเหลือไม่พอสำหรับซื้อ Season Pass",
        });
        expect(purchaseSeasonPassMock).toHaveBeenCalledWith({
            userId: "user-1",
            request: expect.any(Request),
        });

        vi.resetModules();
        isAuthenticatedWithCsrfMock.mockResolvedValue({
            success: true,
            userId: "user-1",
        });
        const purchaseBody = {
            success: true,
            message: "ซื้อ Season Pass สำเร็จ",
            endAt: "2026-06-13 00:00:00",
            endAtText: "13 มิ.ย. 2569",
            queued: false,
            startsAt: null,
            startsAtText: null,
        };
        purchaseSeasonPassMock.mockResolvedValueOnce({
            ok: true,
            status: 200,
            body: purchaseBody,
        });
        const { POST: postSuccess } = await import("@/app/api/season-pass/purchase/route");
        const successResponse = await postSuccess(request("http://localhost/api/season-pass/purchase"));

        expect(successResponse.status).toBe(200);
        await expect(successResponse.json()).resolves.toEqual(purchaseBody);
    });

    it("preserves claim auth, service error, and success contracts", async () => {
        isAuthenticatedWithCsrfMock.mockResolvedValueOnce({
            success: false,
            error: "Invalid CSRF token",
        });
        const { POST } = await import("@/app/api/season-pass/claim/route");

        const unauthorizedResponse = await POST(request("http://localhost/api/season-pass/claim"));

        expect(unauthorizedResponse.status).toBe(401);
        await expect(unauthorizedResponse.json()).resolves.toEqual({
            success: false,
            message: "Invalid CSRF token",
        });
        expect(claimSeasonPassMock).not.toHaveBeenCalled();

        vi.resetModules();
        isAuthenticatedWithCsrfMock.mockResolvedValue({
            success: true,
            userId: "user-1",
        });
        authMock.mockResolvedValue({ user: { id: "user-1", role: "ADMIN" } });
        claimSeasonPassMock.mockResolvedValueOnce({
            ok: false,
            status: 403,
            message: "ยังไม่มี Season Pass ที่ใช้งานอยู่",
        });
        const { POST: postClaimError } = await import("@/app/api/season-pass/claim/route");
        const claimErrorResponse = await postClaimError(
            request("http://localhost/api/season-pass/claim?mockDate=2026-05-14"),
        );

        expect(claimErrorResponse.status).toBe(403);
        await expect(claimErrorResponse.json()).resolves.toEqual({
            success: false,
            message: "ยังไม่มี Season Pass ที่ใช้งานอยู่",
        });
        expect(claimSeasonPassMock).toHaveBeenCalledWith({
            userId: "user-1",
            role: "ADMIN",
            request: expect.any(Request),
        });

        vi.resetModules();
        isAuthenticatedWithCsrfMock.mockResolvedValue({
            success: true,
            userId: "user-1",
        });
        authMock.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
        const claimBody = {
            success: true,
            message: "รับของวันนี้สำเร็จ",
            dayNumber: 5,
            rewardLabel: "เครดิต",
            rewardAmount: "80",
            claimedAtText: "14 พ.ค. 2569",
        };
        claimSeasonPassMock.mockResolvedValueOnce({
            ok: true,
            status: 200,
            body: claimBody,
        });
        const { POST: postClaimSuccess } = await import("@/app/api/season-pass/claim/route");
        const claimSuccessResponse = await postClaimSuccess(request("http://localhost/api/season-pass/claim"));

        expect(claimSuccessResponse.status).toBe(200);
        await expect(claimSuccessResponse.json()).resolves.toEqual(claimBody);
    });
});
