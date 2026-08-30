import { mysqlNow } from "@/lib/utils/date";
import { escapeLikePattern } from "@/lib/utils/sql";
import { db, auditLogs, users } from "@/lib/db";
import { eq, lt, and, or, gte, lte, like, inArray } from "drizzle-orm";
import { getClientIp } from "@/lib/rateLimit";

// Audit action types
export const AUDIT_ACTIONS = {
    LOGIN: "LOGIN", LOGIN_FAILED: "LOGIN_FAILED", LOGOUT: "LOGOUT",
    REGISTER: "REGISTER", PASSWORD_CHANGE: "PASSWORD_CHANGE", PASSWORD_RESET_REQUEST: "PASSWORD_RESET_REQUEST", PASSWORD_RESET_COMPLETE: "PASSWORD_RESET_COMPLETE", PROFILE_UPDATE: "PROFILE_UPDATE", // NOSONAR - these are audit action names, not passwords
    PIN_SET: "PIN_SET", PIN_CHANGED: "PIN_CHANGED", PIN_RESET: "PIN_RESET", PIN_VERIFY_FAILED: "PIN_VERIFY_FAILED",
    USER_CREATE: "USER_CREATE", USER_UPDATE: "USER_UPDATE", USER_DELETE: "USER_DELETE",
    USER_BAN: "USER_BAN", USER_UNBAN: "USER_UNBAN",
    USER_ROLE_CHANGE: "USER_ROLE_CHANGE", USER_PERMISSION_CHANGE: "USER_PERMISSION_CHANGE",
    ROLE_CREATE: "ROLE_CREATE", ROLE_UPDATE: "ROLE_UPDATE", ROLE_DELETE: "ROLE_DELETE",
    PRODUCT_CREATE: "PRODUCT_CREATE", PRODUCT_UPDATE: "PRODUCT_UPDATE", PRODUCT_DELETE: "PRODUCT_DELETE",
    PRODUCT_RESTORE: "PRODUCT_RESTORE", PRODUCT_PERMANENT_DELETE: "PRODUCT_PERMANENT_DELETE",
    PRODUCT_DUPLICATE: "PRODUCT_DUPLICATE", PRODUCT_FEATURED_TOGGLE: "PRODUCT_FEATURED_TOGGLE",
    PROMO_CREATE: "PROMO_CREATE", PROMO_UPDATE: "PROMO_UPDATE", PROMO_DELETE: "PROMO_DELETE",
    NEWS_CREATE: "NEWS_CREATE", NEWS_UPDATE: "NEWS_UPDATE", NEWS_DELETE: "NEWS_DELETE",
    HELP_CREATE: "HELP_CREATE", HELP_UPDATE: "HELP_UPDATE", HELP_DELETE: "HELP_DELETE",
    BANNER_CREATE: "BANNER_CREATE", BANNER_UPDATE: "BANNER_UPDATE", BANNER_DELETE: "BANNER_DELETE",
    POPUP_CREATE: "POPUP_CREATE", POPUP_UPDATE: "POPUP_UPDATE", POPUP_DELETE: "POPUP_DELETE",
    PURCHASE: "PURCHASE",
    SEASON_PASS_PURCHASE: "SEASON_PASS_PURCHASE", SEASON_PASS_RENEW_QUEUED: "SEASON_PASS_RENEW_QUEUED",
    SEASON_PASS_CLAIM: "SEASON_PASS_CLAIM", SEASON_PASS_QUEUE_ACTIVATED: "SEASON_PASS_QUEUE_ACTIVATED",
    SEASON_PASS_PLAN_UPDATE: "SEASON_PASS_PLAN_UPDATE", SEASON_PASS_REWARDS_UPDATE: "SEASON_PASS_REWARDS_UPDATE",
    SEASON_PASS_LIFECYCLE_RUN: "SEASON_PASS_LIFECYCLE_RUN",
    QUEST_CREATE: "QUEST_CREATE", QUEST_UPDATE: "QUEST_UPDATE", QUEST_DELETE: "QUEST_DELETE",
    TOPUP_REQUEST: "TOPUP_REQUEST", TOPUP_APPROVE: "TOPUP_APPROVE", TOPUP_REJECT: "TOPUP_REJECT",
    CHAT_CUSTOMER_MESSAGE: "CHAT_CUSTOMER_MESSAGE", CHAT_ADMIN_MESSAGE: "CHAT_ADMIN_MESSAGE", CHAT_STATUS_UPDATE: "CHAT_STATUS_UPDATE", CHAT_DELETE: "CHAT_DELETE",
    CHAT_TAGS_UPDATE: "CHAT_TAGS_UPDATE", CHAT_PIN_UPDATE: "CHAT_PIN_UPDATE",
    CHAT_ASSIGNEE_UPDATE: "CHAT_ASSIGNEE_UPDATE", CHAT_NOTE_CREATE: "CHAT_NOTE_CREATE",
    CHAT_TEMPLATE_CREATE: "CHAT_TEMPLATE_CREATE", CHAT_TEMPLATE_UPDATE: "CHAT_TEMPLATE_UPDATE", CHAT_TEMPLATE_DELETE: "CHAT_TEMPLATE_DELETE",
    SETTINGS_UPDATE: "SETTINGS_UPDATE",
    DATA_EXPORT: "DATA_EXPORT",
    AUDIT_LOG_DELETE: "AUDIT_LOG_DELETE",
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
        const { auth } = await import("@/auth");
        const session = await auth();
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
    for (const [field, newValue] of Object.entries(newData)) {
        if (fieldsToTrack && !fieldsToTrack.includes(field)) continue;
        if (newValue === undefined) continue;

        if (!oldData) {
            if (newValue !== null) changes.push({ field, oldValue: null, newValue });
            continue;
        }

        const oldValue = oldData[field];
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes.push({ field, oldValue, newValue });
        }
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
            createdAt: mysqlNow(),
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

export interface AuditLogQueryOptions {
    userId?: string;
    action?: string;
    resource?: string;
    status?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

const toMysqlDate = (date: Date) => date.toISOString().slice(0, 19).replace("T", " ");

/**
 * Shared WHERE conditions for the audit log list. Used by both the row query
 * and the count query so pagination totals always match the rows returned.
 */
export function buildAuditLogConditions(options: AuditLogQueryOptions) {
    const conditions = [];
    if (options.userId) conditions.push(eq(auditLogs.userId, options.userId));
    if (options.action) conditions.push(eq(auditLogs.action, options.action));
    if (options.resource) conditions.push(eq(auditLogs.resource, options.resource));
    if (options.status) conditions.push(eq(auditLogs.status, options.status));
    if (options.startDate) conditions.push(gte(auditLogs.createdAt, toMysqlDate(options.startDate)));
    if (options.endDate) conditions.push(lte(auditLogs.createdAt, toMysqlDate(options.endDate)));

    const search = options.search?.trim();
    if (search) {
        const term = `%${escapeLikePattern(search)}%`;
        const usersMatchingName = db.select({ id: users.id }).from(users).where(like(users.username, term));
        const searchCondition = or(
            like(auditLogs.action, term),
            like(auditLogs.resource, term),
            like(auditLogs.resourceId, term),
            like(auditLogs.ipAddress, term),
            like(auditLogs.details, term),
            inArray(auditLogs.userId, usersMatchingName),
        );
        if (searchCondition) conditions.push(searchCondition);
    }

    return conditions;
}

export async function getAuditLogs(options: AuditLogQueryOptions) {
    const conditions = buildAuditLogConditions(options);

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
