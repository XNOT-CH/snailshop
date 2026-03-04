import { NextResponse } from "next/server";
import { db, gachaRewards } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";

interface RouteParams { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: RouteParams) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    try {
        const { id } = await params;
        const body = await request.json();
        const updateData: Record<string, unknown> = {};
        if (body.tier !== undefined) updateData.tier = body.tier;
        if (body.isActive !== undefined) updateData.isActive = body.isActive;
        if (body.rewardName !== undefined) updateData.rewardName = body.rewardName;
        if (body.rewardAmount !== undefined) updateData.rewardAmount = String(body.rewardAmount);
        if (body.rewardImageUrl !== undefined) updateData.rewardImageUrl = body.rewardImageUrl;
        if (body.probability !== undefined) updateData.probability = String(body.probability);
        await db.update(gachaRewards).set(updateData as any).where(eq(gachaRewards.id, id));
        const updated = await db.query.gachaRewards.findFirst({ where: eq(gachaRewards.id, id) });
        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        return NextResponse.json({ success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    try {
        const { id } = await params;
        await db.delete(gachaRewards).where(eq(gachaRewards.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : "Unknown"}` }, { status: 500 });
    }
}
