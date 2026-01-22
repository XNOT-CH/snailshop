import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
    try {
        // Delete the userId cookie
        const cookieStore = await cookies();
        cookieStore.delete("userId");

        return NextResponse.json({
            success: true,
            message: "Logged out successfully",
        });
    } catch (error) {
        console.error("Logout error:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Logout failed",
            },
            { status: 500 }
        );
    }
}
