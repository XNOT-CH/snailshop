import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function PATCH(request: NextRequest) {
    try {
        const { password } = await request.json();

        if (!password) {
            return NextResponse.json({ success: false, message: "Password is required" }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ success: false, message: "Password must be at least 6 characters" }, { status: 400 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.email, "test@gamestore.com"),
            columns: { id: true },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        await db.update(users).set({ password }).where(eq(users.id, user.id));

        return NextResponse.json({ success: true, message: "Password updated successfully!" });
    } catch (error) {
        console.error("Update settings error:", error);
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : "Failed to update" },
            { status: 500 }
        );
    }
}
