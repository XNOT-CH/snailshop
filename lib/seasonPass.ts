import { and, asc, desc, eq, gte, lte, lt, sql } from "drizzle-orm";
import { getPointCurrencyName, type PublicCurrencySettings } from "@/lib/currencySettings";
import { db, seasonPassClaims, seasonPassPlans, seasonPassRewards, seasonPassSubscriptions, users } from "@/lib/db";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { SEASON_PASS_REWARD_DAYS } from "@/lib/seasonPassConfig";
import { formatDateInTimeZone, getFirstDayOfMonthInTimeZone, mysqlDateTimeToIso, mysqlNow, TH_TIME_ZONE } from "@/lib/utils/date";

export type SeasonPassRewardType = "credits" | "points" | "tickets";
export type SeasonPassRewardStatus = "claimed" | "missed" | "today" | "locked";

export type SeasonPassRewardDefinition = {
    day: number;
    type: SeasonPassRewardType;
    amount: string;
    label: string;
    imageUrl?: string | null;
    highlight?: boolean;
    creditReward?: number;
    pointReward?: number;
};

export type SeasonPassBoardReward = SeasonPassRewardDefinition & {
    status: SeasonPassRewardStatus;
    claimedAt: string | null;
};

function normalizeSeasonPassRewardType(value: string): SeasonPassRewardType {
    if (value === "credits" || value === "points" || value === "tickets") {
        return value;
    }

    if (value === "coins") {
        return "credits";
    }

    if (value === "ticket" || value === "grand") {
        return "tickets";
    }

    return "points";
}

const DEFAULT_PLAN = {
    slug: "monthly-30-days",
    name: "Season Pass 30 วัน",
    description: "ปลดล็อกตารางรับของรายวัน 30 วัน",
    price: "50.00",
    durationDays: SEASON_PASS_REWARD_DAYS,
} as const;

const DEFAULT_REWARD_IMAGE_BY_TYPE: Partial<Record<SeasonPassRewardType, string>> = {
    credits: "/season-pass-credit.png",
    points: "/season-pass-points.png",
    tickets: "/season-pass-ticket.png",
};

const DEFAULT_REWARD_CATALOG: SeasonPassRewardDefinition[] = [
    { day: 1, type: "credits", amount: "80", label: "เครดิต", imageUrl: DEFAULT_REWARD_IMAGE_BY_TYPE.credits, creditReward: 80 },
    { day: 2, type: "points", amount: "30", label: "พอยต์", pointReward: 30 },
    { day: 3, type: "tickets", amount: "2", label: "ตั๋วสุ่ม" },
    { day: 4, type: "credits", amount: "120", label: "เครดิต", imageUrl: DEFAULT_REWARD_IMAGE_BY_TYPE.credits, creditReward: 120 },
    { day: 5, type: "points", amount: "40", label: "พอยต์", pointReward: 40 },
    { day: 6, type: "tickets", amount: "2", label: "ตั๋วสุ่ม" },
    { day: 7, type: "credits", amount: "160", label: "เครดิต", imageUrl: DEFAULT_REWARD_IMAGE_BY_TYPE.credits, creditReward: 160, highlight: true },
    { day: 8, type: "points", amount: "50", label: "พอยต์", pointReward: 50 },
    { day: 9, type: "tickets", amount: "3", label: "ตั๋วสุ่ม" },
    { day: 10, type: "credits", amount: "180", label: "เครดิต", imageUrl: DEFAULT_REWARD_IMAGE_BY_TYPE.credits, creditReward: 180 },
    { day: 11, type: "points", amount: "60", label: "พอยต์", pointReward: 60 },
    { day: 12, type: "tickets", amount: "3", label: "ตั๋วสุ่ม" },
    { day: 13, type: "credits", amount: "200", label: "เครดิต", imageUrl: DEFAULT_REWARD_IMAGE_BY_TYPE.credits, creditReward: 200 },
    { day: 14, type: "points", amount: "70", label: "พอยต์", pointReward: 70, highlight: true },
    { day: 15, type: "tickets", amount: "4", label: "ตั๋วสุ่ม" },
    { day: 16, type: "credits", amount: "220", label: "เครดิต", imageUrl: DEFAULT_REWARD_IMAGE_BY_TYPE.credits, creditReward: 220 },
    { day: 17, type: "points", amount: "80", label: "พอยต์", pointReward: 80 },
    { day: 18, type: "tickets", amount: "4", label: "ตั๋วสุ่ม" },
    { day: 19, type: "credits", amount: "240", label: "เครดิต", imageUrl: DEFAULT_REWARD_IMAGE_BY_TYPE.credits, creditReward: 240 },
    { day: 20, type: "points", amount: "90", label: "พอยต์", pointReward: 90 },
    { day: 21, type: "tickets", amount: "5", label: "ตั๋วสุ่ม", highlight: true },
    { day: 22, type: "credits", amount: "260", label: "เครดิต", imageUrl: DEFAULT_REWARD_IMAGE_BY_TYPE.credits, creditReward: 260 },
    { day: 23, type: "points", amount: "100", label: "พอยต์", pointReward: 100 },
    { day: 24, type: "tickets", amount: "5", label: "ตั๋วสุ่ม" },
    { day: 25, type: "credits", amount: "280", label: "เครดิต", imageUrl: DEFAULT_REWARD_IMAGE_BY_TYPE.credits, creditReward: 280 },
    { day: 26, type: "points", amount: "120", label: "พอยต์", pointReward: 120 },
    { day: 27, type: "tickets", amount: "6", label: "ตั๋วสุ่ม" },
    { day: 28, type: "credits", amount: "300", label: "เครดิต", imageUrl: DEFAULT_REWARD_IMAGE_BY_TYPE.credits, creditReward: 300, highlight: true },
    { day: 29, type: "points", amount: "150", label: "พอยต์", pointReward: 150 },
    { day: 30, type: "tickets", amount: "10", label: "ตั๋วสุ่ม", highlight: true },
] as const;

function addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}

function formatMySqlDateTime(date: Date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
}

function parseMySqlDateTime(value: string) {
    return new Date(mysqlDateTimeToIso(value) ?? value);
}

function dateKeyToUtcMs(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
}

function diffDaysByDateKey(from: string, to: string) {
    return Math.floor((dateKeyToUtcMs(to) - dateKeyToUtcMs(from)) / 86_400_000);
}

function formatThaiDate(value: string) {
    return parseMySqlDateTime(value).toLocaleDateString("th-TH", {
        timeZone: TH_TIME_ZONE,
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function normalizeRewardDefinition(reward: SeasonPassRewardDefinition) {
    return {
        day: reward.day,
        type: reward.type,
        amount: reward.amount,
        label: reward.label,
        imageUrl: reward.imageUrl ?? DEFAULT_REWARD_IMAGE_BY_TYPE[reward.type] ?? null,
        highlight: Boolean(reward.highlight),
        creditReward: reward.creditReward ?? null,
        pointReward: reward.pointReward ?? null,
    };
}

function localizeRewardDefinition(
    reward: SeasonPassRewardDefinition,
    settings?: Partial<PublicCurrencySettings> | null,
): SeasonPassRewardDefinition {
    if (reward.type !== "points") {
        return reward;
    }

    return {
        ...reward,
        label: getPointCurrencyName(settings),
    };
}

async function seedSeasonPassRewards(planId: string) {
    const existingRewards = await db.query.seasonPassRewards.findMany({
        where: eq(seasonPassRewards.planId, planId),
        orderBy: [asc(seasonPassRewards.dayNumber)],
    });

    if (existingRewards.length >= DEFAULT_REWARD_CATALOG.length) {
        return existingRewards;
    }

    const existingDays = new Set(existingRewards.map((reward) => reward.dayNumber));
    const missingRewards = DEFAULT_REWARD_CATALOG.filter((reward) => !existingDays.has(reward.day));

    if (missingRewards.length > 0) {
        try {
            await db.insert(seasonPassRewards).values(
                missingRewards.map((reward) => ({
                    planId,
                    dayNumber: reward.day,
                    rewardType: reward.type,
                    label: reward.label,
                    amount: reward.amount,
                    imageUrl: reward.imageUrl ?? DEFAULT_REWARD_IMAGE_BY_TYPE[reward.type] ?? null,
                    highlight: Boolean(reward.highlight),
                    creditReward: reward.creditReward ?? null,
                    pointReward: reward.pointReward ?? null,
                })),
            );
        } catch {
            // Another request may have created missing rows concurrently.
        }
    }

    return db.query.seasonPassRewards.findMany({
        where: eq(seasonPassRewards.planId, planId),
        orderBy: [asc(seasonPassRewards.dayNumber)],
    });
}

function mapDbRewardToDefinition(reward: {
    dayNumber: number;
    rewardType: string;
    amount: string;
    label: string;
    imageUrl?: string | null;
    highlight: boolean;
    creditReward: number | null;
    pointReward: number | null;
}): SeasonPassRewardDefinition {
    const normalizedType = normalizeSeasonPassRewardType(reward.rewardType);

    return {
        day: reward.dayNumber,
        type: normalizedType,
        amount: reward.amount,
        label: reward.label,
        imageUrl: reward.imageUrl ?? DEFAULT_REWARD_IMAGE_BY_TYPE[normalizedType] ?? null,
        highlight: reward.highlight,
        creditReward: normalizedType === "credits" ? reward.creditReward ?? undefined : undefined,
        pointReward: normalizedType === "points" ? reward.pointReward ?? undefined : undefined,
    };
}

export async function getSeasonPassRewardCatalog(planId?: string) {
    const currencySettings = await getCurrencySettings().catch(() => null);

    // Test environment may mock db without query helpers.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(db as any).query?.seasonPassRewards) {
        return DEFAULT_REWARD_CATALOG.map((reward) => localizeRewardDefinition(reward, currencySettings));
    }

    const plan = planId ? { id: planId } : await getOrCreateSeasonPassPlan();
    const rewards = await seedSeasonPassRewards(plan.id);
    return rewards
        .map(mapDbRewardToDefinition)
        .map((reward) => localizeRewardDefinition(reward, currencySettings));
}

export async function getSeasonPassRewardByDay(dayNumber: number, planId?: string) {
    const rewards = await getSeasonPassRewardCatalog(planId);
    return rewards.find((reward) => reward.day === dayNumber) ?? null;
}

export async function getOrCreateSeasonPassPlan() {
    let plan = await db.query.seasonPassPlans.findFirst({
        where: eq(seasonPassPlans.slug, DEFAULT_PLAN.slug),
    });

    if (!plan) {
        try {
            await db.insert(seasonPassPlans).values({
                slug: DEFAULT_PLAN.slug,
                name: DEFAULT_PLAN.name,
                description: DEFAULT_PLAN.description,
                price: DEFAULT_PLAN.price,
                durationDays: DEFAULT_PLAN.durationDays,
                isActive: true,
            });
        } catch {
            // Another request may have created the default plan concurrently.
        }

        plan = await db.query.seasonPassPlans.findFirst({
            where: eq(seasonPassPlans.slug, DEFAULT_PLAN.slug),
        });
    }

    if (!plan) {
        throw new Error("Season Pass plan is unavailable");
    }

    if (plan.durationDays !== DEFAULT_PLAN.durationDays) {
        await db
            .update(seasonPassPlans)
            .set({ durationDays: DEFAULT_PLAN.durationDays })
            .where(eq(seasonPassPlans.id, plan.id));

        const repairedPlan = await db.query.seasonPassPlans.findFirst({
            where: eq(seasonPassPlans.id, plan.id),
        });

        if (repairedPlan) {
            plan = repairedPlan;
        }
    }

    await seedSeasonPassRewards(plan.id);

    return plan;
}

export async function expireSeasonPassSubscriptions(userId?: string) {
    const conditions = [eq(seasonPassSubscriptions.status, "ACTIVE"), lt(seasonPassSubscriptions.endAt, mysqlNow())];

    if (userId) {
        conditions.push(eq(seasonPassSubscriptions.userId, userId));
    }

    await db
        .update(seasonPassSubscriptions)
        .set({ status: "EXPIRED" })
        .where(and(...conditions));
}

export async function activateQueuedSeasonPassSubscriptions(userId?: string) {
    const conditions = [
        eq(seasonPassSubscriptions.status, "QUEUED"),
        lte(seasonPassSubscriptions.startAt, mysqlNow()),
        gte(seasonPassSubscriptions.endAt, mysqlNow()),
    ];

    if (userId) {
        conditions.push(eq(seasonPassSubscriptions.userId, userId));
    }

    await db
        .update(seasonPassSubscriptions)
        .set({ status: "ACTIVE" })
        .where(and(...conditions));
}

export async function getCurrentSeasonPassSubscription(userId: string) {
    await expireSeasonPassSubscriptions(userId);
    await activateQueuedSeasonPassSubscriptions(userId);

    const rows = await db
        .select()
        .from(seasonPassSubscriptions)
        .where(
            and(
                eq(seasonPassSubscriptions.userId, userId),
                eq(seasonPassSubscriptions.status, "ACTIVE"),
                lte(seasonPassSubscriptions.startAt, mysqlNow()),
                gte(seasonPassSubscriptions.endAt, mysqlNow()),
            ),
        )
        .orderBy(desc(seasonPassSubscriptions.endAt))
        .limit(1);

    return rows[0] ?? null;
}

export async function getLatestSeasonPassSubscription(userId: string) {
    const rows = await db
        .select()
        .from(seasonPassSubscriptions)
        .where(eq(seasonPassSubscriptions.userId, userId))
        .orderBy(desc(seasonPassSubscriptions.endAt))
        .limit(1);

    return rows[0] ?? null;
}

export async function getSeasonPassClaims(subscriptionId: string) {
    return db
        .select()
        .from(seasonPassClaims)
        .where(eq(seasonPassClaims.subscriptionId, subscriptionId))
        .orderBy(desc(seasonPassClaims.dayNumber));
}

export function buildSeasonPassBoard(params: {
    startAt: string;
    durationDays: number;
    claims: Awaited<ReturnType<typeof getSeasonPassClaims>>;
    rewardCatalog?: SeasonPassRewardDefinition[];
    now?: Date;
}) {
    const now = params.now ?? new Date();
    const rewardCatalog = params.rewardCatalog ?? DEFAULT_REWARD_CATALOG;
    const startKey = formatDateInTimeZone(parseMySqlDateTime(params.startAt), TH_TIME_ZONE);
    const todayKey = formatDateInTimeZone(now, TH_TIME_ZONE);
    const currentDay = Math.min(
        Math.max(diffDaysByDateKey(startKey, todayKey) + 1, 1),
        params.durationDays,
    );

    const claimMap = new Map(params.claims.map((claim) => [claim.dayNumber, claim]));

    const board = rewardCatalog.map<SeasonPassBoardReward>((reward) => {
        const claim = claimMap.get(reward.day);

        let status: SeasonPassRewardStatus = "locked";
        if (claim) {
            status = "claimed";
        } else if (reward.day < currentDay) {
            status = "missed";
        } else if (reward.day === currentDay) {
            status = "today";
        }

        return {
            ...reward,
            status,
            claimedAt: claim?.createdAt ?? null,
        };
    });

    const claimedCount = board.filter((item) => item.status === "claimed").length;
    const missedCount = board.filter((item) => item.status === "missed").length;
    const currentReward = board.find((item) => item.day === currentDay) ?? board[0];

    return {
        board,
        currentDay,
        claimedCount,
        missedCount,
        remainingCount: Math.max(params.durationDays - claimedCount - missedCount, 0),
        currentReward,
        todayKey,
    };
}

export async function getSeasonPassDashboardState(userId: string, now?: Date) {
    const plan = await getOrCreateSeasonPassPlan();
    const rewardCatalog = await getSeasonPassRewardCatalog(plan.id);
    const activeSubscription = await getCurrentSeasonPassSubscription(userId);
    const latestSubscription = activeSubscription ?? (await getLatestSeasonPassSubscription(userId));

    if (!activeSubscription) {
        return {
            plan,
            unlocked: false as const,
            latestSubscription,
            latestEndAtText: latestSubscription?.endAt ? formatThaiDate(latestSubscription.endAt) : null,
            rewardPreview: rewardCatalog.slice(0, 6),
        };
    }

    const claims = await getSeasonPassClaims(activeSubscription.id);
    const boardState = buildSeasonPassBoard({
        startAt: activeSubscription.startAt,
        durationDays: plan.durationDays,
        claims,
        rewardCatalog,
        now,
    });

    const history = claims.slice(0, 5).map((claim) => ({
        id: claim.id,
        dayNumber: claim.dayNumber,
        rewardLabel: claim.rewardLabel,
        rewardAmount: claim.rewardAmount,
        dateText: formatThaiDate(claim.createdAt),
    }));

    return {
        plan,
        unlocked: true as const,
        subscription: activeSubscription,
        endAtText: formatThaiDate(activeSubscription.endAt),
        boardState,
        history,
    };
}

export async function getAdminSeasonPassRewards(planId?: string) {
    const catalog = await getSeasonPassRewardCatalog(planId);
    return catalog.map((reward) => ({
        ...normalizeRewardDefinition(reward),
        dayNumber: reward.day,
        rewardType: reward.type,
    }));
}

export async function getAdminSeasonPassClaimLogs(limit = 100) {
    return db
        .select({
            id: seasonPassClaims.id,
            dayNumber: seasonPassClaims.dayNumber,
            rewardType: seasonPassClaims.rewardType,
            rewardLabel: seasonPassClaims.rewardLabel,
            rewardAmount: seasonPassClaims.rewardAmount,
            claimDateKey: seasonPassClaims.claimDateKey,
            createdAt: seasonPassClaims.createdAt,
            username: users.username,
            displayName: users.name,
            subscriptionStartAt: seasonPassSubscriptions.startAt,
            subscriptionEndAt: seasonPassSubscriptions.endAt,
        })
        .from(seasonPassClaims)
        .innerJoin(users, eq(users.id, seasonPassClaims.userId))
        .innerJoin(seasonPassSubscriptions, eq(seasonPassSubscriptions.id, seasonPassClaims.subscriptionId))
        .orderBy(desc(seasonPassClaims.createdAt))
        .limit(limit);
}

type AdminSeasonPassOverviewSubscriber = {
    userId: string;
    username: string;
    displayName: string | null;
    statusLabel: string;
    progressText: string;
    expiresAtText: string;
    note: string;
};

export async function getAdminSeasonPassOverview(now: Date = new Date()) {
    const plan = await getOrCreateSeasonPassPlan();
    const rewardCatalog = await getSeasonPassRewardCatalog(plan.id);
    const todayKey = formatDateInTimeZone(now, TH_TIME_ZONE);
    const monthStart = `${getFirstDayOfMonthInTimeZone(now, TH_TIME_ZONE)} 00:00:00`;
    const expiringSoonThreshold = formatMySqlDateTime(addDays(now, 3));

    await expireSeasonPassSubscriptions();
    await activateQueuedSeasonPassSubscriptions();

    const [activeCountRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(seasonPassSubscriptions)
        .where(
            and(
                eq(seasonPassSubscriptions.status, "ACTIVE"),
                lte(seasonPassSubscriptions.startAt, mysqlNow()),
                gte(seasonPassSubscriptions.endAt, mysqlNow()),
            ),
        );

    const [salesCountRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(seasonPassSubscriptions)
        .where(
            and(
                eq(seasonPassSubscriptions.planId, plan.id),
                gte(seasonPassSubscriptions.createdAt, monthStart),
            ),
        );

    const [pendingTodayRow] = await db
        .select({ count: sql<number>`count(distinct ${seasonPassSubscriptions.id})` })
        .from(seasonPassSubscriptions)
        .leftJoin(
            seasonPassClaims,
            and(
                eq(seasonPassClaims.subscriptionId, seasonPassSubscriptions.id),
                eq(seasonPassClaims.claimDateKey, todayKey),
            ),
        )
        .where(
            and(
                eq(seasonPassSubscriptions.status, "ACTIVE"),
                lte(seasonPassSubscriptions.startAt, mysqlNow()),
                gte(seasonPassSubscriptions.endAt, mysqlNow()),
                sql`${seasonPassClaims.id} is null`,
            ),
        );

    const [expiringSoonRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(seasonPassSubscriptions)
        .where(
            and(
                eq(seasonPassSubscriptions.status, "ACTIVE"),
                lte(seasonPassSubscriptions.startAt, mysqlNow()),
                gte(seasonPassSubscriptions.endAt, mysqlNow()),
                lte(seasonPassSubscriptions.endAt, expiringSoonThreshold),
            ),
        );

    const activeSubscribers = await db
        .select({
            subscriptionId: seasonPassSubscriptions.id,
            userId: seasonPassSubscriptions.userId,
            startAt: seasonPassSubscriptions.startAt,
            endAt: seasonPassSubscriptions.endAt,
            username: users.username,
            displayName: users.name,
        })
        .from(seasonPassSubscriptions)
        .innerJoin(users, eq(users.id, seasonPassSubscriptions.userId))
        .where(
            and(
                eq(seasonPassSubscriptions.status, "ACTIVE"),
                lte(seasonPassSubscriptions.startAt, mysqlNow()),
                gte(seasonPassSubscriptions.endAt, mysqlNow()),
            ),
        )
        .orderBy(asc(seasonPassSubscriptions.endAt))
        .limit(6);

    const subscribers = await Promise.all(
        activeSubscribers.map(async (subscription) => {
            const claims = await getSeasonPassClaims(subscription.subscriptionId);
            const boardState = buildSeasonPassBoard({
                startAt: subscription.startAt,
                durationDays: plan.durationDays,
                claims,
                rewardCatalog,
                now,
            });
            const claimedToday = claims.some((claim) => claim.claimDateKey === todayKey);

            let statusLabel = "ยังไม่ได้รับ";
            let note = "ควรแจ้งเตือนวันนี้";

            if (claimedToday) {
                statusLabel = "รับแล้ว";
                note = "รับของวันนี้แล้ว";
            } else if (boardState.missedCount > 0) {
                statusLabel = "พลาดสิทธิ์";
                note = `พลาดสะสม ${boardState.missedCount} วัน`;
            }

            const progressDays = Math.min(boardState.currentDay, plan.durationDays);

            return {
                userId: subscription.userId,
                username: subscription.username,
                displayName: subscription.displayName,
                statusLabel,
                progressText: `${progressDays}/${plan.durationDays} วัน • รับแล้ว ${boardState.claimedCount}`,
                expiresAtText: formatThaiDate(subscription.endAt),
                note,
            } satisfies AdminSeasonPassOverviewSubscriber;
        }),
    );

    const rewardSummary = [
        {
            item: "เครดิต",
            amount: rewardCatalog
                .filter((reward) => reward.type === "credits")
                .reduce((total, reward) => total + Number(reward.amount || 0), 0),
            days: rewardCatalog.filter((reward) => reward.type === "credits").length,
            state: "ใช้งานจริง",
        },
        {
            item: "พอยต์",
            amount: rewardCatalog
                .filter((reward) => reward.type === "points")
                .reduce((total, reward) => total + Number(reward.amount || 0), 0),
            days: rewardCatalog.filter((reward) => reward.type === "points").length,
            state: "ใช้งานจริง",
        },
        {
            item: "ตั๋วสุ่ม",
            amount: rewardCatalog
                .filter((reward) => reward.type === "tickets")
                .reduce((total, reward) => total + Number(reward.amount || 0), 0),
            days: rewardCatalog.filter((reward) => reward.type === "tickets").length,
            state: "ใช้งานจริง",
        },
        {
            item: "Milestone Days",
            amount: rewardCatalog.filter((reward) => reward.highlight).length,
            days: rewardCatalog.length,
            state: plan.isActive ? "เปิดขาย" : "ปิดขาย",
        },
    ];

    return {
        plan,
        stats: {
            activeCount: Number(activeCountRow?.count ?? 0),
            salesCountThisMonth: Number(salesCountRow?.count ?? 0),
            salesAmountThisMonth: Number(salesCountRow?.count ?? 0) * Number(plan.price),
            pendingTodayCount: Number(pendingTodayRow?.count ?? 0),
            expiringSoonCount: Number(expiringSoonRow?.count ?? 0),
        },
        rewardSummary,
        subscribers,
    };
}

export async function updateAdminSeasonPassRewards(
    rewards: Array<{
        dayNumber: number;
        rewardType: SeasonPassRewardType;
        amount: string;
        label: string;
        imageUrl?: string | null;
        highlight?: boolean;
    }>,
    planId?: string,
) {
    const plan = planId ? { id: planId } : await getOrCreateSeasonPassPlan();

    await seedSeasonPassRewards(plan.id);

    const existingRewards = await db.query.seasonPassRewards.findMany({
        where: eq(seasonPassRewards.planId, plan.id),
        orderBy: [asc(seasonPassRewards.dayNumber)],
    });
    const existingDays = new Set(existingRewards.map((reward) => reward.dayNumber));

    for (const reward of rewards) {
        const normalizedType = normalizeSeasonPassRewardType(reward.rewardType);
        const numericAmount = Number(reward.amount);
        const normalizedAmount = Number.isFinite(numericAmount) ? numericAmount : 0;
        const values = {
            planId: plan.id,
            dayNumber: reward.dayNumber,
            rewardType: normalizedType,
            label: reward.label,
            amount: reward.amount,
            imageUrl: reward.imageUrl ?? DEFAULT_REWARD_IMAGE_BY_TYPE[normalizedType] ?? null,
            highlight: Boolean(reward.highlight),
            creditReward: normalizedType === "credits" ? normalizedAmount : null,
            pointReward: normalizedType === "points" ? normalizedAmount : null,
        };

        if (existingDays.has(reward.dayNumber)) {
            await db
                .update(seasonPassRewards)
                .set({
                    rewardType: values.rewardType,
                    label: values.label,
                    amount: values.amount,
                    imageUrl: values.imageUrl,
                    highlight: values.highlight,
                    creditReward: values.creditReward,
                    pointReward: values.pointReward,
                })
                .where(and(eq(seasonPassRewards.planId, plan.id), eq(seasonPassRewards.dayNumber, reward.dayNumber)));
        } else {
            await db.insert(seasonPassRewards).values(values);
        }
    }

    return getAdminSeasonPassRewards(plan.id);
}

export function calculateSeasonPassWindow(params: { endAt: string; now?: Date }) {
    const now = params.now ?? new Date();
    const endAt = parseMySqlDateTime(params.endAt);
    const diffMs = Math.max(endAt.getTime() - now.getTime(), 0);
    const totalMinutes = Math.floor(diffMs / 60_000);
    const days = Math.floor(totalMinutes / 1_440);
    const hours = Math.floor((totalMinutes % 1_440) / 60);
    const minutes = totalMinutes % 60;

    return {
        days,
        hours,
        minutes,
        text: `${days} วัน ${hours} ชม. ${minutes} นาที`,
    };
}

export function calculateSeasonPassDailyResetWindow(params?: { now?: Date }) {
    const now = params?.now ?? new Date();
    const todayKey = formatDateInTimeZone(now, TH_TIME_ZONE);
    const [year, month, day] = todayKey.split("-").map(Number);
    const nextResetAt = new Date(Date.UTC(year, month - 1, day + 1, -7, 0, 0));
    const diffMs = Math.max(nextResetAt.getTime() - now.getTime(), 0);
    const totalMinutes = Math.floor(diffMs / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
        hours,
        minutes,
        text: `${hours} ชม. ${minutes} นาที`,
    };
}

export function getSeasonPassExtensionEndAt(baseEndAt: string | null, durationDays: number) {
    const baseDate = baseEndAt ? parseMySqlDateTime(baseEndAt) : new Date();
    return formatMySqlDateTime(addDays(baseDate, durationDays));
}

export function getSeasonPassInitialEndAt(durationDays: number) {
    return formatMySqlDateTime(addDays(new Date(), durationDays));
}
