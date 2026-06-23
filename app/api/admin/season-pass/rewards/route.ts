import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requirePermissionWithCsrf } from "@/lib/auth";
import { getAdminSeasonPassRewards, updateAdminSeasonPassRewards } from "@/lib/seasonPass";
import { PERMISSIONS } from "@/lib/permissions";
import { contentApiError } from "@/lib/features/content/apiResponse";

const ALLOWED_TYPES = new Set(["credits", "points", "tickets"]);

export async function GET() {
    const authCheck = await requirePermission(PERMISSIONS.SEASON_PASS_VIEW);
    if (!authCheck.success) {
        return contentApiError("Unauthorized", { status: 401 });
    }

    try {
        const rewards = await getAdminSeasonPassRewards();
        return NextResponse.json(rewards);
    } catch {
        return contentApiError("Failed to fetch season pass rewards", { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const authCheck = await requirePermissionWithCsrf(request, PERMISSIONS.SEASON_PASS_EDIT);
    if (!authCheck.success) {
        return contentApiError("Unauthorized", { status: 401 });
    }

    try {
        const body = await request.json() as {
            rewards?: Array<{
                dayNumber: number;
                rewardType: string;
                amount: string;
                label: string;
                imageUrl?: string | null;
                highlight?: boolean;
                creditReward?: number | null;
                pointReward?: number | null;
            }>;
        };

        const rewards = body.rewards;
        if (!Array.isArray(rewards) || rewards.length === 0) {
            return contentApiError("Rewards payload is required", { status: 400 });
        }

        for (const reward of rewards) {
            if (!Number.isInteger(reward.dayNumber) || reward.dayNumber < 1 || reward.dayNumber > 30) {
                return contentApiError("Invalid day number", { status: 400 });
            }

            if (!ALLOWED_TYPES.has(reward.rewardType)) {
                return contentApiError("Invalid reward type", { status: 400 });
            }

            if (!reward.label?.trim() || !reward.amount?.trim()) {
                return contentApiError("Reward label and amount are required", { status: 400 });
            }

            const numericAmount = Number(reward.amount);
            if (!Number.isFinite(numericAmount) || numericAmount < 0) {
                return contentApiError("Reward amount must be a non-negative number", { status: 400 });
            }
        }

        const updatedRewards = await updateAdminSeasonPassRewards(
            rewards.map((reward) => ({
                dayNumber: reward.dayNumber,
                rewardType: reward.rewardType as "credits" | "points" | "tickets",
                amount: reward.amount.trim(),
                label: reward.label.trim(),
                imageUrl: reward.imageUrl?.trim() || null,
                highlight: Boolean(reward.highlight),
                creditReward: reward.creditReward ?? null,
                pointReward: reward.pointReward ?? null,
            })),
        );

        return NextResponse.json(updatedRewards);
    } catch (error) {
        return contentApiError(
            error instanceof Error ? error.message : "Failed to update season pass rewards",
            { status: 500 },
        );
    }
}
