import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { db, gachaRewards, gachaRollLogs } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import {
    acquireGachaExecutionLock,
    claimProductRewardOrThrow,
    deductUserBalanceOrThrow,
    fetchProductRewardForClaimOrThrow,
    GACHA_REDIS_REQUIRED_MESSAGE,
    grantCurrencyReward,
    isProductionGachaRedisMissing,
} from "@/lib/gachaExecution";
import {
    buildGrid,
    getIntersectionTile,
    getValidLSelectors,
    getValidRSelectorsFor,
    type GachaProductLite,
    type GachaTier,
} from "@/lib/gachaGrid";
import { hasExactProbabilityTotal, pickWeightedCandidate } from "@/lib/gachaProbability";
import { getPointCurrencyName } from "@/lib/currencySettings";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { checkDailySpinLimit } from "@/lib/features/gacha/limits";
import { buildGachaChosenRewardId, mapEligibleGachaRewardsToProductLite } from "@/lib/features/gacha/rewards";
import { getSpinGachaSettings } from "@/lib/features/gacha/settings";
import { fetchGachaUserOrError } from "@/lib/features/gacha/users";
import { isRewardEligibleForRoll } from "@/lib/gachaRewardEligibility";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { checkGachaRateLimit, getClientIp } from "@/lib/rateLimit";
import { isRedisAvailable, redis } from "@/lib/redis";
import { GACHA_PENDING_COOKIE_NAME } from "@/lib/constants/gacha";

const COOKIE_TTL = 300;
const PENDING_SPIN_PREFIX = "gacha_pending_spin";
const PENDING_SPIN_LOCK_PREFIX = "gacha_pending_spin_lock";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type PendingSpinPayload = {
    userId: string;
    lLabel: string;
    rLabel: string;
    selectorLabel: string;
    chosenRewardId: string;
    machineId: string | null;
    orderId: string | null;
    product: GachaProductLite;
    message?: string;
    iat: number;
    nonce: string;
};

const pendingSpinMemoryStore = new Map<string, PendingSpinPayload>();
const pendingSpinMemoryLocks = new Map<string, number>();

function purgeExpiredPendingSpinState(now = Date.now()) {
    for (const [nonce, payload] of pendingSpinMemoryStore.entries()) {
        if (now - payload.iat > COOKIE_TTL * 1000) {
            pendingSpinMemoryStore.delete(nonce);
        }
    }

    for (const [nonce, expiresAt] of pendingSpinMemoryLocks.entries()) {
        if (expiresAt <= now) {
            pendingSpinMemoryLocks.delete(nonce);
        }
    }
}

function shouldFallbackProductReward(error: unknown) {
    if (!(error instanceof Error)) {
        return false;
    }

    return error.message.includes("สต็อกของรางวัลหมดแล้ว")
        || error.message.includes("รางวัลนี้ถูกใช้งานไปแล้ว กรุณาสุ่มใหม่");
}

function buildPendingSpinKey(nonce: string) {
    return `${PENDING_SPIN_PREFIX}:${nonce}`;
}

async function fetchRewards(machineId: string | null) {
    return db.query.gachaRewards.findMany({
        where: and(
            eq(gachaRewards.isActive, true),
            machineId ? eq(gachaRewards.gachaMachineId, machineId) : isNull(gachaRewards.gachaMachineId),
            or(
                and(eq(gachaRewards.rewardType, "PRODUCT"), isNotNull(gachaRewards.productId)),
                and(
                    inArray(gachaRewards.rewardType, ["CREDIT", "POINT", "TICKET"]),
                    isNotNull(gachaRewards.rewardName),
                    isNotNull(gachaRewards.rewardAmount),
                ),
            ),
        ),
        with: {
            product: {
                columns: {
                    id: true,
                    imageUrl: true,
                    isSold: true,
                    name: true,
                    orderId: true,
                    price: true,
                },
            },
        },
    });
}

async function fetchTieredProducts(machineId: string | null) {
    const allRewards = await fetchRewards(machineId);
    const currencySettings = await getCurrencySettings().catch(() => null);

    const tieredProducts: GachaProductLite[] = mapEligibleGachaRewardsToProductLite(allRewards, currencySettings);

    return { allRewards, tieredProducts };
}

async function handleSpin1(userId: string, machineId: string | null, costType: string, costAmount: number, dailySpinLimit: number) {
    const userRes = await fetchGachaUserOrError(userId);
    if ("error" in userRes) {
        return userRes;
    }

    const { allRewards, tieredProducts } = await fetchTieredProducts(machineId);
    if (tieredProducts.length === 0) {
        return { error: "ไม่มีรางวัลสำหรับกาชาในขณะนี้", status: 400 };
    }

    const tiles = buildGrid(tieredProducts);
    const allValidLSelectors = getValidLSelectors(tiles);
    if (allValidLSelectors.length === 0) {
        return { error: "ไม่มีแถวซ้ายที่สามารถสุ่มได้", status: 400 };
    }

    const eligibleRewards = allRewards.filter((reward) => isRewardEligibleForRoll(reward));
    if (!hasExactProbabilityTotal(eligibleRewards)) {
        return { error: "ตู้กาชานี้ยังตั้งค่าอัตราสุ่มไม่ครบ 100% จึงยังไม่สามารถสุ่มได้", status: 400 };
    }

    const chosenReward = pickWeightedCandidate(eligibleRewards);
    if (!chosenReward) {
        return { error: "ไม่พบรางวัลที่สามารถสุ่มได้", status: 400 };
    }

    const chosenRewardId = buildGachaChosenRewardId(chosenReward);
    const validLSelectors = allValidLSelectors.filter((candidateLLabel) =>
        ["R1", "R2", "R3", "R4"].some((candidateRLabel) => {
            const tile = getIntersectionTile(tiles, candidateLLabel, candidateRLabel);
            return tile?.product?.id === chosenRewardId;
        }),
    );
    if (validLSelectors.length === 0) {
        return { error: "ไม่พบเส้นทางสำหรับรางวัลที่สุ่มได้", status: 400 };
    }

    const lLabel = validLSelectors[crypto.randomInt(0, validLSelectors.length)];
    const validRSelectors = getValidRSelectorsFor(tiles, lLabel).filter((candidateRLabel) => {
        const tile = getIntersectionTile(tiles, lLabel, candidateRLabel);
        return tile?.product?.id === chosenRewardId;
    });

    if (validRSelectors.length === 0) {
        return { error: "ไม่พบเส้นทางสำหรับรางวัลที่สุ่มได้", status: 400 };
    }

    const rLabel = validRSelectors[crypto.randomInt(0, validRSelectors.length)];
    const selectorLabel = `${lLabel}+${rLabel}`;
    const rewardMeta = tieredProducts.find((product) => product.id === chosenRewardId);
    const tier: GachaTier = rewardMeta?.tier ?? "common";
    const chosenProductReward = allRewards.find((reward) =>
        reward.rewardType === "PRODUCT" && (reward.productId === chosenRewardId || reward.product?.id === chosenRewardId),
    );

    const finalizedResult = await db.transaction(async (tx) => {
        if (dailySpinLimit > 0) {
            await checkDailySpinLimit({ dbClient: tx, userId, machineId, dailySpinLimit });
        }

        if (chosenRewardId.startsWith("reward:")) {
            const rewardRowId = chosenRewardId.replace("reward:", "");
            const chosenRewardRow = allRewards.find((reward) => reward.id === rewardRowId);
            const rewardType = chosenRewardRow?.rewardType as "CREDIT" | "POINT" | "TICKET";
            const rewardAmount = Number(chosenRewardRow?.rewardAmount ?? 0);

            await finalizeCurrencyRewardRoll(
                tx,
                userId,
                selectorLabel,
                machineId,
                costType,
                costAmount,
                rewardType,
                rewardAmount,
                rewardMeta,
                tier,
            );

            return {
                message: undefined as string | undefined,
                orderId: null,
                product: {
                    id: chosenRewardId,
                    imageUrl: rewardMeta?.imageUrl ?? null,
                    name: rewardMeta?.name ?? "รางวัล",
                    price: rewardMeta?.price ?? 0,
                    rewardAmount,
                    rewardType,
                    tier,
                },
                rLabel,
                selectorLabel,
            };
        }

        const product = await fetchProductRewardForClaimOrThrow(tx, chosenRewardId);

        try {
            const claimedReward = await claimProductRewardOrThrow(tx, {
                costAmount,
                isSold: product.isSold,
                orderId: product.orderId,
                productId: product.id,
                secretData: product.secretData,
                stockSeparator: product.stockSeparator,
                userId,
            });

            await deductUserBalanceOrThrow(tx, userId, costType, costAmount);

            await tx.insert(gachaRollLogs).values({
                costAmount: String(costAmount),
                costType,
                gachaMachineId: machineId,
                id: crypto.randomUUID(),
                productId: product.id,
                rewardImageUrl: rewardMeta?.imageUrl ?? null,
                rewardName: rewardMeta?.name ?? "รางวัล",
                selectorLabel,
                tier,
                userId,
            });

            return {
                message: undefined as string | undefined,
                orderId: claimedReward.orderId,
                product: {
                    id: product.id,
                    imageUrl: rewardMeta?.imageUrl ?? null,
                    name: rewardMeta?.name ?? "รางวัล",
                    price: rewardMeta?.price ?? 0,
                    tier,
                },
                rLabel,
                selectorLabel,
            };
        } catch (error) {
            if (!shouldFallbackProductReward(error)) {
                throw error;
            }

            const fallbackAmount = Math.max(0, Number(chosenProductReward?.rewardAmount ?? rewardMeta?.price ?? 0));

            await finalizeCurrencyRewardRoll(
                tx,
                userId,
                selectorLabel,
                machineId,
                costType,
                costAmount,
                "CREDIT",
                fallbackAmount,
                {
                    id: `fallback-credit:${product.id}`,
                    imageUrl: rewardMeta?.imageUrl ?? null,
                    name: `เครดิตชดเชยแทน ${rewardMeta?.name ?? "รางวัล"}`,
                    price: fallbackAmount,
                    rewardAmount: fallbackAmount,
                    rewardType: "CREDIT",
                    tier,
                },
                tier,
            );

            return {
                message: "สินค้ารางวัลหมดชั่วคราว ระบบโอนเครดิตมูลค่าเท่ากันให้แทนอัตโนมัติแล้ว",
                orderId: null,
                product: {
                    id: `fallback-credit:${product.id}`,
                    imageUrl: rewardMeta?.imageUrl ?? null,
                    name: `เครดิตชดเชยแทน ${rewardMeta?.name ?? "รางวัล"}`,
                    price: fallbackAmount,
                    rewardAmount: fallbackAmount,
                    rewardType: "CREDIT",
                    tier,
                },
                rLabel,
                selectorLabel,
            };
        }
    });

    const pendingPayload: PendingSpinPayload = {
        userId,
        lLabel,
        rLabel: finalizedResult.rLabel,
        selectorLabel: finalizedResult.selectorLabel,
        chosenRewardId,
        machineId,
        orderId: finalizedResult.orderId,
        product: finalizedResult.product,
        message: finalizedResult.message,
        iat: Date.now(),
        nonce: crypto.randomUUID(),
    };

    await persistPendingSpin(pendingPayload);

    return { data: { lLabel } };
}

async function persistPendingSpin(pendingPayload: PendingSpinPayload) {
    const payload = encrypt(JSON.stringify(pendingPayload));
    const cookieStore = await cookies();
    cookieStore.set(GACHA_PENDING_COOKIE_NAME, payload, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: COOKIE_TTL,
        path: "/",
    });

    purgeExpiredPendingSpinState(pendingPayload.iat);
    pendingSpinMemoryStore.set(pendingPayload.nonce, pendingPayload);
    pendingSpinMemoryLocks.delete(pendingPayload.nonce);

    if (isRedisAvailable() && redis) {
        await redis.set(buildPendingSpinKey(pendingPayload.nonce), pendingPayload, { ex: COOKIE_TTL });
    }
}

async function readPendingSpin(userId: string, machineId: string | null) {
    const cookieStore = await cookies();
    const rawCookie = cookieStore.get(GACHA_PENDING_COOKIE_NAME)?.value;
    if (!rawCookie) {
        return { error: "กรุณากดสุ่มครั้งที่ 1 ก่อน", status: 400 };
    }

    let payload: PendingSpinPayload;

    try {
        payload = JSON.parse(decrypt(rawCookie)) as PendingSpinPayload;
        if (payload.userId !== userId) throw new Error("user mismatch");
        if (Date.now() - payload.iat > COOKIE_TTL * 1000) throw new Error("expired");
        if ((payload.machineId ?? null) !== machineId) throw new Error("machine mismatch");
    } catch {
        cookieStore.delete(GACHA_PENDING_COOKIE_NAME);
        return { error: "เซสชันการสุ่มหมดอายุ กรุณาเริ่มใหม่", status: 400 };
    }

    purgeExpiredPendingSpinState();

    if (isRedisAvailable() && redis) {
        const redisPayload = await redis.get<PendingSpinPayload>(buildPendingSpinKey(payload.nonce));
        if (!redisPayload || redisPayload.userId !== userId || (redisPayload.machineId ?? null) !== machineId) {
            return { error: "เซสชันการสุ่มไม่ถูกต้อง กรุณาเริ่มใหม่", status: 400 };
        }

        payload = redisPayload;
    } else {
        const memoryPayload = pendingSpinMemoryStore.get(payload.nonce);
        if (!memoryPayload || memoryPayload.userId !== userId || (memoryPayload.machineId ?? null) !== machineId) {
            return { error: "เซสชันการสุ่มไม่ถูกต้อง กรุณาเริ่มใหม่", status: 400 };
        }

        payload = memoryPayload;
    }

    return payload;
}

async function validatePendingSpin(userId: string, machineId: string | null) {
    const pendingState = await readPendingSpin(userId, machineId);
    if ("error" in pendingState) {
        return pendingState;
    }

    const nonce = pendingState.nonce;

    if (nonce && isRedisAvailable() && redis) {
        const lockKey = `${PENDING_SPIN_LOCK_PREFIX}:${nonce}`;
        const lockSet = await redis.set(lockKey, userId, { nx: true, ex: COOKIE_TTL });
        if (!lockSet) {
            return { error: "กำลังประมวลผลการสุ่มก่อนหน้าอยู่ กรุณารอสักครู่แล้วลองใหม่", status: 409 };
        }
    } else if (nonce) {
        if (pendingSpinMemoryLocks.has(nonce)) {
            return { error: "กำลังประมวลผลการสุ่มก่อนหน้าอยู่ กรุณารอสักครู่แล้วลองใหม่", status: 409 };
        }

        pendingSpinMemoryLocks.set(nonce, Date.now() + COOKIE_TTL * 1000);
    }

    return pendingState;
}

async function resumePendingSpin(userId: string, machineId: string | null) {
    const pendingState = await readPendingSpin(userId, machineId);
    if ("error" in pendingState) {
        return pendingState;
    }

    return {
        data: {
            lLabel: pendingState.lLabel,
            orderId: pendingState.orderId,
            product: pendingState.product,
            rLabel: pendingState.rLabel,
            selectorLabel: pendingState.selectorLabel,
            tier: pendingState.product.tier,
        },
        message: pendingState.message,
    };
}

async function finalizeCurrencyRewardRoll(
    tx: DbTransaction,
    userId: string,
    selectorLabel: string,
    machineId: string | null,
    costType: string,
    costAmount: number,
    rewardType: "CREDIT" | "POINT" | "TICKET",
    rewardAmount: number,
    rewardMeta: GachaProductLite | undefined,
    tier: GachaTier,
) {
    await deductUserBalanceOrThrow(tx, userId, costType, costAmount);
    await grantCurrencyReward(tx, userId, rewardType, rewardAmount);

    await tx.insert(gachaRollLogs).values({
        costAmount: String(costAmount),
        costType,
        gachaMachineId: machineId,
        id: crypto.randomUUID(),
        productId: null,
        rewardImageUrl: rewardMeta?.imageUrl ?? null,
        rewardName: rewardMeta?.name ?? null,
        selectorLabel,
        tier,
        userId,
    });
}

async function handleSpin2(userId: string, machineId: string | null) {
    const pendingRes = await validatePendingSpin(userId, machineId);
    if ("error" in pendingRes) {
        return { error: pendingRes.error, status: pendingRes.status };
    }

    const { lLabel, message, orderId, product, rLabel, selectorLabel } = pendingRes;
    const userRes = await fetchGachaUserOrError(userId);
    if ("error" in userRes) {
        return userRes;
    }

    return {
        data: {
            lLabel,
            orderId,
            product,
            rLabel,
            selectorLabel,
            tier: product.tier,
        },
        message: message ?? undefined,
    };
}

export async function POST(req: Request) {
    const maintenance = getMaintenanceState("gacha");
    if (maintenance.enabled) {
        return NextResponse.json(
            { success: false, message: maintenance.message },
            {
                status: 503,
                headers: { "Retry-After": String(maintenance.retryAfterSeconds) },
            },
        );
    }

    const ip = getClientIp(req);
    const rateLimit = checkGachaRateLimit(ip);
    if (rateLimit.blocked) {
        return NextResponse.json(
            { success: false, message: "กดสุ่มถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง" },
            {
                status: 429,
                headers: {
                    "Retry-After": String(Math.max(1, Math.ceil((rateLimit.retryAfter ?? 1000) / 1000))),
                },
            },
        );
    }

    const authCheck = await isAuthenticatedWithCsrf(req);
    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    let spin = 1;
    let machineId: string | null = null;
    try {
        const body = await req.json();
        spin = Number(body.spin ?? 1);
        machineId = (body.machineId as string | null | undefined) ?? null;
    } catch {
        // Ignore missing body and use defaults.
    }

    if (isProductionGachaRedisMissing()) {
        return NextResponse.json(
            { success: false, message: GACHA_REDIS_REQUIRED_MESSAGE },
            { status: 503 },
        );
    }

    const executionLock = spin === 3
        ? { acquired: true, release: async () => {} }
        : await acquireGachaExecutionLock(authCheck.userId, machineId);

    if (!executionLock.acquired) {
        return NextResponse.json(
            { success: false, message: "กำลังประมวลผลการสุ่มก่อนหน้าอยู่ กรุณารอสักครู่แล้วลองใหม่" },
            { status: 409 },
        );
    }

    try {
        const { costAmount, costType, dailySpinLimit, isEnabled } = await getSpinGachaSettings(machineId);

        if (!isEnabled) {
            return NextResponse.json({ success: false, message: "ระบบกาชาปิดอยู่ชั่วคราว" }, { status: 400 });
        }

        if (spin === 3) {
            const res = await resumePendingSpin(authCheck.userId, machineId);
            if ("error" in res) {
                return NextResponse.json({ success: false, message: res.error }, { status: res.status || 400 });
            }

            return NextResponse.json({ success: true, data: res.data, message: res.message });
        }

        if (spin === 1) {
            const res = await handleSpin1(authCheck.userId, machineId, costType, costAmount, dailySpinLimit);
            if ("error" in res) {
                return NextResponse.json({ success: false, message: res.error }, { status: res.status || 400 });
            }

            return NextResponse.json({ success: true, data: res.data });
        }

        const res = await handleSpin2(authCheck.userId, machineId);
        if ("error" in res) {
            return NextResponse.json({ success: false, message: res.error }, { status: res.status || 400 });
        }

        return NextResponse.json({ success: true, data: res.data, message: res.message });
    } catch (error) {
        const normalizedError = error as Error;
        const currencySettings = await getCurrencySettings().catch(() => null);
        const pointCurrencyName = getPointCurrencyName(currencySettings);
        const passthroughMessages = [
            "คุณสุ่มครบ",
            "ตู้กาชานี้ปิดอยู่ชั่วคราว",
            "ระบบกาชาปิดอยู่ชั่วคราว",
            "ไม่พบตู้กาชา",
            "เครดิตไม่เพียงพอ",
            `${pointCurrencyName}ไม่เพียงพอ`,
            "ตั๋วสุ่มไม่เพียงพอ",
            "รางวัลนี้ถูกใช้งานไปแล้ว กรุณาสุ่มใหม่",
            "สต็อกของรางวัลหมดแล้ว",
            "ไม่สามารถหักเครดิตได้",
            `ไม่สามารถหัก${pointCurrencyName}ได้`,
            "ไม่สามารถหักตั๋วสุ่มได้",
        ];

        if (passthroughMessages.some((message) => normalizedError.message?.includes(message))) {
            return NextResponse.json({ success: false, message: normalizedError.message }, { status: 400 });
        }

        return NextResponse.json(
            { success: false, message: normalizedError.message || "เกิดข้อผิดพลาด" },
            { status: 500 },
        );
    } finally {
        await executionLock.release();
    }
}
