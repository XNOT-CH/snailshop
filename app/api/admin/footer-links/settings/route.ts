import { mysqlNow } from "@/lib/utils/date";
import { NextRequest, NextResponse } from "next/server";
import { db, footerWidgetSettings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { FOOTER_WIDGET_SETTINGS_SINGLETON_ID } from "@/lib/db/singletons";
import { requirePermission, requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { PERMISSIONS } from "@/lib/permissions";
import { contentApiError } from "@/lib/features/content/apiResponse";

async function getFooterWidgetSettingsRecord() {
    return (
        await db.query.footerWidgetSettings.findFirst({
            where: eq(footerWidgetSettings.id, FOOTER_WIDGET_SETTINGS_SINGLETON_ID),
        })
    ) ?? db.query.footerWidgetSettings.findFirst();
}

export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.SETTINGS_VIEW);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });
    try {
        let settings = await getFooterWidgetSettingsRecord();
        if (!settings) {
            await db.insert(footerWidgetSettings).values({ id: FOOTER_WIDGET_SETTINGS_SINGLETON_ID, isActive: true, title: "เมนูลัด", createdAt: mysqlNow(), updatedAt: mysqlNow() });
            settings = await getFooterWidgetSettingsRecord();
        }
        return NextResponse.json(settings);
    } catch {
        return contentApiError("Failed to fetch footer settings", { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.SETTINGS_EDIT);
    if (!authCheck.success) return contentApiError("Unauthorized", { status: 401 });
    try {
        const body = await request.json();
        const { isActive, title, secondaryTitle } = body;
        const settings = await getFooterWidgetSettingsRecord();
        if (settings) {
            const set: Record<string, unknown> = {};
            if (isActive !== undefined) set.isActive = isActive;
            if (title !== undefined) set.title = title;
            if (secondaryTitle !== undefined) set.secondaryTitle = secondaryTitle;
            await db.update(footerWidgetSettings).set(set).where(eq(footerWidgetSettings.id, settings.id));
        } else {
            await db.insert(footerWidgetSettings).values({ id: FOOTER_WIDGET_SETTINGS_SINGLETON_ID, isActive: isActive ?? true, title: title ?? "เมนูลัด", createdAt: mysqlNow(), updatedAt: mysqlNow() });
        }
        const updated = await getFooterWidgetSettingsRecord();

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.SETTINGS_UPDATE,
            resource: "FooterWidgetSettings",
            resourceId: updated?.id ?? FOOTER_WIDGET_SETTINGS_SINGLETON_ID,
            resourceName: "Footer Widget Settings",
            details: { operation: "update", isActive, title, secondaryTitle },
        });

        return NextResponse.json(updated);
    } catch {
        return contentApiError("Failed to update footer settings", { status: 500 });
    }
}
