import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, siteSettings } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS, getChanges } from "@/lib/auditLog";
import { mysqlNow } from "@/lib/utils/date";
import { validateBody } from "@/lib/validations/validate";
import { siteSettingsSchema } from "@/lib/validations/settings";
import { SITE_SETTINGS_SINGLETON_ID } from "@/lib/db/singletons";
import { PERMISSIONS } from "@/lib/permissions";

async function getSiteSettingsRecord() {
    return (
        await db.query.siteSettings.findFirst({
            where: eq(siteSettings.id, SITE_SETTINGS_SINGLETON_ID),
        })
    ) ?? db.query.siteSettings.findFirst();
}

export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.SETTINGS_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        let settings = await getSiteSettingsRecord();

        if (!settings) {
            await db.insert(siteSettings).values({
                id: SITE_SETTINGS_SINGLETON_ID,
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
                createdAt: mysqlNow(),
                updatedAt: mysqlNow(),
            });
            settings = await getSiteSettingsRecord();
        }

        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        console.error("Error fetching settings:", error);
        return NextResponse.json(
            {
                success: false,
                message: "เกิดข้อผิดพลาด: กรุณารัน 'npx drizzle-kit push' เพื่ออัปเดต database",
                error: String(error),
            },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    const authCheck = await requirePermission(PERMISSIONS.SETTINGS_EDIT);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const result = await validateBody(request, siteSettingsSchema.partial());
        if ("error" in result) return result.error;

        const body = result.data;
        const existing = await getSiteSettingsRecord();
        const changes = getChanges(
            existing as Record<string, unknown> | null,
            body as Partial<Record<string, unknown>>,
            Object.keys(body)
        );

        if (existing) {
            await db.update(siteSettings).set(body).where(eq(siteSettings.id, existing.id));
        } else {
            const newRecord = {
                id: SITE_SETTINGS_SINGLETON_ID,
                ...body,
                createdAt: mysqlNow(),
                updatedAt: mysqlNow(),
            };
            await db.insert(siteSettings).values(newRecord as typeof siteSettings.$inferInsert);
        }

        const updated = await getSiteSettingsRecord();
        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.SETTINGS_UPDATE,
            resource: "Settings",
            resourceId: updated?.id ?? existing?.id ?? "site-settings",
            resourceName: "Site Settings",
            changes,
        });

        return NextResponse.json({
            success: true,
            message: "บันทึกการตั้งค่าสำเร็จ",
            data: updated,
        });
    } catch (error) {
        console.error("Error updating settings:", error);
        return NextResponse.json(
            { success: false, message: `เกิดข้อผิดพลาด: ${String(error)}` },
            { status: 500 }
        );
    }
}
