import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, users, gachaMachines, gachaSettings, gachaRewards, gachaRollLogs, orders, products } from "@/lib/db";
import { eq, and, or, isNotNull, isNull, gte, lte, inArray, sql, count } from "drizzle-orm";
import { isAuthenticated } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/encryption";
import { takeFirstStock } from "@/lib/stock";
import {
    buildGrid, getValidLSelectors, getValidRSelectorsFor, getIntersectionTile,
    type GachaProductLite, type GachaTier,
} from "@/lib/gachaGrid";

const COOKIE_NAME = "gacha_l_pending";
const COOKIE_TTL = 300;

function toMySQLDatetime(d: Date) {
    return d.toISOString().slice(0, 19).replace("T", " ");
}

function getDayRange(date: Date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);
    return { start: toMySQLDatetime(start), end: toMySQLDatetime(end) };
}

async function fetchRewards(machineId: string | null) {
    const whereCondition = and(
        eq(gachaRewards.isActive, true),
        machineId ? eq(gachaRewards.gachaMachineId, machineId) : isNull(gachaRewards.gachaMachineId),
        or(
            and(eq(gachaRewards.rewardType, "PRODUCT"), isNotNull(gachaRewards.productId)),
            and(inArray(gachaRewards.rewardType, ["CREDIT", "POINT"]), isNotNull(gachaRewards.rewardName), isNotNull(gachaRewards.rewardAmount))
        )
    );
    return db.query.gachaRewards.findMany({
        where: whereCondition,
        with: { product: { columns: { id: true, name: true, price: true, imageUrl: true, secretData: true, stockSeparator: true, isSold: true, orderId: true } } },
    });
}

export async function POST(req: Request) {
    const authCheck = await isAuthenticated();
    if (!authCheck.success || !authCheck.userId) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    let spin = 1;
    let machineId: string | null = null;
    try {
        const body = await req.json();
        spin = Number(body.spin ?? 1);
        machineId = (body.machineId as string | null | undefined) ?? null;
    } catch { /* no body */ }

    try {
        let isEnabled = true, costType = "FREE", costAmount = 0, dailySpinLimit = 0;

        if (machineId) {
            try {
                const machine = await db.query.gachaMachines.findFirst({
                    where: eq(gachaMachines.id, machineId),
                    columns: { isEnabled: true, isActive: true, costType: true, costAmount: true, dailySpinLimit: true },
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
            const settings = await db.query.gachaSettings.findFirst().catch(() => null);
            isEnabled = settings?.isEnabled ?? true;
            costType = settings?.costType ?? "FREE";
            costAmount = Number(settings?.costAmount ?? 0);
            dailySpinLimit = settings?.dailySpinLimit ?? 0;
        }

        if (!isEnabled) return NextResponse.json({ success: false, message: "ระบบกาชาปิดอยู่ชั่วคราว" }, { status: 400 });

        if (spin === 1) {
            const user = await db.query.users.findFirst({
                where: eq(users.id, authCheck.userId),
                columns: { id: true, creditBalance: true, pointBalance: true },
            });
            if (!user) return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้งาน" }, { status: 404 });

            if (costType === "CREDIT" && costAmount > 0 && Number(user.creditBalance) < costAmount)
                return NextResponse.json({ success: false, message: "เครดิตไม่เพียงพอ" }, { status: 400 });
            if (costType === "POINT" && costAmount > 0 && (user.pointBalance ?? 0) < costAmount)
                return NextResponse.json({ success: false, message: "พอยต์ไม่เพียงพอ" }, { status: 400 });

            if (dailySpinLimit > 0) {
                const { start, end } = getDayRange(new Date());
                const [{ count: todayCount }] = await db.select({ count: count() }).from(gachaRollLogs)
                    .where(and(eq(gachaRollLogs.userId, authCheck.userId), gte(gachaRollLogs.createdAt, start), lte(gachaRollLogs.createdAt, end)));
                if (Number(todayCount) >= dailySpinLimit)
                    return NextResponse.json({ success: false, message: `คุณสุ่มครบ ${dailySpinLimit} ครั้ง/วันแล้ว` }, { status: 400 });
            }

            const allRewards = await fetchRewards(machineId);
            type RewardRow = (typeof allRewards)[number];
            const tieredProducts: GachaProductLite[] = allRewards
                .filter((r: RewardRow) => r.rewardType === "PRODUCT" ? r.product && !r.product.isSold : (r.rewardName && r.rewardAmount))
                .map((r: RewardRow) => r.rewardType === "PRODUCT" && r.product
                    ? { id: r.product.id, name: r.product.name, price: Number(r.product.price), imageUrl: r.product.imageUrl, tier: (r.tier as GachaTier) ?? "common" }
                    : { id: `reward:${r.id}`, name: r.rewardName ?? (r.rewardType === "CREDIT" ? "เครดิต" : "พอยต์"), price: Number(r.rewardAmount ?? 0), imageUrl: r.rewardImageUrl ?? null, tier: (r.tier as GachaTier) ?? "common" }
                );

            if (tieredProducts.length === 0)
                return NextResponse.json({ success: false, message: "ไม่มีรางวัลสำหรับกาชาในขณะนี้" }, { status: 400 });

            const tiles = buildGrid(tieredProducts);
            const validLSelectors = getValidLSelectors(tiles);
            if (validLSelectors.length === 0)
                return NextResponse.json({ success: false, message: "ไม่มีแถวซ้ายที่สุ่มได้" }, { status: 400 });

            const lLabel = validLSelectors[Math.floor(Math.random() * validLSelectors.length)];
            const payload = encrypt(JSON.stringify({ userId: authCheck.userId, lLabel, iat: Date.now() }));
            const cookieStore = await cookies();
            cookieStore.set(COOKIE_NAME, payload, { httpOnly: true, maxAge: COOKIE_TTL, path: "/" });
            return NextResponse.json({ success: true, data: { lLabel } });
        }

        // SPIN 2
        const cookieStore = await cookies();
        const rawCookie = cookieStore.get(COOKIE_NAME)?.value;
        if (!rawCookie) return NextResponse.json({ success: false, message: "กรุณากดสุ่มครั้งที่ 1 ก่อน" }, { status: 400 });

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
        cookieStore.delete(COOKIE_NAME);

        if (dailySpinLimit > 0) {
            const { start, end } = getDayRange(new Date());
            const [{ count: todayCount }] = await db.select({ count: count() }).from(gachaRollLogs)
                .where(and(eq(gachaRollLogs.userId, authCheck.userId), gte(gachaRollLogs.createdAt, start), lte(gachaRollLogs.createdAt, end)));
            if (Number(todayCount) >= dailySpinLimit)
                return NextResponse.json({ success: false, message: `คุณสุ่มครบ ${dailySpinLimit} ครั้ง/วันแล้ว` }, { status: 400 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, authCheck.userId),
            columns: { id: true, creditBalance: true, pointBalance: true },
        });
        if (!user) return NextResponse.json({ success: false, message: "ไม่พบผู้ใช้งาน" }, { status: 404 });

        if (costType === "CREDIT" && costAmount > 0 && Number(user.creditBalance) < costAmount)
            return NextResponse.json({ success: false, message: "เครดิตไม่เพียงพอ" }, { status: 400 });
        if (costType === "POINT" && costAmount > 0 && (user.pointBalance ?? 0) < costAmount)
            return NextResponse.json({ success: false, message: "พอยต์ไม่เพียงพอ" }, { status: 400 });

        const allRewards = await fetchRewards(machineId);
        type RewardRow = (typeof allRewards)[number];
        const tieredProducts: GachaProductLite[] = allRewards
            .filter((r: RewardRow) => r.rewardType === "PRODUCT" ? r.product && !r.product.isSold : (r.rewardName && r.rewardAmount))
            .map((r: RewardRow) => r.rewardType === "PRODUCT" && r.product
                ? { id: r.product.id, name: r.product.name, price: Number(r.product.price), imageUrl: r.product.imageUrl, tier: (r.tier as GachaTier) ?? "common" }
                : { id: `reward:${r.id}`, name: r.rewardName ?? (r.rewardType === "CREDIT" ? "เครดิต" : "พอยต์"), price: Number(r.rewardAmount ?? 0), imageUrl: r.rewardImageUrl ?? null, tier: (r.tier as GachaTier) ?? "common" }
            );

        if (tieredProducts.length === 0) return NextResponse.json({ success: false, message: "ไม่มีรางวัลสำหรับกาชาในขณะนี้" }, { status: 400 });

        const tiles = buildGrid(tieredProducts);
        const validRSelectors = getValidRSelectorsFor(tiles, lLabel);
        if (validRSelectors.length === 0) return NextResponse.json({ success: false, message: "ไม่มีแถวขวาที่สุ่มได้" }, { status: 400 });

        const rLabel = validRSelectors[Math.floor(Math.random() * validRSelectors.length)];
        const selectorLabel = `${lLabel}+${rLabel}`;
        const intersectionTile = getIntersectionTile(tiles, lLabel, rLabel);
        if (!intersectionTile?.product) return NextResponse.json({ success: false, message: "ไม่พบรางวัลที่จุดตัด กรุณาสุ่มใหม่" }, { status: 400 });

        const chosenId = intersectionTile.product.id;
        const rewardMeta = tieredProducts.find((p) => p.id === chosenId);
        const tier: GachaTier = rewardMeta?.tier ?? "common";

        const isCurrencyReward = chosenId.startsWith("reward:");
        const rewardRowId = isCurrencyReward ? chosenId.replace("reward:", "") : null;
        const chosenRewardRow = rewardRowId ? allRewards.find((r: RewardRow) => r.id === rewardRowId) : undefined;

        if (isCurrencyReward) {
            const rewardType = chosenRewardRow?.rewardType as "CREDIT" | "POINT";
            const rewardAmount = Number(chosenRewardRow?.rewardAmount ?? 0);
            await db.transaction(async (tx) => {
                if (costType === "CREDIT" && costAmount > 0) await tx.update(users).set({ creditBalance: sql`creditBalance - ${costAmount}` }).where(eq(users.id, user.id));
                if (costType === "POINT" && costAmount > 0) await tx.update(users).set({ pointBalance: sql`pointBalance - ${costAmount}` }).where(eq(users.id, user.id));
                if (rewardType === "CREDIT" && rewardAmount > 0) await tx.update(users).set({ creditBalance: sql`creditBalance + ${rewardAmount}` }).where(eq(users.id, user.id));
                if (rewardType === "POINT" && rewardAmount > 0) await tx.update(users).set({ pointBalance: sql`pointBalance + ${rewardAmount}` }).where(eq(users.id, user.id));
                await tx.insert(gachaRollLogs).values({
                    id: crypto.randomUUID(), userId: user.id, productId: null, rewardName: rewardMeta?.name ?? null,
                    rewardImageUrl: rewardMeta?.imageUrl ?? null, tier, selectorLabel, costType, costAmount: String(costAmount),
                    gachaMachineId: machineId,
                });
            });
            return NextResponse.json({
                success: true,
                data: { lLabel, rLabel, selectorLabel, tier, orderId: null, product: { id: chosenId, name: rewardMeta?.name ?? "รางวัล", price: rewardMeta?.price ?? 0, imageUrl: rewardMeta?.imageUrl ?? null, tier, rewardType, rewardAmount } },
            });
        }

        // Product reward
        const result = await db.transaction(async (tx) => {
            const product = await tx.query.products.findFirst({
                where: eq(products.id, chosenId),
                columns: { id: true, name: true, price: true, imageUrl: true, isSold: true, orderId: true, secretData: true, stockSeparator: true },
            });
            if (!product || product.isSold || product.orderId) throw new Error("รางวัลนี้ถูกใช้ไปแล้ว กรุณาสุ่มใหม่");

            const [taken, remainingData] = takeFirstStock(decrypt(product.secretData || ""), product.stockSeparator || "newline");
            if (!taken) throw new Error("สต็อกของรางวัลหมดแล้ว");

            const isLastStock = !remainingData || remainingData.trim().length === 0;
            const orderId = crypto.randomUUID();
            await tx.insert(orders).values({ id: orderId, userId: user.id, totalPrice: String(costAmount), status: "COMPLETED", givenData: encrypt(taken) });

            if (costType === "CREDIT" && costAmount > 0) await tx.update(users).set({ creditBalance: sql`creditBalance - ${costAmount}` }).where(eq(users.id, user.id));
            if (costType === "POINT" && costAmount > 0) await tx.update(users).set({ pointBalance: sql`pointBalance - ${costAmount}` }).where(eq(users.id, user.id));
            await tx.update(products).set({ secretData: isLastStock ? encrypt(taken) : encrypt(remainingData), isSold: isLastStock, orderId }).where(eq(products.id, product.id));
            await tx.insert(gachaRollLogs).values({
                id: crypto.randomUUID(), userId: user.id, productId: product.id, rewardName: product.name,
                rewardImageUrl: product.imageUrl ?? null, tier, selectorLabel, costType, costAmount: String(costAmount),
                gachaMachineId: machineId,
            });
            return { orderId, product: { id: product.id, name: product.name, price: Number(product.price), imageUrl: product.imageUrl, tier } };
        });

        return NextResponse.json({ success: true, data: { lLabel, rLabel, selectorLabel, tier, orderId: result.orderId, product: result.product } });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ success: false, message: `เกิดข้อผิดพลาด: ${errorMessage}` }, { status: 500 });
    }
}
