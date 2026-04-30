import { NextRequest, NextResponse } from "next/server";
import { db, products } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { invalidateProductCaches } from "@/lib/cache";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions";

const featuredSchema = z.object({
    isFeatured: z.boolean({ message: "isFeatured ต้องเป็น boolean" }),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.PRODUCT_EDIT);
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { id } = await params;
        let raw: unknown;
        try { raw = await request.json(); } catch {
            return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง (invalid JSON)" }, { status: 400 });
        }
        const parsed = featuredSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
        }
        const { isFeatured } = parsed.data;
        await db.update(products).set({ isFeatured }).where(eq(products.id, id));
        await invalidateProductCaches();
        const product = await db.query.products.findFirst({ where: eq(products.id, id), columns: { id: true, name: true, isFeatured: true } });
        return NextResponse.json(product);
    } catch (error) {
        console.error("[PRODUCT_FEATURED]", error);
        return NextResponse.json({ error: "Failed to update featured status" }, { status: 500 });
    }
}
