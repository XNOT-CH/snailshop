import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/encryption";
import { takeFirstStock } from "@/lib/stock";
import {
    buildGrid,
    getValidLSelectors,
    getValidRSelectorsFor,
    getIntersectionTile,
    type GachaProductLite,
    type GachaTier,
} from "@/lib/gachaGrid";

const COOKIE_NAME = "gacha_l_pending";
const COOKIE_TTL = 300; // 5 minutes

function getDayRange(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

export async function POST(req: Request) {
    const authCheck = await isAuthenticated();
    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    // Parse spin phase and machineId from body
    let spin = 1;
    let machineId: string | null = null;
    try {
        const body = await req.json();
        spin = Number(body.spin ?? 1);
        machineId = (body.machineId as string | null | undefined) ?? null;
    } catch { /* no body */ }

    try {
        let isEnabled = true;
        let costType = "FREE";
        let costAmount = 0;
        let dailySpinLimit = 0;

        if (machineId) {
            // Machine-specific settings
            try {
                const machine = await db.gachaMachine.findUnique({
                    where: { id: machineId },
                    select: { isEnabled: true, isActive: true, costType: true, costAmount: true, dailySpinLimit: true },
                });
                if (!machine || !machine.isActive) {
                    return NextResponse.json({ success: false, message: "ตู้กาชานี้ปิดอยู่ชั่วคราว" }, { status: 400 });
                }
                isEnabled = machine.isEnabled ?? true;
                costType = machine.costType;
                costAmount = Number(machine.costAmount ?? 0);
                dailySpinLimit = machine.dailySpinLimit ?? 0;
            } catch {
                return NextResponse.json({ success: false, message: "ไม่พบตู้กาชา" }, { status: 404 });
            }
        } else {
            // Global settings
            let settings: Awaited<ReturnType<typeof db.gachaSettings.findFirst>> | null = null;
            try {
                settings = await db.gachaSettings.findFirst();
            } catch {
                settings = null;
            }
            isEnabled = settings?.isEnabled ?? true;
            costType = settings?.costType ?? "FREE";
            costAmount = Number(settings?.costAmount ?? 0);
            dailySpinLimit = settings?.dailySpinLimit ?? 0;
        }

        if (!isEnabled) {
            return NextResponse.json({ success: false, message: "ระบบกาชาปิดอยู่ชั่วคราว" }, { status: 400 });
        }

        // ── SPIN 1: choose Left diagonal ─────────────────────────────────────
        if (spin === 1) {
            const user = await db.user.findUnique({
                where: { id: authCheck.userId },
                select: { id: true, creditBalance: true, pointBalance: true },
            });
            if (!user) return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้งาน" }, { status: 404 });

            if (costType === "CREDIT" && costAmount > 0 && Number(user.creditBalance) < costAmount) {
                return NextResponse.json({ success: false, message: "เครดิตไม่เพียงพอ" }, { status: 400 });
            }
            if (costType === "POINT" && costAmount > 0 && user.pointBalance < costAmount) {
                return NextResponse.json({ success: false, message: "พอยต์ไม่เพียงพอ" }, { status: 400 });
            }

            // Check daily limit
            const now = new Date();
            const { start, end } = getDayRange(now);
            if (dailySpinLimit > 0) {
                const todayCount = await db.gachaRollLog.count({
                    where: { userId: authCheck.userId, createdAt: { gte: start, lte: end } },
                });
                if (todayCount >= dailySpinLimit) {
                    return NextResponse.json(
                        { success: false, message: `คุณสุ่มครบ ${dailySpinLimit} ครั้ง/วันแล้ว` },
                        { status: 400 }
                    );
                }
            }

            // Build grid, pick valid L
            const allRewards = await db.gachaReward.findMany({
                where: {
                    isActive: true,
                    // Use machine-specific rewards if machineId provided, otherwise global
                    gachaMachineId: machineId ?? null,
                    OR: [
                        { rewardType: "PRODUCT", productId: { not: null } },
                        {
                            rewardType: { in: ["CREDIT", "POINT"] },
                            rewardName: { not: null },
                            rewardAmount: { not: null },
                        },
                    ],
                },
                include: { product: { select: { id: true, name: true, price: true, imageUrl: true, secretData: true, stockSeparator: true, isSold: true, orderId: true } } },
            });
            type RewardRow = (typeof allRewards)[number];
            const tieredProducts: GachaProductLite[] = allRewards
                .filter((r: RewardRow) => (r.rewardType === "PRODUCT" ? r.product && !r.product.isSold : (r.rewardName && r.rewardAmount)))
                .map((r: RewardRow) => r.rewardType === "PRODUCT" && r.product
                    ? { id: r.product.id, name: r.product.name, price: Number(r.product.price), imageUrl: r.product.imageUrl, tier: (r.tier as GachaTier) ?? "common" }
                    : { id: `reward:${r.id}`, name: r.rewardName ?? (r.rewardType === "CREDIT" ? "เครดิต" : "พอยต์"), price: Number(r.rewardAmount ?? 0), imageUrl: r.rewardImageUrl ?? null, tier: (r.tier as GachaTier) ?? "common" }
                );

            if (tieredProducts.length === 0) {
                return NextResponse.json({ success: false, message: "ไม่มีรางวัลสำหรับกาชาในขณะนี้" }, { status: 400 });
            }

            const tiles = buildGrid(tieredProducts);
            const validLSelectors = getValidLSelectors(tiles);
            if (validLSelectors.length === 0) {
                return NextResponse.json({ success: false, message: "ไม่มีแถวซ้ายที่สุ่มได้" }, { status: 400 });
            }

            const lLabel = validLSelectors[Math.floor(Math.random() * validLSelectors.length)];

            // Store in encrypted cookie
            const payload = encrypt(JSON.stringify({ userId: authCheck.userId, lLabel, iat: Date.now() }));
            const cookieStore = await cookies();
            cookieStore.set(COOKIE_NAME, payload, { httpOnly: true, maxAge: COOKIE_TTL, path: "/" });

            return NextResponse.json({ success: true, data: { lLabel } });
        }

        // ── SPIN 2: choose Right diagonal, resolve intersection ───────────────
        const cookieStore = await cookies();
        const rawCookie = cookieStore.get(COOKIE_NAME)?.value;
        if (!rawCookie) {
            return NextResponse.json({ success: false, message: "กรุณากดสุ่มครั้งที่ 1 ก่อน" }, { status: 400 });
        }

        let lLabel: string;
        try {
            const parsed = JSON.parse(decrypt(rawCookie));
            if (parsed.userId !== authCheck.userId) throw new Error("user mismatch");
            if (Date.now() - parsed.iat > COOKIE_TTL * 1000) throw new Error("expired");
            lLabel = parsed.lLabel;
        } catch {
            cookieStore.delete(COOKIE_NAME);
            return NextResponse.json({ success: false, message: "เซสชันสุ่มหมดอายุ กรุณาเริ่มใหม่" }, { status: 400 });
        }

        // Clear cookie immediately
        cookieStore.delete(COOKIE_NAME);

        // Daily limit (definitive check on spin 2)
        const now = new Date();
        const { start, end } = getDayRange(now);
        if (dailySpinLimit > 0) {
            const todayCount = await db.gachaRollLog.count({
                where: { userId: authCheck.userId, createdAt: { gte: start, lte: end } },
            });
            if (todayCount >= dailySpinLimit) {
                return NextResponse.json(
                    { success: false, message: `คุณสุ่มครบ ${dailySpinLimit} ครั้ง/วันแล้ว` },
                    { status: 400 }
                );
            }
        }

        const user = await db.user.findUnique({
            where: { id: authCheck.userId },
            select: { id: true, creditBalance: true, pointBalance: true },
        });
        if (!user) return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้งาน" }, { status: 404 });

        if (costType === "CREDIT" && costAmount > 0 && Number(user.creditBalance) < costAmount) {
            return NextResponse.json({ success: false, message: "เครดิตไม่เพียงพอ" }, { status: 400 });
        }
        if (costType === "POINT" && costAmount > 0 && user.pointBalance < costAmount) {
            return NextResponse.json({ success: false, message: "พอยต์ไม่เพียงพอ" }, { status: 400 });
        }

        // Rebuild grid
        const allRewards = await db.gachaReward.findMany({
            where: {
                isActive: true,
                // Use machine-specific rewards if machineId provided, otherwise global
                gachaMachineId: machineId ?? null,
                OR: [
                    { rewardType: "PRODUCT", productId: { not: null } },
                    {
                        rewardType: { in: ["CREDIT", "POINT"] },
                        rewardName: { not: null },
                        rewardAmount: { not: null },
                    },
                ],
            },
            include: { product: { select: { id: true, name: true, price: true, imageUrl: true, secretData: true, stockSeparator: true, isSold: true, orderId: true } } },
        });
        type RewardRow = (typeof allRewards)[number];
        const tieredProducts: GachaProductLite[] = allRewards
            .filter((r: RewardRow) => (r.rewardType === "PRODUCT" ? r.product && !r.product.isSold : (r.rewardName && r.rewardAmount)))
            .map((r: RewardRow) => r.rewardType === "PRODUCT" && r.product
                ? { id: r.product.id, name: r.product.name, price: Number(r.product.price), imageUrl: r.product.imageUrl, tier: (r.tier as GachaTier) ?? "common" }
                : { id: `reward:${r.id}`, name: r.rewardName ?? (r.rewardType === "CREDIT" ? "เครดิต" : "พอยต์"), price: Number(r.rewardAmount ?? 0), imageUrl: r.rewardImageUrl ?? null, tier: (r.tier as GachaTier) ?? "common" }
            );

        if (tieredProducts.length === 0) {
            return NextResponse.json({ success: false, message: "ไม่มีรางวัลสำหรับกาชาในขณะนี้" }, { status: 400 });
        }

        const tiles = buildGrid(tieredProducts);

        // Pick valid R for this L
        const validRSelectors = getValidRSelectorsFor(tiles, lLabel);
        if (validRSelectors.length === 0) {
            return NextResponse.json({ success: false, message: "ไม่มีแถวขวาที่สุ่มได้" }, { status: 400 });
        }
        const rLabel = validRSelectors[Math.floor(Math.random() * validRSelectors.length)];
        const selectorLabel = `${lLabel}+${rLabel}`;

        // Resolve intersection tile
        const intersectionTile = getIntersectionTile(tiles, lLabel, rLabel);
        if (!intersectionTile?.product) {
            return NextResponse.json({ success: false, message: "ไม่พบรางวัลที่จุดตัด กรุณาสุ่มใหม่" }, { status: 400 });
        }

        const chosenId = intersectionTile.product.id;
        const rewardMeta = tieredProducts.find((p) => p.id === chosenId);
        const tier: GachaTier = rewardMeta?.tier ?? "common";

        // Currency reward path
        const isCurrencyReward = chosenId.startsWith("reward:");
        const rewardRowId = isCurrencyReward ? chosenId.replace("reward:", "") : null;
        const chosenRewardRow: RewardRow | undefined = rewardRowId
            ? allRewards.find((r: RewardRow) => r.id === rewardRowId)
            : undefined;

        if (isCurrencyReward) {
            const rewardType = chosenRewardRow?.rewardType as "CREDIT" | "POINT";
            const rewardAmount = Number(chosenRewardRow?.rewardAmount ?? 0);

            await db.$transaction(async (tx) => {
                if (costType === "CREDIT" && costAmount > 0) await tx.user.update({ where: { id: user.id }, data: { creditBalance: { decrement: costAmount } } });
                if (costType === "POINT" && costAmount > 0) await tx.user.update({ where: { id: user.id }, data: { pointBalance: { decrement: costAmount } } });
                if (rewardType === "CREDIT" && rewardAmount > 0) await tx.user.update({ where: { id: user.id }, data: { creditBalance: { increment: rewardAmount } } });
                if (rewardType === "POINT" && rewardAmount > 0) await tx.user.update({ where: { id: user.id }, data: { pointBalance: { increment: rewardAmount } } });
                await tx.gachaRollLog.create({ data: { userId: user.id, productId: null, rewardName: rewardMeta?.name ?? null, rewardImageUrl: rewardMeta?.imageUrl ?? null, tier, selectorLabel, costType, costAmount } });
            });

            return NextResponse.json({
                success: true,
                data: {
                    lLabel, rLabel, selectorLabel, tier, orderId: null,
                    product: { id: chosenId, name: rewardMeta?.name ?? "รางวัล", price: rewardMeta?.price ?? 0, imageUrl: rewardMeta?.imageUrl ?? null, tier, rewardType, rewardAmount },
                },
            });
        }

        // Product reward path
        const result = await db.$transaction(async (tx) => {
            const product = await tx.product.findUnique({
                where: { id: chosenId },
                select: { id: true, name: true, price: true, imageUrl: true, isSold: true, orderId: true, secretData: true, stockSeparator: true },
            });

            if (!product || product.isSold || product.orderId) throw new Error("รางวัลนี้ถูกใช้ไปแล้ว กรุณาสุ่มใหม่");

            const decrypted = decrypt(product.secretData || "");
            const [taken, remainingData] = takeFirstStock(decrypted, product.stockSeparator || "newline");
            if (!taken) throw new Error("สต็อกของรางวัลหมดแล้ว");

            const isLastStock = !remainingData || remainingData.trim().length === 0;
            const order = await tx.order.create({ data: { userId: user.id, totalPrice: costAmount, status: "COMPLETED", givenData: encrypt(taken) } });

            if (costType === "CREDIT" && costAmount > 0) await tx.user.update({ where: { id: user.id }, data: { creditBalance: { decrement: costAmount } } });
            if (costType === "POINT" && costAmount > 0) await tx.user.update({ where: { id: user.id }, data: { pointBalance: { decrement: costAmount } } });

            await tx.product.update({
                where: { id: product.id },
                data: { secretData: isLastStock ? encrypt(taken) : encrypt(remainingData), isSold: isLastStock, orderId: order.id },
            });

            await tx.gachaRollLog.create({ data: { userId: user.id, productId: product.id, rewardName: product.name, rewardImageUrl: product.imageUrl ?? null, tier, selectorLabel, costType, costAmount } });

            return { orderId: order.id, product: { id: product.id, name: product.name, price: Number(product.price), imageUrl: product.imageUrl, tier } };
        });

        return NextResponse.json({
            success: true,
            data: { lLabel, rLabel, selectorLabel, tier, orderId: result.orderId, product: result.product },
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, message: `เกิดข้อผิดพลาด: ${errorMessage}` }, { status: 500 });
    }
}
