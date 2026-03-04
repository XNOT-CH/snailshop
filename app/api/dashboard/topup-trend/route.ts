import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, topups } from "@/lib/db";
import { and, gte, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

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

        // Parse date range params
        const startParam = request.nextUrl.searchParams.get("startDate");
        const endParam = request.nextUrl.searchParams.get("endDate");
        const dateParam = request.nextUrl.searchParams.get("date");

        let startDate: Date;
        let endDate: Date;

        if (startParam && endParam) {
            startDate = new Date(startParam);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(endParam);
            endDate.setHours(23, 59, 59, 999);
        } else {
            // Fallback: 7 days ending on target date
            const targetDate = dateParam ? new Date(dateParam) : new Date();
            endDate = new Date(targetDate);
            endDate.setHours(23, 59, 59, 999);
            startDate = new Date(targetDate);
            startDate.setDate(targetDate.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
        }

        const topupList = await db.select({ amount: topups.amount, status: topups.status, createdAt: topups.createdAt })
            .from(topups)
            .where(and(gte(topups.createdAt, startDate.toISOString().slice(0, 19).replace("T", " "),), lte(topups.createdAt, endDate.toISOString().slice(0, 19).replace("T", " "))));
        // alias for rest of logic
        const topupItems = topupList;

        // Build a map for every day in the range
        const dailyMap = new Map<string, { amount: number; transactions: number }>();
        const dayCount = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        for (let i = 0; i < dayCount; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
            dailyMap.set(key, { amount: 0, transactions: 0 });
        }

        // Aggregate by date
        for (const t of topupItems) {
            const key = new Date(t.createdAt).toISOString().slice(0, 10);
            const entry = dailyMap.get(key);
            if (entry) {
                entry.transactions++;
                if (t.status === "APPROVED") {
                    entry.amount += Number(t.amount);
                }
            }
        }

        // Convert to array with Thai-formatted labels
        const data = Array.from(dailyMap.entries()).map(([dateStr, vals]) => {
            const d = new Date(dateStr);
            const label = d.toLocaleDateString("th-TH", {
                day: "2-digit",
                month: "short",
            });
            return {
                date: label,
                rawDate: dateStr,
                dayOfWeek: d.getDay(),
                amount: vals.amount,
                transactions: vals.transactions,
            };
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Topup trend error:", error);
        return NextResponse.json(
            { success: false, message: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
