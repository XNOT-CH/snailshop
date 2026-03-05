import { NextRequest, NextResponse } from "next/server";
import { db, footerLinks } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { validateBody } from "@/lib/validations/validate";
import { footerLinkSchema } from "@/lib/validations/content";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { id } = await params;
        const result = await validateBody(request, footerLinkSchema.partial());
        if ("error" in result) return result.error;
        const body = result.data;

        const updateData: Record<string, unknown> = {};
        if (body.label !== undefined) updateData.label = body.label;
        if (body.href !== undefined) updateData.href = body.href;
        if (body.openInNewTab !== undefined) updateData.openInNewTab = body.openInNewTab;
        await db.update(footerLinks).set(updateData as any).where(eq(footerLinks.id, id));
        const link = await db.query.footerLinks.findFirst({ where: (t, { eq }) => eq(t.id, id) });
        return NextResponse.json(link);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update footer link" }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { id } = await params;
        await db.delete(footerLinks).where(eq(footerLinks.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete footer link" }, { status: 500 });
    }
}
