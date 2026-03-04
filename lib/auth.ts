import { cookies } from "next/headers";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { validateCsrfToken, getCsrfTokenFromRequest } from "@/lib/csrf";

interface AdminCheckResult {
    success: boolean;
    error?: string;
    userId?: string;
}

export async function isAdmin(): Promise<AdminCheckResult> {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) return { success: false, error: "ไม่ได้เข้าสู่ระบบ" };

    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true, role: true },
    });

    if (!user) return { success: false, error: "ไม่พบผู้ใช้งาน" };
    if (user.role !== "ADMIN") return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };

    return { success: true, userId: user.id };
}

export async function isAdminWithCsrf(request: Request): Promise<AdminCheckResult> {
    const adminCheck = await isAdmin();
    if (!adminCheck.success) return adminCheck;

    const csrfToken = getCsrfTokenFromRequest(request);
    if (!csrfToken) return { success: false, error: "Missing CSRF token" };

    const isValidCsrf = await validateCsrfToken(csrfToken);
    if (!isValidCsrf) return { success: false, error: "Invalid CSRF token" };

    return { success: true, userId: adminCheck.userId };
}

export async function isAuthenticated(): Promise<AdminCheckResult> {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) return { success: false, error: "ไม่ได้เข้าสู่ระบบ" };

    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true, role: true },
    });

    if (!user) return { success: false, error: "ไม่พบผู้ใช้งาน" };

    return { success: true, userId: user.id };
}

export async function isAuthenticatedWithCsrf(request: Request): Promise<AdminCheckResult> {
    const authCheck = await isAuthenticated();
    if (!authCheck.success) return authCheck;

    const csrfToken = getCsrfTokenFromRequest(request);
    if (!csrfToken) return { success: false, error: "Missing CSRF token" };

    const isValidCsrf = await validateCsrfToken(csrfToken);
    if (!isValidCsrf) return { success: false, error: "Invalid CSRF token" };

    return { success: true, userId: authCheck.userId };
}
