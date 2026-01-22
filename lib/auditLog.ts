import { db } from "@/lib/db";
import { getClientIp } from "@/lib/rateLimit";

// Audit action types
export const AUDIT_ACTIONS = {
    // Authentication
    LOGIN: "LOGIN",
    LOGIN_FAILED: "LOGIN_FAILED",
    LOGOUT: "LOGOUT",
    REGISTER: "REGISTER",
    PASSWORD_CHANGE: "PASSWORD_CHANGE",

    // User management
    USER_CREATE: "USER_CREATE",
    USER_UPDATE: "USER_UPDATE",
    USER_DELETE: "USER_DELETE",
    USER_ROLE_CHANGE: "USER_ROLE_CHANGE",
    USER_PERMISSION_CHANGE: "USER_PERMISSION_CHANGE",

    // Product management
    PRODUCT_CREATE: "PRODUCT_CREATE",
    PRODUCT_UPDATE: "PRODUCT_UPDATE",
    PRODUCT_DELETE: "PRODUCT_DELETE",

    // Order/Purchase
    PURCHASE: "PURCHASE",

    // Topup/Slip
    TOPUP_REQUEST: "TOPUP_REQUEST",
    TOPUP_APPROVE: "TOPUP_APPROVE",
    TOPUP_REJECT: "TOPUP_REJECT",

    // Settings
    SETTINGS_UPDATE: "SETTINGS_UPDATE",

    // API Key
    API_KEY_CREATE: "API_KEY_CREATE",
    API_KEY_REVOKE: "API_KEY_REVOKE",

    // Security events
    RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
    UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

interface AuditLogParams {
    userId?: string | null;
    action: AuditAction;
    resource?: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    status?: "SUCCESS" | "FAILURE";
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
    try {
        await db.auditLog.create({
            data: {
                userId: params.userId || null,
                action: params.action,
                resource: params.resource || null,
                resourceId: params.resourceId || null,
                details: params.details ? JSON.stringify(params.details) : null,
                ipAddress: params.ipAddress || null,
                userAgent: params.userAgent || null,
                status: params.status || "SUCCESS",
            },
        });
    } catch (error) {
        // Log to console but don't throw - audit logging should never break the app
        console.error("Failed to create audit log:", error);
    }
}

/**
 * Create audit log from a request object
 */
export async function auditFromRequest(
    request: Request,
    params: Omit<AuditLogParams, "ipAddress" | "userAgent">
): Promise<void> {
    await createAuditLog({
        ...params,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
    });
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(options: {
    userId?: string;
    action?: AuditAction;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}) {
    const where: Record<string, unknown> = {};

    if (options.userId) where.userId = options.userId;
    if (options.action) where.action = options.action;
    if (options.resource) where.resource = options.resource;

    if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) (where.createdAt as Record<string, unknown>).gte = options.startDate;
        if (options.endDate) (where.createdAt as Record<string, unknown>).lte = options.endDate;
    }

    return db.auditLog.findMany({
        where,
        include: {
            user: {
                select: { username: true },
            },
        },
        orderBy: { createdAt: "desc" },
        take: options.limit || 50,
        skip: options.offset || 0,
    });
}

/**
 * Clean up old audit logs (call periodically)
 */
export async function cleanupOldAuditLogs(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await db.auditLog.deleteMany({
        where: {
            createdAt: { lt: cutoffDate },
        },
    });

    return result.count;
}
