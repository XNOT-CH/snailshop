import { mysqlNow } from "@/lib/utils/date";
import { NextRequest, NextResponse } from "next/server";
import { db, footerWidgetSettings, footerLinks } from "@/lib/db";
import { max } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";
import { validateBody } from "@/lib/validations/validate";
import { footerLinkSchema } from "@/lib/validations/content";
import { FOOTER_WIDGET_SETTINGS_SINGLETON_ID } from "@/lib/db/singletons";
import { PERMISSIONS } from "@/lib/permissions";

async function getFooterWidgetSettingsRecord() {
    return (
        await db.query.footerWidgetSettings.findFirst({
            where: (t, { eq }) => eq(t.id, FOOTER_WIDGET_SETTINGS_SINGLETON_ID),
        })
    ) ?? db.query.footerWidgetSettings.findFirst();
}

export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.SETTINGS_VIEW);
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        let settings = await getFooterWidgetSettingsRecord();
        if (!settings) {
            await db.insert(footerWidgetSettings).values({ id: FOOTER_WIDGET_SETTINGS_SINGLETON_ID, isActive: true, title: "เมนูลัด", createdAt: mysqlNow(), updatedAt: mysqlNow() });
            settings = await getFooterWidgetSettingsRecord();
        }
        const links = await db.query.footerLinks.findMany({ orderBy: (t, { asc }) => asc(t.sortOrder) });
        return NextResponse.json({ settings, links });
    } catch (error) {
        console.error("Error fetching footer links:", error);
        return NextResponse.json({ error: "Failed to fetch footer links" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.SETTINGS_EDIT);
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const result = await validateBody(request, footerLinkSchema);
        if ("error" in result) return result.error;
        const { label, href, openInNewTab } = result.data;

        const [{ maxSort }] = await db.select({ maxSort: max(footerLinks.sortOrder) }).from(footerLinks);
        const nextSortOrder = (maxSort ?? -1) + 1;
        const newId = crypto.randomUUID();
        await db.insert(footerLinks).values({ id: newId, label, href, openInNewTab: openInNewTab ?? false, sortOrder: nextSortOrder, createdAt: mysqlNow(), updatedAt: mysqlNow() });
        const link = await db.query.footerLinks.findFirst({ where: (t, { eq }) => eq(t.id, newId) });
        return NextResponse.json(link, { status: 201 });
    } catch (error) {
        console.error("Error creating footer link:", error);
        return NextResponse.json({ error: "Failed to create footer link" }, { status: 500 });
    }
}
