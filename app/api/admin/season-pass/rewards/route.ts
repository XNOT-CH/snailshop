import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requirePermissionWithCsrf } from "@/lib/auth";
import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { getAdminSeasonPassRewards, updateAdminSeasonPassRewards } from "@/lib/seasonPass";
import { PERMISSIONS } from "@/lib/permissions";
import { SEASON_PASS_REWARD_DAYS } from "@/lib/seasonPassConfig";
import { contentApiError } from "@/lib/features/content/apiResponse";

const ALLOWED_TYPES = new Set(["credits", "points", "tickets"]);
// A board day hands its amount straight to a customer balance, so a slipped
// digit is a real payout. Anything above this is a typo, not a promotion.
const MAX_REWARD_AMOUNT = 1_000_000;

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
            if (
                !Number.isInteger(reward.dayNumber)
                || reward.dayNumber < 1
                || reward.dayNumber > SEASON_PASS_REWARD_DAYS
            ) {
                return contentApiError("Invalid day number", { status: 400 });
            }

            if (!ALLOWED_TYPES.has(reward.rewardType)) {
                return contentApiError("Invalid reward type", { status: 400 });
            }

            if (!reward.label?.trim() || !reward.amount?.trim()) {
                return contentApiError("Reward label and amount are required", { status: 400 });
            }

            const numericAmount = Number(reward.amount);
            if (!Number.isInteger(numericAmount) || numericAmount < 0) {
                return contentApiError("Reward amount must be a non-negative whole number", { status: 400 });
            }

            if (numericAmount > MAX_REWARD_AMOUNT) {
                return contentApiError(
                    `จำนวนรางวัลต่อวันต้องไม่เกิน ${MAX_REWARD_AMOUNT.toLocaleString()}`,
                    { status: 400 },
                );
            }
        }

        // Snapshot before writing so the trail names the days that moved rather
        // than all thirty every time someone presses save.
        const previousRewards = await getAdminSeasonPassRewards();
        const previousByDay = new Map(previousRewards.map((reward) => [reward.dayNumber, reward]));

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

        const changes = rewards.flatMap((reward) => {
            const previous = previousByDay.get(reward.dayNumber);
            const before = previous
                ? `${previous.rewardType} ${previous.amount}${previous.highlight ? " (ไฮไลต์)" : ""}`
                : "-";
            const after = `${reward.rewardType} ${reward.amount.trim()}${reward.highlight ? " (ไฮไลต์)" : ""}`;
            return before === after ? [] : [{ field: `day ${reward.dayNumber}`, old: before, new: after }];
        });

        if (changes.length > 0) {
            await auditFromRequest(request, {
                action: AUDIT_ACTIONS.SEASON_PASS_REWARDS_UPDATE,
                resource: "SeasonPassReward",
                resourceId: "board",
                resourceName: `แก้รางวัล ${changes.length} วัน`,
                details: { resourceName: `แก้รางวัล ${changes.length} วัน`, changes },
            });
        }

        return NextResponse.json(updatedRewards);
    } catch (error) {
        return contentApiError(
            error instanceof Error ? error.message : "Failed to update season pass rewards",
            { status: 500 },
        );
    }
}
