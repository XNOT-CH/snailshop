import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const { id } = await params;
    const machine = await db.gachaMachine.findUnique({
        where: { id },
        include: { category: { select: { id: true, name: true } } },
    });
    if (!machine) return NextResponse.json({ success: false, message: "ไม่พบตู้กาชา" }, { status: 404 });
    return NextResponse.json({ success: true, data: machine });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const { id } = await params;
    const body = await req.json() as {
        name?: string; imageUrl?: string; categoryId?: string | null;
        costType?: string; costAmount?: number; dailySpinLimit?: number;
        tierMode?: string; isActive?: boolean; isEnabled?: boolean; sortOrder?: number;
    };
    const updated = await db.gachaMachine.update({ where: { id }, data: body });
    return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const { id } = await params;
    await db.gachaMachine.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
