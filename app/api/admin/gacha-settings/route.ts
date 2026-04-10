import { mysqlNow } from "@/lib/utils/date";
import { NextResponse } from "next/server";
import { db, gachaSettings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";
import { validateBody } from "@/lib/validations/validate";
import { gachaSettingsSchema } from "@/lib/validations/gacha";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.GACHA_VIEW);
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    try {
        let settings = await db.query.gachaSettings.findFirst();
        if (!settings) {
            await db.insert(gachaSettings).values({ id: "default", isEnabled: true, costType: "CREDIT", costAmount: "0", dailySpinLimit: 999, tierMode: "PRICE", updatedAt: mysqlNow() });
            settings = await db.query.gachaSettings.findFirst();
        }
        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        console.error("[GACHA_SETTINGS_GET]", error);
        return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการโหลดการตั้งค่ากาชา" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const authCheck = await requirePermission(PERMISSIONS.GACHA_EDIT);
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
            await db.insert(gachaSettings).values({ id: "default", ...updateData, updatedAt: mysqlNow() });
        }
        const updated = await db.query.gachaSettings.findFirst();
        return NextResponse.json({ success: true, message: "บันทึกการตั้งค่ากาชาสำเร็จ", data: updated });
    } catch (error) {
        console.error("[GACHA_SETTINGS_PUT]", error);
        return NextResponse.json({ success: false, message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : "Unknown error"}` }, { status: 500 });
    }
}
