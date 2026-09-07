import { NextRequest, NextResponse } from "next/server";
import { requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { softDeleteInviteCode, updateInviteCode } from "@/lib/features/invites/mutations";
import { findInviteCodeById } from "@/lib/features/invites/queries";
import { validateBody } from "@/lib/validations/validate";
import { updateInviteCodeSchema } from "@/lib/validations/inviteCode";
import { PERMISSIONS } from "@/lib/permissions";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.INVITE_EDIT);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const { id } = await params;
        const result = await validateBody(request, updateInviteCodeSchema);
        if ("error" in result) return result.error;
        const body = result.data;

        const existing = await findInviteCodeById(id);
        if (!existing) {
            return NextResponse.json(
                { success: false, message: "ไม่พบลิงก์คำเชิญนี้" },
                { status: 404 },
            );
        }

        const updated = await updateInviteCode(id, body);

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.INVITE_UPDATE,
            resource: "InviteCode",
            resourceId: id,
            resourceName: existing.code,
            details: { code: existing.code, ...body },
        });

        return NextResponse.json({
            success: true,
            message: "บันทึกลิงก์คำเชิญแล้ว",
            data: updated,
        });
    } catch (error) {
        console.error("[INVITE_CODES_PATCH]", error);
        return NextResponse.json(
            { success: false, message: "ไม่สามารถบันทึกลิงก์คำเชิญได้" },
            { status: 500 },
        );
    }
}

// "Delete" hides the code and kills the link; the row itself stays. Signups
// point at it through User.inviteCodeId (ON DELETE RESTRICT), so removing it
// would erase the record of which channel those shoppers came from — the
// numbers this whole feature exists to produce.
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.INVITE_EDIT);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error }, { status: 401 });
    }

    try {
        const { id } = await params;
        const existing = await findInviteCodeById(id);
        if (!existing || existing.deletedAt) {
            return NextResponse.json(
                { success: false, message: "ไม่พบลิงก์คำเชิญนี้" },
                { status: 404 },
            );
        }

        await softDeleteInviteCode(id);

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.INVITE_DELETE,
            resource: "InviteCode",
            resourceId: id,
            resourceName: existing.code,
            details: { code: existing.code, label: existing.label },
        });

        return NextResponse.json({ success: true, message: "ลบลิงก์คำเชิญแล้ว" });
    } catch (error) {
        console.error("[INVITE_CODES_DELETE]", error);
        return NextResponse.json(
            { success: false, message: "ไม่สามารถลบลิงก์คำเชิญได้" },
            { status: 500 },
        );
    }
}
