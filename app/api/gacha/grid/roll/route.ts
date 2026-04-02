import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { db, gachaMachines, gachaRewards, gachaRollLogs, users, orders, products } from "@/lib/db";
import { eq, and, isNull, gte, lte, count, sql } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/encryption";
import { takeFirstStock } from "@/lib/stock";
import crypto from "node:crypto";

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

async function fetchUserOrError(userId: string, costType: string, costAmount: number) {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true, creditBalance: true, pointBalance: true },
    });
    if (!user) return { error: "ไม่พบผู้ใช้งาน", status: 404 };
    if (costType === "CREDIT" && costAmount > 0 && Number(user.creditBalance) < costAmount)
        return { error: "เครดิตไม่เพียงพอ", status: 400 };
    if (costType === "POINT" && costAmount > 0 && (user.pointBalance ?? 0) < costAmount)
        return { error: "พอยต์ไม่เพียงพอ", status: 400 };
    return { user };
}

function getRewardDetails(chosen: { rewardType: string; product?: { name?: string; imageUrl?: string | null } | null; rewardName?: string | null; rewardAmount?: string | number | null; rewardImageUrl?: string | null; }) {
    let rewardName: string;
    if (chosen.rewardType === "PRODUCT") {
        rewardName = chosen.product?.name ?? "รางวัล";
    } else if (chosen.rewardName) {
        rewardName = chosen.rewardName;
    } else if (chosen.rewardType === "CREDIT") {
        rewardName = "เครดิต";
    } else {
        rewardName = "พอยต์";
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
    if (product.isSold || product.orderId) throw new Error("รางวัลนี้ถูกใช้ไปแล้ว กรุณาสุ่มใหม่");
    const [taken, remainingData] = takeFirstStock(decrypt(product.secretData || ""), product.stockSeparator || "newline");
    if (!taken) throw new Error("สต็อกของรางวัลหมดแล้ว");
    const isLastStock = !remainingData || remainingData.trim().length === 0;
    const orderId = crypto.randomUUID();
    await tx.insert(orders).values({ id: orderId, userId, totalPrice: String(costAmount), status: "COMPLETED", givenData: encrypt(taken) });
    await tx.update(products).set({ secretData: isLastStock ? encrypt(taken) : encrypt(remainingData), isSold: isLastStock, orderId }).where(eq(products.id, product.id));
}

async function executeRollTransaction(ctx: RollTxContext) {
    const { tx, user, chosen, costType, costAmount, rewardName, imageUrl, machineId } = ctx;

    if (costType === "CREDIT" && costAmount > 0) await tx.update(users).set({ creditBalance: sql`creditBalance - ${costAmount}` }).where(eq(users.id, user.id));
    if (costType === "POINT" && costAmount > 0) await tx.update(users).set({ pointBalance: sql`pointBalance - ${costAmount}` }).where(eq(users.id, user.id));
    
    const rewardAmount = chosen.rewardAmount ? Number(chosen.rewardAmount) : null;
    if (chosen.rewardType === "CREDIT" && rewardAmount && rewardAmount > 0) await tx.update(users).set({ creditBalance: sql`creditBalance + ${rewardAmount}` }).where(eq(users.id, user.id));
    if (chosen.rewardType === "POINT" && rewardAmount && rewardAmount > 0) await tx.update(users).set({ pointBalance: sql`pointBalance + ${rewardAmount}` }).where(eq(users.id, user.id));
    
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
        id: crypto.randomUUID(), userId: user.id,
        productId: chosen.rewardType === "PRODUCT" ? chosen.product?.id ?? null : null,
        rewardName, rewardImageUrl: imageUrl ?? null, tier: chosen.tier ?? "common",
        selectorLabel: "grid", costType, costAmount: String(costAmount),
        ...(machineId ? { gachaMachineId: machineId } : {}),
    });
}

async function handleGridRoll(userId: string, machineId: string | null, costType: string, costAmount: number) {
    const userRes = await fetchUserOrError(userId, costType, costAmount);
    if ('error' in userRes) return { error: userRes.error, status: userRes.status };
    const user = userRes.user;

    const rewardList = await db.query.gachaRewards.findMany({
        where: and(eq(gachaRewards.isActive, true), machineId ? eq(gachaRewards.gachaMachineId, machineId) : isNull(gachaRewards.gachaMachineId)),
        limit: 9,
        with: { product: { columns: { id: true, name: true, price: true, imageUrl: true, isSold: true, orderId: true, secretData: true, stockSeparator: true } } },
    });

    const eligible = rewardList.filter((r) =>
        r.rewardType === "PRODUCT" ? r.product && !r.product.isSold && !r.product.orderId : true
    );
    if (eligible.length === 0) return { error: "ไม่มีรางวัลในขณะนี้", status: 400 };

    const randomIndex = crypto.randomInt(0, eligible.length);
    const chosen = eligible[randomIndex];
    const wonIndex = rewardList.findIndex((r) => r.id === chosen.id);
    const { rewardName, imageUrl, rewardAmount } = getRewardDetails(chosen);

    await db.transaction(async (tx) => {
        await executeRollTransaction({ tx, user, chosen, costType, costAmount, rewardName, imageUrl, machineId });
    });

    return { data: { wonIndex, rewardId: chosen.id, rewardName, rewardType: chosen.rewardType, rewardAmount, imageUrl: imageUrl ?? null, tier: chosen.tier ?? "common" } };
}

export async function POST(req: Request) {
    const auth = await isAuthenticated();
    if (!auth.success || !auth.userId) {
        return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({})) as { machineId?: string };
    const machineId = body.machineId ?? null;

    try {
        const { costType, costAmount, dailySpinLimit } = await getMachineSettings(machineId);

        if (dailySpinLimit > 0) {
            await checkDailySpinLimit(auth.userId, machineId, dailySpinLimit);
        }

        const result = await handleGridRoll(auth.userId, machineId, costType, costAmount);
        if ('error' in result) {
            return NextResponse.json({ success: false, message: result.error }, { status: result.status || 400 });
        }

        return NextResponse.json({ success: true, data: result.data });
    } catch (e) {
        const error = e as Error;
        if (error.message && ["ตู้กาชานี้ปิดอยู่ชั่วคราว", "ระบบกาชาปิดอยู่ชั่วคราว", "คุณสุ่มครบ"].some((m) => error.message.includes(m))) {
            return NextResponse.json({ success: false, message: error.message }, { status: 400 });
        }
        return NextResponse.json({ success: false, message: error.message || "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}

async function getMachineSettings(machineId: string | null) {
    if (machineId) {
        const machine = await db.query.gachaMachines.findFirst({ where: eq(gachaMachines.id, machineId) });
        if (!machine || !machine.isActive || !machine.isEnabled) throw new Error("ตู้กาชานี้ปิดอยู่ชั่วคราว");
        return { costType: machine.costType, costAmount: Number(machine.costAmount ?? 0), dailySpinLimit: machine.dailySpinLimit ?? 0 };
    }
    const settings = await db.query.gachaSettings.findFirst().catch(() => null);
    if (settings && !settings.isEnabled) throw new Error("ระบบกาชาปิดอยู่ชั่วคราว");
    return {
        costType: settings?.costType ?? "FREE",
        costAmount: Number(settings?.costAmount ?? 0),
        dailySpinLimit: settings?.dailySpinLimit ?? 0,
    };
}

async function checkDailySpinLimit(userId: string, machineId: string | null, dailySpinLimit: number) {
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const toMySQLDatetime = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
    const whereCondition = and(
        eq(gachaRollLogs.userId, userId),
        machineId ? eq(gachaRollLogs.gachaMachineId, machineId) : isNull(gachaRollLogs.gachaMachineId),
        gte(gachaRollLogs.createdAt, toMySQLDatetime(start)),
        lte(gachaRollLogs.createdAt, toMySQLDatetime(end))
    );
    const [{ count: todayCount }] = await db.select({ count: count() }).from(gachaRollLogs).where(whereCondition);
    if (Number(todayCount) >= dailySpinLimit) throw new Error(`คุณสุ่มครบ ${dailySpinLimit} ครั้ง/วันแล้ว`);
}
