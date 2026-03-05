import { NextResponse } from "next/server";
import { db, siteSettings } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { validateBody } from "@/lib/validations/validate";
import { siteSettingsSchema } from "@/lib/validations/settings";

export async function GET() {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    try {
        let settings = await db.query.siteSettings.findFirst();

        if (!settings) {
            const newId = crypto.randomUUID();
            await db.insert(siteSettings).values({
                id: newId,
                heroTitle: "GameStore",
                heroDescription: "Game ID Marketplace",
                bannerImage1: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=2000&h=500&fit=crop",
                bannerTitle1: "Game ID Marketplace",
                bannerSubtitle1: "ซื้อขายไอดีเกมปลอดภัย 100%",
                bannerImage2: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=2000&h=500&fit=crop",
                bannerTitle2: "ROV, Valorant, Genshin",
                bannerSubtitle2: "ไอดีคุณภาพ ราคาถูก พร้อมเล่นทันที",
                bannerImage3: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=2000&h=500&fit=crop",
                bannerTitle3: "Instant Delivery 24/7",
                bannerSubtitle3: "ระบบอัตโนมัติ ได้ของทันทีไม่ต้องรอ",
            });
            settings = await db.query.siteSettings.findFirst();
        }

        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        console.error("Error fetching settings:", error);
        return NextResponse.json(
            { success: false, message: "เกิดข้อผิดพลาด: กรุณารัน 'npx drizzle-kit push' เพื่ออัปเดต database", error: String(error) },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });

    try {
        const result = await validateBody(request, siteSettingsSchema.partial());
        if ("error" in result) return result.error;
        const body = result.data;

        const existing = await db.query.siteSettings.findFirst();
        if (existing) {
            await db.update(siteSettings).set(body as any).where(
                (await import("drizzle-orm")).eq(siteSettings.id, existing.id)
            );
        } else {
            await db.insert(siteSettings).values({ id: crypto.randomUUID(), ...body } as any);
        }

        const updated = await db.query.siteSettings.findFirst();
        return NextResponse.json({ success: true, message: "บันทึกการตั้งค่าสำเร็จ", data: updated });
    } catch (error) {
        console.error("Error updating settings:", error);
        return NextResponse.json({ success: false, message: `เกิดข้อผิดพลาด: ${String(error)}` }, { status: 500 });
    }
}
