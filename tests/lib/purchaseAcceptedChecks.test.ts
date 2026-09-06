import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ rawDbPool: { getConnection: vi.fn() } }));
vi.mock("@/lib/encryption", () => ({
    encrypt: vi.fn((value: string) => `enc_${value}`),
    decrypt: vi.fn((value: string) => value.replace("enc_", "")),
}));
vi.mock("@/lib/stock", () => ({
    splitStock: vi.fn((value: string) => (value ? value.split("\n").filter(Boolean) : [])),
    getDelimiter: vi.fn(() => "\n"),
}));

import { executeSingleProductPurchaseTransaction } from "@/lib/features/orders/purchase";

const PRODUCT = {
    id: "p1",
    name: "Test Product",
    price: "100",
    discountPrice: null,
    currency: "THB",
    isSold: 0,
    secretData: "item1\nitem2",
    stockSeparator: "newline",
    orderId: null,
};

const USER = { id: "u1", creditBalance: "1000", pointBalance: 0 };

function mkConn() {
    const conn = {
        beginTransaction: vi.fn().mockResolvedValue(undefined),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
        release: vi.fn(),
        execute: vi.fn(async (query: string) => {
            if (query.includes("FROM Product WHERE id")) return [[PRODUCT]];
            if (query.includes("FROM User WHERE id")) return [[USER]];
            return [{ affectedRows: 1 }];
        }),
    };
    return conn;
}

function orderInsertCall(conn: ReturnType<typeof mkConn>) {
    return conn.execute.mock.calls.find(([query]) => String(query).startsWith("INSERT INTO `Order`"));
}

describe("Order.acceptedChecks snapshot", () => {
    it("stores only the boxes of the product being bought, without the productId field", async () => {
        const conn = mkConn();

        await executeSingleProductPurchaseTransaction({
            // The raw mysql2 connection shape is wider than this test needs.
            conn: conn as never,
            productId: "p1",
            qty: 1,
            user: USER,
            acceptedChecks: [
                { id: "c1", title: "ใช้แล้วไม่คืนเงิน", productId: "p1" },
                { id: "c9", title: "ของสินค้าอื่น", productId: "p2" },
            ],
        });

        const call = orderInsertCall(conn);
        expect(call).toBeDefined();
        const [query, params] = call as unknown as [string, unknown[]];
        // The snapshot sits in the column list right after `status`.
        const columnIndex = query
            .slice(query.indexOf("(") + 1, query.indexOf(")"))
            .split(",")
            .map((column) => column.trim())
            .indexOf("acceptedChecks");
        expect(columnIndex).toBeGreaterThan(-1);
        // 'COMPLETED' is inlined in the VALUES list, so the placeholder for
        // acceptedChecks sits one position earlier than its column.
        expect(params[columnIndex - 1]).toBe(JSON.stringify([{ id: "c1", title: "ใช้แล้วไม่คืนเงิน" }]));
    });

    it("stores NULL when nothing was ticked", async () => {
        const conn = mkConn();

        await executeSingleProductPurchaseTransaction({
            conn: conn as never,
            productId: "p1",
            qty: 1,
            user: USER,
            acceptedChecks: [],
        });

        const [, params] = orderInsertCall(conn) as unknown as [string, unknown[]];
        expect(params).toContain(null);
        expect(params.some((param) => typeof param === "string" && param.startsWith("[{"))).toBe(false);
    });
});
