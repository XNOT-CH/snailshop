import { NextRequest, NextResponse } from "next/server";
import { db, products } from "@/lib/db";
import { mysqlNow } from "@/lib/utils/date";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authCheck = await requirePermission(PERMISSIONS.PRODUCT_CREATE);
        if (!authCheck.success) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        const { id } = await params;
        const original = await db.query.products.findFirst({ where: eq(products.id, id) });
        if (!original) return NextResponse.json({ error: "Product not found" }, { status: 404 });
        const newId = crypto.randomUUID();
        await db.insert(products).values({
            id: newId, name: `${original.name} (สำเนา)`, description: original.description,
            price: original.price, discountPrice: null, imageUrl: original.imageUrl,
            category: original.category, secretData: "", isSold: false, isFeatured: false, sortOrder: 0,
            createdAt: mysqlNow(),
            updatedAt: mysqlNow(),
        });
        const duplicate = await db.query.products.findFirst({ where: eq(products.id, newId) });
        return NextResponse.json({ success: true, product: duplicate });
    } catch (error) {
        console.error("[PRODUCT_DUPLICATE]", error);
        return NextResponse.json({ error: "Failed to duplicate product" }, { status: 500 });
    }
}
