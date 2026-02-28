import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
    const machines = await db.gachaMachine.findMany({
        where: { isActive: true, isEnabled: true },
        orderBy: { sortOrder: "asc" },
        select: {
            id: true,
            name: true,
            imageUrl: true,
            gameType: true,
            costType: true,
            costAmount: true,
            categoryId: true,
            category: { select: { id: true, name: true } },
        },
    });
    return NextResponse.json({ success: true, data: machines });
}
