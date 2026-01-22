import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// POST - Set session cookie (HTTP-only, Secure)
export async function POST(request: NextRequest) {
    try {
        const { userId, rememberMe } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "Missing userId" },
                { status: 400 }
            );
        }

        const cookieStore = await cookies();

        // Set HTTP-only cookie (more secure than client-side cookie)
        cookieStore.set("userId", userId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: rememberMe ? 60 * 60 * 24 * 7 : undefined, // 7 days or session
        });

        return NextResponse.json({
            success: true,
            message: "Session created",
        });
    } catch (error) {
        console.error("Session error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to create session" },
            { status: 500 }
        );
    }
}

// DELETE - Clear session cookie
export async function DELETE() {
    try {
        const cookieStore = await cookies();
        cookieStore.delete("userId");

        return NextResponse.json({
            success: true,
            message: "Session cleared",
        });
    } catch (error) {
        console.error("Session error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to clear session" },
            { status: 500 }
        );
    }
}
