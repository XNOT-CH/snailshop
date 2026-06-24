import { mysqlNow } from "@/lib/utils/date";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, requirePermissionWithCsrf } from "@/lib/auth";
import { db, gachaCategories } from "@/lib/db";
import { eq } from "drizzle-orm";
import { PERMISSIONS } from "@/lib/permissions";

const createCategorySchema = z.object({
    name: z.string().trim().min(1, "ต้องระบุชื่อหมวดหมู่").max(100, "ชื่อหมวดหมู่ต้องไม่เกิน 100 ตัวอักษร"),
    sortOrder: z.coerce.number().int().optional(),
});

export async function GET() {
    const auth = await requirePermission(PERMISSIONS.GACHA_VIEW);
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const categories = await db.query.gachaCategories.findMany({
        orderBy: (t, { asc }) => asc(t.sortOrder),
        with: { machines: { columns: { id: true } } },
    });
    // Mimic _count.machines
    const data = categories.map(c => ({ ...c, _count: { machines: c.machines.length }, machines: undefined }));
    return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
    const auth = await requirePermissionWithCsrf(req, PERMISSIONS.GACHA_EDIT);
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });

    try {
        let raw: unknown;
        try { raw = await req.json(); } catch {
            return NextResponse.json({ success: false, message: "ข้อมูลไม่ถูกต้อง (invalid JSON)" }, { status: 400 });
        }
        const parsed = createCategorySchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
        }

        const newId = crypto.randomUUID();
        await db.insert(gachaCategories).values({ id: newId, name: parsed.data.name, sortOrder: parsed.data.sortOrder ?? 0, createdAt: mysqlNow(), updatedAt: mysqlNow() });
        const category = await db.query.gachaCategories.findFirst({ where: eq(gachaCategories.id, newId) });
        return NextResponse.json({ success: true, data: category });
    } catch (error) {
        console.error("[GACHA_CATEGORY_CREATE]", error);
        return NextResponse.json({ success: false, message: "Failed to create category" }, { status: 500 });
    }
}
