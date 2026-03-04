"use server";

import { NextResponse } from "next/server";
import { db, roles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const role = await db.query.roles.findFirst({ where: eq(roles.id, id) });
        if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
        return NextResponse.json(role);
    } catch {
        return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, code, iconUrl, description, permissions, sortOrder } = body;
        if (!name || !code) return NextResponse.json({ error: "Name and code are required" }, { status: 400 });

        const existingRole = await db.query.roles.findFirst({ where: eq(roles.id, id) });
        if (!existingRole) return NextResponse.json({ error: "Role not found" }, { status: 404 });

        if (code.toUpperCase() !== existingRole.code) {
            const conflict = await db.query.roles.findFirst({ where: eq(roles.code, code.toUpperCase()) });
            if (conflict) return NextResponse.json({ error: "Role code already exists" }, { status: 400 });
        }

        const newData = {
            name, code: code.toUpperCase(), iconUrl: iconUrl || null, description: description || null,
            permissions: permissions ? JSON.stringify(permissions) : null,
            sortOrder: sortOrder !== undefined ? sortOrder : existingRole.sortOrder,
        };
        await db.update(roles).set(newData).where(eq(roles.id, id));

        const changes = [];
        if (existingRole.name !== newData.name) changes.push({ field: "name", old: existingRole.name, new: newData.name });
        if (existingRole.description !== newData.description) changes.push({ field: "description", old: existingRole.description || "ไม่มี", new: newData.description || "ไม่มี" });

        await auditFromRequest(request, {
            action: AUDIT_ACTIONS.ROLE_UPDATE || "ROLE_UPDATE", resource: "Role", resourceId: id, resourceName: name,
            details: { resourceName: name, changes },
        });
        const updated = await db.query.roles.findFirst({ where: eq(roles.id, id) });
        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating role:", error);
        return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params;
        const role = await db.query.roles.findFirst({ where: eq(roles.id, id) });
        if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
        if (role.isSystem) return NextResponse.json({ error: "Cannot delete system role" }, { status: 400 });
        await db.delete(roles).where(eq(roles.id, id));
        await auditFromRequest(request, { action: AUDIT_ACTIONS.ROLE_DELETE || "ROLE_DELETE", resource: "Role", resourceId: id, details: { name: role.name, code: role.code } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting role:", error);
        return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
    }
}
