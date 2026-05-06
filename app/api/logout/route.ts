import { NextResponse } from "next/server";
import { auth, signOut } from "@/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { validateCsrfRequest } from "@/lib/csrf";

export async function POST(request: Request) {
    try {
        if (!await validateCsrfRequest(request)) {
            return NextResponse.json(
                { success: false, message: "Invalid CSRF token" },
                { status: 401 }
            );
        }

        const session = await auth();
        const userId = session?.user?.id;

        if (userId) {
            await auditFromRequest(request, {
                userId,
                action: AUDIT_ACTIONS.LOGOUT,
                resource: "User",
                resourceId: userId,
                status: "SUCCESS",
            });
        }

        await signOut({ redirect: false });
        return NextResponse.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error);
        return NextResponse.json({ success: false, message: "Logout failed" }, { status: 500 });
    }
}
