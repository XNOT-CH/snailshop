import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db, gachaCategories } from "@/lib/db";
import { eq } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const { id } = await params;
    const body = await req.json() as { name?: string; sortOrder?: number; isActive?: boolean };
    const set: Record<string, unknown> = {};
    if (body.name !== undefined) set.name = body.name;
    if (body.sortOrder !== undefined) set.sortOrder = body.sortOrder;
    if (body.isActive !== undefined) set.isActive = body.isActive;
    await db.update(gachaCategories).set(set as any).where(eq(gachaCategories.id, id));
    const updated = await db.query.gachaCategories.findFirst({ where: eq(gachaCategories.id, id) });
    return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const { id } = await params;
    await db.delete(gachaCategories).where(eq(gachaCategories.id, id));
    return NextResponse.json({ success: true });
}
