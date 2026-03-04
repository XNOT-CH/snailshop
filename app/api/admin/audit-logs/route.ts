import { NextResponse } from "next/server";
import { getAuditLogs, AUDIT_ACTIONS } from "@/lib/auditLog";
import { db, auditLogs } from "@/lib/db";
import { and, eq, gte, lte, count } from "drizzle-orm";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId") || undefined;
        const action = searchParams.get("action") as keyof typeof AUDIT_ACTIONS | undefined;
        const resource = searchParams.get("resource") || undefined;
        const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
        const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

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
        console.error("Error fetching audit logs:", error);
        return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
    }
}
