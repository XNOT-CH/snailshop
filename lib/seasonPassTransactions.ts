import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import {
    buildSeasonPassBoard,
    getCurrentSeasonPassSubscription,
    getOrCreateSeasonPassPlan,
    getSeasonPassExtensionEndAt,
    getSeasonPassInitialEndAt,
    getSeasonPassRewardByDay,
    getSeasonPassRewardCatalog,
} from "@/lib/seasonPass";
import {
    auditSeasonPassClaim,
    auditSeasonPassPurchase,
    auditSeasonPassQueueActivation,
    logSeasonPassEvent,
} from "@/lib/seasonPassObservability";
import {
    buildThaiDateAtCurrentTime,
    formatDateInTimeZone,
    parseMockDateKey,
    TH_TIME_ZONE,
} from "@/lib/utils/date";

type LockedUserRow = {
    id: string;
    creditBalance: string;
};

type LockedSubscriptionRow = {
    id: string;
    startAt: string;
    endAt: string;
    status: string;
};

function formatThaiDate(value: string) {
    return new Date(value.replace(" ", "T") + "Z").toLocaleDateString("th-TH", {
        timeZone: TH_TIME_ZONE,
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatClaimDate(now: Date) {
    return new Intl.DateTimeFormat("th-TH", {
        timeZone: TH_TIME_ZONE,
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(now);
}

async function activateQueuedSubscriptionsForUser(conn: {
    execute: (query: string, values: unknown[]) => Promise<unknown>;
}, userId: string) {
    const [result] = await conn.execute(
        "UPDATE SeasonPassSubscription SET status = 'ACTIVE', updatedAt = UTC_TIMESTAMP() WHERE userId = ? AND status = 'QUEUED' AND startAt <= UTC_TIMESTAMP() AND endAt >= UTC_TIMESTAMP()",
        [userId],
    ) as [{ affectedRows?: number }];

    return Number(result?.affectedRows ?? 0);
}

export async function purchaseSeasonPass(params: {
    userId: string;
    request?: Request;
}) {
    const plan = await getOrCreateSeasonPassPlan();
    if (!plan.isActive) {
        return { ok: false as const, status: 403, message: "Season Pass ถูกปิดการขายชั่วคราว" };
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, params.userId),
        columns: { id: true, creditBalance: true },
    });

    if (!user) {
        return { ok: false as const, status: 404, message: "ไม่พบผู้ใช้งาน" };
    }

    const price = Number(plan.price);
    const balance = Number(user.creditBalance);

    if (balance < price) {
        return { ok: false as const, status: 400, message: "เครดิตคงเหลือไม่พอสำหรับซื้อ Season Pass" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = await (db as any).$client.getConnection();

    try {
        await conn.beginTransaction();

        const [userRows] = await conn.execute(
            "SELECT id, creditBalance FROM User WHERE id = ? FOR UPDATE",
            [params.userId],
        );
        const lockedUser = (userRows as LockedUserRow[])[0];

        if (!lockedUser) {
            throw new Error("ไม่พบผู้ใช้งาน");
        }

        if (Number(lockedUser.creditBalance) < price) {
            throw new Error("เครดิตคงเหลือไม่พอสำหรับซื้อ Season Pass");
        }

        await conn.execute(
            "UPDATE SeasonPassSubscription SET status = 'EXPIRED', updatedAt = UTC_TIMESTAMP() WHERE userId = ? AND status = 'ACTIVE' AND endAt < UTC_TIMESTAMP()",
            [params.userId],
        );

        const activatedCount = await activateQueuedSubscriptionsForUser(conn, params.userId);

        const [subscriptionRows] = await conn.execute(
            "SELECT id, startAt, endAt, status FROM SeasonPassSubscription WHERE userId = ? AND status IN ('ACTIVE', 'QUEUED') AND endAt >= UTC_TIMESTAMP() ORDER BY endAt DESC LIMIT 1 FOR UPDATE",
            [params.userId],
        );
        const latestSubscription = (subscriptionRows as LockedSubscriptionRow[])[0];
        const queuedStartAt = latestSubscription?.endAt ?? null;
        const nextEndAt = latestSubscription
            ? getSeasonPassExtensionEndAt(latestSubscription.endAt, plan.durationDays)
            : getSeasonPassInitialEndAt(plan.durationDays);

        await conn.execute(
            "UPDATE User SET creditBalance = creditBalance - ? WHERE id = ?",
            [price, params.userId],
        );

        if (latestSubscription) {
            await conn.execute(
                "INSERT INTO SeasonPassSubscription (id, userId, planId, status, startAt, endAt, createdAt, updatedAt) VALUES (?, ?, ?, 'QUEUED', ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())",
                [crypto.randomUUID(), params.userId, plan.id, queuedStartAt, nextEndAt],
            );
        } else {
            await conn.execute(
                "INSERT INTO SeasonPassSubscription (id, userId, planId, status, startAt, endAt, createdAt, updatedAt) VALUES (?, ?, ?, 'ACTIVE', UTC_TIMESTAMP(), ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())",
                [crypto.randomUUID(), params.userId, plan.id, nextEndAt],
            );
        }

        await conn.commit();

        const currentSubscription = await getCurrentSeasonPassSubscription(params.userId);
        const endAt = latestSubscription ? nextEndAt : currentSubscription?.endAt ?? nextEndAt;
        const queued = Boolean(latestSubscription);

        await auditSeasonPassPurchase(params.request, {
            userId: params.userId,
            planId: plan.id,
            queued,
            price,
            startsAt: queuedStartAt,
            endAt,
        });
        await auditSeasonPassQueueActivation({
            userId: params.userId,
            request: params.request,
            activatedCount,
        });

        logSeasonPassEvent("info", queued ? "renewal-queued" : "purchase-created", {
            userId: params.userId,
            planId: plan.id,
            queued,
            activatedCount,
            startsAt: queuedStartAt,
            endAt,
        });

        return {
            ok: true as const,
            status: 200,
            body: {
                success: true,
                message: queued ? "ต่ออายุ Season Pass สำเร็จ" : "ซื้อ Season Pass สำเร็จ",
                endAt,
                endAtText: formatThaiDate(endAt),
                queued,
                startsAt: queuedStartAt,
                startsAtText: queuedStartAt ? formatThaiDate(queuedStartAt) : null,
            },
        };
    } catch (error) {
        await conn.rollback();
        logSeasonPassEvent("error", "purchase-failed", {
            userId: params.userId,
            message: error instanceof Error ? error.message : "unknown_error",
        });

        return {
            ok: false as const,
            status: 400,
            message: error instanceof Error ? error.message : "ไม่สามารถซื้อ Season Pass ได้",
        };
    } finally {
        conn.release();
    }
}

export async function claimSeasonPass(params: {
    userId: string;
    role?: string | null;
    request: Request;
}) {
    const mockDate = params.role === "ADMIN"
        ? parseMockDateKey(new URL(params.request.url).searchParams.get("mockDate"))
        : null;
    const now = mockDate ? buildThaiDateAtCurrentTime(mockDate) : new Date();

    const plan = await getOrCreateSeasonPassPlan();
    const rewardCatalog = await getSeasonPassRewardCatalog(plan.id);
    const activeSubscription = await getCurrentSeasonPassSubscription(params.userId);

    if (!activeSubscription) {
        return { ok: false as const, status: 403, message: "ยังไม่มี Season Pass ที่ใช้งานอยู่" };
    }

    const boardState = buildSeasonPassBoard({
        startAt: activeSubscription.startAt,
        durationDays: plan.durationDays,
        claims: [],
        rewardCatalog,
        now,
    });

    const reward = await getSeasonPassRewardByDay(boardState.currentDay, plan.id);
    if (!reward) {
        return { ok: false as const, status: 400, message: "ไม่พบรางวัลของวันนี้" };
    }

    const todayKey = formatDateInTimeZone(now, TH_TIME_ZONE);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = await (db as any).$client.getConnection();

    try {
        await conn.beginTransaction();

        await conn.execute(
            "UPDATE SeasonPassSubscription SET status = 'EXPIRED', updatedAt = UTC_TIMESTAMP() WHERE userId = ? AND status = 'ACTIVE' AND endAt < UTC_TIMESTAMP()",
            [params.userId],
        );

        const activatedCount = await activateQueuedSubscriptionsForUser(conn, params.userId);

        const [subscriptionRows] = await conn.execute(
            "SELECT id, startAt FROM SeasonPassSubscription WHERE userId = ? AND status = 'ACTIVE' AND startAt <= UTC_TIMESTAMP() AND endAt >= UTC_TIMESTAMP() ORDER BY endAt DESC LIMIT 1 FOR UPDATE",
            [params.userId],
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
            now,
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
                params.userId,
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
                [currentReward.creditReward, params.userId],
            );
        }

        if (currentReward.pointReward) {
            await conn.execute(
                "UPDATE User SET pointBalance = pointBalance + ?, lifetimePoints = lifetimePoints + ? WHERE id = ?",
                [currentReward.pointReward, currentReward.pointReward, params.userId],
            );
        }

        if (currentReward.type === "tickets") {
            const ticketReward = Number(currentReward.amount) || 0;
            if (ticketReward > 0) {
                await conn.execute(
                    "UPDATE User SET ticketBalance = ticketBalance + ? WHERE id = ?",
                    [ticketReward, params.userId],
                );
            }
        }

        await conn.commit();

        await auditSeasonPassClaim(params.request, {
            userId: params.userId,
            subscriptionId: lockedSubscription.id,
            dayNumber: lockedBoardState.currentDay,
            rewardType: currentReward.type,
            rewardLabel: currentReward.label,
            rewardAmount: currentReward.amount,
            claimDateKey: todayKey,
        });
        await auditSeasonPassQueueActivation({
            userId: params.userId,
            request: params.request,
            activatedCount,
        });

        logSeasonPassEvent("info", "claim-created", {
            userId: params.userId,
            subscriptionId: lockedSubscription.id,
            dayNumber: lockedBoardState.currentDay,
            rewardType: currentReward.type,
            activatedCount,
        });

        return {
            ok: true as const,
            status: 200,
            body: {
                success: true,
                message: "รับของวันนี้สำเร็จ",
                dayNumber: lockedBoardState.currentDay,
                rewardLabel: currentReward.label,
                rewardAmount: currentReward.amount,
                claimedAtText: formatClaimDate(now),
            },
        };
    } catch (error) {
        await conn.rollback();
        logSeasonPassEvent("error", "claim-failed", {
            userId: params.userId,
            message: error instanceof Error ? error.message : "unknown_error",
        });

        return {
            ok: false as const,
            status: 400,
            message: error instanceof Error ? error.message : "ไม่สามารถรับของวันนี้ได้",
        };
    } finally {
        conn.release();
    }
}
