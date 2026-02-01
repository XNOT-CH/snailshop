import { NextResponse } from "next/server";
import { getAuditLogs, AUDIT_ACTIONS } from "@/lib/auditLog";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const userId = searchParams.get("userId") || undefined;
        const action = searchParams.get("action") as keyof typeof AUDIT_ACTIONS | undefined;
        const resource = searchParams.get("resource") || undefined;
        const startDate = searchParams.get("startDate")
            ? new Date(searchParams.get("startDate")!)
            : undefined;
        const endDate = searchParams.get("endDate")
            ? new Date(searchParams.get("endDate")!)
            : undefined;
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        const logs = await getAuditLogs({
            userId,
            action: action ? AUDIT_ACTIONS[action] : undefined,
            resource,
            startDate,
            endDate,
            limit,
            offset,
        });

        // Get total count for pagination
        const total = await getAuditLogsCount({
            userId,
            action: action ? AUDIT_ACTIONS[action] : undefined,
            resource,
            startDate,
            endDate,
        });

        return NextResponse.json({
            logs,
            total,
            limit,
            offset,
        });
    } catch (error) {
        console.error("Error fetching audit logs:", error);
        return NextResponse.json(
            { error: "Failed to fetch audit logs" },
            { status: 500 }
        );
    }
}

// Helper function to get count
async function getAuditLogsCount(options: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
}) {
    const { db } = await import("@/lib/db");

    const where: Record<string, unknown> = {};

    if (options.userId) where.userId = options.userId;
    if (options.action) where.action = options.action;
    if (options.resource) where.resource = options.resource;

    if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) (where.createdAt as Record<string, unknown>).gte = options.startDate;
        if (options.endDate) (where.createdAt as Record<string, unknown>).lte = options.endDate;
    }

    return db.auditLog.count({ where });
}
