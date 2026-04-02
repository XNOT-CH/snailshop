import { mysqlNow } from "@/lib/utils/date";
import { NextRequest, NextResponse } from "next/server";
import { db, footerWidgetSettings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { FOOTER_WIDGET_SETTINGS_SINGLETON_ID } from "@/lib/db/singletons";

async function getFooterWidgetSettingsRecord() {
    return (
        await db.query.footerWidgetSettings.findFirst({
            where: eq(footerWidgetSettings.id, FOOTER_WIDGET_SETTINGS_SINGLETON_ID),
        })
    ) ?? db.query.footerWidgetSettings.findFirst();
}

export async function GET() {
    try {
        let settings = await getFooterWidgetSettingsRecord();
        if (!settings) {
            await db.insert(footerWidgetSettings).values({ id: FOOTER_WIDGET_SETTINGS_SINGLETON_ID, isActive: true, title: "เมนูลัด", createdAt: mysqlNow(), updatedAt: mysqlNow() });
            settings = await getFooterWidgetSettingsRecord();
        }
        return NextResponse.json(settings);
    } catch {
        return NextResponse.json({ error: "Failed to fetch footer settings" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { isActive, title } = body;
        const settings = await getFooterWidgetSettingsRecord();
        if (settings) {
            const set: Record<string, unknown> = {};
            if (isActive !== undefined) set.isActive = isActive;
            if (title !== undefined) set.title = title;
            await db.update(footerWidgetSettings).set(set).where(eq(footerWidgetSettings.id, settings.id));
        } else {
            await db.insert(footerWidgetSettings).values({ id: FOOTER_WIDGET_SETTINGS_SINGLETON_ID, isActive: isActive ?? true, title: title ?? "เมนูลัด", createdAt: mysqlNow(), updatedAt: mysqlNow() });
        }
        const updated = await getFooterWidgetSettingsRecord();
        return NextResponse.json(updated);
    } catch {
        return NextResponse.json({ error: "Failed to update footer settings" }, { status: 500 });
    }
}
