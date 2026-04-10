import path from "node:path";
import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";
import { db, topups } from "@/lib/db";
import { decryptTopupSensitiveFields } from "@/lib/sensitiveData";
import { resolveStoredSlipPath } from "@/lib/slipStorage";
import { PERMISSIONS } from "@/lib/permissions";

interface RouteParams {
    params: Promise<{ id: string }>;
}

function getMimeType(filePath: string) {
    switch (path.extname(filePath).toLowerCase()) {
        case ".png":
            return "image/png";
        case ".jpg":
        case ".jpeg":
            return "image/jpeg";
        case ".webp":
            return "image/webp";
        default:
            return "application/octet-stream";
    }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermission(PERMISSIONS.SLIP_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const { id } = await params;
        const topup = await db.query.topups.findFirst({
            where: eq(topups.id, id),
            columns: {
                id: true,
                proofImage: true,
            },
        });

        if (!topup) {
            return NextResponse.json({ success: false, message: "Topup request not found" }, { status: 404 });
        }

        const decryptedTopup = decryptTopupSensitiveFields(topup);
        if (!decryptedTopup.proofImage) {
            return NextResponse.json({ success: false, message: "Slip image not found" }, { status: 404 });
        }

        const filePath = resolveStoredSlipPath(decryptedTopup.proofImage);
        if (!filePath) {
            return NextResponse.json({ success: false, message: "Invalid slip image path" }, { status: 400 });
        }

        const fileBuffer = await readFile(filePath);
        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                "Content-Type": getMimeType(filePath),
                "Cache-Control": "private, no-store, max-age=0",
                "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        console.error("[ADMIN_SLIP_IMAGE]", error);
        return NextResponse.json({ success: false, message: "Failed to load slip image" }, { status: 500 });
    }
}
