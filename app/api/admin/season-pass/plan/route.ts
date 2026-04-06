import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/auth";
import { db, seasonPassPlans } from "@/lib/db";
import { getOrCreateSeasonPassPlan } from "@/lib/seasonPass";

function normalizePrice(value: unknown) {
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) {
        return null;
    }

    return price.toFixed(2);
}

function normalizeDuration(value: unknown) {
    const duration = Number(value);
    if (!Number.isInteger(duration) || duration <= 0 || duration > 365) {
        return null;
    }

    return duration;
}

export async function GET() {
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const plan = await getOrCreateSeasonPassPlan();
        return NextResponse.json(plan);
    } catch {
        return NextResponse.json({ error: "Failed to fetch season pass plan" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const currentPlan = await getOrCreateSeasonPassPlan();
        const body = await request.json() as {
            name?: string;
            description?: string | null;
            price?: number | string;
            durationDays?: number | string;
            isActive?: boolean;
        };

        const name = body.name?.trim();
        const description = body.description?.trim() ?? null;
        const price = normalizePrice(body.price);
        const durationDays = normalizeDuration(body.durationDays);

        if (!name) {
            return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
        }

        if (price === null) {
            return NextResponse.json({ error: "Invalid price" }, { status: 400 });
        }

        if (durationDays === null) {
            return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
        }

        await db
            .update(seasonPassPlans)
            .set({
                name,
                description,
                price,
                durationDays,
                isActive: body.isActive ?? true,
            })
            .where(eq(seasonPassPlans.id, currentPlan.id));

        const updatedPlan = await db.query.seasonPassPlans.findFirst({
            where: eq(seasonPassPlans.id, currentPlan.id),
        });

        return NextResponse.json(updatedPlan);
    } catch {
        return NextResponse.json({ error: "Failed to update season pass plan" }, { status: 500 });
    }
}
