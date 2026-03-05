import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { checkRegisterRateLimit, getClientIp } from "@/lib/rateLimit";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { parseBody } from "@/lib/api";
import { registerSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
    try {
        // Check rate limit first
        const clientIp = getClientIp(request);
        const rateLimit = checkRegisterRateLimit(clientIp);

        if (rateLimit.blocked) {
            return NextResponse.json(
                { success: false, message: rateLimit.message },
                { status: 429 }
            );
        }

        // Validate inputs with Zod
        const parsed = await parseBody(request, registerSchema);
        if ("error" in parsed) return parsed.error;
        const { username, password } = parsed.data;

        // Check if username already exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.username, username),
        });

        if (existingUser) {
            return NextResponse.json(
                { success: false, message: "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว" },
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
            password: hashedPassword,
            role: "USER",
            creditBalance: "100", // Welcome bonus
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
