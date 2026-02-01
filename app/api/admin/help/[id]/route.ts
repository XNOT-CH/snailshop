import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

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

        const article = await db.helpArticle.update({
            where: { id },
            data: {
                ...(question && { question }),
                ...(answer && { answer }),
                ...(category && { category }),
                ...(typeof isActive === "boolean" && { isActive }),
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
        await db.helpArticle.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting help article:", error);
        return NextResponse.json({ error: "Failed to delete article" }, { status: 500 });
    }
}
