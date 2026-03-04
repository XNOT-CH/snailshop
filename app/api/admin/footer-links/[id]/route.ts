import { NextRequest, NextResponse } from "next/server";
import { db, footerLinks } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { label, href, openInNewTab, sortOrder, isActive } = body;
        const updateData: Record<string, unknown> = {};
        if (label !== undefined) updateData.label = label;
        if (href !== undefined) updateData.href = href;
        if (openInNewTab !== undefined) updateData.openInNewTab = openInNewTab;
        if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
        if (isActive !== undefined) updateData.isActive = isActive;
        await db.update(footerLinks).set(updateData as any).where(eq(footerLinks.id, id));
        const link = await db.query.footerLinks.findFirst({ where: (t, { eq }) => eq(t.id, id) });
        return NextResponse.json(link);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update footer link" }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await db.delete(footerLinks).where(eq(footerLinks.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete footer link" }, { status: 500 });
    }
}
