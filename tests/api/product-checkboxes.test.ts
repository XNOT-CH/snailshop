import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Rows the fake database returns for the product being bought / edited.
let checkboxRows: {
    id: string;
    productId: string;
    title: string;
    description: string | null;
    isRequired: boolean;
}[] = [];

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/auth", () => ({
    isAuthenticatedWithCsrf: vi.fn(async () => ({ success: true, userId: "u1", user: { id: "u1" } })),
    requirePermission: vi.fn(async () => ({ success: true, userId: "admin1" })),
    requirePermissionWithCsrf: vi.fn(async () => ({ success: true, userId: "admin1" })),
}));

vi.mock("@/lib/db", () => {
    const getConnection = vi.fn();

    return {
        db: {
            $client: { getConnection },
            query: {
                users: { findFirst: vi.fn(async () => ({ id: "u1", creditBalance: "1000", pointBalance: 100 })) },
                productCheckboxes: { findFirst: vi.fn(async () => checkboxRows[0] ?? null) },
            },
            select: vi.fn(() => ({
                from: vi.fn(() => ({
                    where: vi.fn(() => Object.assign(Promise.resolve(checkboxRows), {
                        orderBy: vi.fn(async () => checkboxRows),
                    })),
                })),
            })),
            insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
            update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) })),
            delete: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
        },
        rawDbPool: { getConnection },
        users: { id: "id" },
        products: { id: "id" },
        productCheckboxes: {
            id: "id",
            productId: "productId",
            title: "title",
            description: "description",
            isRequired: "isRequired",
            createdAt: "createdAt",
        },
    };
});

vi.mock("drizzle-orm", () => ({ eq: vi.fn(), and: vi.fn(), asc: vi.fn(), inArray: vi.fn() }));
vi.mock("@/lib/auditLog", () => ({
    auditFromRequest: vi.fn(),
    AUDIT_ACTIONS: { PURCHASE: "PURCHASE", PRODUCT_UPDATE: "PRODUCT_UPDATE" },
}));
vi.mock("@/lib/mail", () => ({ sendEmail: vi.fn().mockResolvedValue({}) }));
vi.mock("@/components/emails/PurchaseReceiptEmail", () => ({ PurchaseReceiptEmail: vi.fn(() => null) }));
vi.mock("@/lib/rateLimit", () => ({
    checkPurchaseRateLimit: vi.fn(() => ({ blocked: false })),
    getClientIp: vi.fn(() => "127.0.0.1"),
}));
vi.mock("@/lib/security/pin", () => ({
    assertPinForProtectedAction: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/getCurrencySettings", () => ({ getCurrencySettings: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/getSiteSettings", () => ({ getSiteSettings: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/seo", () => ({ resolveSiteName: vi.fn(() => "Game Store") }));
vi.mock("@/lib/maintenanceMode", () => ({ getMaintenanceState: vi.fn(() => ({ enabled: false })) }));

// The money path itself is covered by purchase.test.ts / cart-checkout.test.ts;
// here it only has to prove it was never reached.
vi.mock("@/lib/features/orders/purchase", () => ({
    executeSingleProductPurchaseTransaction: vi.fn(),
    executeCartPurchaseTransaction: vi.fn(),
    getRawTransactionConnection: vi.fn(async () => ({})),
    getActivePrice: vi.fn(() => 100),
}));

import { auth } from "@/auth";
import { requirePermissionWithCsrf } from "@/lib/auth";
import {
    executeCartPurchaseTransaction,
    executeSingleProductPurchaseTransaction,
} from "@/lib/features/orders/purchase";

const requiredBox = {
    id: "c1",
    productId: "p1",
    title: "ใช้แล้วไม่คืนเงิน",
    description: null,
    isRequired: true,
};
const optionalBox = { ...requiredBox, id: "c2", title: "รับข่าวสาร", isRequired: false };

const purchaseReq = (body: object) =>
    new NextRequest("http://localhost/api/purchase", { method: "POST", body: JSON.stringify(body) });
const checkoutReq = (body: object) =>
    new NextRequest("http://localhost/api/cart/checkout", { method: "POST", body: JSON.stringify(body) });
const adminReq = (body: object, method = "POST") =>
    new NextRequest("http://localhost/api/admin/products/p1/checkboxes", { method, body: JSON.stringify(body) });

beforeEach(() => {
    vi.clearAllMocks();
    checkboxRows = [];
    (auth as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue({
        user: { id: "u1", email: null },
    });
    (requirePermissionWithCsrf as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue({
        success: true,
        userId: "admin1",
    });
});

describe("consent guard: /api/purchase", () => {
    it("refuses the purchase when a required box was not ticked, and charges nothing", async () => {
        checkboxRows = [requiredBox];
        const { POST } = await import("@/app/api/purchase/route");
        const res = await POST(purchaseReq({ productId: "p1", quantity: 1 }));

        expect(res.status).toBe(409);
        const body = await res.json();
        expect(body.requiresChecks).toBe(true);
        expect(body.missingChecks).toEqual(["ใช้แล้วไม่คืนเงิน"]);
        expect(executeSingleProductPurchaseTransaction).not.toHaveBeenCalled();
    });

    it("refuses when only an unrelated id is sent", async () => {
        checkboxRows = [requiredBox];
        const { POST } = await import("@/app/api/purchase/route");
        const res = await POST(purchaseReq({ productId: "p1", acceptedCheckIds: ["not-mine"] }));

        expect(res.status).toBe(409);
        expect(executeSingleProductPurchaseTransaction).not.toHaveBeenCalled();
    });

    it("passes the accepted snapshot to the transaction once every required box is ticked", async () => {
        checkboxRows = [requiredBox, optionalBox];
        (executeSingleProductPurchaseTransaction as unknown as { mockResolvedValue: (v: unknown) => void })
            .mockResolvedValue({
                order: { id: "o1" },
                product: { name: "Product 1", currency: "THB" },
                finalPrice: 100,
                promoData: null,
            });

        const { POST } = await import("@/app/api/purchase/route");
        const res = await POST(purchaseReq({ productId: "p1", acceptedCheckIds: ["c1", "c2"] }));

        expect(res.status).toBe(200);
        expect(executeSingleProductPurchaseTransaction).toHaveBeenCalledWith(
            expect.objectContaining({
                acceptedChecks: [
                    { id: "c1", title: "ใช้แล้วไม่คืนเงิน", productId: "p1" },
                    { id: "c2", title: "รับข่าวสาร", productId: "p1" },
                ],
            }),
        );
    });

    it("leaves products without checkboxes untouched", async () => {
        checkboxRows = [];
        (executeSingleProductPurchaseTransaction as unknown as { mockResolvedValue: (v: unknown) => void })
            .mockResolvedValue({
                order: { id: "o1" },
                product: { name: "Product 1", currency: "THB" },
                finalPrice: 100,
                promoData: null,
            });

        const { POST } = await import("@/app/api/purchase/route");
        const res = await POST(purchaseReq({ productId: "p1" }));

        expect(res.status).toBe(200);
        expect(executeSingleProductPurchaseTransaction).toHaveBeenCalledWith(
            expect.objectContaining({ acceptedChecks: [] }),
        );
    });
});

describe("consent guard: /api/cart/checkout", () => {
    it("refuses checkout when a cart item has an unticked required box", async () => {
        checkboxRows = [requiredBox];
        const { POST } = await import("@/app/api/cart/checkout/route");
        const res = await POST(checkoutReq({ items: [{ productId: "p1", quantity: 1 }] }));

        expect(res.status).toBe(409);
        const body = await res.json();
        expect(body.requiresChecks).toBe(true);
        expect(executeCartPurchaseTransaction).not.toHaveBeenCalled();
    });
});

describe("admin checkbox routes", () => {
    it("refuses to create without PRODUCT_EDIT", async () => {
        (requirePermissionWithCsrf as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue({
            success: false,
            error: "ไม่มีสิทธิ์เข้าถึง",
        });

        const { POST } = await import("@/app/api/admin/products/[id]/checkboxes/route");
        const res = await POST(adminReq({ title: "x" }), { params: Promise.resolve({ id: "p1" }) });

        expect(res.status).toBe(401);
    });

    it("refuses to delete without PRODUCT_EDIT", async () => {
        (requirePermissionWithCsrf as unknown as { mockResolvedValue: (v: unknown) => void }).mockResolvedValue({
            success: false,
            error: "ไม่มีสิทธิ์เข้าถึง",
        });

        const { DELETE } = await import("@/app/api/admin/products/[id]/checkboxes/[checkboxId]/route");
        const res = await DELETE(adminReq({}, "DELETE"), {
            params: Promise.resolve({ id: "p1", checkboxId: "c1" }),
        });

        expect(res.status).toBe(401);
    });

    it("rejects an empty title", async () => {
        const { POST } = await import("@/app/api/admin/products/[id]/checkboxes/route");
        const res = await POST(adminReq({ title: "   " }), { params: Promise.resolve({ id: "p1" }) });

        expect(res.status).toBe(400);
    });

    it("creates a checkbox for an admin who may edit products", async () => {
        const { POST } = await import("@/app/api/admin/products/[id]/checkboxes/route");
        const res = await POST(adminReq({ title: "ใช้แล้วไม่คืนเงิน", isRequired: true }), {
            params: Promise.resolve({ id: "p1" }),
        });

        expect(res.status).toBe(201);
        expect((await res.json()).success).toBe(true);
    });
});
