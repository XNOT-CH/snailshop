import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(request: NextRequest) {
    try {
        const { password } = await request.json();

        if (!password) {
            return NextResponse.json(
                { success: false, message: "Password is required" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { success: false, message: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        // Find test user
        const user = await db.user.findFirst({
            where: { email: "test@gamestore.com" },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, message: "User not found" },
                { status: 404 }
            );
        }

        // Update password (Note: In production, hash the password!)
        await db.user.update({
            where: { id: user.id },
            data: { password: password },
        });

        return NextResponse.json({
            success: true,
            message: "Password updated successfully!",
        });
    } catch (error) {
        console.error("Update settings error:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to update",
            },
            { status: 500 }
        );
    }
}
