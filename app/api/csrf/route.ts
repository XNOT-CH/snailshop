import { NextResponse } from "next/server";
import { createCsrfTokenPair } from "@/lib/csrf";

// GET - Generate new CSRF token
export async function GET() {
    try {
        const { token } = await createCsrfTokenPair();

        return NextResponse.json({
            success: true,
            csrfToken: token,
        });
    } catch (error) {
        console.error("CSRF token error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to generate CSRF token" },
            { status: 500 }
        );
    }
}
