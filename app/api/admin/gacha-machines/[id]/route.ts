import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db, gachaMachines } from "@/lib/db";
import { eq } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const { id } = await params;
    const machine = await db.query.gachaMachines.findFirst({
        where: eq(gachaMachines.id, id),
        with: { category: { columns: { id: true, name: true } } },
    });
    if (!machine) return NextResponse.json({ success: false, message: "ไม่พบตู้กาชา" }, { status: 404 });
    return NextResponse.json({ success: true, data: machine });
}

export async function PATCH(req: Request, { params }: RouteParams) {
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const { id } = await params;
    const body = await req.json() as {
        name?: string; imageUrl?: string; categoryId?: string | null;
        costType?: string; costAmount?: number; dailySpinLimit?: number;
        tierMode?: string; isActive?: boolean; isEnabled?: boolean; sortOrder?: number;
        description?: string; gameType?: string;
    };
    const set: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
        if (v !== undefined) set[k] = k === "costAmount" ? String(v) : v;
    }
    await db.update(gachaMachines).set(set as any).where(eq(gachaMachines.id, id));
    const updated = await db.query.gachaMachines.findFirst({ where: eq(gachaMachines.id, id) });
    return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const { id } = await params;
    await db.delete(gachaMachines).where(eq(gachaMachines.id, id));
    return NextResponse.json({ success: true });
}
