import { NextResponse } from "next/server";
import { db, siteSettings } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export async function GET() {
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
        const body = await request.json();
        const existing = await db.query.siteSettings.findFirst();

        const updateData: Record<string, unknown> = {
            heroTitle: body.heroTitle || "GameStore",
            heroDescription: body.heroDescription || "Game ID Marketplace",
        };
        const optionalFields = ["announcement", "bannerImage1", "bannerTitle1", "bannerSubtitle1", "bannerImage2", "bannerTitle2",
            "bannerSubtitle2", "bannerImage3", "bannerTitle3", "bannerSubtitle3", "logoUrl", "backgroundImage", "showAllProducts"];
        for (const field of optionalFields) {
            if (body[field] !== undefined) updateData[field] = body[field];
        }

        if (existing) {
            await db.update(siteSettings).set(updateData as any).where(
                (await import("drizzle-orm")).eq(siteSettings.id, existing.id)
            );
        } else {
            await db.insert(siteSettings).values({ id: crypto.randomUUID(), ...updateData } as any);
        }

        const updated = await db.query.siteSettings.findFirst();
        return NextResponse.json({ success: true, message: "บันทึกการตั้งค่าสำเร็จ", data: updated });
    } catch (error) {
        console.error("Error updating settings:", error);
        return NextResponse.json({ success: false, message: `เกิดข้อผิดพลาด: ${String(error)}` }, { status: 500 });
    }
}
