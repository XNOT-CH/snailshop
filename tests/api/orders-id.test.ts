import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({
    auth: vi.fn(),
}));

vi.mock("@/lib/encryption", () => ({
    decrypt: vi.fn((value: string) => value.replace(/^enc:/, "")),
}));

const { whereMock, deleteMock } = vi.hoisted(() => {
    const where = vi.fn();
    const del = vi.fn(() => ({ where }));
    return { whereMock: where, deleteMock: del };
});

vi.mock("@/lib/db", () => ({
    db: {
        query: {
            orders: {
                findFirst: vi.fn(),
            },
        },
        delete: deleteMock,
    },
    orders: {
        id: "id",
        userId: "userId",
    },
}));

vi.mock("drizzle-orm", () => ({
    and: vi.fn(),
    eq: vi.fn(),
}));

import { auth } from "@/auth";
import { db } from "@/lib/db";

const mkParams = (id: string) => ({ params: Promise.resolve({ id }) });
const mkReq = () => new NextRequest("http://localhost/api/orders/o1");

describe("API: /api/orders/[id]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        whereMock.mockResolvedValue(undefined);
    });

    it("GET returns 401 when not authenticated", async () => {
        vi.mocked(auth).mockResolvedValue(null);
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
        vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
        vi.mocked(db.query.orders.findFirst).mockResolvedValue(null as never);

        const { DELETE } = await import("@/app/api/orders/[id]/route");
        const res = await DELETE(mkReq(), mkParams("o-foreign"));

        expect(res.status).toBe(404);
        expect(deleteMock).not.toHaveBeenCalled();
    });

    it("DELETE removes an order for its owner", async () => {
        vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
        vi.mocked(db.query.orders.findFirst).mockResolvedValue({
            id: "o1",
            userId: "u1",
        } as never);

        const { DELETE } = await import("@/app/api/orders/[id]/route");
        const res = await DELETE(mkReq(), mkParams("o1"));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(deleteMock).toHaveBeenCalled();
        expect(whereMock).toHaveBeenCalled();
    });
});
