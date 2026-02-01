import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - ดึงข่าวสารที่ active สำหรับแสดงหน้าแรก
export async function GET() {
    try {
        const news = await db.newsArticle.findMany({
            where: { isActive: true },
            orderBy: [
                { sortOrder: "asc" },
                { createdAt: "desc" },
            ],
            take: 6, // จำกัดจำนวนข่าวสารที่แสดง
        });

        return NextResponse.json(news);
    } catch (error) {
        console.error("Error fetching news:", error);
        return NextResponse.json(
            { error: "Failed to fetch news" },
            { status: 500 }
        );
    }
}
