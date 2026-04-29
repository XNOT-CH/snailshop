import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { mysqlNow } from "@/lib/utils/date";
import { parseBody } from "@/lib/api";
import { resetPasswordSchema } from "@/lib/validations";
import { createPasswordFingerprint, verifyPasswordResetToken } from "@/lib/passwordReset";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { checkPasswordResetAttemptRateLimitShared, getClientIp } from "@/lib/rateLimit";

type PasswordResetFailureReason =
    | "invalid_or_expired_token"
    | "user_not_found"
    | "stale_token"
    | "same_password"
    | "concurrent_or_reused_token";

function getAffectedRows(result: unknown) {
    if (Array.isArray(result)) {
        return getAffectedRows(result[0]);
    }

    if (!result || typeof result !== "object") {
        return null;
    }

    const maybeResult = result as { affectedRows?: unknown; rowsAffected?: unknown };
    if (typeof maybeResult.affectedRows === "number") {
        return maybeResult.affectedRows;
    }

    if (typeof maybeResult.rowsAffected === "number") {
        return maybeResult.rowsAffected;
    }

    return null;
}

async function auditPasswordResetFailure(
    request: Request,
    params: {
        reason: PasswordResetFailureReason;
        userId?: string;
        username?: string;
        resourceId?: string;
    }
) {
    await auditFromRequest(request, {
        action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETE,
        userId: params.userId,
        resource: "User",
        resourceId: params.resourceId,
        resourceName: params.username,
        status: "FAILURE",
        details: {
            reason: params.reason,
        },
    });
}

export async function GET(request: NextRequest) {
    try {
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
    } catch (error) {
        console.error("Reset password token validation error:", error);
        return NextResponse.json(
            { valid: false, message: "ไม่สามารถตรวจสอบลิงก์รีเซ็ตรหัสผ่านได้" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const parsed = await parseBody(request, resetPasswordSchema);
        if ("error" in parsed) return parsed.error;

        const verification = verifyPasswordResetToken(parsed.data.token);
        if (!verification.success) {
            await auditPasswordResetFailure(request, {
                reason: "invalid_or_expired_token",
            });
            return NextResponse.json({ success: false, message: verification.message }, { status: 400 });
        }

        const clientIp = getClientIp(request);
        const rateLimit = await checkPasswordResetAttemptRateLimitShared(`${clientIp}:${verification.userId}`);
        if (rateLimit.blocked) {
            await auditFromRequest(request, {
                action: AUDIT_ACTIONS.RATE_LIMIT_EXCEEDED,
                userId: verification.userId,
                resource: "User",
                resourceId: verification.userId,
                status: "FAILURE",
                details: {
                    flow: "reset-password",
                },
            });
            return NextResponse.json(
                { success: false, message: rateLimit.message ?? "ลองตั้งรหัสผ่านใหม่บ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
                { status: 429 }
            );
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
            await auditPasswordResetFailure(request, {
                reason: "user_not_found",
                resourceId: verification.userId,
            });
            return NextResponse.json(
                { success: false, message: "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง" },
                { status: 400 }
            );
        }

        if (createPasswordFingerprint(user.password) !== verification.passwordFingerprint) {
            await auditPasswordResetFailure(request, {
                reason: "stale_token",
                userId: user.id,
                resourceId: user.id,
                username: user.username,
            });
            return NextResponse.json(
                { success: false, message: "ลิงก์รีเซ็ตรหัสผ่านหมดอายุแล้ว" },
                { status: 400 }
            );
        }

        const isSamePassword = await bcrypt.compare(parsed.data.password, user.password);
        if (isSamePassword) {
            await auditPasswordResetFailure(request, {
                reason: "same_password",
                userId: user.id,
                resourceId: user.id,
                username: user.username,
            });
            return NextResponse.json(
                { success: false, message: "รหัสผ่านใหม่ต้องไม่ซ้ำรหัสผ่านเดิม" },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
        const updateResult = await db.update(users)
            .set({
                password: hashedPassword,
                updatedAt: mysqlNow(),
            })
            .where(and(
                eq(users.id, user.id),
                eq(users.password, user.password),
            ));

        const affectedRows = getAffectedRows(updateResult);
        if (affectedRows !== null && affectedRows !== 1) {
            await auditPasswordResetFailure(request, {
                reason: "concurrent_or_reused_token",
                userId: user.id,
                resourceId: user.id,
                username: user.username,
            });
            return NextResponse.json(
                { success: false, message: "ลิงก์รีเซ็ตรหัสผ่านหมดอายุแล้ว" },
                { status: 400 }
            );
        }

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
