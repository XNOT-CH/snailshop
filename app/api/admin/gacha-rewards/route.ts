import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export async function GET(request: Request) {
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const machineId = searchParams.get("machineId");

        const rewards = await db.gachaReward.findMany({
            where: machineId ? { gachaMachineId: machineId } : undefined,
            orderBy: { createdAt: "desc" },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        imageUrl: true,
                        category: true,
                        isSold: true,
                    },
                },
            },
        });

        type RewardRow = (typeof rewards)[number];

        return NextResponse.json({
            success: true,
            data: rewards.map((r: RewardRow) => ({
                id: r.id,
                tier: r.tier,
                isActive: r.isActive,
                rewardType: r.rewardType,
                productId: r.productId,
                rewardName: r.rewardName,
                rewardAmount: r.rewardAmount ? Number(r.rewardAmount) : null,
                rewardImageUrl: r.rewardImageUrl,
                probability: (r as unknown as { probability?: number }).probability
                    ? Number((r as unknown as { probability?: number }).probability)
                    : 1,
                product: r.product
                    ? {
                        ...r.product,
                        price: Number(r.product.price),
                    }
                    : null,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
            })),
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { success: false, message: `เกิดข้อผิดพลาด: ${errorMessage}` },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const body = await request.json();
        const rewardType = (body.rewardType as string) ?? "PRODUCT";
        const tier = (body.tier as string) ?? "common";
        const isActive = (body.isActive as boolean) ?? true;
        const gachaMachineId = (body.gachaMachineId as string | undefined) ?? null;
        const probability = body.probability !== undefined ? Number(body.probability) : 1;

        if (rewardType === "PRODUCT") {
            const productId = body.productId as string | undefined;
            if (!productId) {
                return NextResponse.json({ success: false, message: "กรุณาเลือกสินค้า" }, { status: 400 });
            }
            const created = await db.gachaReward.create({
                data: { productId, tier, isActive, rewardType: "PRODUCT", gachaMachineId, probability } as never,
            });
            return NextResponse.json({ success: true, data: created });
        } else {
            // CREDIT or POINT
            const rewardAmount = body.rewardAmount as number | undefined;
            const rewardName = body.rewardName as string | undefined;
            const rewardImageUrl = body.rewardImageUrl as string | undefined;

            if (!rewardAmount || rewardAmount <= 0) {
                return NextResponse.json({ success: false, message: "กรุณากรอกจำนวนรางวัล" }, { status: 400 });
            }
            if (!rewardName) {
                return NextResponse.json({ success: false, message: "กรุณากรอกชื่อรางวัล" }, { status: 400 });
            }

            const created = await db.gachaReward.create({
                data: {
                    rewardType,
                    rewardName,
                    rewardAmount,
                    rewardImageUrl: rewardImageUrl ?? null,
                    tier,
                    isActive,
                    gachaMachineId,
                    probability,
                } as never,
            });
            return NextResponse.json({ success: true, data: created });
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { success: false, message: `เกิดข้อผิดพลาด: ${errorMessage}` },
            { status: 500 }
        );
    }
}
