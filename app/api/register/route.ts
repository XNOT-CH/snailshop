import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { checkRegisterRateLimit, getClientIp } from "@/lib/rateLimit";

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

        const { username, password } = await request.json();

        // Validate inputs
        if (!username || !password) {
            return NextResponse.json(
                { success: false, message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" },
                { status: 400 }
            );
        }

        if (username.length < 3) {
            return NextResponse.json(
                { success: false, message: "Username must be at least 3 characters" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { success: false, message: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        // Check if username already exists
        const existingUser = await db.user.findUnique({
            where: { username },
        });

        if (existingUser) {
            return NextResponse.json(
                { success: false, message: "Username already taken" },
                { status: 400 }
            );
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await db.user.create({
            data: {
                username,
                password: hashedPassword,
                role: "USER",
                creditBalance: 100, // Welcome bonus
            },
        });

        return NextResponse.json({
            success: true,
            message: "Account created successfully! You can now login.",
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
