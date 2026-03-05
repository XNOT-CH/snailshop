import { NextRequest, NextResponse } from "next/server";
import { db, navItems } from "@/lib/db";
import { asc, max, count } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { validateBody } from "@/lib/validations/validate";
import { navItemSchema } from "@/lib/validations/content";

const DEFAULT_NAV_ITEMS = [
    { label: "หน้าแรก", href: "/", icon: "home", sortOrder: 0 },
    { label: "ร้านค้า", href: "/shop", icon: "shop", sortOrder: 1 },
    { label: "แดชบอร์ด", href: "/dashboard", icon: "dashboard", sortOrder: 2 },
    { label: "ช่วยเหลือ", href: "/help", icon: "help", sortOrder: 3 },
];

export async function GET() {
    try {
        const [{ count: navCount }] = await db.select({ count: count() }).from(navItems);
        if (Number(navCount) === 0) {
            await db.insert(navItems).values(DEFAULT_NAV_ITEMS.map(item => ({ id: crypto.randomUUID(), ...item })));
        }
        const items = await db.query.navItems.findMany({ orderBy: (t, { asc }) => asc(t.sortOrder) });
        return NextResponse.json(items);
    } catch (error) {
        console.error("Error fetching nav items:", error);
        return NextResponse.json({ error: "Failed to fetch nav items" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authCheck = await isAdmin();
    if (!authCheck.success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const result = await validateBody(request, navItemSchema);
        if ("error" in result) return result.error;
        const body = result.data;

        const [{ maxSort }] = await db.select({ maxSort: max(navItems.sortOrder) }).from(navItems);
        const nextSortOrder = body.sortOrder ?? (maxSort ?? -1) + 1;
        const newId = crypto.randomUUID();
        await db.insert(navItems).values({ id: newId, label: body.label, href: body.href, icon: body.icon || null, sortOrder: nextSortOrder });
        const item = await db.query.navItems.findFirst({ where: (t, { eq }) => eq(t.id, newId) });
        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        console.error("Error creating nav item:", error);
        return NextResponse.json({ error: "Failed to create nav item" }, { status: 500 });
    }
}
