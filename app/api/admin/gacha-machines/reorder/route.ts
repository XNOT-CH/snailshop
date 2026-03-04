import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db, gachaMachines } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
    const auth = await isAdmin();
    if (!auth.success) return NextResponse.json({ success: false }, { status: 401 });
    try {
        const body = await req.json() as { orders: { id: string; sortOrder: number }[] };
        if (!Array.isArray(body.orders)) return NextResponse.json({ success: false, message: "Invalid payload" }, { status: 400 });
        await Promise.all(body.orders.map(({ id, sortOrder }) => db.update(gachaMachines).set({ sortOrder }).where(eq(gachaMachines.id, id))));
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message }, { status: 500 });
    }
}
