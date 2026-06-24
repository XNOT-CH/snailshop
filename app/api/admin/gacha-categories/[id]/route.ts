import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { db, gachaCategories } from "@/lib/db";
import { eq } from "drizzle-orm";
import { PERMISSIONS } from "@/lib/permissions";

type RouteParams = { params: Promise<{ id: string }> };

const updateCategorySchema = z.object({
    name: z.string().trim().min(1, "ต้องระบุชื่อหมวดหมู่").max(100, "ชื่อหมวดหมู่ต้องไม่เกิน 100 ตัวอักษร").optional(),
    sortOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
}).refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: "ต้องระบุข้อมูลที่ต้องการแก้ไขอย่างน้อย 1 ฟิลด์" }
);

export async function PATCH(req: Request, { params }: RouteParams) {
    const auth = await requirePermissionWithCsrf(req, PERMISSIONS.GACHA_EDIT);
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });

    try {
        const { id } = await params;
        let raw: unknown;
        try { raw = await req.json(); } catch {
            return NextResponse.json({ success: false, message: "ข้อมูลไม่ถูกต้อง (invalid JSON)" }, { status: 400 });
        }
        const parsed = updateCategorySchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
        }

        const existing = await db.query.gachaCategories.findFirst({ where: eq(gachaCategories.id, id) });
        if (!existing) return NextResponse.json({ success: false, message: "ไม่พบหมวดหมู่" }, { status: 404 });

        const set: Record<string, unknown> = {};
        if (parsed.data.name !== undefined) set.name = parsed.data.name;
        if (parsed.data.sortOrder !== undefined) set.sortOrder = parsed.data.sortOrder;
        if (parsed.data.isActive !== undefined) set.isActive = parsed.data.isActive;

        await db.update(gachaCategories).set(set).where(eq(gachaCategories.id, id));
        const updated = await db.query.gachaCategories.findFirst({ where: eq(gachaCategories.id, id) });
        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error("[GACHA_CATEGORY_UPDATE]", error);
        return NextResponse.json({ success: false, message: "Failed to update category" }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
    const auth = await requirePermissionWithCsrf(_req, PERMISSIONS.GACHA_EDIT);
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });

    try {
        const { id } = await params;
        const existing = await db.query.gachaCategories.findFirst({ where: eq(gachaCategories.id, id) });
        if (!existing) return NextResponse.json({ success: false, message: "ไม่พบหมวดหมู่" }, { status: 404 });

        // Machines reference this category with onDelete: "set null", so deleting it
        // leaves the machines intact but uncategorized (no cascade data loss).
        await db.delete(gachaCategories).where(eq(gachaCategories.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[GACHA_CATEGORY_DELETE]", error);
        return NextResponse.json({ success: false, message: "Failed to delete category" }, { status: 500 });
    }
}
