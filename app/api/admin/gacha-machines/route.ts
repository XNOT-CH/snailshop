import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db, gachaMachines, gachaRewards } from "@/lib/db";
import { eq, asc, count } from "drizzle-orm";

export async function GET() {
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const machines = await db.query.gachaMachines.findMany({
        orderBy: (t, { asc }) => asc(t.sortOrder),
        with: { category: { columns: { name: true } }, rewards: { columns: { id: true } } },
    });
    const data = machines.map(m => ({ ...m, _count: { rewards: m.rewards.length }, rewards: undefined }));
    return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const body = await req.json() as {
        name: string; description?: string; imageUrl?: string; categoryId?: string;
        costType?: string; costAmount?: number; dailySpinLimit?: number;
        gameType?: string; tierMode?: string; sortOrder?: number;
    };
    const newId = crypto.randomUUID();
    await db.insert(gachaMachines).values({
        id: newId, name: body.name, description: body.description ?? null, imageUrl: body.imageUrl ?? null,
        gameType: body.gameType ?? "SPIN_X", categoryId: body.categoryId ?? null,
        costType: body.costType ?? "FREE", costAmount: String(body.costAmount ?? 0),
        dailySpinLimit: body.dailySpinLimit ?? 0, tierMode: body.tierMode ?? "PRICE", sortOrder: body.sortOrder ?? 0,
    });
    const machine = await db.query.gachaMachines.findFirst({ where: eq(gachaMachines.id, newId) });
    return NextResponse.json({ success: true, data: machine });
}
