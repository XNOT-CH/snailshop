import { NextResponse } from "next/server";
import { db, navItems } from "@/lib/db";
import { eq } from "drizzle-orm";
import { contentApiError } from "@/lib/features/content/apiResponse";

export async function GET() {
    try {
        const items = await db.query.navItems.findMany({
            where: eq(navItems.isActive, true),
            orderBy: (t, { asc }) => asc(t.sortOrder),
            columns: { id: true, label: true, href: true, icon: true },
        });
        return NextResponse.json(items);
    } catch (error) {
        console.error("Error fetching active nav items:", error);
        return contentApiError("Failed to fetch nav items", { status: 500 });
    }
}
