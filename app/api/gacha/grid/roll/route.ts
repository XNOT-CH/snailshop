import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { and, count, eq, gte, isNull, lte } from "drizzle-orm";
import { isAuthenticated } from "@/lib/auth";
import { db, gachaMachines, gachaRollLogs, users } from "@/lib/db";
import {
    acquireGachaExecutionLock,
    claimProductRewardOrThrow,
    deductUserBalanceOrThrow,
    grantCurrencyReward,
} from "@/lib/gachaExecution";
import { getPointCurrencyName } from "@/lib/currencySettings";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { isRewardEligibleForRoll } from "@/lib/gachaRewardEligibility";
import { fetchActiveGridRewards } from "@/lib/gachaRewardQueries";
import { hasExactProbabilityTotal, pickWeightedCandidate } from "@/lib/gachaProbability";
import { getGachaRewardTypeLabel, normalizeGachaCost } from "@/lib/gachaCost";
import { getMaintenanceState } from "@/lib/maintenanceMode";
import { checkGachaRateLimit, getClientIp } from "@/lib/rateLimit";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface ProductRewardRecord {
    id: string;
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
        secretData?: string;
        stockSeparator?: string | null;
    } | null;
}

async function fetchUserOrError(userId: string) {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true },
    });

    if (!user) {
        return { error: "ไม่พบผู้ใช้งาน", status: 404 };
    }

    return { user };
}

function getRewardDetails(chosen: {
    rewardType: string;
    product?: { name?: string; imageUrl?: string | null } | null;
    rewardName?: string | null;
    rewardAmount?: string | number | null;
    rewardImageUrl?: string | null;
}, currencySettings?: Awaited<ReturnType<typeof getCurrencySettings>> | null) {
    let rewardName: string;
    if (chosen.rewardType === "PRODUCT") {
        rewardName = chosen.product?.name ?? "รางวัล";
    } else if (chosen.rewardName) {
        rewardName = chosen.rewardName;
    } else {
        rewardName = getGachaRewardTypeLabel(chosen.rewardType, currencySettings);
    }

    const imageUrl = chosen.rewardType === "PRODUCT" ? chosen.product?.imageUrl : chosen.rewardImageUrl;
    const rewardAmountStr = chosen.rewardAmount ? String(chosen.rewardAmount) : null;
    const rewardAmount = rewardAmountStr ? Number(rewardAmountStr) : null;
    return { rewardName, imageUrl: imageUrl || null, rewardAmount };
}

interface RollTxContext {
    tx: DbTransaction;
    user: { id: string };
    chosen: RewardChoice;
    costType: string;
    costAmount: number;
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
        secretData: product.secretData,
        stockSeparator: product.stockSeparator,
        userId,
    });
}

async function executeRollTransaction(ctx: RollTxContext) {
    const { tx, user, chosen, costType, costAmount, rewardName, imageUrl, machineId } = ctx;

    await deductUserBalanceOrThrow(tx, user.id, costType, costAmount);

    const rewardAmount = chosen.rewardAmount ? Number(chosen.rewardAmount) : null;
    await grantCurrencyReward(tx, user.id, chosen.rewardType, rewardAmount);

    if (chosen.rewardType === "PRODUCT" && chosen.product) {
        await processProductReward(tx, user.id, costAmount, {
            id: chosen.product.id,
            isSold: Boolean(chosen.product.isSold),
            orderId: chosen.product.orderId ?? null,
            secretData: chosen.product.secretData ?? "",
            stockSeparator: chosen.product.stockSeparator ?? "newline",
        });
    }

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
        ...(machineId ? { gachaMachineId: machineId } : {}),
    });
}

async function handleGridRoll(userId: string, machineId: string | null, costType: string, costAmount: number) {
    const userRes = await fetchUserOrError(userId);
    if ("error" in userRes) {
        return { error: userRes.error, status: userRes.status };
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

    const chosen = pickWeightedCandidate(eligible);
    if (!chosen) {
        return { error: "ไม่พบรางวัลที่สามารถสุ่มได้", status: 400 };
    }
    const wonIndex = eligible.findIndex((reward) => reward.id === chosen.id);
    const currencySettings = await getCurrencySettings().catch(() => null);
    const { rewardName, imageUrl, rewardAmount } = getRewardDetails(chosen, currencySettings);

    await db.transaction(async (tx) => {
        await executeRollTransaction({ tx, user, chosen, costType, costAmount, rewardName, imageUrl, machineId });
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
    const rateLimit = checkGachaRateLimit(`${ip}:grid`);
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

    const auth = await isAuthenticated();
    if (!auth.success || !auth.userId) {
        return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({})) as { machineId?: string };
    const machineId = body.machineId ?? null;
    const executionLock = await acquireGachaExecutionLock(auth.userId, machineId);

    if (!executionLock.acquired) {
        return NextResponse.json(
            { success: false, message: "กำลังประมวลผลการสุ่มก่อนหน้าอยู่ กรุณารอสักครู่แล้วลองใหม่" },
            { status: 409 },
        );
    }

    try {
        const { costType, costAmount, dailySpinLimit } = await getMachineSettings(machineId);

        if (dailySpinLimit > 0) {
            await checkDailySpinLimit(auth.userId, machineId, dailySpinLimit);
        }

        const result = await handleGridRoll(auth.userId, machineId, costType, costAmount);
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

async function getMachineSettings(machineId: string | null) {
    if (machineId) {
        const machine = await db.query.gachaMachines.findFirst({ where: eq(gachaMachines.id, machineId) });
        if (!machine || !machine.isActive || !machine.isEnabled) {
            throw new Error("ตู้กาชานี้ปิดอยู่ชั่วคราว");
        }

        return {
            ...normalizeGachaCost(machine.costType, machine.costAmount),
            dailySpinLimit: machine.dailySpinLimit ?? 0,
        };
    }

    const settings = await db.query.gachaSettings.findFirst().catch(() => null);
    if (settings && !settings.isEnabled) {
        throw new Error("ระบบกาชาปิดอยู่ชั่วคราว");
    }

    return {
        ...normalizeGachaCost(settings?.costType ?? "FREE", settings?.costAmount ?? 0),
        dailySpinLimit: settings?.dailySpinLimit ?? 0,
    };
}

async function checkDailySpinLimit(userId: string, machineId: string | null, dailySpinLimit: number) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const toMySQLDatetime = (date: Date) => date.toISOString().slice(0, 19).replace("T", " ");

    const whereCondition = and(
        eq(gachaRollLogs.userId, userId),
        machineId ? eq(gachaRollLogs.gachaMachineId, machineId) : isNull(gachaRollLogs.gachaMachineId),
        gte(gachaRollLogs.createdAt, toMySQLDatetime(start)),
        lte(gachaRollLogs.createdAt, toMySQLDatetime(end)),
    );

    const [{ count: todayCount }] = await db.select({ count: count() }).from(gachaRollLogs).where(whereCondition);
    if (Number(todayCount) >= dailySpinLimit) {
        throw new Error(`คุณสุ่มครบ ${dailySpinLimit} ครั้ง/วันแล้ว`);
    }
}
