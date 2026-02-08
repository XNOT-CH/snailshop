import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

async function isAdmin() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;
    if (!userId) return false;
    const user = await db.user.findUnique({ where: { id: userId } });
    return user?.role === "ADMIN";
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const { question, answer, category, isActive } = body;

        // Get existing article for change tracking
        const existingArticle = await db.helpArticle.findUnique({
            where: { id },
        });

        if (!existingArticle) {
            return NextResponse.json({ error: "Article not found" }, { status: 404 });
        }

        const article = await db.helpArticle.update({
            where: { id },
            data: {
                ...(question && { question }),
                ...(answer && { answer }),
                ...(category && { category }),
                ...(typeof isActive === "boolean" && { isActive }),
            },
        });

        // Build changes array
        const changes: { field: string; old: string; new: string }[] = [];
        if (question && existingArticle.question !== question) {
            changes.push({ field: "question", old: existingArticle.question, new: question });
        }
        if (answer && existingArticle.answer !== answer) {
            changes.push({ field: "answer", old: existingArticle.answer.substring(0, 50) + "...", new: answer.substring(0, 50) + "..." });
        }
        if (typeof isActive === "boolean" && existingArticle.isActive !== isActive) {
            changes.push({ field: "isActive", old: existingArticle.isActive ? "เปิด" : "ปิด", new: isActive ? "เปิด" : "ปิด" });
        }

        // Audit log
        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.HELP_UPDATE,
            resource: "HelpArticle",
            resourceId: id,
            resourceName: existingArticle.question,
            details: {
                resourceName: existingArticle.question,
                changes,
            },
        });

        return NextResponse.json(article);
    } catch (error) {
        console.error("Error updating help article:", error);
        return NextResponse.json({ error: "Failed to update article" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await params;

        // Get article before deletion for audit log
        const article = await db.helpArticle.findUnique({
            where: { id },
        });

        if (!article) {
            return NextResponse.json({ error: "Article not found" }, { status: 404 });
        }

        await db.helpArticle.delete({ where: { id } });

        // Audit log
        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.HELP_DELETE,
            resource: "HelpArticle",
            resourceId: id,
            resourceName: article.question,
            details: {
                resourceName: article.question,
                deletedData: {
                    question: article.question,
                    category: article.category,
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting help article:", error);
        return NextResponse.json({ error: "Failed to delete article" }, { status: 500 });
    }
}
