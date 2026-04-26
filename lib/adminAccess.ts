import { PERMISSIONS, type Permission } from "@/lib/permissions";

type AdminAccessRule = {
    path: string;
    permission: Permission;
    exact?: boolean;
};

const ADMIN_PAGE_RULES: AdminAccessRule[] = [
    { path: "/admin/chat", permission: PERMISSIONS.CHAT_VIEW, exact: true },
    { path: "/admin/export", permission: PERMISSIONS.EXPORT_DATA, exact: true },
    { path: "/admin/news", permission: PERMISSIONS.CONTENT_VIEW, exact: true },
    { path: "/admin/popups", permission: PERMISSIONS.CONTENT_VIEW, exact: true },
    { path: "/admin/help", permission: PERMISSIONS.CONTENT_VIEW, exact: true },
    { path: "/admin/promo-codes", permission: PERMISSIONS.PROMO_VIEW, exact: true },
    { path: "/admin/gacha-grid", permission: PERMISSIONS.GACHA_EDIT, exact: true },
    { path: "/admin/gacha-machines", permission: PERMISSIONS.GACHA_VIEW, exact: true },
    { path: "/admin/gacha-machines/", permission: PERMISSIONS.GACHA_EDIT },
    { path: "/admin/gacha-settings", permission: PERMISSIONS.GACHA_VIEW, exact: true },
    { path: "/admin/season-pass/edit", permission: PERMISSIONS.SEASON_PASS_EDIT, exact: true },
    { path: "/admin/season-pass/logs", permission: PERMISSIONS.SEASON_PASS_VIEW, exact: true },
    { path: "/admin/season-pass", permission: PERMISSIONS.SEASON_PASS_VIEW, exact: true },
    { path: "/admin/products/new", permission: PERMISSIONS.PRODUCT_CREATE, exact: true },
    { path: "/admin/products/trash", permission: PERMISSIONS.PRODUCT_VIEW, exact: true },
    { path: "/admin/products/", permission: PERMISSIONS.PRODUCT_EDIT },
    { path: "/admin/products", permission: PERMISSIONS.PRODUCT_VIEW, exact: true },
    { path: "/admin/users", permission: PERMISSIONS.USER_VIEW, exact: true },
    { path: "/admin/roles", permission: PERMISSIONS.USER_MANAGE_ROLE, exact: true },
    { path: "/admin/audit-logs", permission: PERMISSIONS.AUDIT_LOG_VIEW, exact: true },
    { path: "/admin/slips", permission: PERMISSIONS.SLIP_VIEW, exact: true },
    { path: "/admin/settings", permission: PERMISSIONS.SETTINGS_VIEW, exact: true },
    { path: "/admin/currency-settings", permission: PERMISSIONS.SETTINGS_VIEW, exact: true },
    { path: "/admin/footer-links", permission: PERMISSIONS.SETTINGS_VIEW, exact: true },
    { path: "/admin/nav-items", permission: PERMISSIONS.SETTINGS_VIEW, exact: true },
    { path: "/admin", permission: PERMISSIONS.ADMIN_PANEL, exact: true },
];

const ADMIN_API_RULES: AdminAccessRule[] = [
    { path: "/api/admin/chat", permission: PERMISSIONS.CHAT_VIEW },
    { path: "/api/admin/export", permission: PERMISSIONS.EXPORT_DATA },
    { path: "/api/admin/news", permission: PERMISSIONS.CONTENT_VIEW },
    { path: "/api/admin/popups", permission: PERMISSIONS.CONTENT_VIEW },
    { path: "/api/admin/help", permission: PERMISSIONS.CONTENT_VIEW },
    { path: "/api/admin/promo-codes", permission: PERMISSIONS.PROMO_VIEW },
    { path: "/api/admin/gacha", permission: PERMISSIONS.GACHA_VIEW },
    { path: "/api/admin/season-pass", permission: PERMISSIONS.SEASON_PASS_VIEW },
    { path: "/api/admin/roles", permission: PERMISSIONS.USER_MANAGE_ROLE },
    { path: "/api/admin/users", permission: PERMISSIONS.USER_EDIT },
    { path: "/api/admin/audit-logs", permission: PERMISSIONS.AUDIT_LOG_VIEW },
    { path: "/api/admin/slips", permission: PERMISSIONS.SLIP_VIEW },
    { path: "/api/admin/settings", permission: PERMISSIONS.SETTINGS_VIEW },
    { path: "/api/admin/currency-settings", permission: PERMISSIONS.SETTINGS_VIEW },
    { path: "/api/admin/footer-links", permission: PERMISSIONS.SETTINGS_VIEW },
    { path: "/api/admin/nav-items", permission: PERMISSIONS.SETTINGS_VIEW },
    { path: "/api/admin/products", permission: PERMISSIONS.PRODUCT_VIEW },
    { path: "/api/admin", permission: PERMISSIONS.ADMIN_PANEL },
];

function matchRule(pathname: string, rules: AdminAccessRule[]) {
    for (const rule of rules) {
        if (rule.exact ? pathname === rule.path : pathname.startsWith(rule.path)) {
            return rule.permission;
        }
    }

    return null;
}

export function isProtectedPath(pathname: string): boolean {
    return (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/api/admin") ||
        pathname.startsWith("/profile")
    );
}

export function getAdminPageAccessResponse(pathname: string, permissions: string[], baseUrl: URL) {
    const requiredPermission = getRequiredPermissionForAdminPage(pathname);
    if (requiredPermission && !permissions.includes(requiredPermission)) {
        return Response.redirect(new URL("/", baseUrl));
    }

    return null;
}

export function getAdminApiAccessResponse(pathname: string, permissions: string[]) {
    const requiredPermission = getRequiredPermissionForAdminApi(pathname);
    if (requiredPermission && !permissions.includes(requiredPermission)) {
        return new Response(
            JSON.stringify({ success: false, message: "ไม่มีสิทธิ์เข้าถึง" }),
            { status: 403, headers: { "Content-Type": "application/json" } }
        );
    }

    return null;
}

export function getRequiredPermissionForAdminPage(pathname: string): Permission | null {
    return matchRule(pathname, ADMIN_PAGE_RULES);
}

export function getRequiredPermissionForAdminApi(pathname: string): Permission | null {
    return matchRule(pathname, ADMIN_API_RULES);
}
