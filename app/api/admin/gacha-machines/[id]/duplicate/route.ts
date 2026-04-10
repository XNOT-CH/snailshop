import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db, gachaMachines, gachaRewards } from "@/lib/db";
import { mysqlNow } from "@/lib/utils/date";
import { eq } from "drizzle-orm";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requirePermission(PERMISSIONS.GACHA_EDIT);
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });

    try {
        const { id } = await params;
        const original = await db.query.gachaMachines.findFirst({
            where: eq(gachaMachines.id, id),
            with: { rewards: true },
        });

        if (!original) return NextResponse.json({ success: false, message: "ไม่พบข้อมูลเดิม" }, { status: 404 });

        const newId = crypto.randomUUID();
        await db.insert(gachaMachines).values({
            id: newId,
            name: original.name + " (Copy)",
            description: original.description,
            imageUrl: original.imageUrl,
            gameType: original.gameType,
            categoryId: original.categoryId,
            costType: original.costType,
            costAmount: original.costAmount,
            dailySpinLimit: original.dailySpinLimit,
            tierMode: original.tierMode,
            isActive: false,
            isEnabled: original.isEnabled,
            sortOrder: (original.sortOrder ?? 0) + 1,
            createdAt: mysqlNow(),
            updatedAt: mysqlNow(),
        });

        if (original.rewards && original.rewards.length > 0) {
            const newRewards = original.rewards.map((r) => ({
                id: crypto.randomUUID(),
                rewardType: r.rewardType,
                tier: r.tier,
                isActive: r.isActive,
                probability: r.probability,
                rewardName: r.rewardName,
                rewardAmount: r.rewardAmount,
                rewardImageUrl: r.rewardImageUrl,
                gachaMachineId: newId,
                productId: null,
                createdAt: mysqlNow(),
                updatedAt: mysqlNow(),
            }));
            await db.insert(gachaRewards).values(newRewards);
        }

        return NextResponse.json({ success: true, data: { id: newId } });
    } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : "อัพเดทไม่สำเร็จ";
        return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
    }
}
