import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requirePermission, requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
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
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.SEASON_PASS_EDIT);
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
                // Omitting the field keeps the plan as it is; defaulting to true
                // meant an unrelated save could put a paused plan back on sale.
                isActive: body.isActive ?? currentPlan.isActive,
            })
            .where(eq(seasonPassPlans.id, currentPlan.id));

        const updatedPlan = await db.query.seasonPassPlans.findFirst({
            where: eq(seasonPassPlans.id, currentPlan.id),
        });

        // The package price is a money setting; it was the one product-shaped
        // thing in the admin that could be changed without leaving a trace.
        const nextIsActive = body.isActive ?? currentPlan.isActive;
        const changes = [];
        if (currentPlan.name !== name) changes.push({ field: "name", old: String(currentPlan.name ?? ""), new: name });
        if (Number(currentPlan.price) !== Number(price)) changes.push({ field: "price", old: String(currentPlan.price), new: String(price) });
        if (Boolean(currentPlan.isActive) !== Boolean(nextIsActive)) {
            changes.push({ field: "isActive", old: String(Boolean(currentPlan.isActive)), new: String(Boolean(nextIsActive)) });
        }

        if (changes.length > 0) {
            await auditFromRequest(request, {
                action: AUDIT_ACTIONS.SEASON_PASS_PLAN_UPDATE,
                resource: "SeasonPassPlan",
                resourceId: currentPlan.id,
                resourceName: name,
                details: { resourceName: name, changes },
            });
        }

        return NextResponse.json(updatedPlan);
    } catch {
        return contentApiError("Failed to update season pass plan", { status: 500 });
    }
}
