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

export async function GET() {
    try {
        const articles = await db.helpArticle.findMany({
            orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
        });
        return NextResponse.json(articles);
    } catch (error) {
        console.error("Error fetching help articles:", error);
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { question, answer, category } = body;

        if (!question || !answer) {
            return NextResponse.json({ error: "Question and answer are required" }, { status: 400 });
        }

        const article = await db.helpArticle.create({
            data: {
                question,
                answer,
                category: category || "general",
            },
        });

        return NextResponse.json(article);
    } catch (error) {
        console.error("Error creating help article:", error);
        return NextResponse.json({ error: "Failed to create article" }, { status: 500 });
    }
}
