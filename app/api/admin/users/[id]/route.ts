import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { isAdmin } from "@/lib/auth";

// Admin user update: เลือกส่งได้อย่างน้อย 1 ฟิลด์
const adminUserUpdateSchema = z.object({
    creditBalance: z.coerce.number().min(0, "เครดิตต้องไม่ติดลบ").optional(),
    totalTopup: z.coerce.number().min(0, "ยอดเติมสะสมต้องไม่ติดลบ").optional(),
    pointBalance: z.coerce.number().int().min(0, "พอยต์ต้องเป็นจำนวนเต็มที่ไม่ติดลบ").optional(),
    lifetimePoints: z.coerce.number().int().min(0, "พอยต์สะสมต้องเป็นจำนวนเต็มที่ไม่ติดลบ").optional(),
    role: z.string().trim().min(1).optional(),
}).refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: "ต้องระบุข้อมูลที่ต้องการแก้ไขอย่างน้อย 1 ฟิลด์" }
);

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { id } = await params;

        let raw: unknown;
        try { raw = await request.json(); } catch {
            return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง (invalid JSON)" }, { status: 400 });
        }
        const parsed = adminUserUpdateSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง", errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }
        const { creditBalance, totalTopup, pointBalance, lifetimePoints, role } = parsed.data;

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

        await db.update(users).set(updateData as any).where(eq(users.id, id));

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.USER_UPDATE, resource: "User", resourceId: id,
            resourceName: existingUser.username,
            details: { resourceName: existingUser.username, changes },
        });

        const updated = await db.query.users.findFirst({ where: eq(users.id, id) });
        return NextResponse.json({
            success: true,
            user: {
                id: updated!.id, username: updated!.username,
                creditBalance: String(updated!.creditBalance), totalTopup: String(updated!.totalTopup),
                pointBalance: updated!.pointBalance, lifetimePoints: updated!.lifetimePoints, role: updated!.role,
            },
        });
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาดในการอัปเดตผู้ใช้" }, { status: 500 });
    }
}
