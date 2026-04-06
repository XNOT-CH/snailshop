import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminSeasonPassRewards, updateAdminSeasonPassRewards } from "@/lib/seasonPass";

const ALLOWED_TYPES = new Set(["credits", "points", "tickets"]);

export async function GET() {
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const rewards = await getAdminSeasonPassRewards();
        return NextResponse.json(rewards);
    } catch {
        return NextResponse.json({ error: "Failed to fetch season pass rewards" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const authCheck = await isAdmin();
    if (!authCheck.success) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
            return NextResponse.json({ error: "Rewards payload is required" }, { status: 400 });
        }

        for (const reward of rewards) {
            if (!Number.isInteger(reward.dayNumber) || reward.dayNumber < 1 || reward.dayNumber > 30) {
                return NextResponse.json({ error: "Invalid day number" }, { status: 400 });
            }

            if (!ALLOWED_TYPES.has(reward.rewardType)) {
                return NextResponse.json({ error: "Invalid reward type" }, { status: 400 });
            }

            if (!reward.label?.trim() || !reward.amount?.trim()) {
                return NextResponse.json({ error: "Reward label and amount are required" }, { status: 400 });
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
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to update season pass rewards" },
            { status: 500 },
        );
    }
}
