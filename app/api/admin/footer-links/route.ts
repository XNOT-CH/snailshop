import { NextRequest, NextResponse } from "next/server";
import { db, footerWidgetSettings, footerLinks } from "@/lib/db";
import { asc, max } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { validateBody } from "@/lib/validations/validate";
import { footerLinkSchema } from "@/lib/validations/content";

export async function GET() {
    try {
        let settings = await db.query.footerWidgetSettings.findFirst();
        if (!settings) {
            const newId = crypto.randomUUID();
            await db.insert(footerWidgetSettings).values({ id: newId, isActive: true, title: "เมนูลัด" });
            settings = await db.query.footerWidgetSettings.findFirst();
        }
        const links = await db.query.footerLinks.findMany({ orderBy: (t, { asc }) => asc(t.sortOrder) });
        return NextResponse.json({ settings, links });
    } catch (error) {
        console.error("Error fetching footer links:", error);
        return NextResponse.json({ error: "Failed to fetch footer links" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const result = await validateBody(request, footerLinkSchema);
        if ("error" in result) return result.error;
        const { label, href, openInNewTab } = result.data;

        const [{ maxSort }] = await db.select({ maxSort: max(footerLinks.sortOrder) }).from(footerLinks);
        const nextSortOrder = (maxSort ?? -1) + 1;
        const newId = crypto.randomUUID();
        await db.insert(footerLinks).values({ id: newId, label, href, openInNewTab: openInNewTab ?? false, sortOrder: nextSortOrder });
        const link = await db.query.footerLinks.findFirst({ where: (t, { eq }) => eq(t.id, newId) });
        return NextResponse.json(link, { status: 201 });
    } catch (error) {
        console.error("Error creating footer link:", error);
        return NextResponse.json({ error: "Failed to create footer link" }, { status: 500 });
    }
}
