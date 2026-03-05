import { NextResponse } from "next/server";
import { db, gachaSettings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { validateBody } from "@/lib/validations/validate";
import { gachaSettingsSchema } from "@/lib/validations/gacha";

export async function GET() {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
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
        const result = await validateBody(request, gachaSettingsSchema);
        if ("error" in result) return result.error;
        const body = result.data;

        const updateData = {
            isEnabled: body.isEnabled,
            costType: body.costType,
            costAmount: String(body.costAmount),
            dailySpinLimit: body.dailySpinLimit,
            tierMode: body.tierMode,
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
