import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { db, gachaMachines } from "@/lib/db";
import { eq } from "drizzle-orm";
import { PERMISSIONS } from "@/lib/permissions";
import { gachaApiError } from "@/lib/features/gacha/apiResponse";

export async function POST(req: Request) {
    const auth = await requirePermission(PERMISSIONS.GACHA_EDIT);
    if (!auth.success) return gachaApiError(undefined, { status: 401 });
    try {
        const body = await req.json() as { orders: { id: string; sortOrder: number }[] };
        if (!Array.isArray(body.orders)) return gachaApiError("Invalid payload", { status: 400 });
        await Promise.all(body.orders.map(({ id, sortOrder }) => db.update(gachaMachines).set({ sortOrder }).where(eq(gachaMachines.id, id))));
        return NextResponse.json({ success: true });
    } catch (e: unknown) {
        return gachaApiError(e instanceof Error ? e.message : "Unknown error", { status: 500 });
    }
}
