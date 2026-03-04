import { NextRequest, NextResponse } from "next/server";
import { db, users, helpArticles } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { cookies } from "next/headers";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

async function isAdminCheck() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;
    if (!userId) return false;
    const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { role: true } });
    return user?.role === "ADMIN";
}

export async function GET() {
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
    if (!(await isAdminCheck())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const body = await request.json();
        const { question, answer, category } = body;
        if (!question || !answer) return NextResponse.json({ error: "Question and answer are required" }, { status: 400 });
        const newId = crypto.randomUUID();
        await db.insert(helpArticles).values({ id: newId, question, answer, category: category || "general" });
        const article = await db.query.helpArticles.findFirst({ where: eq(helpArticles.id, newId) });
        await auditFromRequest(request, { action: AUDIT_ACTIONS.HELP_CREATE, resource: "HelpArticle", resourceId: newId, resourceName: question, details: { resourceName: question, category: category || "general" } });
        return NextResponse.json(article);
    } catch {
        return NextResponse.json({ error: "Failed to create article" }, { status: 500 });
    }
}
