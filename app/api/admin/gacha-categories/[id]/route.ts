import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const { id } = await params;
    const body = await req.json() as { name?: string; sortOrder?: number; isActive?: boolean };
    const updated = await db.gachaCategory.update({ where: { id }, data: body });
    return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const { id } = await params;
    await db.gachaCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
