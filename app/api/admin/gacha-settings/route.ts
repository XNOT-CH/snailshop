import { NextResponse } from "next/server";
import { db, gachaSettings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";

export async function GET() {
    try {
        let settings = await db.query.gachaSettings.findFirst();
        if (!settings) {
            await db.insert(gachaSettings).values({ id: "default", isEnabled: true, costType: "CREDIT", costAmount: "0", dailySpinLimit: 999, tierMode: "PRICE" });
            settings = await db.query.gachaSettings.findFirst();
        }
        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการโหลดการตั้งค่ากาชา" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    try {
        const body = await request.json();
        const updateData = {
            isEnabled: body.isEnabled ?? true, costType: body.costType ?? "FREE",
            costAmount: String(body.costAmount ?? 0), dailySpinLimit: body.dailySpinLimit ?? 0,
            tierMode: body.tierMode ?? "PRICE",
        };
        const existing = await db.query.gachaSettings.findFirst();
        if (existing) {
            await db.update(gachaSettings).set(updateData).where(eq(gachaSettings.id, existing.id));
        } else {
            await db.insert(gachaSettings).values({ id: "default", ...updateData });
        }
        const updated = await db.query.gachaSettings.findFirst();
        return NextResponse.json({ success: true, message: "บันทึกการตั้งค่ากาชาสำเร็จ", data: updated });
    } catch (error) {
        return NextResponse.json({ success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : "Unknown error"}` }, { status: 500 });
    }
}
