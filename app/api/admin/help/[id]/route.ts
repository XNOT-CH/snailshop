import { NextRequest, NextResponse } from "next/server";
import { db, helpArticles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { validateBody } from "@/lib/validations/validate";
import { helpItemSchema, type HelpItemInput } from "@/lib/validations/content";
import { PERMISSIONS } from "@/lib/permissions";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermission(PERMISSIONS.CONTENT_EDIT);
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { id } = await params;
        const result = await validateBody(request, helpItemSchema.partial());
        if ("error" in result) return result.error;
        const { title, content, category, isActive } = result.data as Partial<HelpItemInput>;

        const existing = await db.query.helpArticles.findFirst({ where: eq(helpArticles.id, id) });
        if (!existing) return NextResponse.json({ error: "Article not found" }, { status: 404 });

        const updateData: Record<string, unknown> = {};
        if (title) updateData.question = title;
        if (content) updateData.answer = content;
        if (category) updateData.category = category;
        if (typeof isActive === "boolean") updateData.isActive = isActive;
        await db.update(helpArticles).set(updateData).where(eq(helpArticles.id, id));

        const changes = generateChanges(existing, title, content, isActive);
        await auditFromRequest(request, { action: AUDIT_ACTIONS.HELP_UPDATE, resource: "HelpArticle", resourceId: id, resourceName: existing.question, details: { resourceName: existing.question, changes } });

        const updated = await db.query.helpArticles.findFirst({ where: eq(helpArticles.id, id) });
        return NextResponse.json(updated);
    } catch { return NextResponse.json({ error: "Failed to update article" }, { status: 500 }); }
}

function generateChanges(existing: { question: string; answer: string; isActive: boolean }, title?: string, content?: string, isActive?: boolean) {
    const changes: { field: string; old: string; new: string }[] = [];
    const truncate = (str: string) => str.substring(0, 50) + "...";
    
    if (title && existing.question !== title) {
        changes.push({ field: "title", old: existing.question, new: title });
    }
    if (content && existing.answer !== content) {
        changes.push({ field: "content", old: truncate(existing.answer), new: truncate(content) });
    }
    if (typeof isActive === "boolean" && existing.isActive !== isActive) {
        changes.push({ field: "isActive", old: existing.isActive ? "เปิด" : "ปิด", new: isActive ? "เปิด" : "ปิด" });
    }
    
    return changes;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermission(PERMISSIONS.CONTENT_EDIT);
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { id } = await params;
        const article = await db.query.helpArticles.findFirst({ where: eq(helpArticles.id, id) });
        if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });
        await db.delete(helpArticles).where(eq(helpArticles.id, id));
        await auditFromRequest(request, { action: AUDIT_ACTIONS.HELP_DELETE, resource: "HelpArticle", resourceId: id, resourceName: article.question, details: { resourceName: article.question, deletedData: { question: article.question, category: article.category } } });
        return NextResponse.json({ success: true });
    } catch { return NextResponse.json({ error: "Failed to delete article" }, { status: 500 }); }
}
