import { auth } from "@/auth";
import { getCsrfTokenFromRequest, validateCsrfToken } from "@/lib/csrf";
import { db, roles, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getUserPermissions, hasAnyPermission, hasPermission, Permission, PERMISSIONS } from "@/lib/permissions";

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

type PermissionCheckResult = AuthCheckResult & {
    role?: string;
    permissions?: Permission[];
};

async function getAuthenticatedUserContext(): Promise<PermissionCheckResult> {
    const session = await auth();

    if (!session?.user) return { success: false, error: "ไม่ได้เข้าสู่ระบบ" };
    if (!session.user.id) return { success: false, error: "ไม่พบข้อมูลผู้ใช้งาน" };

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { id: true, role: true },
    });

    if (!user) return { success: false, error: "ไม่พบข้อมูลผู้ใช้งาน" };

    const roleRecord = await db.query.roles.findFirst({
        where: eq(roles.code, user.role),
        columns: { permissions: true },
    });

    return {
        success: true,
        userId: user.id,
        role: user.role,
        permissions: getUserPermissions(user.role, roleRecord?.permissions ?? null),
    };
}

export async function requirePermission(permission: Permission): Promise<PermissionCheckResult> {
    const userContext = await getAuthenticatedUserContext();
    if (!userContext.success) return userContext;

    if (!userContext.role || !userContext.permissions) {
        return { success: false, error: "ไม่พบข้อมูลสิทธิ์" };
    }

    if (!hasPermission(userContext.role, permission, userContext.permissions)) {
        return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };
    }

    return userContext;
}

export async function requireAnyPermission(permissions: Permission[]): Promise<PermissionCheckResult> {
    const userContext = await getAuthenticatedUserContext();
    if (!userContext.success) return userContext;

    if (!userContext.role || !userContext.permissions) {
        return { success: false, error: "ไม่พบข้อมูลสิทธิ์" };
    }

    if (!hasAnyPermission(userContext.role, permissions, userContext.permissions)) {
        return { success: false, error: "ไม่มีสิทธิ์เข้าถึง" };
    }

    return userContext;
}

/**
 * Check if the current request has permission to access the admin panel.
 */
export async function isAdmin(): Promise<AuthCheckResult> {
    const result = await requirePermission(PERMISSIONS.ADMIN_PANEL);
    if (!result.success) return result;

    return { success: true, userId: result.userId };
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

export async function requirePermissionWithCsrf(
    request: Request,
    permission: Permission
): Promise<AuthCheckResult> {
    const permissionCheck = await requirePermission(permission);
    if (!permissionCheck.success) return permissionCheck;

    const csrfToken = getCsrfTokenFromRequest(request);
    if (!csrfToken) return { success: false, error: "Missing CSRF token" };

    const isValidCsrf = await validateCsrfToken(csrfToken);
    if (!isValidCsrf) return { success: false, error: "Invalid CSRF token" };

    return { success: true, userId: permissionCheck.userId };
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
