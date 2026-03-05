import { NextResponse } from "next/server";
import { db, gachaRewards } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { validateBody } from "@/lib/validations/validate";
import { gachaRewardSchema } from "@/lib/validations/gacha";

export async function GET(request: Request) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    try {
        const { searchParams } = new URL(request.url);
        const machineId = searchParams.get("machineId");
        const rewards = await db.query.gachaRewards.findMany({
            where: machineId ? eq(gachaRewards.gachaMachineId, machineId) : undefined,
            orderBy: (t, { desc }) => desc(t.createdAt),
            with: { product: { columns: { id: true, name: true, price: true, imageUrl: true, category: true, isSold: true } } },
        });
        type RewardRow = (typeof rewards)[number];
        return NextResponse.json({
            success: true,
            data: rewards.map((r: RewardRow) => ({
                id: r.id, tier: r.tier, isActive: r.isActive, rewardType: r.rewardType,
                productId: r.productId, rewardName: r.rewardName,
                rewardAmount: r.rewardAmount ? Number(r.rewardAmount) : null,
                rewardImageUrl: r.rewardImageUrl,
                probability: r.probability ? Number(r.probability) : 1,
                product: r.product ? { ...r.product, price: Number(r.product.price) } : null,
                createdAt: r.createdAt, updatedAt: r.updatedAt,
            })),
        });
    } catch (error) {
        return NextResponse.json({ success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    try {
        const result = await validateBody(request, gachaRewardSchema);
        if ("error" in result) return result.error;
        const body = result.data;

        const newId = crypto.randomUUID();
        if (body.rewardType === "PRODUCT") {
            if (!body.productId) return NextResponse.json({ success: false, message: "กรุณาเลือกสินค้า" }, { status: 400 });
            await db.insert(gachaRewards).values({
                id: newId, productId: body.productId, tier: body.tier, isActive: body.isActive,
                rewardType: "PRODUCT", gachaMachineId: body.gachaMachineId ?? null,
                probability: String(body.probability),
            });
        } else {
            if (!body.rewardAmount || body.rewardAmount <= 0) return NextResponse.json({ success: false, message: "กรุณากรอกจำนวนรางวัล" }, { status: 400 });
            if (!body.rewardName) return NextResponse.json({ success: false, message: "กรุณากรอกชื่อรางวัล" }, { status: 400 });
            await db.insert(gachaRewards).values({
                id: newId, rewardType: body.rewardType, rewardName: body.rewardName,
                rewardAmount: String(body.rewardAmount), rewardImageUrl: body.rewardImageUrl || null,
                tier: body.tier, isActive: body.isActive, gachaMachineId: body.gachaMachineId ?? null,
                probability: String(body.probability),
            });
        }
        const created = await db.query.gachaRewards.findFirst({ where: eq(gachaRewards.id, newId) });
        return NextResponse.json({ success: true, data: created });
    } catch (error) {
        return NextResponse.json({ success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
    }
}
