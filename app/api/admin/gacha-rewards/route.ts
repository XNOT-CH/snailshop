import { mysqlNow } from "@/lib/utils/date";
import { db, gachaRewards } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requirePermission, requirePermissionWithCsrf } from "@/lib/auth";
import { validateBody } from "@/lib/validations/validate";
import { gachaRewardSchema } from "@/lib/validations/gacha";
import { PERMISSIONS } from "@/lib/permissions";
import { disableMachineIfProbabilityInvalid } from "@/lib/gachaMachineProbability";
import { gachaApiError, gachaApiSuccess } from "@/lib/features/gacha/apiResponse";

export async function GET(request: Request) {
    const authCheck = await requirePermission(PERMISSIONS.GACHA_VIEW);
    if (!authCheck.success) return gachaApiError(authCheck.error, { status: 401 });
    try {
        const { searchParams } = new URL(request.url);
        const machineId = searchParams.get("machineId");
        const rewards = await db.query.gachaRewards.findMany({
            where: machineId ? eq(gachaRewards.gachaMachineId, machineId) : undefined,
            orderBy: (t, { desc }) => desc(t.createdAt),
            with: { product: { columns: { id: true, name: true, price: true, imageUrl: true, category: true, isSold: true, orderId: true } } },
        });
        type RewardRow = (typeof rewards)[number];
        return gachaApiSuccess(
            rewards.map((r: RewardRow) => ({
                id: r.id, tier: r.tier, isActive: r.isActive, rewardType: r.rewardType,
                productId: r.productId, rewardName: r.rewardName,
                rewardAmount: r.rewardAmount ? Number(r.rewardAmount) : null,
                rewardImageUrl: r.rewardImageUrl,
                probability: r.probability ? Number(r.probability) : 1,
                product: r.product ? { ...r.product, price: Number(r.product.price) } : null,
                createdAt: r.createdAt, updatedAt: r.updatedAt,
            })),
        );
    } catch (error) {
        return gachaApiError(`เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : "Unknown"}`, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.GACHA_EDIT);
    if (!authCheck.success) return gachaApiError(authCheck.error, { status: 401 });
    try {
        const result = await validateBody(request, gachaRewardSchema);
        if ("error" in result) return result.error;
        const body = result.data;

        const newId = crypto.randomUUID();
        if (body.rewardType === "PRODUCT") {
            if (!body.productId) return gachaApiError("กรุณาเลือกสินค้า", { status: 400 });
            await db.insert(gachaRewards).values({
                id: newId, productId: body.productId, tier: body.tier, isActive: body.isActive,
                rewardType: "PRODUCT", gachaMachineId: body.gachaMachineId ?? null,
                rewardAmount: body.rewardAmount == null ? null : String(body.rewardAmount),
                probability: String(body.probability),
                createdAt: mysqlNow(),
                updatedAt: mysqlNow(),
            });
        } else {
            if (!body.rewardAmount || body.rewardAmount <= 0) return gachaApiError("กรุณากรอกจำนวนรางวัล", { status: 400 });
            if (!body.rewardName) return gachaApiError("กรุณากรอกชื่อรางวัล", { status: 400 });
            await db.insert(gachaRewards).values({
                id: newId, rewardType: body.rewardType, rewardName: body.rewardName,
                rewardAmount: body.rewardAmount == null ? null : String(body.rewardAmount), rewardImageUrl: body.rewardImageUrl || null,
                tier: body.tier, isActive: body.isActive, gachaMachineId: body.gachaMachineId ?? null,
                probability: String(body.probability),
                createdAt: mysqlNow(),
                updatedAt: mysqlNow(),
            });
        }
        if (body.gachaMachineId) {
            await disableMachineIfProbabilityInvalid(body.gachaMachineId);
        }
        const created = await db.query.gachaRewards.findFirst({ where: eq(gachaRewards.id, newId) });
        return gachaApiSuccess(created);
    } catch (error) {
        return gachaApiError(`เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : "Unknown"}`, { status: 500 });
    }
}
