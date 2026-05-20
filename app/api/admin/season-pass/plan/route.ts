import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";
import { db, seasonPassPlans } from "@/lib/db";
import { SEASON_PASS_REWARD_DAYS } from "@/lib/seasonPassConfig";
import { getOrCreateSeasonPassPlan } from "@/lib/seasonPass";
import { PERMISSIONS } from "@/lib/permissions";
import { contentApiError } from "@/lib/features/content/apiResponse";

function normalizePrice(value: unknown) {
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) {
        return null;
    }

    return price.toFixed(2);
}

function normalizeDuration(value: unknown) {
    const duration = Number(value);
    if (!Number.isInteger(duration) || duration !== SEASON_PASS_REWARD_DAYS) {
        return null;
    }

    return duration;
}

export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.SEASON_PASS_VIEW);
    if (!authCheck.success) {
        return contentApiError("Unauthorized", { status: 401 });
    }

    try {
        const plan = await getOrCreateSeasonPassPlan();
        return NextResponse.json(plan);
    } catch {
        return contentApiError("Failed to fetch season pass plan", { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.SEASON_PASS_EDIT);
    if (!authCheck.success) {
        return contentApiError("Unauthorized", { status: 401 });
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
        const durationDays = normalizeDuration(body.durationDays ?? SEASON_PASS_REWARD_DAYS);

        if (!name) {
            return contentApiError("Plan name is required", { status: 400 });
        }

        if (price === null) {
            return contentApiError("Invalid price", { status: 400 });
        }

        if (durationDays === null) {
            return contentApiError(
                `Season Pass currently supports a fixed ${SEASON_PASS_REWARD_DAYS}-day reward board`,
                { status: 400 },
            );
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
        return contentApiError("Failed to update season pass plan", { status: 500 });
    }
}
