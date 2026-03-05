import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
    checkLoginRateLimit,
    recordFailedLogin,
    clearLoginAttempts,
    getClientIp,
    getProgressiveDelay,
    sleep,
} from "@/lib/rateLimit";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { parseBody } from "@/lib/api";
import { loginSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
    try {
        // Validate inputs with Zod (before rate limit so we get clean username)
        const parsed = await parseBody(request, loginSchema);
        if ("error" in parsed) return parsed.error;
        const { username, password } = parsed.data;

        const clientIp = getClientIp(request);
        const identifier = `${clientIp}:${username}`;

        // Check rate limit before processing
        const rateLimit = checkLoginRateLimit(identifier);
        if (rateLimit.blocked) {
            return NextResponse.json(
                { success: false, message: rateLimit.message, lockoutRemaining: rateLimit.lockoutRemaining },
                { status: 429 }
            );
        }

        // Apply progressive delay
        const delay = getProgressiveDelay(identifier);
        if (delay > 0) await sleep(delay);

        // Find user by username
        const user = await db.query.users.findFirst({
            where: eq(users.username, username),
        });

        if (!user) {
            // Record failed attempt
            recordFailedLogin(identifier);
            const remaining = checkLoginRateLimit(identifier);

            // Audit log for failed login
            await auditFromRequest(request, {
                action: AUDIT_ACTIONS.LOGIN_FAILED,
                resource: "User",
                resourceName: username,
                status: "FAILURE",
                details: {
                    resourceName: username,
                    reason: "ไม่พบผู้ใช้",
                },
            });

            return NextResponse.json(
                {
                    success: false,
                    message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
                    remainingAttempts: remaining.remainingAttempts,
                },
                { status: 401 }
            );
        }

        // Compare password with bcrypt
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            // Record failed attempt
            recordFailedLogin(identifier);
            const remaining = checkLoginRateLimit(identifier);

            // Audit log for failed login
            await auditFromRequest(request, {
                action: AUDIT_ACTIONS.LOGIN_FAILED,
                userId: user.id,
                resource: "User",
                resourceId: user.id,
                resourceName: username,
                status: "FAILURE",
                details: {
                    resourceName: username,
                    reason: "รหัสผ่านไม่ถูกต้อง",
                },
            });

            return NextResponse.json(
                {
                    success: false,
                    message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
                    remainingAttempts: remaining.remainingAttempts,
                },
                { status: 401 }
            );
        }

        // Login successful - clear rate limit
        clearLoginAttempts(identifier);

        // Audit log for successful login
        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.LOGIN,
            userId: user.id,
            resource: "User",
            resourceId: user.id,
            resourceName: username,
            details: {
                resourceName: username,
            },
        });

        // Return user info (client will handle cookie)
        return NextResponse.json({
            success: true,
            message: "เข้าสู่ระบบสำเร็จ!",
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ",
            },
            { status: 500 }
        );
    }
}
