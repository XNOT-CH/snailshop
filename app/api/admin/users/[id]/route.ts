import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { requireAnyPermission, requirePermission } from "@/lib/auth";
import { getPointCurrencyName } from "@/lib/currencySettings";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { PERMISSIONS } from "@/lib/permissions";

const MAX_DECIMAL_BALANCE = 99999999.99;
const MAX_INTEGER_BALANCE = 2147483647;

function createAdminUserUpdateSchema(pointCurrencyName: string) {
    return z.object({
        creditBalance: z.coerce.number().finite("เครดิตต้องเป็นตัวเลข").min(0, "เครดิตต้องไม่ติดลบ").max(MAX_DECIMAL_BALANCE, "เครดิตต้องไม่เกิน 99,999,999.99").optional(),
        totalTopup: z.coerce.number().finite("ยอดเติมสะสมต้องเป็นตัวเลข").min(0, "ยอดเติมสะสมต้องไม่ติดลบ").max(MAX_DECIMAL_BALANCE, "ยอดเติมสะสมต้องไม่เกิน 99,999,999.99").optional(),
        pointBalance: z.coerce.number().finite(`${pointCurrencyName}ต้องเป็นตัวเลข`).int(`${pointCurrencyName}ต้องเป็นจำนวนเต็ม`).min(0, `${pointCurrencyName}ต้องเป็นจำนวนเต็มที่ไม่ติดลบ`).max(MAX_INTEGER_BALANCE, `${pointCurrencyName}ต้องไม่เกิน 2,147,483,647`).optional(),
        lifetimePoints: z.coerce.number().finite(`${pointCurrencyName}สะสมต้องเป็นตัวเลข`).int(`${pointCurrencyName}สะสมต้องเป็นจำนวนเต็ม`).min(0, `${pointCurrencyName}สะสมต้องเป็นจำนวนเต็มที่ไม่ติดลบ`).max(MAX_INTEGER_BALANCE, `${pointCurrencyName}สะสมต้องไม่เกิน 2,147,483,647`).optional(),
        role: z.string().trim().min(1).optional(),
    }).refine(
        (data) => Object.values(data).some((v) => v !== undefined),
        { message: "ต้องระบุข้อมูลที่ต้องการแก้ไขอย่างน้อย 1 ฟิลด์" }
    );
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authCheck = await requireAnyPermission([PERMISSIONS.USER_EDIT, PERMISSIONS.USER_MANAGE_ROLE]);
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { id } = await params;

        let raw: unknown;
        try { raw = await request.json(); } catch {
            return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง (invalid JSON)" }, { status: 400 });
        }
        const currencySettings = await getCurrencySettings().catch(() => null);
        const parsed = createAdminUserUpdateSchema(getPointCurrencyName(currencySettings)).safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
                    errors: parsed.error.issues.reduce((acc, issue) => {
                        const key = String(issue.path[0] || '_root');
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(issue.message);
                        return acc;
                    }, {} as Record<string, string[]>),
                },
                { status: 400 }
            );
        }
        const { creditBalance, totalTopup, pointBalance, lifetimePoints, role } = parsed.data;

        if (role !== undefined) {
            const rolePermissionCheck = await requirePermission(PERMISSIONS.USER_MANAGE_ROLE);
            if (!rolePermissionCheck.success) {
                return NextResponse.json({ error: "ไม่มีสิทธิ์เปลี่ยนบทบาทผู้ใช้" }, { status: 403 });
            }
        }

        const existingUser = await db.query.users.findFirst({ where: eq(users.id, id) });
        if (!existingUser) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });

        const updateData: Record<string, unknown> = {};
        const changes: { field: string; old: string; new: string }[] = [];

        if (creditBalance !== undefined) {
            updateData.creditBalance = String(creditBalance);
            changes.push({ field: "creditBalance", old: String(existingUser.creditBalance), new: String(creditBalance) });
        }
        if (totalTopup !== undefined) {
            updateData.totalTopup = String(totalTopup);
            changes.push({ field: "totalTopup", old: String(existingUser.totalTopup), new: String(totalTopup) });
        }
        if (pointBalance !== undefined) {
            updateData.pointBalance = pointBalance;
            changes.push({ field: "pointBalance", old: String(existingUser.pointBalance), new: String(pointBalance) });
        }
        if (lifetimePoints !== undefined) {
            updateData.lifetimePoints = lifetimePoints;
            changes.push({ field: "lifetimePoints", old: String(existingUser.lifetimePoints), new: String(lifetimePoints) });
        }
        if (role !== undefined) {
            updateData.role = role.toUpperCase();
            changes.push({ field: "role", old: existingUser.role, new: role.toUpperCase() });
        }

        await db.update(users).set(updateData).where(eq(users.id, id));

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.USER_UPDATE, resource: "User", resourceId: id,
            resourceName: existingUser.username,
            details: { resourceName: existingUser.username, changes },
        });

        // ✅ ใช้ข้อมูลที่มีอยู่แล้ว — ไม่ต้อง query ซ้ำ
        return NextResponse.json({
            success: true,
            user: {
                id: existingUser.id,
                username: existingUser.username,
                creditBalance: (updateData.creditBalance as string) ?? String(existingUser.creditBalance),
                totalTopup: (updateData.totalTopup as string) ?? String(existingUser.totalTopup),
                pointBalance: (updateData.pointBalance as number) ?? Number(existingUser.pointBalance),
                lifetimePoints: (updateData.lifetimePoints as number) ?? Number(existingUser.lifetimePoints),
                role: (updateData.role as string) ?? existingUser.role,
            },
        });
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาดในการอัปเดตผู้ใช้" }, { status: 500 });
    }
}
