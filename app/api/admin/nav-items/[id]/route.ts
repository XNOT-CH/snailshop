import { NextRequest, NextResponse } from "next/server";
import { db, navItems } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { label, href, icon, isActive, sortOrder } = body;
        const updateData: Record<string, unknown> = {};
        if (label !== undefined) updateData.label = label;
        if (href !== undefined) updateData.href = href;
        if (icon !== undefined) updateData.icon = icon;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
        await db.update(navItems).set(updateData as any).where(eq(navItems.id, id));
        const item = await db.query.navItems.findFirst({ where: (t, { eq }) => eq(t.id, id) });
        return NextResponse.json(item);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update nav item" }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await db.delete(navItems).where(eq(navItems.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete nav item" }, { status: 500 });
    }
}
