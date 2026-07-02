import { afterEach, describe, expect, it, vi } from "vitest";

const redisState = vi.hoisted(() => ({
    available: false,
    client: {
        eval: vi.fn(),
        set: vi.fn(),
    },
}));

vi.mock("@/lib/db", () => ({
    db: {},
    orders: {},
    products: {
        id: "id",
        isSold: "isSold",
        orderId: "orderId",
        secretData: "secretData",
        stockSeparator: "stockSeparator",
    },
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
    gte: vi.fn((left, right) => ({ kind: "gte", left, right })),
    isNull: vi.fn((value) => ({ kind: "isNull", value })),
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings: Array.from(strings), values }),
}));

vi.mock("@/lib/redis", () => ({
    isRedisAvailable: vi.fn(() => redisState.available),
    get redis() {
        return redisState.client;
    },
}));

import {
    acquireGachaExecutionLock,
    deductUserBalanceOrThrow,
    fetchProductRewardForClaimOrThrow,
    GACHA_REDIS_REQUIRED_MESSAGE,
    grantCurrencyReward,
    isProductionGachaRedisMissing,
} from "@/lib/gachaExecution";


function makeTx(affectedRows = 1) {
    const where = vi.fn().mockResolvedValue({ affectedRows });
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));
    const findUserFirst = vi.fn().mockResolvedValue({
        creditBalance: "1000.00",
        pointBalance: 1000,
        ticketBalance: 1000,
    });
    const findProductFirst = vi.fn().mockResolvedValue({
        id: "product-1",
        name: "Product 1",
        imageUrl: null,
        isSold: false,
        orderId: null,
        secretData: "encrypted-stock",
        stockSeparator: "newline",
    });

    return {
        query: {
            products: {
                findFirst: findProductFirst,
            },
            users: {
                findFirst: findUserFirst,
            },
        },
        update,
        __findProductFirst: findProductFirst,
        __findUserFirst: findUserFirst,
        __where: where,
        __set: set,
    };
}

describe("lib/gachaExecution", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        redisState.available = false;
        redisState.client.eval.mockReset();
        redisState.client.set.mockReset();
    });

    describe("acquireGachaExecutionLock", () => {
        it("rejects production gacha execution when Redis is unavailable", async () => {
            vi.stubEnv("NODE_ENV", "production");
            redisState.available = false;

            expect(isProductionGachaRedisMissing()).toBe(true);
            await expect(acquireGachaExecutionLock("user-prod", "machine-1"))
                .rejects.toThrow(GACHA_REDIS_REQUIRED_MESSAGE);
        });

        it("keeps the memory lock fallback outside production", async () => {
            vi.stubEnv("NODE_ENV", "test");
            redisState.available = false;

            const firstLock = await acquireGachaExecutionLock("user-test", "machine-1");
            const secondLock = await acquireGachaExecutionLock("user-test", "machine-1");

            expect(firstLock.acquired).toBe(true);
            expect(secondLock.acquired).toBe(false);

            await firstLock.release();
            const thirdLock = await acquireGachaExecutionLock("user-test", "machine-1");
            expect(thirdLock.acquired).toBe(true);
            await thirdLock.release();
        });

        it("uses Redis locks in production when Redis is available", async () => {
            vi.stubEnv("NODE_ENV", "production");
            redisState.available = true;
            redisState.client.set.mockResolvedValueOnce("OK");
            redisState.client.eval.mockResolvedValueOnce(1);

            const lock = await acquireGachaExecutionLock("user-redis", "machine-1");

            expect(lock.acquired).toBe(true);
            expect(redisState.client.set).toHaveBeenCalledWith(
                "gacha_execution_lock:user-redis:machine-1",
                expect.any(String),
                { nx: true, ex: 15 },
            );

            await lock.release();
            expect(redisState.client.eval).toHaveBeenCalledTimes(1);
        });
    });

    describe("deductUserBalanceOrThrow", () => {
        it("deducts ticket balance when costType is TICKET", async () => {
            const tx = makeTx();

            await deductUserBalanceOrThrow(tx as never, "user-1", "TICKET", 3);

            expect(tx.__findUserFirst).not.toHaveBeenCalled();
            expect(tx.update).toHaveBeenCalledTimes(1);
            expect(tx.__set).toHaveBeenCalledTimes(1);
            expect(tx.__where).toHaveBeenCalledTimes(1);
        });

        it("throws when the conditional ticket deduction updates no rows", async () => {
            const tx = makeTx(0);

            await expect(deductUserBalanceOrThrow(tx as never, "user-1", "TICKET", 5)).rejects.toThrow("ตั๋วสุ่มไม่เพียงพอ");
            expect(tx.update).toHaveBeenCalledTimes(1);
        });

        it("throws when affected rows cannot prove a single balance deduction", async () => {
            const tx = makeTx();
            tx.__where.mockResolvedValueOnce({});

            await expect(deductUserBalanceOrThrow(tx as never, "user-1", "CREDIT", 5)).rejects.toThrow("เครดิตไม่เพียงพอ");
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

    describe("fetchProductRewardForClaimOrThrow", () => {
        it("loads stock-bearing product fields only when a chosen product is being claimed", async () => {
            const tx = makeTx();

            await expect(fetchProductRewardForClaimOrThrow(tx as never, "product-1")).resolves.toEqual({
                id: "product-1",
                name: "Product 1",
                imageUrl: null,
                isSold: false,
                orderId: null,
                secretData: "encrypted-stock",
                stockSeparator: "newline",
            });

            expect(tx.__findProductFirst).toHaveBeenCalledWith({
                where: { kind: "eq", left: "id", right: "product-1" },
                columns: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    isSold: true,
                    orderId: true,
                    secretData: true,
                    stockSeparator: true,
                },
            });
        });

        it("uses the existing sold reward message when the chosen product no longer exists", async () => {
            const tx = makeTx();
            tx.__findProductFirst.mockResolvedValueOnce(null);

            await expect(fetchProductRewardForClaimOrThrow(tx as never, "missing-product"))
                .rejects.toThrow("รางวัลนี้ถูกใช้งานไปแล้ว กรุณาสุ่มใหม่");
        });
    });
});
