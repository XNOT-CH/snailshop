import { auth } from "@/auth";
import { getCsrfTokenFromRequest, validateCsrfToken } from "@/lib/csrf";
import { db, roles } from "@/lib/db";
import { eq } from "drizzle-orm";

type AuthCheckResult =
    | {
        success: true;
        userId: string;
        error?: undefined;
    }
    | {
        success: false;
        error: string;
        userId?: undefined;
    };

/**
 * Check if the current request is from an authenticated admin.
 * Uses NextAuth JWT session — no extra DB query needed.
 * 
 * =========================================================================
 * 🛡️ DUAL ROLE SYSTEM NOTE:
 * The source of truth for authorization is `users.role` (varchar string).
 * The `Role` table in the DB is strictly for UI purposes (labels, icons).
 * To prevent desync bugs, always check permissions against the string value
 * from the session/user table directly.
 * =========================================================================
 */
export async function isAdmin(): Promise<AuthCheckResult> {
    const session = await auth();

    if (!session?.user) return { success: false, error: "ไม่ได้เข้าสู่ระบบ" };
    if (!session.user.id) return { success: false, error: "ไม่พบข้อมูลผู้ใช้งาน" };

    const role = (session.user as { role?: string }).role;
    if (role !== "ADMIN") return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };

    // Async warning check in background to detect Role table desyncs
    // (doesn't block the request)
    db.query.roles.findFirst({ where: eq(roles.code, "ADMIN") }).then(adminRole => {
        if (!adminRole) {
            console.warn(`⚠️ [AUTH WARNING] User ${session.user?.id} has 'ADMIN' role string, but 'ADMIN' code is missing from the Role table!`);
        }
    }).catch(() => { });

    return { success: true, userId: session.user.id };
}

/**
 * Check admin + validate CSRF token.
 */
export async function isAdminWithCsrf(request: Request): Promise<AuthCheckResult> {
    const adminCheck = await isAdmin();
    if (!adminCheck.success) return adminCheck;

    const csrfToken = getCsrfTokenFromRequest(request);
    if (!csrfToken) return { success: false, error: "Missing CSRF token" };

    const isValidCsrf = await validateCsrfToken(csrfToken);
    if (!isValidCsrf) return { success: false, error: "Invalid CSRF token" };

    return { success: true, userId: adminCheck.userId };
}

/**
 * Check if the current request is from any authenticated user.
 */
export async function isAuthenticated(): Promise<AuthCheckResult> {
    const session = await auth();

    if (!session?.user) return { success: false, error: "ไม่ได้เข้าสู่ระบบ" };
    if (!session.user.id) return { success: false, error: "ไม่พบข้อมูลผู้ใช้งาน" };

    return { success: true, userId: session.user.id };
}

/**
 * Check authenticated + validate CSRF token.
 */
export async function isAuthenticatedWithCsrf(request: Request): Promise<AuthCheckResult> {
    const authCheck = await isAuthenticated();
    if (!authCheck.success) return authCheck;

    const csrfToken = getCsrfTokenFromRequest(request);
    if (!csrfToken) return { success: false, error: "Missing CSRF token" };

    const isValidCsrf = await validateCsrfToken(csrfToken);
    if (!isValidCsrf) return { success: false, error: "Invalid CSRF token" };

    return { success: true, userId: authCheck.userId };
}
