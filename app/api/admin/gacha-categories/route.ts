import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const categories = await db.gachaCategory.findMany({
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { machines: true } } },
    });
    return NextResponse.json({ success: true, data: categories });
}

export async function POST(req: Request) {
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    const body = await req.json() as { name: string; sortOrder?: number };
    const category = await db.gachaCategory.create({
        data: { name: body.name, sortOrder: body.sortOrder ?? 0 },
    });
    return NextResponse.json({ success: true, data: category });
}
