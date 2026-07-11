import crypto from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, orders, products, users } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { getPointCurrencyName } from "@/lib/currencySettings";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { isRedisAvailable, redis } from "@/lib/redis";
import { getStockCount, takeFirstStock } from "@/lib/stock";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const EXECUTION_LOCK_TTL_SECONDS = 15;
const EXECUTION_LOCK_PREFIX = "gacha_execution_lock";
const executionMemoryLocks = new Map<string, { token: string; expiresAt: number }>();
export const GACHA_REDIS_REQUIRED_MESSAGE = "ระบบกาชายังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้งภายหลัง";

export function isProductionGachaRedisMissing() {
    return process.env.NODE_ENV === "production" && (!isRedisAvailable() || !redis);
}

// ค่าสุ่ม uniform [0,1) จาก CSPRNG สำหรับใช้จับรางวัลกาชา แทน Math.random()
// ซึ่งคาดเดาลำดับถัดไปได้ (V8 xorshift128+) — สำคัญเพราะเป็นเส้นทางที่มีมูลค่าเงินจริง
export function cryptoRandomFloat() {
    // crypto.randomInt กำหนดช่วงต้อง < 2^48 จึงใช้ 2^47 (47-bit) เพื่ออยู่ในขอบเขตอย่างปลอดภัย
    return crypto.randomInt(0, 2 ** 47) / 2 ** 47;
}

function purgeExpiredExecutionLocks(now = Date.now()) {
    for (const [key, value] of executionMemoryLocks.entries()) {
        if (value.expiresAt <= now) {
            executionMemoryLocks.delete(key);
        }
    }
}

function getExecutionLockKey(userId: string, machineId: string | null) {
    return `${EXECUTION_LOCK_PREFIX}:${userId}:${machineId ?? "default"}`;
}

export async function acquireGachaExecutionLock(userId: string, machineId: string | null) {
    if (isProductionGachaRedisMissing()) {
        throw new Error(GACHA_REDIS_REQUIRED_MESSAGE);
    }

    const key = getExecutionLockKey(userId, machineId);
    const token = crypto.randomUUID();

    if (isRedisAvailable() && redis) {
        const redisClient = redis;
        const locked = await redisClient.set(key, token, { nx: true, ex: EXECUTION_LOCK_TTL_SECONDS });
        if (!locked) {
            return { acquired: false, release: async () => {} };
        }

        return {
            acquired: true,
            release: async () => {
                await redisClient.eval(
                    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
                    [key],
                    [token],
                );
            },
        };
    }

    purgeExpiredExecutionLocks();
    const existing = executionMemoryLocks.get(key);
    if (existing && existing.expiresAt > Date.now()) {
        return { acquired: false, release: async () => {} };
    }

    executionMemoryLocks.set(key, {
        expiresAt: Date.now() + EXECUTION_LOCK_TTL_SECONDS * 1000,
        token,
    });

    return {
        acquired: true,
        release: async () => {
            const current = executionMemoryLocks.get(key);
            if (current?.token === token) {
                executionMemoryLocks.delete(key);
            }
        },
    };
}

export function getAffectedRows(result: unknown) {
    if (Array.isArray(result)) {
        return getAffectedRows(result[0]);
    }

    if (!result || typeof result !== "object") {
        return null;
    }

    const maybeResult = result as { affectedRows?: unknown; rowsAffected?: unknown };
    if (typeof maybeResult.affectedRows === "number") {
        return maybeResult.affectedRows;
    }

    if (typeof maybeResult.rowsAffected === "number") {
        return maybeResult.rowsAffected;
    }

    return null;
}

export async function deductUserBalanceOrThrow(
    tx: DbTransaction,
    userId: string,
    costType: string,
    costAmount: number,
) {
    const currencySettings = costType === "POINT"
        ? await getCurrencySettings().catch(() => null)
        : null;

    if (costAmount <= 0 || costType === "FREE") {
        return;
    }

    if (costType === "CREDIT") {
        const result = await tx
            .update(users)
            .set({ creditBalance: sql`creditBalance - ${costAmount}` })
            .where(and(
                eq(users.id, userId),
                gte(users.creditBalance, String(costAmount)),
            ));

        const affectedRows = getAffectedRows(result);
        if (affectedRows !== 1) {
            throw new Error("เครดิตไม่เพียงพอ");
        }

        return;
    }

    if (costType === "POINT") {
        const result = await tx
            .update(users)
            .set({ pointBalance: sql`pointBalance - ${costAmount}` })
            .where(and(
                eq(users.id, userId),
                gte(users.pointBalance, costAmount),
            ));

        const affectedRows = getAffectedRows(result);
        if (affectedRows !== 1) {
            throw new Error(`${getPointCurrencyName(currencySettings)}ไม่เพียงพอ`);
        }

        return;
    }

    if (costType === "TICKET") {
        const result = await tx
            .update(users)
            .set({ ticketBalance: sql`ticketBalance - ${costAmount}` })
            .where(and(
                eq(users.id, userId),
                gte(users.ticketBalance, costAmount),
            ));

        const affectedRows = getAffectedRows(result);
        if (affectedRows !== 1) {
            throw new Error("ตั๋วสุ่มไม่เพียงพอ");
        }
    }
}

export async function grantCurrencyReward(
    tx: DbTransaction,
    userId: string,
    rewardType: string,
    rewardAmount: number | null,
) {
    if (!rewardAmount || rewardAmount <= 0) {
        return;
    }

    if (rewardType === "CREDIT") {
        await tx.update(users).set({ creditBalance: sql`creditBalance + ${rewardAmount}` }).where(eq(users.id, userId));
    }

    if (rewardType === "POINT") {
        await tx.update(users).set({ pointBalance: sql`pointBalance + ${rewardAmount}` }).where(eq(users.id, userId));
    }

    if (rewardType === "TICKET") {
        await tx.update(users).set({ ticketBalance: sql`ticketBalance + ${rewardAmount}` }).where(eq(users.id, userId));
    }
}

type ClaimProductRewardInput = {
    productId: string;
    productName: string;
    productImage: string | null;
    userId: string;
    costAmount: number;
    isSold: boolean;
    orderId: string | null;
    secretData: string;
    stockSeparator: string | null;
};

export async function fetchProductRewardForClaimOrThrow(tx: DbTransaction, productId: string) {
    const product = await tx.query.products.findFirst({
        where: eq(products.id, productId),
        columns: {
            id: true,
            name: true,
            imageUrl: true,
            isSold: true,
            orderId: true,
            secretData: true,
            stockSeparator: true,
            price: true,
            discountPrice: true,
        },
    });

    if (!product) {
        throw new Error("รางวัลนี้ถูกใช้งานไปแล้ว กรุณาสุ่มใหม่");
    }

    return product;
}

export async function claimProductRewardOrThrow(tx: DbTransaction, input: ClaimProductRewardInput) {
    if (input.isSold) {
        throw new Error("รางวัลนี้ถูกใช้งานไปแล้ว กรุณาสุ่มใหม่");
    }

    const [taken, remainingData] = takeFirstStock(decrypt(input.secretData || ""), input.stockSeparator || "newline");
    if (!taken) {
        throw new Error("สต็อกของรางวัลหมดแล้ว");
    }

    const isLastStock = !remainingData || remainingData.trim().length === 0;
    const remainingCount = getStockCount(remainingData, input.stockSeparator || "newline");
    // Only the remaining (undelivered) stock stays on the product — same as the
    // purchase path. The delivered item lives solely in the order's givenData;
    // keeping it here would let an admin duplicate/restore resell a used code.
    const nextSecretData = encrypt(remainingData);
    const nextOrderId = crypto.randomUUID();

    const updateResult = await tx
        .update(products)
        .set({
            isSold: isLastStock,
            orderId: isLastStock ? nextOrderId : null,
            secretData: nextSecretData,
            stockCount: remainingCount,
        })
        .where(and(
            eq(products.id, input.productId),
            eq(products.isSold, false),
            eq(products.secretData, input.secretData),
        ));

    if (getAffectedRows(updateResult) !== 1) {
        throw new Error("รางวัลนี้ถูกใช้งานไปแล้ว กรุณาสุ่มใหม่");
    }

    await tx.insert(orders).values({
        givenData: encrypt(taken),
        id: nextOrderId,
        productId: input.productId,
        productName: input.productName,
        productImage: input.productImage,
        status: "COMPLETED",
        totalPrice: String(input.costAmount),
        userId: input.userId,
    });

    return { orderId: nextOrderId };
}
