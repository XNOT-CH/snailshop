import { mysqlNow } from "@/lib/utils/date";
import { NextRequest, NextResponse } from "next/server";
import { db, currencySettings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requirePermission, requirePermissionWithCsrf } from "@/lib/auth";
import { validateBody } from "@/lib/validations/validate";
import { currencySettingsSchema } from "@/lib/validations/content";
import { PERMISSIONS } from "@/lib/permissions";

const DEFAULT_SETTINGS = { id: "default", name: "พอยท์", symbol: "💎", code: "POINT", description: null, isActive: true, updatedAt: "" };

export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.SETTINGS_VIEW);
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        let settings = await db.query.currencySettings.findFirst({ where: eq(currencySettings.id, "default") });
        if (!settings) {
            await db.insert(currencySettings).values({ ...DEFAULT_SETTINGS, updatedAt: mysqlNow() });
            settings = await db.query.currencySettings.findFirst({ where: eq(currencySettings.id, "default") });
        }
        return NextResponse.json(settings);
    } catch {
        return NextResponse.json({ error: "Failed to fetch currency settings" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.SETTINGS_EDIT);
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const result = await validateBody(request, currencySettingsSchema);
        if ("error" in result) return result.error;
        const { name, symbol, description, isActive } = result.data;

        const existing = await db.query.currencySettings.findFirst({ where: eq(currencySettings.id, "default") });
        if (existing) {
            await db.update(currencySettings).set({ name, symbol, description: description || null, isActive }).where(eq(currencySettings.id, "default"));
        } else {
            await db.insert(currencySettings).values({ id: "default", name, symbol, code: "POINT", description: description || null, isActive, updatedAt: mysqlNow() });
        }
        const settings = await db.query.currencySettings.findFirst({ where: eq(currencySettings.id, "default") });
        return NextResponse.json(settings);
    } catch {
        return NextResponse.json({ error: "Failed to update currency settings" }, { status: 500 });
    }
}
