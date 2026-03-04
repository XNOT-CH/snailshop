import { NextResponse } from "next/server";
import { db, gachaMachines } from "@/lib/db";
import { eq, and, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
    const machines = await db.query.gachaMachines.findMany({
        where: and(eq(gachaMachines.isActive, true), eq(gachaMachines.isEnabled, true)),
        orderBy: (t, { asc }) => asc(t.sortOrder),
        columns: {
            id: true, name: true, imageUrl: true, gameType: true,
            costType: true, costAmount: true, categoryId: true,
        },
        with: {
            category: { columns: { id: true, name: true } },
        },
    });
    return NextResponse.json({ success: true, data: machines });
}
