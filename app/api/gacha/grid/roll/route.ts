import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { isAuthenticatedWithCsrf } from "@/lib/auth";
import { db, gachaRollLogs } from "@/lib/db";
import {
    acquireGachaExecutionLock,
    claimProductRewardOrThrow,
    cryptoRandomFloat,
    deductUserBalanceOrThrow,
    fetchProductRewardForClaimOrThrow,
    GACHA_REDIS_REQUIRED_MESSAGE,
    grantCurrencyReward,
    isProductionGachaRedisMissing,
} from "@/lib/gachaExecution";
import { getPointCurrencyName } from "@/lib/currencySettings";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { checkDailySpinLimit } from "@/lib/features/gacha/limits";
import { getGachaRollRewardDetails } from "@/lib/features/gacha/rewards";
import { getGridGachaSettings } from "@/lib/features/gacha/settings";
import { fetchGachaUserOrError } from "@/lib/features/gacha/users";
import { isRewardEligibleForRoll } from "@/lib/gachaRewardEligibility";
import { fetchActiveGridRewards } from "@/lib/gachaRewardQueries";
import { hasExactProbabilityTotal, pickWeightedCandidate } from "@/lib/gachaProbability";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { checkGachaRateLimit, getClientIp } from "@/lib/rateLimit";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface ProductRewardRecord {
    id: string;
    name: string;
    imageUrl: string | null;
    isSold: boolean;
    orderId: string | null;
    secretData: string;
    stockSeparator: string | null;
}

interface RewardChoice {
    id: string;
    rewardType: string;
    rewardName?: string | null;
    rewardAmount?: string | number | null;
    rewardImageUrl?: string | null;
    tier?: string | null;
    product?: {
        id: string;
        name?: string;
        imageUrl?: string | null;
        isSold?: boolean;
        orderId?: string | null;
    } | null;
}

interface RollTxContext {
    tx: DbTransaction;
    user: { id: string };
    chosen: RewardChoice;
    costType: string;
    costAmount: number;
    dailySpinLimit: number;
    rewardName: string;
    imageUrl: string | null;
    machineId: string | null;
}

async function processProductReward(tx: DbTransaction, userId: string, costAmount: number, product: ProductRewardRecord) {
    await claimProductRewardOrThrow(tx, {
        costAmount,
        isSold: product.isSold,
        orderId: product.orderId,
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl,
        secretData: product.secretData,
        stockSeparator: product.stockSeparator,
        userId,
    });
}

async function executeRollTransaction(ctx: RollTxContext) {
    const { tx, user, chosen, costType, costAmount, dailySpinLimit, rewardName, imageUrl, machineId } = ctx;

    if (dailySpinLimit > 0) {
        await checkDailySpinLimit({ dbClient: tx, userId: user.id, machineId, dailySpinLimit });
    }

    // Snapshot the reward's baht value at roll time (product sale price or
    // currency face value) — product rows can be deleted or repriced later.
    let rewardValue = chosen.rewardAmount ? Number(chosen.rewardAmount) : 0;

    if (chosen.rewardType === "PRODUCT" && chosen.product) {
        const product = await fetchProductRewardForClaimOrThrow(tx, chosen.product.id);
        rewardValue = Number(product.discountPrice ?? product.price ?? 0);
        await processProductReward(tx, user.id, costAmount, {
            id: product.id,
            name: product.name,
            imageUrl: product.imageUrl,
            isSold: product.isSold,
            orderId: product.orderId,
            secretData: product.secretData,
            stockSeparator: product.stockSeparator,
        });
    }

    await deductUserBalanceOrThrow(tx, user.id, costType, costAmount);

    const rewardAmount = chosen.rewardAmount ? Number(chosen.rewardAmount) : null;
    await grantCurrencyReward(tx, user.id, chosen.rewardType, rewardAmount);

    await tx.insert(gachaRollLogs).values({
        id: crypto.randomUUID(),
        userId: user.id,
        productId: chosen.rewardType === "PRODUCT" ? chosen.product?.id ?? null : null,
        rewardName,
        rewardImageUrl: imageUrl ?? null,
        tier: chosen.tier ?? "common",
        selectorLabel: "grid",
        costType,
        costAmount: String(costAmount),
        rewardValue: String(rewardValue),
        ...(machineId ? { gachaMachineId: machineId } : {}),
    });
}

async function handleGridRoll(
    userId: string,
    machineId: string | null,
    costType: string,
    costAmount: number,
    dailySpinLimit: number,
) {
    const userRes = await fetchGachaUserOrError(userId);
    if ("error" in userRes) {
        return userRes;
    }
    const user = userRes.user;

    const rewardList = await fetchActiveGridRewards(machineId);
    const eligible = rewardList.filter(isRewardEligibleForRoll);

    if (eligible.length === 0) {
        return { error: "ไม่มีรางวัลในขณะนี้", status: 400 };
    }

    if (!hasExactProbabilityTotal(eligible)) {
        return { error: "ตู้กาชานี้ยังตั้งค่าอัตราสุ่มไม่ครบ 100% จึงยังไม่สามารถสุ่มได้", status: 400 };
    }

    const chosen = pickWeightedCandidate(eligible, cryptoRandomFloat());
    if (!chosen) {
        return { error: "ไม่พบรางวัลที่สามารถสุ่มได้", status: 400 };
    }
    const wonIndex = eligible.findIndex((reward) => reward.id === chosen.id);
    const currencySettings = await getCurrencySettings().catch(() => null);
    const { rewardName, imageUrl, rewardAmount } = getGachaRollRewardDetails(chosen, currencySettings);

    await db.transaction(async (tx) => {
        await executeRollTransaction({
            tx,
            user,
            chosen,
            costType,
            costAmount,
            dailySpinLimit,
            rewardName,
            imageUrl,
            machineId,
        });
    });

    return {
        data: {
            wonIndex,
            rewardId: chosen.id,
            rewardName,
            rewardType: chosen.rewardType,
            rewardAmount,
            imageUrl: imageUrl ?? null,
            tier: chosen.tier ?? "common",
        },
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
    const rateLimit = await checkGachaRateLimit(`${ip}:grid`);
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

    const auth = await isAuthenticatedWithCsrf(req);
    if (!auth.success || !auth.userId) {
        return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({})) as { machineId?: string };
    const machineId = body.machineId ?? null;
    if (isProductionGachaRedisMissing()) {
        return NextResponse.json(
            { success: false, message: GACHA_REDIS_REQUIRED_MESSAGE },
            { status: 503 },
        );
    }

    const executionLock = await acquireGachaExecutionLock(auth.userId, machineId);

    if (!executionLock.acquired) {
        return NextResponse.json(
            { success: false, message: "กำลังประมวลผลการสุ่มก่อนหน้าอยู่ กรุณารอสักครู่แล้วลองใหม่" },
            { status: 409 },
        );
    }

    try {
        const { costType, costAmount, dailySpinLimit } = await getGridGachaSettings(machineId);

        const result = await handleGridRoll(auth.userId, machineId, costType, costAmount, dailySpinLimit);
        if ("error" in result) {
            return NextResponse.json({ success: false, message: result.error }, { status: result.status || 400 });
        }

        return NextResponse.json({ success: true, data: result.data });
    } catch (e) {
        const error = e as Error;
        const currencySettings = await getCurrencySettings().catch(() => null);
        const pointCurrencyName = getPointCurrencyName(currencySettings);
        if (error.message?.includes("ตั๋วสุ่มไม่เพียงพอ")) {
            return NextResponse.json({ success: false, message: error.message }, { status: 400 });
        }

        if (error.message && [
            "ตู้กาชานี้ปิดอยู่ชั่วคราว",
            "ระบบกาชาปิดอยู่ชั่วคราว",
            "คุณสุ่มครบ",
            "เครดิตไม่เพียงพอ",
            `${pointCurrencyName}ไม่เพียงพอ`,
            `ไม่สามารถหัก${pointCurrencyName}ได้`,
            "รางวัลนี้ถูกใช้งานไปแล้ว กรุณาสุ่มใหม่",
            "สต็อกของรางวัลหมดแล้ว",
        ].some((message) => error.message.includes(message))) {
            return NextResponse.json({ success: false, message: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: false, message: error.message || "เกิดข้อผิดพลาด" }, { status: 500 });
    } finally {
        await executionLock.release();
    }
}
