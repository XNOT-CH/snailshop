"use server";

import { NextResponse } from "next/server";
import { db, roles } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

export async function GET() {
    try {
        const roleList = await db.query.roles.findMany({ orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.createdAt)] });
        return NextResponse.json(roleList);
    } catch (error) {
        console.error("Error fetching roles:", error);
        return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, code, iconUrl, description, permissions, sortOrder } = body;
        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        const roleCode = code ? code.toUpperCase() : name.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
        const existing = await db.query.roles.findFirst({ where: eq(roles.code, roleCode) });
        if (existing) return NextResponse.json({ error: "Role code already exists" }, { status: 400 });

        const newId = crypto.randomUUID();
        await db.insert(roles).values({
            id: newId, name, code: roleCode, iconUrl: iconUrl || null, description: description || null,
            permissions: permissions ? JSON.stringify(permissions) : null,
            sortOrder: sortOrder || 0, isSystem: false,
        });
        const role = await db.query.roles.findFirst({ where: eq(roles.id, newId) });

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.ROLE_CREATE || "ROLE_CREATE", resource: "Role", resourceId: newId,
            details: { name, code: roleCode },
        });
        return NextResponse.json(role, { status: 201 });
    } catch (error) {
        console.error("Error creating role:", error);
        return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
    }
}
