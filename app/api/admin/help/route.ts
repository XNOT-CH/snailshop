import { mysqlNow } from "@/lib/utils/date";
import { NextRequest, NextResponse } from "next/server";
import { db, helpArticles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { validateBody } from "@/lib/validations/validate";
import { helpItemSchema } from "@/lib/validations/content";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.CONTENT_VIEW);
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const articles = await db.query.helpArticles.findMany({
            orderBy: (t, { asc }) => [asc(t.category), asc(t.sortOrder)],
        });
        return NextResponse.json(articles);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.CONTENT_EDIT);
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const result = await validateBody(request, helpItemSchema);
        if ("error" in result) return result.error;
        const { title, content, category, sortOrder, isActive } = result.data;

        const newId = crypto.randomUUID();
        await db.insert(helpArticles).values({
            id: newId,
            question: title,
            answer: content,
            category: category || "general",
            sortOrder,
            isActive,
            createdAt: mysqlNow(),
            updatedAt: mysqlNow(),
        });
        const article = await db.query.helpArticles.findFirst({ where: eq(helpArticles.id, newId) });
        await auditFromRequest(request, { action: AUDIT_ACTIONS.HELP_CREATE, resource: "HelpArticle", resourceId: newId, resourceName: title, details: { resourceName: title, category: category || "general" } });
        return NextResponse.json(article);
    } catch {
        return NextResponse.json({ error: "Failed to create article" }, { status: 500 });
    }
}
