import { NextRequest, NextResponse } from "next/server";
import { db, users, helpArticles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

async function isAdminCheck() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;
    if (!userId) return false;
    const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { role: true } });
    return user?.role === "ADMIN";
}

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
    if (!(await isAdminCheck())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { id } = await params;
        const body = await request.json();
        const { question, answer, category, isActive } = body;
        const existing = await db.query.helpArticles.findFirst({ where: eq(helpArticles.id, id) });
        if (!existing) return NextResponse.json({ error: "Article not found" }, { status: 404 });
        const updateData: Record<string, unknown> = {};
        if (question) updateData.question = question;
        if (answer) updateData.answer = answer;
        if (category) updateData.category = category;
        if (typeof isActive === "boolean") updateData.isActive = isActive;
        await db.update(helpArticles).set(updateData as any).where(eq(helpArticles.id, id));
        const changes: { field: string; old: string; new: string }[] = [];
        if (question && existing.question !== question) changes.push({ field: "question", old: existing.question, new: question });
        if (answer && existing.answer !== answer) changes.push({ field: "answer", old: existing.answer.substring(0, 50) + "...", new: answer.substring(0, 50) + "..." });
        if (typeof isActive === "boolean" && existing.isActive !== isActive) changes.push({ field: "isActive", old: existing.isActive ? "เปิด" : "ปิด", new: isActive ? "เปิด" : "ปิด" });
        await auditFromRequest(request, { action: AUDIT_ACTIONS.HELP_UPDATE, resource: "HelpArticle", resourceId: id, resourceName: existing.question, details: { resourceName: existing.question, changes } });
        const updated = await db.query.helpArticles.findFirst({ where: eq(helpArticles.id, id) });
        return NextResponse.json(updated);
    } catch { return NextResponse.json({ error: "Failed to update article" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    if (!(await isAdminCheck())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { id } = await params;
        const article = await db.query.helpArticles.findFirst({ where: eq(helpArticles.id, id) });
        if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });
        await db.delete(helpArticles).where(eq(helpArticles.id, id));
        await auditFromRequest(request, { action: AUDIT_ACTIONS.HELP_DELETE, resource: "HelpArticle", resourceId: id, resourceName: article.question, details: { resourceName: article.question, deletedData: { question: article.question, category: article.category } } });
        return NextResponse.json({ success: true });
    } catch { return NextResponse.json({ error: "Failed to delete article" }, { status: 500 }); }
}
