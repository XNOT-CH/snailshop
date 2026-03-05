import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db, gachaMachines, gachaRewards } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { validateBody } from "@/lib/validations/validate";
import { gachaMachineSchema } from "@/lib/validations/gacha";

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

    const result = await validateBody(req, gachaMachineSchema);
    if ("error" in result) return result.error;
    const body = result.data;

    const newId = crypto.randomUUID();
    await db.insert(gachaMachines).values({
        id: newId,
        name: body.name,
        description: body.description || null,
        imageUrl: body.imageUrl || null,
        gameType: body.gameType,
        categoryId: body.categoryId ?? null,
        costType: body.costType,
        costAmount: String(body.costAmount),
        dailySpinLimit: body.dailySpinLimit,
        tierMode: body.tierMode,
        sortOrder: body.sortOrder,
    });
    const machine = await db.query.gachaMachines.findFirst({ where: eq(gachaMachines.id, newId) });
    return NextResponse.json({ success: true, data: machine });
}
