import { NextResponse } from "next/server";
import { db, announcementPopups } from "@/lib/db";
import { eq, asc, desc } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { invalidatePopupCaches } from "@/lib/cache";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { validateBody } from "@/lib/validations/validate";
import { popupSchema } from "@/lib/validations/content";

export async function GET(request: Request) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get("active") === "true";
        const popups = await db.query.announcementPopups.findMany({
            where: activeOnly ? eq(announcementPopups.isActive, true) : undefined,
            orderBy: (t, { asc, desc }) => [asc(t.sortOrder), desc(t.createdAt)],
        });
        return NextResponse.json(popups);
    } catch {
        return NextResponse.json({ error: "Failed to fetch popups" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const result = await validateBody(request, popupSchema);
        if ("error" in result) return result.error;
        const { title, imageUrl, linkUrl, sortOrder, isActive, dismissOption } = result.data;

        const newId = crypto.randomUUID();
        await db.insert(announcementPopups).values({
            id: newId, title: title || null, imageUrl, linkUrl: linkUrl || null,
            sortOrder, isActive, dismissOption,
        });
        const popup = await db.query.announcementPopups.findFirst({ where: eq(announcementPopups.id, newId) });
        await invalidatePopupCaches();
        await auditFromRequest(request, { action: AUDIT_ACTIONS.POPUP_CREATE, resource: "AnnouncementPopup", resourceId: newId, details: { title: title || "Untitled" } });
        return NextResponse.json(popup, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Failed to create popup" }, { status: 500 });
    }
}
