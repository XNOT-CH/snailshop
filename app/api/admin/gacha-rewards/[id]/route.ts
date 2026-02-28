import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const { id } = await params;
        const body = await request.json();

        const updateData: Record<string, unknown> = {};
        if (body.tier !== undefined) updateData.tier = body.tier;
        if (body.isActive !== undefined) updateData.isActive = body.isActive;
        if (body.rewardName !== undefined) updateData.rewardName = body.rewardName;
        if (body.rewardAmount !== undefined) updateData.rewardAmount = body.rewardAmount;
        if (body.rewardImageUrl !== undefined) updateData.rewardImageUrl = body.rewardImageUrl;
        if (body.probability !== undefined) updateData.probability = body.probability;

        const updated = await db.gachaReward.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { success: false, message: `เกิดข้อผิดพลาด: ${errorMessage}` },
            { status: 500 }
        );
    }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const { id } = await params;
        await db.gachaReward.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { success: false, message: `เกิดข้อผิดพลาด: ${errorMessage}` },
            { status: 500 }
        );
    }
}
