import { mysqlNow } from "@/lib/utils/date";
import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { checkRegisterRateLimit, getClientIp } from "@/lib/rateLimit";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { parseBody } from "@/lib/api";
import { registerSchema } from "@/lib/validations";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

export async function POST(request: NextRequest) {
    try {
        // Check rate limit first (skip in dev mode for easier testing)
        if (process.env.NODE_ENV === "production") {
            const clientIp = getClientIp(request);
            const rateLimit = checkRegisterRateLimit(clientIp);
            if (rateLimit.blocked) {
                return NextResponse.json(
                    { success: false, message: rateLimit.message },
                    { status: 429 }
                );
            }
        }

        // Validate inputs with Zod
        const parsed = await parseBody(request, registerSchema);
        if ("error" in parsed) return parsed.error;
        const { username, email, password, pin, turnstileToken } = parsed.data;

        const clientIp = getClientIp(request);
        const turnstileResult = await verifyTurnstileToken(turnstileToken ?? undefined, clientIp);
        if (!turnstileResult.success) {
            return NextResponse.json(
                { success: false, message: turnstileResult.message },
                { status: 400 }
            );
        }

        // Check if username already exists
        const existingUser = await db.query.users.findFirst({
            where: or(
                eq(users.username, username),
                eq(users.email, email)
            ),
        });

        if (existingUser) {
            const duplicateMessage = existingUser.username === username
                ? "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว"
                : "อีเมลนี้ถูกใช้งานแล้ว";

            return NextResponse.json(
                { success: false, message: duplicateMessage },
                { status: 400 }
            );
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newId = crypto.randomUUID();
        await db.insert(users).values({
            id: newId,
            username,
            email,
            password: hashedPassword,
            pinHash: pin ? await bcrypt.hash(pin, 12) : null,
            pinEnabledAt: pin ? mysqlNow() : null,
            pinUpdatedAt: pin ? mysqlNow() : null,
            role: "USER",
            creditBalance: "0",
            createdAt: mysqlNow(),
            updatedAt: mysqlNow(),
        });
        const user = { id: newId, username };

        // Audit log for registration
        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.REGISTER,
            userId: user.id,
            resource: "User",
            resourceId: user.id,
            resourceName: username,
            details: {
                resourceName: username,
            },
        });

        return NextResponse.json({
            success: true,
            message: "สมัครสมาชิกสำเร็จ! เข้าสู่ระบบได้เลย",
            userId: user.id,
        });
    } catch (error) {
        console.error("Register error:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Registration failed",
            },
            { status: 500 }
        );
    }
}
