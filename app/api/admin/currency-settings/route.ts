import { NextRequest, NextResponse } from "next/server";
import { db, currencySettings } from "@/lib/db";
import { eq } from "drizzle-orm";

const DEFAULT_SETTINGS = { id: "default", name: "พอยท์", symbol: "💎", code: "POINT", description: null, isActive: true };

export async function GET() {
    try {
        let settings = await db.query.currencySettings.findFirst({ where: eq(currencySettings.id, "default") });
        if (!settings) {
            await db.insert(currencySettings).values(DEFAULT_SETTINGS);
            settings = await db.query.currencySettings.findFirst({ where: eq(currencySettings.id, "default") });
        }
        return NextResponse.json(settings);
    } catch {
        return NextResponse.json({ error: "Failed to fetch currency settings" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, symbol, description, isActive } = body;
        if (!name || !symbol) return NextResponse.json({ error: "Name and symbol are required" }, { status: 400 });
        const existing = await db.query.currencySettings.findFirst({ where: eq(currencySettings.id, "default") });
        if (existing) {
            await db.update(currencySettings).set({ name, symbol, description: description || null, isActive: isActive ?? true }).where(eq(currencySettings.id, "default"));
        } else {
            await db.insert(currencySettings).values({ id: "default", name, symbol, code: "POINT", description: description || null, isActive: isActive ?? true });
        }
        const settings = await db.query.currencySettings.findFirst({ where: eq(currencySettings.id, "default") });
        return NextResponse.json(settings);
    } catch {
        return NextResponse.json({ error: "Failed to update currency settings" }, { status: 500 });
    }
}
