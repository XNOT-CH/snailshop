import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({
    auth: vi.fn(),
}));

vi.mock("@/lib/encryption", () => ({
    decrypt: vi.fn((value: string) => value.replace(/^enc:/, "")),
}));

vi.mock("@/lib/auth", () => ({
    isAuthenticatedWithCsrf: vi.fn(),
}));

const { whereMock, updateMock, setMock } = vi.hoisted(() => {
    const where = vi.fn();
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));
    return { whereMock: where, updateMock: update, setMock: set };
});

vi.mock("@/lib/db", () => ({
    db: {
        query: {
            orders: {
                findFirst: vi.fn(),
            },
        },
        update: updateMock,
    },
    orders: {
        id: "id",
        userId: "userId",
        deletedAt: "deletedAt",
    },
}));

vi.mock("@/lib/utils/date", () => ({
    mysqlNow: vi.fn(() => "2026-06-24 00:00:00"),
}));

vi.mock("drizzle-orm", () => ({
    and: vi.fn(),
    eq: vi.fn(),
    isNull: vi.fn(),
}));

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAuthenticatedWithCsrf } from "@/lib/auth";

const mkParams = (id: string) => ({ params: Promise.resolve({ id }) });
const mkReq = () => new NextRequest("http://localhost/api/orders/o1");

describe("API: /api/orders/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        whereMock.mockResolvedValue(undefined);
    });

    it("GET returns 401 when not authenticated", async () => {
        (auth as any).mockResolvedValue(null);
        const { GET } = await import("@/app/api/orders/[id]/route");
        const res = await GET(mkReq(), mkParams("o1"));

        expect(res.status).toBe(401);
    });

    it("GET returns 404 when order does not belong to the authenticated user", async () => {
        vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
        vi.mocked(db.query.orders.findFirst).mockResolvedValue(null as never);

        const { GET } = await import("@/app/api/orders/[id]/route");
        const res = await GET(mkReq(), mkParams("o-foreign"));

        expect(res.status).toBe(404);
    });

    it("GET returns order details for the owner only", async () => {
        vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
        vi.mocked(db.query.orders.findFirst).mockResolvedValue({
            id: "o1",
            purchasedAt: "2026-04-06 10:00:00",
            totalPrice: "150.00",
            status: "COMPLETED",
            givenData: "enc:SECRET-123",
            product: {
                name: "Test Product",
                imageUrl: "/img.jpg",
            },
        } as never);

        const { GET } = await import("@/app/api/orders/[id]/route");
        const res = await GET(mkReq(), mkParams("o1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.id).toBe("o1");
        expect(body.data.secretData).toBe("SECRET-123");
    });

    it("DELETE returns 404 when order does not belong to the authenticated user", async () => {
        vi.mocked(isAuthenticatedWithCsrf).mockResolvedValue({ success: true, userId: "u1" } as never);
        vi.mocked(db.query.orders.findFirst).mockResolvedValue(null as never);

        const { DELETE } = await import("@/app/api/orders/[id]/route");
        const res = await DELETE(mkReq(), mkParams("o-foreign"));

        expect(res.status).toBe(404);
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("DELETE returns 401 when CSRF-backed authentication fails", async () => {
        vi.mocked(isAuthenticatedWithCsrf).mockResolvedValue({ success: false, error: "Invalid CSRF token" } as never);

        const { DELETE } = await import("@/app/api/orders/[id]/route");
        const res = await DELETE(mkReq(), mkParams("o1"));
        const body = await res.json();

        expect(res.status).toBe(401);
        expect(body).toEqual({ success: false, message: "Invalid CSRF token" });
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("DELETE soft-deletes an order for its owner", async () => {
        vi.mocked(isAuthenticatedWithCsrf).mockResolvedValue({ success: true, userId: "u1" } as never);
        vi.mocked(db.query.orders.findFirst).mockResolvedValue({
            id: "o1",
            userId: "u1",
        } as never);

        const { DELETE } = await import("@/app/api/orders/[id]/route");
        const res = await DELETE(mkReq(), mkParams("o1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(updateMock).toHaveBeenCalled();
        expect(setMock).toHaveBeenCalledWith({ deletedAt: "2026-06-24 00:00:00" });
        expect(whereMock).toHaveBeenCalled();
    });
});
