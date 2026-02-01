import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - ดึงข่าวสารตาม ID
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const news = await db.newsArticle.findUnique({
            where: { id },
        });

        if (!news) {
            return NextResponse.json(
                { error: "News not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(news);
    } catch (error) {
        console.error("Error fetching news:", error);
        return NextResponse.json(
            { error: "Failed to fetch news" },
            { status: 500 }
        );
    }
}

// PUT - อัพเดทข่าวสาร
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { title, description, imageUrl, link, sortOrder, isActive } = body;

        const news = await db.newsArticle.update({
            where: { id },
            data: {
                title,
                description,
                imageUrl,
                link,
                sortOrder,
                isActive,
            },
        });

        return NextResponse.json(news);
    } catch (error) {
        console.error("Error updating news:", error);
        return NextResponse.json(
            { error: "Failed to update news" },
            { status: 500 }
        );
    }
}

// DELETE - ลบข่าวสาร
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await db.newsArticle.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting news:", error);
        return NextResponse.json(
            { error: "Failed to delete news" },
            { status: 500 }
        );
    }
}
