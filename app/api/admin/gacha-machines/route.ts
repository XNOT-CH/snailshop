import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const machines = await db.gachaMachine.findMany({
        orderBy: { sortOrder: "asc" },
        include: { category: { select: { name: true } }, _count: { select: { rewards: true } } },
    });
    return NextResponse.json({ success: true, data: machines });
}

export async function POST(req: Request) {
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const body = await req.json() as {
        name: string; description?: string; imageUrl?: string; categoryId?: string;
        costType?: string; costAmount?: number; dailySpinLimit?: number;
        gameType?: string; tierMode?: string; sortOrder?: number;
    };
    const machine = await db.gachaMachine.create({
        data: {
            name: body.name,
            description: body.description ?? null,
            imageUrl: body.imageUrl ?? null,
            gameType: body.gameType ?? "SPIN_X",
            categoryId: body.categoryId ?? null,
            costType: body.costType ?? "FREE",
            costAmount: body.costAmount ?? 0,
            dailySpinLimit: body.dailySpinLimit ?? 0,
            tierMode: body.tierMode ?? "PRICE",
            sortOrder: body.sortOrder ?? 0,
        },
    });
    return NextResponse.json({ success: true, data: machine });
}
