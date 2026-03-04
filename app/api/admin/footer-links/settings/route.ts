import { NextRequest, NextResponse } from "next/server";
import { db, footerWidgetSettings } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
    try {
        let settings = await db.query.footerWidgetSettings.findFirst();
        if (!settings) {
            const newId = crypto.randomUUID();
            await db.insert(footerWidgetSettings).values({ id: newId, isActive: true, title: "เมนูลัด" });
            settings = await db.query.footerWidgetSettings.findFirst();
        }
        return NextResponse.json(settings);
    } catch {
        return NextResponse.json({ error: "Failed to fetch footer settings" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { isActive, title } = body;
        let settings = await db.query.footerWidgetSettings.findFirst();
        if (!settings) {
            const newId = crypto.randomUUID();
            await db.insert(footerWidgetSettings).values({ id: newId, isActive: isActive ?? true, title: title ?? "เมนูลัด" });
        } else {
            const set: Record<string, unknown> = {};
            if (isActive !== undefined) set.isActive = isActive;
            if (title !== undefined) set.title = title;
            await db.update(footerWidgetSettings).set(set as any).where(eq(footerWidgetSettings.id, settings.id));
        }
        const updated = await db.query.footerWidgetSettings.findFirst();
        return NextResponse.json(updated);
    } catch {
        return NextResponse.json({ error: "Failed to update footer settings" }, { status: 500 });
    }
}
