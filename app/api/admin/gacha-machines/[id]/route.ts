import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db, gachaMachines } from "@/lib/db";
import { eq } from "drizzle-orm";
import { validateBody } from "@/lib/validations/validate";
import { gachaMachineSchema } from "@/lib/validations/gacha";
import { PERMISSIONS } from "@/lib/permissions";
import { getMachineProbabilitySummary } from "@/lib/gachaMachineProbability";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
    const auth = await requirePermission(PERMISSIONS.GACHA_VIEW);
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
    const auth = await requirePermission(PERMISSIONS.GACHA_EDIT);
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const { id } = await params;

    const result = await validateBody(req, gachaMachineSchema.partial());
    if ("error" in result) return result.error;
    const body = result.data;

    const set: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
        if (v !== undefined) set[k] = k === "costAmount" ? String(v as string | number) : v;
    }

    if (body.isActive === true) {
        const probability = await getMachineProbabilitySummary(id);
        if (!probability.isComplete) {
            return NextResponse.json({
                success: false,
                message: `ไม่สามารถเปิดใช้งานตู้ได้ เนื่องจากโอกาสรวมของรางวัลไม่ครบ 100% (ปัจจุบัน ${probability.totalProbability}%)`,
            }, { status: 400 });
        }
    }

    await db.update(gachaMachines).set(set).where(eq(gachaMachines.id, id));
    const updated = await db.query.gachaMachines.findFirst({ where: eq(gachaMachines.id, id) });
    return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
    const auth = await requirePermission(PERMISSIONS.GACHA_EDIT);
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const { id } = await params;
    await db.delete(gachaMachines).where(eq(gachaMachines.id, id));
    return NextResponse.json({ success: true });
}
