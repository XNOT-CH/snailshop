import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
    buildSeasonPassBoard,
    getCurrentSeasonPassSubscription,
    getOrCreateSeasonPassPlan,
    getSeasonPassRewardCatalog,
    getSeasonPassRewardByDay,
} from "@/lib/seasonPass";
import { formatDateInTimeZone } from "@/lib/utils/date";

type LockedSubscriptionRow = {
    id: string;
    startAt: string;
};

export async function POST() {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const plan = await getOrCreateSeasonPassPlan();
    const rewardCatalog = await getSeasonPassRewardCatalog(plan.id);
    const activeSubscription = await getCurrentSeasonPassSubscription(userId);

    if (!activeSubscription) {
        return NextResponse.json(
            { success: false, message: "ยังไม่มี Season Pass ที่ใช้งานอยู่" },
            { status: 403 },
        );
    }

    const boardState = buildSeasonPassBoard({
        startAt: activeSubscription.startAt,
        durationDays: plan.durationDays,
        claims: [],
        rewardCatalog,
    });

    const reward = await getSeasonPassRewardByDay(boardState.currentDay, plan.id);
    if (!reward) {
        return NextResponse.json(
            { success: false, message: "ไม่พบรางวัลของวันนี้" },
            { status: 400 },
        );
    }

    const todayKey = formatDateInTimeZone(new Date(), "Asia/Bangkok");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = await (db as any).$client.getConnection();

    try {
        await conn.beginTransaction();

        await conn.execute(
            "UPDATE SeasonPassSubscription SET status = 'EXPIRED', updatedAt = UTC_TIMESTAMP() WHERE userId = ? AND status = 'ACTIVE' AND endAt < UTC_TIMESTAMP()",
            [userId],
        );

        const [subscriptionRows] = await conn.execute(
            "SELECT id, startAt FROM SeasonPassSubscription WHERE userId = ? AND status = 'ACTIVE' AND endAt >= UTC_TIMESTAMP() ORDER BY endAt DESC LIMIT 1 FOR UPDATE",
            [userId],
        );
        const lockedSubscription = (subscriptionRows as LockedSubscriptionRow[])[0];

        if (!lockedSubscription) {
            throw new Error("ยังไม่มี Season Pass ที่ใช้งานอยู่");
        }

        const lockedBoardState = buildSeasonPassBoard({
            startAt: lockedSubscription.startAt,
            durationDays: plan.durationDays,
            claims: [],
            rewardCatalog,
        });

        const currentReward = await getSeasonPassRewardByDay(lockedBoardState.currentDay, plan.id);
        if (!currentReward) {
            throw new Error("ไม่พบรางวัลของวันนี้");
        }

        const [claimRows] = await conn.execute(
            "SELECT id FROM SeasonPassClaim WHERE subscriptionId = ? AND dayNumber = ? LIMIT 1 FOR UPDATE",
            [lockedSubscription.id, lockedBoardState.currentDay],
        );

        if (Array.isArray(claimRows) && claimRows.length > 0) {
            throw new Error("คุณรับของวันนี้ไปแล้ว");
        }

        await conn.execute(
            "INSERT INTO SeasonPassClaim (id, subscriptionId, userId, dayNumber, claimDateKey, rewardType, rewardLabel, rewardAmount, rewardPayload, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())",
            [
                crypto.randomUUID(),
                lockedSubscription.id,
                userId,
                lockedBoardState.currentDay,
                todayKey,
                currentReward.type,
                currentReward.label,
                currentReward.amount,
                JSON.stringify({
                    highlight: Boolean(currentReward.highlight),
                    creditReward: currentReward.creditReward ?? 0,
                    pointReward: currentReward.pointReward ?? 0,
                    ticketReward: currentReward.type === "tickets" ? Number(currentReward.amount) || 0 : 0,
                }),
            ],
        );

        if (currentReward.creditReward) {
            await conn.execute(
                "UPDATE User SET creditBalance = creditBalance + ? WHERE id = ?",
                [currentReward.creditReward, userId],
            );
        }

        if (currentReward.pointReward) {
            await conn.execute(
                "UPDATE User SET pointBalance = pointBalance + ?, lifetimePoints = lifetimePoints + ? WHERE id = ?",
                [currentReward.pointReward, currentReward.pointReward, userId],
            );
        }

        if (currentReward.type === "tickets") {
            const ticketReward = Number(currentReward.amount) || 0;
            if (ticketReward > 0) {
                await conn.execute(
                    "UPDATE User SET ticketBalance = ticketBalance + ? WHERE id = ?",
                    [ticketReward, userId],
                );
            }
        }

        await conn.commit();

        return NextResponse.json({
            success: true,
            message: "รับของวันนี้สำเร็จ",
            rewardLabel: currentReward.label,
            rewardAmount: currentReward.amount,
        });
    } catch (error) {
        await conn.rollback();

        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "ไม่สามารถรับของวันนี้ได้",
            },
            { status: 400 },
        );
    } finally {
        conn.release();
    }
}
