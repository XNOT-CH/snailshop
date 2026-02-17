import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// ─── Bank Color Map ─────────────────────────────────────
const BANK_COLORS: Record<string, string> = {
    KBANK: "#00A651",
    SCB: "#4E2A84",
    KTB: "#1BA5E0",
    BBL: "#1E3A8A",
    BAY: "#FFC107",
    TMB: "#004EC4",
    TTB: "#FC4F1F",
    GSB: "#E91E8B",
    TRUEWALLET: "#FF6600",
    TRUEMONEY: "#FF6600",
    PROMPTPAY: "#003B71",
};

function getBankColor(bank: string | null): string {
    if (!bank) return "#9ca3af";
    const key = bank.toUpperCase().replace(/\s+/g, "");
    return BANK_COLORS[key] || "#6366f1";
}

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value;

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "กรุณาเข้าสู่ระบบก่อน" },
                { status: 401 }
            );
        }

        // Parse date range params (supports single "date" or "startDate"+"endDate")
        const startParam = request.nextUrl.searchParams.get("startDate");
        const endParam = request.nextUrl.searchParams.get("endDate");
        const dateParam = request.nextUrl.searchParams.get("date");

        let todayStart: Date;
        let todayEnd: Date;

        if (startParam && endParam) {
            todayStart = new Date(startParam);
            todayStart.setHours(0, 0, 0, 0);
            todayEnd = new Date(endParam);
            todayEnd.setHours(23, 59, 59, 999);
        } else {
            const targetDate = dateParam ? new Date(dateParam) : new Date();
            todayStart = new Date(targetDate);
            todayStart.setHours(0, 0, 0, 0);
            todayEnd = new Date(targetDate);
            todayEnd.setHours(23, 59, 59, 999);
        }

        // Fetch ALL today's topups (all statuses)
        const topups = await db.topup.findMany({
            where: {
                createdAt: {
                    gte: todayStart,
                    lte: todayEnd,
                },
            },
            include: {
                user: {
                    select: {
                        username: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // ── Status Summary ──────────────────────────────
        const statusSummary = {
            approved: { count: 0, amount: 0 },
            pending: { count: 0, amount: 0 },
            rejected: { count: 0, amount: 0 },
        };

        for (const t of topups) {
            const amt = Number(t.amount);
            switch (t.status) {
                case "APPROVED":
                    statusSummary.approved.count++;
                    statusSummary.approved.amount += amt;
                    break;
                case "PENDING":
                    statusSummary.pending.count++;
                    statusSummary.pending.amount += amt;
                    break;
                case "REJECTED":
                    statusSummary.rejected.count++;
                    statusSummary.rejected.amount += amt;
                    break;
            }
        }

        // ── Total KPI ────────────────────────────────────
        const totalAmount = statusSummary.approved.amount;
        const allTransactions = topups.length;
        const uniqueUsers = new Set(
            topups.filter((t) => t.status === "APPROVED").map((t) => t.userId)
        );
        const averagePerTransaction =
            statusSummary.approved.count > 0
                ? Math.round(totalAmount / statusSummary.approved.count)
                : 0;

        // ── Hourly Breakdown (APPROVED only) ────────────
        const hourlyMap = new Map<number, number>();
        for (let h = 0; h < 24; h++) {
            hourlyMap.set(h, 0);
        }
        for (const t of topups) {
            if (t.status === "APPROVED") {
                const hour = new Date(t.createdAt).getHours();
                hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + Number(t.amount));
            }
        }
        const hourlyData = Array.from(hourlyMap.entries()).map(([hour, amount]) => ({
            hour: `${hour.toString().padStart(2, "0")}:00`,
            amount,
        }));

        // ── Payment Method Distribution (APPROVED only) ─
        const methodMap = new Map<string, { count: number; amount: number }>();
        for (const t of topups) {
            if (t.status === "APPROVED") {
                const bank = t.senderBank || "ไม่ระบุ";
                const existing = methodMap.get(bank) || { count: 0, amount: 0 };
                existing.count++;
                existing.amount += Number(t.amount);
                methodMap.set(bank, existing);
            }
        }
        const paymentMethods = Array.from(methodMap.entries()).map(
            ([name, data]) => ({
                name,
                count: data.count,
                amount: data.amount,
                color: getBankColor(name),
            })
        );

        return NextResponse.json({
            success: true,
            data: {
                date: todayStart.toISOString(),
                totalAmount,
                totalPeople: uniqueUsers.size,
                totalTransactions: statusSummary.approved.count,
                allTransactions,
                averagePerTransaction,
                statusSummary,
                hourlyData,
                paymentMethods,
                records: topups.map((t) => ({
                    id: t.id,
                    username: t.user.username,
                    amount: Number(t.amount),
                    time: t.createdAt.toISOString(),
                    status: t.status,
                    senderBank: t.senderBank,
                    proofImage: t.proofImage,
                    transactionRef: t.transactionRef,
                    rejectReason: t.rejectReason,
                })),
            },
        });
    } catch (error) {
        console.error("Topup summary error:", error);
        return NextResponse.json(
            { success: false, message: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
