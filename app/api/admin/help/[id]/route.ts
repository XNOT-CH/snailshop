import { NextRequest, NextResponse } from "next/server";
import { db, helpArticles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { validateBody } from "@/lib/validations/validate";
import { partialUpdateSchema } from "@/lib/validations/partialUpdate";
import { helpItemSchema, type HelpItemInput } from "@/lib/validations/content";
import { PERMISSIONS } from "@/lib/permissions";
import { mysqlNow } from "@/lib/utils/date";
import { contentApiError } from "@/lib/features/content/apiResponse";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.CONTENT_EDIT);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });
    try {
        const { id } = await params;
        const result = await validateBody(request, partialUpdateSchema(helpItemSchema));
        if ("error" in result) return result.error;
        const { title, content, category, sortOrder, isActive } = result.data as Partial<HelpItemInput>;

        const existing = await db.query.helpArticles.findFirst({ where: eq(helpArticles.id, id) });
        if (!existing) return contentApiError("Article not found", { status: 404 });

        const updateData: Record<string, unknown> = {};
        if (title) updateData.question = title;
        if (content) updateData.answer = content;
        if (category) updateData.category = category;
        if (typeof sortOrder === "number") updateData.sortOrder = sortOrder;
        if (typeof isActive === "boolean") updateData.isActive = isActive;
        updateData.updatedAt = mysqlNow();
        await db.update(helpArticles).set(updateData).where(eq(helpArticles.id, id));

        const changes = generateChanges(existing, title, content, category, sortOrder, isActive);
        await auditFromRequest(request, { action: AUDIT_ACTIONS.HELP_UPDATE, resource: "HelpArticle", resourceId: id, resourceName: existing.question, details: { resourceName: existing.question, changes } });

        const updated = await db.query.helpArticles.findFirst({ where: eq(helpArticles.id, id) });
        return NextResponse.json(updated);
    } catch { return contentApiError("Failed to update article", { status: 500 }); }
}

function generateChanges(
    existing: { question: string; answer: string; category: string; sortOrder: number; isActive: boolean },
    title?: string,
    content?: string,
    category?: string,
    sortOrder?: number,
    isActive?: boolean,
) {
    const changes: { field: string; old: string; new: string }[] = [];
    const truncate = (str: string) => str.substring(0, 50) + "...";
    
    if (title && existing.question !== title) {
        changes.push({ field: "title", old: existing.question, new: title });
    }
    if (content && existing.answer !== content) {
        changes.push({ field: "content", old: truncate(existing.answer), new: truncate(content) });
    }
    if (category && existing.category !== category) {
        changes.push({ field: "category", old: existing.category, new: category });
    }
    if (typeof sortOrder === "number" && existing.sortOrder !== sortOrder) {
        changes.push({ field: "sortOrder", old: String(existing.sortOrder), new: String(sortOrder) });
    }
    if (typeof isActive === "boolean" && existing.isActive !== isActive) {
        changes.push({ field: "isActive", old: existing.isActive ? "เปิด" : "ปิด", new: isActive ? "เปิด" : "ปิด" });
    }
    
    return changes;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.CONTENT_EDIT);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });
    try {
        const { id } = await params;
        const article = await db.query.helpArticles.findFirst({ where: eq(helpArticles.id, id) });
        if (!article) return contentApiError("Article not found", { status: 404 });
        await db.delete(helpArticles).where(eq(helpArticles.id, id));
        await auditFromRequest(request, { action: AUDIT_ACTIONS.HELP_DELETE, resource: "HelpArticle", resourceId: id, resourceName: article.question, details: { resourceName: article.question, deletedData: { question: article.question, category: article.category } } });
        return NextResponse.json({ success: true });
    } catch { return contentApiError("Failed to delete article", { status: 500 }); }
}
