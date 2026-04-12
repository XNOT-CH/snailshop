import { NextResponse } from "next/server";
import { AUDIT_ACTIONS, auditFromRequest, getAuditLogs } from "@/lib/auditLog";
import { db, auditLogs } from "@/lib/db";
import { and, count, eq, gte, inArray, lte } from "drizzle-orm";
import { requirePermission, requirePermissionWithCsrf } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

function parseDateParam(value: string | null, label: string): Date | null {
    if (!value) return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.valueOf())) {
        throw new Error(`Invalid ${label}`);
    }

    return parsed;
}

export async function GET(request: Request) {
    const authCheck = await requirePermission(PERMISSIONS.AUDIT_LOG_VIEW);
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId") || undefined;
        const action = searchParams.get("action") || undefined;
        const resource = searchParams.get("resource") || undefined;
        const startDate = parseDateParam(searchParams.get("startDate"), "startDate") ?? undefined;
        const endDate = parseDateParam(searchParams.get("endDate"), "endDate") ?? undefined;
        const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 200);
        const offset = Math.max(Number.parseInt(searchParams.get("offset") || "0"), 0);

        const logs = await getAuditLogs({
            userId, action,
            resource, startDate, endDate, limit, offset,
        });

        // Build where conditions for count
        const conditions = [];
        if (userId) conditions.push(eq(auditLogs.userId, userId));
        if (action) conditions.push(eq(auditLogs.action, action));
        if (resource) conditions.push(eq(auditLogs.resource, resource));
        if (startDate) conditions.push(gte(auditLogs.createdAt, startDate.toISOString().slice(0, 19).replace("T", " ")));
        if (endDate) conditions.push(lte(auditLogs.createdAt, endDate.toISOString().slice(0, 19).replace("T", " ")));

        const [{ count: total }] = await db.select({ count: count() }).from(auditLogs)
            .where(conditions.length > 0 ? and(...conditions) : undefined);

        return NextResponse.json({ logs, total: Number(total), limit, offset });
    } catch (error) {
        if (error instanceof Error && error.message.startsWith("Invalid ")) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        console.error("Error fetching audit logs:", error);
        return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
    }
}

type DeleteAuditLogsPayload =
    | { mode: "single"; id?: string }
    | { mode: "selected"; ids?: string[] }
    | { mode: "all" };

export async function DELETE(request: Request) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.AUDIT_LOG_DELETE);
    if (!authCheck.success) {
        return NextResponse.json({ error: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => null) as DeleteAuditLogsPayload | null;
        const mode = body?.mode;

        if (!mode || !["single", "selected", "all"].includes(mode)) {
            return NextResponse.json({ error: "Invalid delete mode" }, { status: 400 });
        }

        let deletedCount = 0;

        if (mode === "single") {
            if (!body.id) {
                return NextResponse.json({ error: "Missing audit log id" }, { status: 400 });
            }

            const result = await db.delete(auditLogs).where(eq(auditLogs.id, body.id));
            deletedCount = result[0]?.affectedRows ?? 0;
        }

        if (mode === "selected") {
            const ids = Array.isArray(body.ids)
                ? Array.from(new Set(body.ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0)))
                : [];

            if (ids.length === 0) {
                return NextResponse.json({ error: "No audit logs selected" }, { status: 400 });
            }

            const result = await db.delete(auditLogs).where(inArray(auditLogs.id, ids));
            deletedCount = result[0]?.affectedRows ?? 0;
        }

        if (mode === "all") {
            const result = await db.delete(auditLogs);
            deletedCount = result[0]?.affectedRows ?? 0;
        }

        await auditFromRequest(request, {
            userId: authCheck.userId,
            action: AUDIT_ACTIONS.AUDIT_LOG_DELETE,
            resource: "AuditLog",
            resourceId: mode === "single" ? body.id ?? "single" : mode,
            resourceName: mode === "all" ? "ลบ Audit Logs ทั้งหมด" : "ลบ Audit Logs",
            details: {
                mode,
                deletedCount,
                ids: mode === "selected" ? body.ids ?? [] : undefined,
            },
        });

        return NextResponse.json({ success: true, deletedCount });
    } catch (error) {
        console.error("Error deleting audit logs:", error);
        return NextResponse.json({ error: "Failed to delete audit logs" }, { status: 500 });
    }
}
