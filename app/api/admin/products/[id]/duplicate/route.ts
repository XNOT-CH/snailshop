import { NextRequest, NextResponse } from "next/server";
import { db, users, products } from "@/lib/db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { role: true } });
        if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        const { id } = await params;
        const original = await db.query.products.findFirst({ where: eq(products.id, id) });
        if (!original) return NextResponse.json({ error: "Product not found" }, { status: 404 });
        const newId = crypto.randomUUID();
        await db.insert(products).values({
            id: newId, name: `${original.name} (สำเนา)`, description: original.description,
            price: original.price, discountPrice: null, imageUrl: original.imageUrl,
            category: original.category, secretData: "", isSold: false, isFeatured: false, sortOrder: 0,
        });
        const duplicate = await db.query.products.findFirst({ where: eq(products.id, newId) });
        return NextResponse.json({ success: true, product: duplicate });
    } catch (error) {
        return NextResponse.json({ error: "Failed to duplicate product" }, { status: 500 });
    }
}
