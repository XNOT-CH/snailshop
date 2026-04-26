import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { mysqlNow } from "@/lib/utils/date";
import { parseBody } from "@/lib/api";
import { resetPasswordSchema } from "@/lib/validations";
import { createPasswordFingerprint, verifyPasswordResetToken } from "@/lib/passwordReset";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
    const verification = verifyPasswordResetToken(token);

    if (!verification.success) {
        return NextResponse.json({ valid: false, message: verification.message }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, verification.userId),
        columns: {
            id: true,
            password: true,
        },
    });

    if (!user) {
        return NextResponse.json({ valid: false, message: "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง" }, { status: 400 });
    }

    if (createPasswordFingerprint(user.password) !== verification.passwordFingerprint) {
        return NextResponse.json({ valid: false, message: "ลิงก์รีเซ็ตรหัสผ่านหมดอายุแล้ว" }, { status: 400 });
    }

    return NextResponse.json({ valid: true });
}

export async function POST(request: NextRequest) {
    try {
        const parsed = await parseBody(request, resetPasswordSchema);
        if ("error" in parsed) return parsed.error;

        const verification = verifyPasswordResetToken(parsed.data.token);
        if (!verification.success) {
            return NextResponse.json({ success: false, message: verification.message }, { status: 400 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, verification.userId),
            columns: {
                id: true,
                username: true,
                password: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, message: "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง" },
                { status: 400 }
            );
        }

        if (createPasswordFingerprint(user.password) !== verification.passwordFingerprint) {
            return NextResponse.json(
                { success: false, message: "ลิงก์รีเซ็ตรหัสผ่านหมดอายุแล้ว" },
                { status: 400 }
            );
        }

        const isSamePassword = await bcrypt.compare(parsed.data.password, user.password);
        if (isSamePassword) {
            return NextResponse.json(
                { success: false, message: "รหัสผ่านใหม่ต้องไม่ซ้ำรหัสผ่านเดิม" },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
        await db.update(users)
            .set({
                password: hashedPassword,
                updatedAt: mysqlNow(),
            })
            .where(eq(users.id, user.id));

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETE,
            userId: user.id,
            resource: "User",
            resourceId: user.id,
            resourceName: user.username,
            status: "SUCCESS",
        });

        return NextResponse.json({
            success: true,
            message: "ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง",
        });
    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json(
            { success: false, message: "ตั้งรหัสผ่านใหม่ไม่สำเร็จ" },
            { status: 500 }
        );
    }
}
