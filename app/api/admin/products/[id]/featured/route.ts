import { NextRequest, NextResponse } from "next/server";
import { db, users, products } from "@/lib/db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { role: true } });
        if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        const { id } = await params;
        const body = await request.json();
        const { isFeatured } = body;
        if (typeof isFeatured !== "boolean") return NextResponse.json({ error: "isFeatured must be a boolean" }, { status: 400 });
        await db.update(products).set({ isFeatured }).where(eq(products.id, id));
        const product = await db.query.products.findFirst({ where: eq(products.id, id), columns: { id: true, name: true, isFeatured: true } });
        return NextResponse.json(product);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update featured status" }, { status: 500 });
    }
}
