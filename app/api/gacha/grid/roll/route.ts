import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { takeFirstStock } from "@/lib/stock";

/** POST /api/gacha/grid/roll — pick a random reward from the pool and record it */
export async function POST(req: Request) {
    const auth = await isAuthenticated();
    if (!auth.success || !auth.userId) {
        return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({})) as { machineId?: string };
    const machineId = body.machineId ?? null;

    try {
        // Fetch machine / global settings
        let costType = "FREE";
        let costAmount = 0;
        let dailySpinLimit = 0;

        if (machineId) {
            const machine = await db.gachaMachine.findUnique({ where: { id: machineId } });
            if (!machine || !machine.isActive || !machine.isEnabled) {
                return NextResponse.json({ success: false, message: "ตู้กาชานี้ปิดอยู่ชั่วคราว" }, { status: 400 });
            }
            costType = machine.costType;
            costAmount = Number(machine.costAmount ?? 0);
            dailySpinLimit = machine.dailySpinLimit ?? 0;
        } else {
            const settings = await db.gachaSettings.findFirst().catch(() => null);
            if (settings && !settings.isEnabled) {
                return NextResponse.json({ success: false, message: "ระบบกาชาปิดอยู่ชั่วคราว" }, { status: 400 });
            }
            costType = settings?.costType ?? "FREE";
            costAmount = Number(settings?.costAmount ?? 0);
            dailySpinLimit = settings?.dailySpinLimit ?? 0;
        }

        // Check daily spin limit
        if (dailySpinLimit > 0) {
            const now = new Date();
            const start = new Date(now); start.setHours(0, 0, 0, 0);
            const end = new Date(now); end.setHours(23, 59, 59, 999);
            const todayCount = await db.gachaRollLog.count({
                where: {
                    userId: auth.userId,
                    ...(machineId ? { gachaMachineId: machineId } : {}),
                    createdAt: { gte: start, lte: end },
                },
            });
            if (todayCount >= dailySpinLimit) {
                return NextResponse.json(
                    { success: false, message: `คุณสุ่มครบ ${dailySpinLimit} ครั้ง/วันแล้ว` },
                    { status: 400 }
                );
            }
        }

        // Check user balance
        const user = await db.user.findUnique({
            where: { id: auth.userId },
            select: { id: true, creditBalance: true, pointBalance: true },
        });
        if (!user) return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้งาน" }, { status: 404 });

        if (costType === "CREDIT" && costAmount > 0 && Number(user.creditBalance) < costAmount) {
            return NextResponse.json({ success: false, message: "เครดิตไม่เพียงพอ" }, { status: 400 });
        }
        if (costType === "POINT" && costAmount > 0 && user.pointBalance < costAmount) {
            return NextResponse.json({ success: false, message: "พอยต์ไม่เพียงพอ" }, { status: 400 });
        }

        // Fetch reward pool (up to 9 for grid display, but use all eligible for fair random)
        const rewards = await db.gachaReward.findMany({
            where: {
                isActive: true,
                ...(machineId ? { gachaMachineId: machineId } : { gachaMachineId: null }),
            },
            take: 9,
            include: {
                product: {
                    select: {
                        id: true, name: true, price: true, imageUrl: true,
                        isSold: true, orderId: true, secretData: true, stockSeparator: true,
                    },
                },
            },
        });

        // Eligible = unsold products or currency rewards
        const eligible = rewards.filter((r) =>
            r.rewardType === "PRODUCT" ? r.product && !r.product.isSold && !r.product.orderId : true
        );

        if (eligible.length === 0) {
            return NextResponse.json({ success: false, message: "ไม่มีรางวัลในขณะนี้" }, { status: 400 });
        }

        const chosen = eligible[Math.floor(Math.random() * eligible.length)];
        // Find the index within the DISPLAY array (rewards) for animation alignment
        const wonIndex = rewards.findIndex((r) => r.id === chosen.id);

        const rewardName = chosen.rewardType === "PRODUCT"
            ? chosen.product?.name ?? "รางวัล"
            : chosen.rewardName ?? (chosen.rewardType === "CREDIT" ? "เครดิต" : "พอยต์");
        const imageUrl = chosen.rewardType === "PRODUCT" ? chosen.product?.imageUrl : chosen.rewardImageUrl;
        const rewardAmount = chosen.rewardAmount ? Number(chosen.rewardAmount) : null;

        // ── Transaction: deduct cost + deliver reward + log ──────────────────
        await db.$transaction(async (tx) => {
            // 1. Deduct spin cost
            if (costType === "CREDIT" && costAmount > 0) {
                await tx.user.update({ where: { id: user.id }, data: { creditBalance: { decrement: costAmount } } });
            }
            if (costType === "POINT" && costAmount > 0) {
                await tx.user.update({ where: { id: user.id }, data: { pointBalance: { decrement: costAmount } } });
            }

            // 2. Grant reward
            if (chosen.rewardType === "CREDIT" && rewardAmount && rewardAmount > 0) {
                await tx.user.update({ where: { id: user.id }, data: { creditBalance: { increment: rewardAmount } } });
            }
            if (chosen.rewardType === "POINT" && rewardAmount && rewardAmount > 0) {
                await tx.user.update({ where: { id: user.id }, data: { pointBalance: { increment: rewardAmount } } });
            }
            if (chosen.rewardType === "PRODUCT" && chosen.product) {
                const product = chosen.product;
                if (product.isSold || product.orderId) throw new Error("รางวัลนี้ถูกใช้ไปแล้ว กรุณาสุ่มใหม่");

                const decrypted = decrypt(product.secretData || "");
                const [taken, remainingData] = takeFirstStock(decrypted, product.stockSeparator || "newline");
                if (!taken) throw new Error("สต็อกของรางวัลหมดแล้ว");

                const isLastStock = !remainingData || remainingData.trim().length === 0;
                const order = await tx.order.create({
                    data: { userId: user.id, totalPrice: costAmount, status: "COMPLETED", givenData: encrypt(taken) },
                });
                await tx.product.update({
                    where: { id: product.id },
                    data: {
                        secretData: isLastStock ? encrypt(taken) : encrypt(remainingData),
                        isSold: isLastStock,
                        orderId: order.id,
                    },
                });
            }

            // 3. Log the roll
            await tx.gachaRollLog.create({
                data: {
                    userId: user.id,
                    productId: chosen.rewardType === "PRODUCT" ? chosen.product?.id ?? null : null,
                    rewardName,
                    rewardImageUrl: imageUrl ?? null,
                    tier: chosen.tier ?? "common",
                    selectorLabel: "grid",
                    costType,
                    costAmount,
                    ...(machineId ? { gachaMachineId: machineId } : {}),
                },
            });
        });

        return NextResponse.json({
            success: true,
            data: {
                wonIndex,
                rewardId: chosen.id,
                rewardName,
                rewardType: chosen.rewardType,
                rewardAmount,
                imageUrl: imageUrl ?? null,
                tier: chosen.tier ?? "common",
            },
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
        return NextResponse.json({ success: false, message: msg }, { status: 500 });
    }
}
