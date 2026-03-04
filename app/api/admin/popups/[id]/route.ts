"use server";

import { NextResponse } from "next/server";
import { db, announcementPopups } from "@/lib/db";
import { eq } from "drizzle-orm";
import { invalidatePopupCaches } from "@/lib/cache";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const popup = await db.query.announcementPopups.findFirst({ where: eq(announcementPopups.id, id) });
        if (!popup) return NextResponse.json({ error: "Popup not found" }, { status: 404 });
        return NextResponse.json(popup);
    } catch { return NextResponse.json({ error: "Failed to fetch popup" }, { status: 500 }); }
}

export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { title, imageUrl, linkUrl, sortOrder, isActive, dismissOption } = body;
        if (!imageUrl) return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
        const existing = await db.query.announcementPopups.findFirst({ where: eq(announcementPopups.id, id) });
        if (!existing) return NextResponse.json({ error: "Popup not found" }, { status: 404 });
        const newData = { title: title || null, imageUrl, linkUrl: linkUrl || null, sortOrder: sortOrder !== undefined ? sortOrder : 0, isActive: isActive !== undefined ? isActive : true, dismissOption: dismissOption || "show_always" };
        await db.update(announcementPopups).set(newData).where(eq(announcementPopups.id, id));
        await invalidatePopupCaches();
        const changes = [];
        if (existing.title !== newData.title) changes.push({ field: "title", old: existing.title || "ไม่มี", new: newData.title || "ไม่มี" });
        if (existing.imageUrl !== newData.imageUrl) changes.push({ field: "imageUrl", old: existing.imageUrl, new: newData.imageUrl });
        if (existing.isActive !== newData.isActive) changes.push({ field: "isActive", old: existing.isActive ? "เปิด" : "ปิด", new: newData.isActive ? "เปิด" : "ปิด" });
        await auditFromRequest(request, { action: AUDIT_ACTIONS.POPUP_UPDATE, resource: "AnnouncementPopup", resourceId: id, resourceName: title || "Popup", details: { resourceName: title || "Popup", changes } });
        const updated = await db.query.announcementPopups.findFirst({ where: eq(announcementPopups.id, id) });
        return NextResponse.json(updated);
    } catch { return NextResponse.json({ error: "Failed to update popup" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const popup = await db.query.announcementPopups.findFirst({ where: eq(announcementPopups.id, id) });
        if (!popup) return NextResponse.json({ error: "Popup not found" }, { status: 404 });
        await db.delete(announcementPopups).where(eq(announcementPopups.id, id));
        await invalidatePopupCaches();
        await auditFromRequest(request, { action: AUDIT_ACTIONS.POPUP_DELETE, resource: "AnnouncementPopup", resourceId: id, details: { title: popup.title || "Untitled" } });
        return NextResponse.json({ success: true });
    } catch { return NextResponse.json({ error: "Failed to delete popup" }, { status: 500 }); }
}
