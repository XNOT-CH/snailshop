import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { db, gachaMachines, gachaSettings, gachaRewards, gachaRollLogs, users, orders, products } from "@/lib/db";
import { eq, and, isNull, gte, lte, count, sql } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/encryption";
import { takeFirstStock } from "@/lib/stock";

export async function POST(req: Request) {
    const auth = await isAuthenticated();
    if (!auth.success || !auth.userId) {
        return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({})) as { machineId?: string };
    const machineId = body.machineId ?? null;

    try {
        let costType = "FREE", costAmount = 0, dailySpinLimit = 0;

        if (machineId) {
            const machine = await db.query.gachaMachines.findFirst({ where: eq(gachaMachines.id, machineId) });
            if (!machine || !machine.isActive || !machine.isEnabled) {
                return NextResponse.json({ success: false, message: "ตู้กาชานี้ปิดอยู่ชั่วคราว" }, { status: 400 });
            }
            costType = machine.costType;
            costAmount = Number(machine.costAmount ?? 0);
            dailySpinLimit = machine.dailySpinLimit ?? 0;
        } else {
            const settings = await db.query.gachaSettings.findFirst().catch(() => null);
            if (settings && !settings.isEnabled) return NextResponse.json({ success: false, message: "ระบบกาชาปิดอยู่ชั่วคราว" }, { status: 400 });
            costType = settings?.costType ?? "FREE";
            costAmount = Number(settings?.costAmount ?? 0);
            dailySpinLimit = settings?.dailySpinLimit ?? 0;
        }

        if (dailySpinLimit > 0) {
            const now = new Date();
            const start = new Date(now); start.setHours(0, 0, 0, 0);
            const end = new Date(now); end.setHours(23, 59, 59, 999);
            const toMySQLDatetime = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
            const whereCondition = and(
                eq(gachaRollLogs.userId, auth.userId),
                machineId ? eq(gachaRollLogs.gachaMachineId, machineId) : isNull(gachaRollLogs.gachaMachineId),
                gte(gachaRollLogs.createdAt, toMySQLDatetime(start)),
                lte(gachaRollLogs.createdAt, toMySQLDatetime(end))
            );
            const [{ count: todayCount }] = await db.select({ count: count() }).from(gachaRollLogs).where(whereCondition);
            if (Number(todayCount) >= dailySpinLimit)
                return NextResponse.json({ success: false, message: `คุณสุ่มครบ ${dailySpinLimit} ครั้ง/วันแล้ว` }, { status: 400 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, auth.userId),
            columns: { id: true, creditBalance: true, pointBalance: true },
        });
        if (!user) return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้งาน" }, { status: 404 });

        if (costType === "CREDIT" && costAmount > 0 && Number(user.creditBalance) < costAmount)
            return NextResponse.json({ success: false, message: "เครดิตไม่เพียงพอ" }, { status: 400 });
        if (costType === "POINT" && costAmount > 0 && (user.pointBalance ?? 0) < costAmount)
            return NextResponse.json({ success: false, message: "พอยต์ไม่เพียงพอ" }, { status: 400 });

        const rewardList = await db.query.gachaRewards.findMany({
            where: and(eq(gachaRewards.isActive, true), machineId ? eq(gachaRewards.gachaMachineId, machineId) : isNull(gachaRewards.gachaMachineId)),
            limit: 9,
            with: { product: { columns: { id: true, name: true, price: true, imageUrl: true, isSold: true, orderId: true, secretData: true, stockSeparator: true } } },
        });

        const eligible = rewardList.filter((r: any) =>
            r.rewardType === "PRODUCT" ? r.product && !r.product.isSold && !r.product.orderId : true
        );
        if (eligible.length === 0) return NextResponse.json({ success: false, message: "ไม่มีรางวัลในขณะนี้" }, { status: 400 });

        const chosen = eligible[Math.floor(Math.random() * eligible.length)];
        const wonIndex = rewardList.findIndex((r: any) => r.id === chosen.id);
        const rewardName = chosen.rewardType === "PRODUCT" ? chosen.product?.name ?? "รางวัล" : chosen.rewardName ?? (chosen.rewardType === "CREDIT" ? "เครดิต" : "พอยต์");
        const imageUrl = chosen.rewardType === "PRODUCT" ? chosen.product?.imageUrl : chosen.rewardImageUrl;
        const rewardAmount = chosen.rewardAmount ? Number(chosen.rewardAmount) : null;

        await db.transaction(async (tx) => {
            if (costType === "CREDIT" && costAmount > 0) await tx.update(users).set({ creditBalance: sql`creditBalance - ${costAmount}` }).where(eq(users.id, user.id));
            if (costType === "POINT" && costAmount > 0) await tx.update(users).set({ pointBalance: sql`pointBalance - ${costAmount}` }).where(eq(users.id, user.id));
            if (chosen.rewardType === "CREDIT" && rewardAmount && rewardAmount > 0) await tx.update(users).set({ creditBalance: sql`creditBalance + ${rewardAmount}` }).where(eq(users.id, user.id));
            if (chosen.rewardType === "POINT" && rewardAmount && rewardAmount > 0) await tx.update(users).set({ pointBalance: sql`pointBalance + ${rewardAmount}` }).where(eq(users.id, user.id));
            if (chosen.rewardType === "PRODUCT" && chosen.product) {
                const product = chosen.product;
                if (product.isSold || product.orderId) throw new Error("รางวัลนี้ถูกใช้ไปแล้ว กรุณาสุ่มใหม่");
                const [taken, remainingData] = takeFirstStock(decrypt(product.secretData || ""), product.stockSeparator || "newline");
                if (!taken) throw new Error("สต็อกของรางวัลหมดแล้ว");
                const isLastStock = !remainingData || remainingData.trim().length === 0;
                const orderId = crypto.randomUUID();
                await tx.insert(orders).values({ id: orderId, userId: user.id, totalPrice: String(costAmount), status: "COMPLETED", givenData: encrypt(taken) });
                await tx.update(products).set({ secretData: isLastStock ? encrypt(taken) : encrypt(remainingData), isSold: isLastStock, orderId }).where(eq(products.id, product.id));
            }
            await tx.insert(gachaRollLogs).values({
                id: crypto.randomUUID(), userId: user.id,
                productId: chosen.rewardType === "PRODUCT" ? chosen.product?.id ?? null : null,
                rewardName, rewardImageUrl: imageUrl ?? null, tier: chosen.tier ?? "common",
                selectorLabel: "grid", costType, costAmount: String(costAmount),
                ...(machineId ? { gachaMachineId: machineId } : {}),
            });
        });

        return NextResponse.json({
            success: true,
            data: { wonIndex, rewardId: chosen.id, rewardName, rewardType: chosen.rewardType, rewardAmount, imageUrl: imageUrl ?? null, tier: chosen.tier ?? "common" },
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
        return NextResponse.json({ success: false, message: msg }, { status: 500 });
    }
}
