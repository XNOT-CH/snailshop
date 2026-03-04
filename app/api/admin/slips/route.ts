import { NextRequest, NextResponse } from "next/server";
import { db, topups, users } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });

    try {
        const { id, action } = await request.json();
        if (!id || !action) return NextResponse.json({ success: false, message: "Missing id or action" }, { status: 400 });
        if (!["APPROVE", "REJECT"].includes(action)) return NextResponse.json({ success: false, message: "Invalid action. Use APPROVE or REJECT" }, { status: 400 });

        const topup = await db.query.topups.findFirst({
            where: eq(topups.id, id),
            with: { user: true },
        });

        if (!topup) return NextResponse.json({ success: false, message: "Topup request not found" }, { status: 404 });
        if (topup.status !== "PENDING") return NextResponse.json({ success: false, message: "Request already processed" }, { status: 400 });

        if (action === "APPROVE") {
            await db.update(topups).set({ status: "APPROVED" }).where(eq(topups.id, id));
            await db.update(users).set({ creditBalance: sql`creditBalance + ${Number(topup.amount)}` }).where(eq(users.id, topup.userId));
            return NextResponse.json({
                success: true,
                message: `Approved! Added ฿${Number(topup.amount).toLocaleString()} to ${topup.user.username}'s balance`,
            });
        } else {
            await db.update(topups).set({ status: "REJECTED" }).where(eq(topups.id, id));
            return NextResponse.json({ success: true, message: "Request rejected" });
        }
    } catch (error) {
        console.error("Slip approval error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed to process request" },
            { status: 500 }
        );
    }
}
