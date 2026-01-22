import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
    // Check if user is admin
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json(
            { success: false, message: authCheck.error },
            { status: 401 }
        );
    }

    try {
        const { id, action } = await request.json();

        if (!id || !action) {
            return NextResponse.json(
                { success: false, message: "Missing id or action" },
                { status: 400 }
            );
        }

        if (!["APPROVE", "REJECT"].includes(action)) {
            return NextResponse.json(
                { success: false, message: "Invalid action. Use APPROVE or REJECT" },
                { status: 400 }
            );
        }

        // Find the topup request
        const topup = await db.topup.findUnique({
            where: { id },
            include: { user: true },
        });

        if (!topup) {
            return NextResponse.json(
                { success: false, message: "Topup request not found" },
                { status: 404 }
            );
        }

        if (topup.status !== "PENDING") {
            return NextResponse.json(
                { success: false, message: "Request already processed" },
                { status: 400 }
            );
        }

        if (action === "APPROVE") {
            // Use transaction to update both topup status and user balance
            await db.$transaction([
                db.topup.update({
                    where: { id },
                    data: { status: "APPROVED" },
                }),
                db.user.update({
                    where: { id: topup.userId },
                    data: {
                        creditBalance: {
                            increment: topup.amount,
                        },
                    },
                }),
            ]);

            return NextResponse.json({
                success: true,
                message: `Approved! Added ฿${Number(topup.amount).toLocaleString()} to ${topup.user.username}'s balance`,
            });
        } else {
            // REJECT: Just update status
            await db.topup.update({
                where: { id },
                data: { status: "REJECTED" },
            });

            return NextResponse.json({
                success: true,
                message: "Request rejected",
            });
        }
    } catch (error) {
        console.error("Slip approval error:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to process request",
            },
            { status: 500 }
        );
    }
}
