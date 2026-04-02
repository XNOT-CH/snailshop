import { NextResponse } from "next/server";
import { getAuditLogs, AUDIT_ACTIONS } from "@/lib/auditLog";
import { db, auditLogs } from "@/lib/db";
import { and, eq, gte, lte, count } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";

function parseDateParam(value: string | null, label: string): Date | null {
    if (!value) return null;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.valueOf())) {
        throw new Error(`Invalid ${label}`);
    }

    return parsed;
}

export async function GET(request: Request) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId") || undefined;
        const action = searchParams.get("action") as keyof typeof AUDIT_ACTIONS | undefined;
        const resource = searchParams.get("resource") || undefined;
        const startDate = parseDateParam(searchParams.get("startDate"), "startDate") ?? undefined;
        const endDate = parseDateParam(searchParams.get("endDate"), "endDate") ?? undefined;
        const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 200);
        const offset = Math.max(Number.parseInt(searchParams.get("offset") || "0"), 0);

        if (action && !(action in AUDIT_ACTIONS)) {
            return NextResponse.json({ error: "Invalid action filter" }, { status: 400 });
        }

        const logs = await getAuditLogs({
            userId, action: action ? AUDIT_ACTIONS[action] : undefined,
            resource, startDate, endDate, limit, offset,
        });

        // Build where conditions for count
        const conditions = [];
        if (userId) conditions.push(eq(auditLogs.userId, userId));
        if (action) conditions.push(eq(auditLogs.action, AUDIT_ACTIONS[action]));
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
