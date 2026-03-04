import { db, auditLogs, users } from "@/lib/db";
import { eq, lt, and, gte, lte } from "drizzle-orm";
import { getClientIp } from "@/lib/rateLimit";
import { cookies } from "next/headers";

// Audit action types
export const AUDIT_ACTIONS = {
    LOGIN: "LOGIN", LOGIN_FAILED: "LOGIN_FAILED", LOGOUT: "LOGOUT",
    REGISTER: "REGISTER", PASSWORD_CHANGE: "PASSWORD_CHANGE", PROFILE_UPDATE: "PROFILE_UPDATE",
    USER_CREATE: "USER_CREATE", USER_UPDATE: "USER_UPDATE", USER_DELETE: "USER_DELETE",
    USER_ROLE_CHANGE: "USER_ROLE_CHANGE", USER_PERMISSION_CHANGE: "USER_PERMISSION_CHANGE",
    ROLE_CREATE: "ROLE_CREATE", ROLE_UPDATE: "ROLE_UPDATE", ROLE_DELETE: "ROLE_DELETE",
    PRODUCT_CREATE: "PRODUCT_CREATE", PRODUCT_UPDATE: "PRODUCT_UPDATE", PRODUCT_DELETE: "PRODUCT_DELETE",
    PRODUCT_DUPLICATE: "PRODUCT_DUPLICATE", PRODUCT_FEATURED_TOGGLE: "PRODUCT_FEATURED_TOGGLE",
    NEWS_CREATE: "NEWS_CREATE", NEWS_UPDATE: "NEWS_UPDATE", NEWS_DELETE: "NEWS_DELETE",
    HELP_CREATE: "HELP_CREATE", HELP_UPDATE: "HELP_UPDATE", HELP_DELETE: "HELP_DELETE",
    BANNER_CREATE: "BANNER_CREATE", BANNER_UPDATE: "BANNER_UPDATE", BANNER_DELETE: "BANNER_DELETE",
    POPUP_CREATE: "POPUP_CREATE", POPUP_UPDATE: "POPUP_UPDATE", POPUP_DELETE: "POPUP_DELETE",
    PURCHASE: "PURCHASE",
    TOPUP_REQUEST: "TOPUP_REQUEST", TOPUP_APPROVE: "TOPUP_APPROVE", TOPUP_REJECT: "TOPUP_REJECT",
    SETTINGS_UPDATE: "SETTINGS_UPDATE",
    API_KEY_CREATE: "API_KEY_CREATE", API_KEY_REVOKE: "API_KEY_REVOKE",
    RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED", UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

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
    resourceName?: string;
    changes?: AuditChange[];
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    status?: "SUCCESS" | "FAILURE";
}

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

export function getChanges<T extends Record<string, unknown>>(
    oldData: T | null,
    newData: Partial<T>,
    fieldsToTrack?: string[]
): AuditChange[] {
    const changes: AuditChange[] = [];
    if (!oldData) {
        for (const [field, newValue] of Object.entries(newData)) {
            if (fieldsToTrack && !fieldsToTrack.includes(field)) continue;
            if (newValue !== undefined && newValue !== null) changes.push({ field, oldValue: null, newValue });
        }
        return changes;
    }
    for (const [field, newValue] of Object.entries(newData)) {
        if (fieldsToTrack && !fieldsToTrack.includes(field)) continue;
        const oldValue = oldData[field];
        if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
        if (newValue === undefined) continue;
        changes.push({ field, oldValue, newValue });
    }
    return changes;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
    try {
        let userId = params.userId;
        if (userId === undefined) userId = await getCurrentUserId();

        const details: Record<string, unknown> = { ...params.details };
        if (params.resourceName) details.resourceName = params.resourceName;
        if (params.changes && params.changes.length > 0) details.changes = params.changes;

        await db.insert(auditLogs).values({
            userId: userId || null,
            action: params.action,
            resource: params.resource || null,
            resourceId: params.resourceId || null,
            details: Object.keys(details).length > 0 ? JSON.stringify(details) : null,
            ipAddress: params.ipAddress || null,
            userAgent: params.userAgent || null,
            status: params.status || "SUCCESS",
        });
    } catch (error) {
        console.error("Failed to create audit log:", error);
    }
}

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

export async function getAuditLogs(options: {
    userId?: string;
    action?: AuditAction;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}) {
    const conditions = [];
    if (options.userId) conditions.push(eq(auditLogs.userId, options.userId));
    if (options.action) conditions.push(eq(auditLogs.action, options.action));
    if (options.resource) conditions.push(eq(auditLogs.resource, options.resource));
    if (options.startDate) conditions.push(gte(auditLogs.createdAt, options.startDate.toISOString().slice(0, 19).replace("T", " ")));
    if (options.endDate) conditions.push(lte(auditLogs.createdAt, options.endDate.toISOString().slice(0, 19).replace("T", " ")));

    return db.query.auditLogs.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: { user: { columns: { id: true, username: true } } },
        orderBy: (t, { desc }) => desc(t.createdAt),
        limit: options.limit || 50,
        offset: options.offset || 0,
    });
}

export async function cleanupOldAuditLogs(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    const result = await db.delete(auditLogs)
        .where(lt(auditLogs.createdAt, cutoffDate.toISOString().slice(0, 19).replace("T", " ")));
    return result[0].affectedRows;
}
