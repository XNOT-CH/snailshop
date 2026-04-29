import { NextResponse } from "next/server";
import { db, footerLinks } from "@/lib/db";
import { eq } from "drizzle-orm";
import { FOOTER_WIDGET_SETTINGS_SINGLETON_ID } from "@/lib/db/singletons";
import { sanitizePublicFooterLinks } from "@/lib/footerLinks";

export async function GET() {
    try {
        const settings =
            await db.query.footerWidgetSettings.findFirst({
                where: (t, { eq: whereEq }) => whereEq(t.id, FOOTER_WIDGET_SETTINGS_SINGLETON_ID),
            })
            ?? await db.query.footerWidgetSettings.findFirst();

        if (!settings?.isActive) {
            return NextResponse.json({ settings: { isActive: false, title: "" }, links: [] });
        }
        const links = await db.query.footerLinks.findMany({
            where: eq(footerLinks.isActive, true),
            orderBy: (t, { asc }) => asc(t.sortOrder),
            columns: { id: true, label: true, href: true, openInNewTab: true },
        });
        return NextResponse.json({
            settings: { isActive: settings.isActive, title: settings.title },
            links: sanitizePublicFooterLinks(links),
        });
    } catch (error) {
        console.error("Error fetching footer widget:", error);
        return NextResponse.json({ settings: { isActive: false, title: "" }, links: [] }, { status: 500 });
    }
}
