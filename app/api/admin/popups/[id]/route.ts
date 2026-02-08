"use server";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidatePopupCaches } from "@/lib/cache";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

// GET - ดึง popup ตาม ID
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const popup = await db.announcementPopup.findUnique({
            where: { id },
        });

        if (!popup) {
            return NextResponse.json(
                { error: "Popup not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(popup);
    } catch (error) {
        console.error("Error fetching popup:", error);
        return NextResponse.json(
            { error: "Failed to fetch popup" },
            { status: 500 }
        );
    }
}

// PUT - แก้ไข popup
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { title, imageUrl, linkUrl, sortOrder, isActive, dismissOption } = body;

        if (!imageUrl) {
            return NextResponse.json(
                { error: "Image URL is required" },
                { status: 400 }
            );
        }

        // Get existing popup for change tracking
        const existingPopup = await db.announcementPopup.findUnique({
            where: { id },
        });

        if (!existingPopup) {
            return NextResponse.json(
                { error: "Popup not found" },
                { status: 404 }
            );
        }

        const newData = {
            title: title || null,
            imageUrl,
            linkUrl: linkUrl || null,
            sortOrder: sortOrder !== undefined ? sortOrder : 0,
            isActive: isActive !== undefined ? isActive : true,
            dismissOption: dismissOption || "show_always",
        };

        const popup = await db.announcementPopup.update({
            where: { id },
            data: newData,
        });

        // Invalidate cache
        await invalidatePopupCaches();

        // Audit log with change tracking
        const changes = [];
        if (existingPopup.title !== newData.title) {
            changes.push({ field: "title", old: existingPopup.title || "ไม่มี", new: newData.title || "ไม่มี" });
        }
        if (existingPopup.imageUrl !== newData.imageUrl) {
            changes.push({ field: "imageUrl", old: existingPopup.imageUrl, new: newData.imageUrl });
        }
        if (existingPopup.linkUrl !== newData.linkUrl) {
            changes.push({ field: "linkUrl", old: existingPopup.linkUrl || "ไม่มี", new: newData.linkUrl || "ไม่มี" });
        }
        if (existingPopup.isActive !== newData.isActive) {
            changes.push({ field: "isActive", old: existingPopup.isActive ? "เปิด" : "ปิด", new: newData.isActive ? "เปิด" : "ปิด" });
        }
        if (existingPopup.sortOrder !== newData.sortOrder) {
            changes.push({ field: "sortOrder", old: String(existingPopup.sortOrder), new: String(newData.sortOrder) });
        }

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.POPUP_UPDATE,
            resource: "AnnouncementPopup",
            resourceId: popup.id,
            resourceName: title || "Popup",
            details: {
                resourceName: title || "Popup",
                changes
            },
        });

        return NextResponse.json(popup);
    } catch (error) {
        console.error("Error updating popup:", error);
        return NextResponse.json(
            { error: "Failed to update popup" },
            { status: 500 }
        );
    }
}

// DELETE - ลบ popup
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const popup = await db.announcementPopup.findUnique({
            where: { id },
        });

        if (!popup) {
            return NextResponse.json(
                { error: "Popup not found" },
                { status: 404 }
            );
        }

        await db.announcementPopup.delete({
            where: { id },
        });

        // Invalidate cache
        await invalidatePopupCaches();

        // Audit log
        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.POPUP_DELETE,
            resource: "AnnouncementPopup",
            resourceId: id,
            details: { title: popup.title || "Untitled" },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting popup:", error);
        return NextResponse.json(
            { error: "Failed to delete popup" },
            { status: 500 }
        );
    }
}
