import { NextResponse } from "next/server";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db, topups } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// Maps the stored slip channel to a display label. Legacy rows (NULL) are excluded
// by the query, so only known channels reach here.
const CHANNEL_LABELS: Record<string, string> = {
    truewallet: "ทรูวอลเล็ท",
    bank: "โอนผ่านธนาคาร",
};

function labelForChannel(channel: string) {
    return CHANNEL_LABELS[channel] ?? channel;
}

export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    try {
        const rows = await db
            .select({
                channel: topups.paymentMethod,
                total: sql<string>`COALESCE(SUM(${topups.amount}), 0)`,
            })
            .from(topups)
            .where(and(eq(topups.status, "APPROVED"), isNotNull(topups.paymentMethod)))
            .groupBy(topups.paymentMethod)
            .orderBy(sql`SUM(${topups.amount}) DESC`);

        const data = rows
            .filter((row) => row.channel !== null)
            .map((row) => ({
                name: labelForChannel(row.channel as string),
                value: Number(row.total),
            }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("[ADMIN_DASHBOARD_SALES_DISTRIBUTION]", error);
        return NextResponse.json({ success: false, message: "Failed to load distribution data" }, { status: 500 });
    }
}
