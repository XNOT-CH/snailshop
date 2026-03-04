import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { creditBalance, totalTopup, pointBalance, lifetimePoints, role } = body;

        if (creditBalance === undefined && totalTopup === undefined &&
            pointBalance === undefined && lifetimePoints === undefined && role === undefined) {
            return NextResponse.json({ error: "ต้องระบุข้อมูลที่ต้องการแก้ไขอย่างน้อย 1 ฟิลด์" }, { status: 400 });
        }

        const existingUser = await db.query.users.findFirst({ where: eq(users.id, id) });
        if (!existingUser) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });

        const updateData: Record<string, unknown> = {};
        const changes: { field: string; old: string; new: string }[] = [];

        if (creditBalance !== undefined) {
            const value = parseFloat(creditBalance);
            if (isNaN(value) || value < 0) return NextResponse.json({ error: "เครดิตคงเหลือต้องเป็นตัวเลขที่ไม่ติดลบ" }, { status: 400 });
            updateData.creditBalance = String(value);
            changes.push({ field: "creditBalance", old: String(existingUser.creditBalance), new: String(value) });
        }
        if (totalTopup !== undefined) {
            const value = parseFloat(totalTopup);
            if (isNaN(value) || value < 0) return NextResponse.json({ error: "ยอดเติมสะสมต้องเป็นตัวเลขที่ไม่ติดลบ" }, { status: 400 });
            updateData.totalTopup = String(value);
            changes.push({ field: "totalTopup", old: String(existingUser.totalTopup), new: String(value) });
        }
        if (pointBalance !== undefined) {
            const value = parseInt(pointBalance);
            if (isNaN(value) || value < 0) return NextResponse.json({ error: "พอยต์คงเหลือต้องเป็นจำนวนเต็มที่ไม่ติดลบ" }, { status: 400 });
            updateData.pointBalance = value;
            changes.push({ field: "pointBalance", old: String(existingUser.pointBalance), new: String(value) });
        }
        if (lifetimePoints !== undefined) {
            const value = parseInt(lifetimePoints);
            if (isNaN(value) || value < 0) return NextResponse.json({ error: "พอยต์สะสมต้องเป็นจำนวนเต็มที่ไม่ติดลบ" }, { status: 400 });
            updateData.lifetimePoints = value;
            changes.push({ field: "lifetimePoints", old: String(existingUser.lifetimePoints), new: String(value) });
        }
        if (role !== undefined && typeof role === "string" && role.trim()) {
            updateData.role = role.trim().toUpperCase();
            changes.push({ field: "role", old: existingUser.role, new: role.trim().toUpperCase() });
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
