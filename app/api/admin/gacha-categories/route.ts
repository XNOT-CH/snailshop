import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db, gachaCategories, gachaMachines } from "@/lib/db";
import { eq, count } from "drizzle-orm";

export async function GET() {
    const auth = await isAdmin();
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
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const body = await req.json() as { name: string; sortOrder?: number };
    const newId = crypto.randomUUID();
    await db.insert(gachaCategories).values({ id: newId, name: body.name, sortOrder: body.sortOrder ?? 0 });
    const category = await db.query.gachaCategories.findFirst({ where: eq(gachaCategories.id, newId) });
    return NextResponse.json({ success: true, data: category });
}
