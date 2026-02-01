import { db } from "@/lib/db";
import { getClientIp } from "@/lib/rateLimit";
import { cookies } from "next/headers";

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
    PRODUCT_DUPLICATE: "PRODUCT_DUPLICATE",
    PRODUCT_FEATURED_TOGGLE: "PRODUCT_FEATURED_TOGGLE",

    // News management
    NEWS_CREATE: "NEWS_CREATE",
    NEWS_UPDATE: "NEWS_UPDATE",
    NEWS_DELETE: "NEWS_DELETE",

    // Help articles
    HELP_CREATE: "HELP_CREATE",
    HELP_UPDATE: "HELP_UPDATE",
    HELP_DELETE: "HELP_DELETE",

    // Banner management
    BANNER_CREATE: "BANNER_CREATE",
    BANNER_UPDATE: "BANNER_UPDATE",
    BANNER_DELETE: "BANNER_DELETE",

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

// Change tracking for audit logs
export interface AuditChange {
    field: string;
    oldValue: unknown;
    newValue: unknown;
}

interface AuditLogParams {
    userId?: string | null;
    action: AuditAction;
    resource?: string;
    resourceId?: string;
    resourceName?: string; // Human-readable name of the resource
    changes?: AuditChange[]; // Track old/new values
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    status?: "SUCCESS" | "FAILURE";
}

/**
 * Get current user ID from session cookie
 */
async function getCurrentUserId(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session");
        if (!sessionCookie?.value) return null;

        const session = JSON.parse(sessionCookie.value);
        return session?.user?.id || null;
    } catch {
        return null;
    }
}

/**
 * Compare two objects and return the differences
 */
export function getChanges<T extends Record<string, unknown>>(
    oldData: T | null,
    newData: Partial<T>,
    fieldsToTrack?: string[]
): AuditChange[] {
    const changes: AuditChange[] = [];

    if (!oldData) {
        // For create operations, track all new values
        for (const [field, newValue] of Object.entries(newData)) {
            if (fieldsToTrack && !fieldsToTrack.includes(field)) continue;
            if (newValue !== undefined && newValue !== null) {
                changes.push({ field, oldValue: null, newValue });
            }
        }
        return changes;
    }

    for (const [field, newValue] of Object.entries(newData)) {
        if (fieldsToTrack && !fieldsToTrack.includes(field)) continue;

        const oldValue = oldData[field];

        // Skip if values are the same
        if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;

        // Skip undefined values
        if (newValue === undefined) continue;

        changes.push({ field, oldValue, newValue });
    }

    return changes;
}

/**
 * Format changes for storage (serialize properly)
 */
function formatChangesForStorage(changes: AuditChange[]): string {
    return JSON.stringify(changes.map(change => ({
        field: change.field,
        old: formatValue(change.oldValue),
        new: formatValue(change.newValue),
    })));
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
    if (value === null || value === undefined) return "null";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "number") return value.toString();
    if (typeof value === "string") {
        // Truncate long strings
        return value.length > 100 ? value.substring(0, 100) + "..." : value;
    }
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

/**
 * Create an audit log entry with full tracking
 * Who: userId (auto-detected from session if not provided)
 * What: action
 * Target: resource + resourceId + resourceName
 * Change: changes array with old/new values
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
    try {
        // Auto-detect userId if not provided
        let userId = params.userId;
        if (userId === undefined) {
            userId = await getCurrentUserId();
        }

        // Build details object
        const details: Record<string, unknown> = {
            ...params.details,
        };

        // Add resource name if provided
        if (params.resourceName) {
            details.resourceName = params.resourceName;
        }

        // Add changes if provided
        if (params.changes && params.changes.length > 0) {
            details.changes = params.changes;
        }

        await db.auditLog.create({
            data: {
                userId: userId || null,
                action: params.action,
                resource: params.resource || null,
                resourceId: params.resourceId || null,
                details: Object.keys(details).length > 0 ? JSON.stringify(details) : null,
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
 * Create audit log from a request object with auto user detection
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
 * Helper to create audit log for update operations with change tracking
 */
export async function auditUpdate<T extends Record<string, unknown>>(
    request: Request,
    params: {
        action: AuditAction;
        resource: string;
        resourceId: string;
        resourceName?: string;
        oldData: T | null;
        newData: Partial<T>;
        fieldsToTrack?: string[];
    }
): Promise<void> {
    const changes = getChanges(params.oldData, params.newData, params.fieldsToTrack);

    await auditFromRequest(request, {
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        resourceName: params.resourceName,
        changes,
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
                select: { id: true, username: true },
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
