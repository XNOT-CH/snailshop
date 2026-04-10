import { mysqlNow } from "@/lib/utils/date";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db, gachaCategories } from "@/lib/db";
import { eq } from "drizzle-orm";
import { PERMISSIONS } from "@/lib/permissions";

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
    const auth = await requirePermission(PERMISSIONS.GACHA_EDIT);
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const body = await req.json() as { name: string; sortOrder?: number };
    const newId = crypto.randomUUID();
    await db.insert(gachaCategories).values({ id: newId, name: body.name, sortOrder: body.sortOrder ?? 0, createdAt: mysqlNow(), updatedAt: mysqlNow() });
    const category = await db.query.gachaCategories.findFirst({ where: eq(gachaCategories.id, newId) });
    return NextResponse.json({ success: true, data: category });
}
