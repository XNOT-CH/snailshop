import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { createInviteCode } from "@/lib/features/invites/mutations";
import { findInviteCodeByCode, listInviteCodesWithStats } from "@/lib/features/invites/queries";
import { validateBody } from "@/lib/validations/validate";
import { createInviteCodeSchema } from "@/lib/validations/inviteCode";
import { PERMISSIONS } from "@/lib/permissions";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.INVITE_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const { searchParams } = request.nextUrl;
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const codes = await listInviteCodesWithStats({
            startDate: startDate && DATE_PATTERN.test(startDate) ? startDate : undefined,
            endDate: endDate && DATE_PATTERN.test(endDate) ? endDate : undefined,
        });

        return NextResponse.json({ success: true, data: codes });
    } catch (error) {
        console.error("[INVITE_CODES_GET]", error);
        return NextResponse.json(
            { success: false, message: "ไม่สามารถโหลดข้อมูลลิงก์คำเชิญได้" },
            { status: 500 },
        );
    }
}

export async function POST(request: NextRequest) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.INVITE_EDIT);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const result = await validateBody(request, createInviteCodeSchema);
        if ("error" in result) return result.error;
        const body = result.data;

        // Checked against every code, active or not: the codes share one URL
        // space, and reusing a switched-off one would hand an old promoter's
        // traffic to a new campaign.
        const existing = await findInviteCodeByCode(body.code);
        if (existing) {
            return NextResponse.json(
                { success: false, message: "โค้ดนี้ถูกใช้ไปแล้ว" },
                { status: 400 },
            );
        }

        const created = await createInviteCode(body);

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.INVITE_CREATE,
            resource: "InviteCode",
            resourceId: created?.id,
            resourceName: body.code,
            details: { code: body.code, label: body.label, destination: body.destination },
        });

        return NextResponse.json({
            success: true,
            message: "สร้างลิงก์คำเชิญแล้ว",
            data: created,
        });
    } catch (error) {
        console.error("[INVITE_CODES_POST]", error);
        return NextResponse.json(
            { success: false, message: "ไม่สามารถสร้างลิงก์คำเชิญได้" },
            { status: 500 },
        );
    }
}
