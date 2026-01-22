import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { validateCsrfToken, getCsrfTokenFromRequest } from "@/lib/csrf";

interface AdminCheckResult {
    success: boolean;
    error?: string;
    userId?: string;
}

/**
 * Check if the current request is from an authenticated admin user.
 * Use this in API routes to protect admin endpoints.
 */
export async function isAdmin(): Promise<AdminCheckResult> {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
        return { success: false, error: "ไม่ได้เข้าสู่ระบบ" };
    }

    const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
    });

    if (!user) {
        return { success: false, error: "ไม่พบผู้ใช้งาน" };
    }

    if (user.role !== "ADMIN") {
        return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };
    }

    return { success: true, userId: user.id };
}

/**
 * Check if the current request is from an authenticated admin user AND has valid CSRF token.
 * Use this for mutation endpoints (POST, PUT, DELETE) that need CSRF protection.
 */
export async function isAdminWithCsrf(request: Request): Promise<AdminCheckResult> {
    // First check admin status
    const adminCheck = await isAdmin();
    if (!adminCheck.success) {
        return adminCheck;
    }

    // Then validate CSRF token
    const csrfToken = getCsrfTokenFromRequest(request);
    if (!csrfToken) {
        return { success: false, error: "Missing CSRF token" };
    }

    const isValidCsrf = await validateCsrfToken(csrfToken);
    if (!isValidCsrf) {
        return { success: false, error: "Invalid CSRF token" };
    }

    return { success: true, userId: adminCheck.userId };
}

/**
 * Check if the current request is from an authenticated user (any role).
 */
export async function isAuthenticated(): Promise<AdminCheckResult> {
    const cookieStore = await cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
        return { success: false, error: "ไม่ได้เข้าสู่ระบบ" };
    }

    const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
    });

    if (!user) {
        return { success: false, error: "ไม่พบผู้ใช้งาน" };
    }

    return { success: true, userId: user.id };
}

/**
 * Check if the current request is from an authenticated user AND has valid CSRF token.
 */
export async function isAuthenticatedWithCsrf(request: Request): Promise<AdminCheckResult> {
    // First check auth status
    const authCheck = await isAuthenticated();
    if (!authCheck.success) {
        return authCheck;
    }

    // Then validate CSRF token
    const csrfToken = getCsrfTokenFromRequest(request);
    if (!csrfToken) {
        return { success: false, error: "Missing CSRF token" };
    }

    const isValidCsrf = await validateCsrfToken(csrfToken);
    if (!isValidCsrf) {
        return { success: false, error: "Invalid CSRF token" };
    }

    return { success: true, userId: authCheck.userId };
}
