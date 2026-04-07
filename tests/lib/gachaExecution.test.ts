import { describe, expect, it, vi } from "vitest";
import { deductUserBalanceOrThrow, grantCurrencyReward } from "@/lib/gachaExecution";

vi.mock("@/lib/db", () => ({
    db: {},
    orders: {},
    products: {},
    users: {
        id: "id",
        creditBalance: "creditBalance",
        pointBalance: "pointBalance",
        ticketBalance: "ticketBalance",
    },
}));

vi.mock("drizzle-orm", () => ({
    and: vi.fn((...args) => ({ kind: "and", args })),
    eq: vi.fn((left, right) => ({ kind: "eq", left, right })),
    isNull: vi.fn((value) => ({ kind: "isNull", value })),
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings: Array.from(strings), values }),
}));

function makeTx(affectedRows = 1) {
    const where = vi.fn().mockResolvedValue({ affectedRows });
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));
    const findFirst = vi.fn().mockResolvedValue({
        creditBalance: "1000.00",
        pointBalance: 1000,
        ticketBalance: 1000,
    });

    return {
        query: {
            users: {
                findFirst,
            },
        },
        update,
        __findFirst: findFirst,
        __where: where,
        __set: set,
    };
}

describe("lib/gachaExecution", () => {
    describe("deductUserBalanceOrThrow", () => {
        it("deducts ticket balance when costType is TICKET", async () => {
            const tx = makeTx();

            await deductUserBalanceOrThrow(tx as never, "user-1", "TICKET", 3);

            expect(tx.__findFirst).toHaveBeenCalledTimes(1);
            expect(tx.update).toHaveBeenCalledTimes(1);
            expect(tx.__set).toHaveBeenCalledTimes(1);
            expect(tx.__where).toHaveBeenCalledTimes(1);
        });

        it("throws when ticket balance is insufficient", async () => {
            const tx = makeTx(0);
            tx.__findFirst.mockResolvedValueOnce({ ticketBalance: 1 });

            await expect(deductUserBalanceOrThrow(tx as never, "user-1", "TICKET", 5)).rejects.toThrow("ตั๋วสุ่มไม่เพียงพอ");
            expect(tx.update).not.toHaveBeenCalled();
        });
    });

    describe("grantCurrencyReward", () => {
        it("grants credit reward when rewardType is CREDIT", async () => {
            const tx = makeTx();

            await grantCurrencyReward(tx as never, "user-1", "CREDIT", 10);

            expect(tx.update).toHaveBeenCalledTimes(1);
            expect(tx.__set).toHaveBeenCalledTimes(1);
            expect(tx.__where).toHaveBeenCalledTimes(1);
        });

        it("grants ticket reward when rewardType is TICKET", async () => {
            const tx = makeTx();

            await grantCurrencyReward(tx as never, "user-1", "TICKET", 2);

            expect(tx.update).toHaveBeenCalledTimes(1);
            expect(tx.__set).toHaveBeenCalledTimes(1);
            expect(tx.__where).toHaveBeenCalledTimes(1);
        });

        it("skips updates when reward amount is empty", async () => {
            const tx = makeTx();

            await grantCurrencyReward(tx as never, "user-1", "TICKET", 0);

            expect(tx.update).not.toHaveBeenCalled();
        });
    });
});
