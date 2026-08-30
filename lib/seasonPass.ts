import { and, asc, desc, eq, gte, inArray, lte, lt, sql, type SQL } from "drizzle-orm";
import { getPointCurrencyName, type PublicCurrencySettings } from "@/lib/currencySettings";
import { db, seasonPassClaims, seasonPassPlans, seasonPassRewards, seasonPassSubscriptions, users } from "@/lib/db";
import { getCurrencySettings } from "@/lib/getCurrencySettings";
import { SEASON_PASS_REWARD_DAYS } from "@/lib/seasonPassConfig";
import { formatDateInTimeZone, getFirstDayOfMonthInTimeZone, mysqlDateTimeToIso, mysqlNow, TH_TIME_ZONE, toMySQLDatetime } from "@/lib/utils/date";
import { formatThaiDateShort } from "@/lib/formatters/date";

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

function getEffectiveSeasonPassStartAt(startAt: string, createdAt?: string | null) {
    if (!createdAt) {
        return startAt;
    }

    const startDate = parseMySqlDateTime(startAt);
    const createdDate = parseMySqlDateTime(createdAt);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(createdDate.getTime())) {
        return startAt;
    }

    return createdDate > startDate ? createdAt : startAt;
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

function getAffectedRows(result: unknown): number {
    const rows = Array.isArray(result) ? result[0] : result;
    const affected = (rows as { affectedRows?: number } | undefined)?.affectedRows;
    return Number.isFinite(affected) ? Number(affected) : 0;
}

export async function expireSeasonPassSubscriptions(userId?: string) {
    const conditions = [eq(seasonPassSubscriptions.status, "ACTIVE"), lt(seasonPassSubscriptions.endAt, mysqlNow())];

    if (userId) {
        conditions.push(eq(seasonPassSubscriptions.userId, userId));
    }

    const result = await db
        .update(seasonPassSubscriptions)
        .set({ status: "EXPIRED" })
        .where(and(...conditions));

    // The cron endpoint reports how many rows it moved.
    return getAffectedRows(result);
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

    const result = await db
        .update(seasonPassSubscriptions)
        .set({ status: "ACTIVE" })
        .where(and(...conditions));

    return getAffectedRows(result);
}

export async function getCurrentSeasonPassSubscription(userId: string) {
    // Pure read: the start/end window decides whether a subscription is currently
    // active, so we don't need to flip statuses (EXPIRED/ACTIVE) on every read.
    // Including QUEUED covers a renewal whose window has already begun but whose
    // status hasn't been promoted yet by a purchase/claim transaction or admin job.
    // Status normalization still happens in those write paths.
    const rows = await db
        .select()
        .from(seasonPassSubscriptions)
        .where(
            and(
                eq(seasonPassSubscriptions.userId, userId),
                inArray(seasonPassSubscriptions.status, ["ACTIVE", "QUEUED"]),
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
    createdAt?: string | null;
    durationDays: number;
    claims: Awaited<ReturnType<typeof getSeasonPassClaims>>;
    rewardCatalog?: SeasonPassRewardDefinition[];
    now?: Date;
}) {
    const now = params.now ?? new Date();
    const rewardCatalog = params.rewardCatalog ?? DEFAULT_REWARD_CATALOG;
    const effectiveStartAt = getEffectiveSeasonPassStartAt(params.startAt, params.createdAt);
    const startKey = formatDateInTimeZone(parseMySqlDateTime(effectiveStartAt), TH_TIME_ZONE);
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
            latestEndAtText: latestSubscription?.endAt ? formatThaiDateShort(latestSubscription.endAt) : null,
            rewardPreview: rewardCatalog.slice(0, 6),
        };
    }

    const claims = await getSeasonPassClaims(activeSubscription.id);
    const boardState = buildSeasonPassBoard({
        startAt: activeSubscription.startAt,
        createdAt: activeSubscription.createdAt,
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
        dateText: formatThaiDateShort(claim.createdAt),
    }));

    return {
        plan,
        unlocked: true as const,
        subscription: activeSubscription,
        endAtText: formatThaiDateShort(activeSubscription.endAt),
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

export interface SeasonPassClaimLogFilters {
    /** Matches username or display name. */
    search?: string;
    /** Thai calendar day keys (YYYY-MM-DD), inclusive. */
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
}

/**
 * Claim history with filters and a total, so the page can say how many rows
 * exist rather than showing the newest 150 and leaving the rest unreachable.
 */
export async function getAdminSeasonPassClaimLogs(filters: SeasonPassClaimLogFilters = {}) {
    const pageSize = Math.min(Math.max(filters.pageSize ?? 50, 1), 200);
    const page = Math.max(filters.page ?? 1, 1);

    const conditions = [];
    const search = filters.search?.trim();
    if (search) {
        const pattern = `%${search}%`;
        conditions.push(sql`(${users.username} LIKE ${pattern} OR ${users.name} LIKE ${pattern})`);
    }
    if (filters.from) conditions.push(gte(seasonPassClaims.claimDateKey, filters.from));
    if (filters.to) conditions.push(lte(seasonPassClaims.claimDateKey, filters.to));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [totalRow]] = await Promise.all([
        db
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
            .where(where)
            .orderBy(desc(seasonPassClaims.createdAt))
            .limit(pageSize)
            .offset((page - 1) * pageSize),
        db
            .select({ total: sql<number>`count(*)` })
            .from(seasonPassClaims)
            .innerJoin(users, eq(users.id, seasonPassClaims.userId))
            .where(where),
    ]);

    const total = Number(totalRow?.total ?? 0);

    return { rows, total, page, pageSize, pageCount: Math.max(Math.ceil(total / pageSize), 1) };
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

export async function getAdminSeasonPassOverview(
    now: Date = new Date(),
    options: { normalizeStatuses?: boolean } = {},
) {
    const plan = await getOrCreateSeasonPassPlan();
    const rewardCatalog = await getSeasonPassRewardCatalog(plan.id);
    const todayKey = formatDateInTimeZone(now, TH_TIME_ZONE);
    const monthStart = `${getFirstDayOfMonthInTimeZone(now, TH_TIME_ZONE)} 00:00:00`;
    const expiringSoonThreshold = toMySQLDatetime(addDays(now, 3));

    // Status normalization is a write. It rides along here only for admins who
    // could run it themselves; the scheduled job at
    // GET /api/admin/season-pass/lifecycle is what keeps it correct in between.
    if (options.normalizeStatuses) {
        await expireSeasonPassSubscriptions();
        await activateQueuedSeasonPassSubscriptions();
    }

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

    // COALESCE covers rows sold before pricePaid existed; everything sold since
    // carries the amount actually charged, so changing the price no longer
    // rewrites past months.
    const [salesRow] = await db
        .select({
            count: sql<number>`count(*)`,
            amount: sql<string>`COALESCE(SUM(COALESCE(${seasonPassSubscriptions.pricePaid}, ${plan.price})), 0)`,
        })
        .from(seasonPassSubscriptions)
        .where(gte(seasonPassSubscriptions.createdAt, monthStart));

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
            createdAt: seasonPassSubscriptions.createdAt,
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
                createdAt: subscription.createdAt,
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
                expiresAtText: formatThaiDateShort(subscription.endAt),
                note,
            } satisfies AdminSeasonPassOverviewSubscriber;
        }),
    );

    // One row per reward kind with its own unit. The old shape summed credits,
    // points and tickets into a bare "รวม N" and carried a fourth row that was
    // not a reward at all — a highlight-day counter the page filtered back out.
    const pointCurrencyName = getPointCurrencyName(await getCurrencySettings().catch(() => null));
    const rewardSummary = ([
        { item: "เครดิต", type: "credits" as const, unit: "เครดิต" },
        { item: pointCurrencyName, type: "points" as const, unit: pointCurrencyName },
        { item: "ตั๋วสุ่ม", type: "tickets" as const, unit: "ใบ" },
    ]).map(({ item, type, unit }) => {
        const rewardsOfType = rewardCatalog.filter((reward) => reward.type === type);
        return {
            item,
            unit,
            amount: rewardsOfType.reduce((total, reward) => total + Number(reward.amount || 0), 0),
            days: rewardsOfType.length,
        };
    });

    const highlightDays = rewardCatalog.filter((reward) => reward.highlight).length;

    return {
        plan,
        stats: {
            activeCount: Number(activeCountRow?.count ?? 0),
            salesCountThisMonth: Number(salesRow?.count ?? 0),
            salesAmountThisMonth: Number(salesRow?.amount ?? 0),
            pendingTodayCount: Number(pendingTodayRow?.count ?? 0),
            expiringSoonCount: Number(expiringSoonRow?.count ?? 0),
        },
        rewardSummary,
        highlightDays,
        boardDays: rewardCatalog.length,
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
    return toMySQLDatetime(addDays(baseDate, durationDays));
}

export function getSeasonPassInitialEndAt(durationDays: number) {
    return toMySQLDatetime(addDays(new Date(), durationDays));
}

/**
 * Season Pass money for a window, bucketed the same way the dashboard buckets
 * orders. Season Pass sales never create an Order row, so every revenue report
 * that reads only Order was blind to them.
 */
export async function getSeasonPassRevenueBuckets(
    start: Date,
    end: Date | null,
    buildBucketKey: (thaiTimestamp: SQL) => SQL<string>,
) {
    const plan = await getOrCreateSeasonPassPlan();
    const thaiCreatedAt = sql`CONVERT_TZ(${seasonPassSubscriptions.createdAt}, '+00:00', '+07:00')`;
    const bucketKey = buildBucketKey(thaiCreatedAt);

    const rows = await db
        .select({
            key: bucketKey,
            amount: sql<string>`COALESCE(SUM(COALESCE(${seasonPassSubscriptions.pricePaid}, ${plan.price})), 0)`,
            sales: sql<number>`count(*)`,
        })
        .from(seasonPassSubscriptions)
        .where(
            end
                ? and(
                    gte(seasonPassSubscriptions.createdAt, toMySQLDatetime(start)),
                    lt(seasonPassSubscriptions.createdAt, toMySQLDatetime(end)),
                )
                : gte(seasonPassSubscriptions.createdAt, toMySQLDatetime(start)),
        )
        .groupBy(bucketKey);

    return new Map(rows.map((row) => [row.key, { revenue: Number(row.amount), sales: Number(row.sales) }]));
}

/** Season Pass money for a window as a single total. */
export async function getSeasonPassRevenueTotal(start?: Date, end?: Date) {
    const plan = await getOrCreateSeasonPassPlan();
    const conditions = [];
    if (start) conditions.push(gte(seasonPassSubscriptions.createdAt, toMySQLDatetime(start)));
    if (end) conditions.push(lt(seasonPassSubscriptions.createdAt, toMySQLDatetime(end)));

    const [row] = await db
        .select({
            amount: sql<string>`COALESCE(SUM(COALESCE(${seasonPassSubscriptions.pricePaid}, ${plan.price})), 0)`,
            sales: sql<number>`count(*)`,
        })
        .from(seasonPassSubscriptions)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

    return { revenue: Number(row?.amount ?? 0), sales: Number(row?.sales ?? 0) };
}

export interface AdminSubscriberFilters {
    search?: string;
    /** "active" (default), "expired" or "all". */
    status?: "active" | "expired" | "all";
    page?: number;
    pageSize?: number;
}

/**
 * The full subscriber list behind the overview card, which only ever showed the
 * six passes closest to expiry — so an admin could not look up the customer who
 * just wrote in. Claims for the whole page are read in one query rather than one
 * per subscriber.
 */
export async function getAdminSeasonPassSubscribers(
    filters: AdminSubscriberFilters = {},
    now: Date = new Date(),
) {
    const plan = await getOrCreateSeasonPassPlan();
    const rewardCatalog = await getSeasonPassRewardCatalog(plan.id);
    const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 100);
    const page = Math.max(filters.page ?? 1, 1);
    const status = filters.status ?? "active";
    const todayKey = formatDateInTimeZone(now, TH_TIME_ZONE);

    const conditions = [];
    const search = filters.search?.trim();
    if (search) {
        const pattern = `%${search}%`;
        conditions.push(sql`(${users.username} LIKE ${pattern} OR ${users.name} LIKE ${pattern})`);
    }
    if (status === "active") {
        conditions.push(lte(seasonPassSubscriptions.startAt, mysqlNow()));
        conditions.push(gte(seasonPassSubscriptions.endAt, mysqlNow()));
    } else if (status === "expired") {
        conditions.push(lt(seasonPassSubscriptions.endAt, mysqlNow()));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [totalRow]] = await Promise.all([
        db
            .select({
                subscriptionId: seasonPassSubscriptions.id,
                userId: seasonPassSubscriptions.userId,
                startAt: seasonPassSubscriptions.startAt,
                createdAt: seasonPassSubscriptions.createdAt,
                endAt: seasonPassSubscriptions.endAt,
                status: seasonPassSubscriptions.status,
                pricePaid: seasonPassSubscriptions.pricePaid,
                username: users.username,
                displayName: users.name,
            })
            .from(seasonPassSubscriptions)
            .innerJoin(users, eq(users.id, seasonPassSubscriptions.userId))
            .where(where)
            .orderBy(asc(seasonPassSubscriptions.endAt))
            .limit(pageSize)
            .offset((page - 1) * pageSize),
        db
            .select({ total: sql<number>`count(*)` })
            .from(seasonPassSubscriptions)
            .innerJoin(users, eq(users.id, seasonPassSubscriptions.userId))
            .where(where),
    ]);

    const subscriptionIds = rows.map((row) => row.subscriptionId);
    const claims = subscriptionIds.length > 0
        ? await db
            .select()
            .from(seasonPassClaims)
            .where(inArray(seasonPassClaims.subscriptionId, subscriptionIds))
        : [];

    const claimsBySubscription = new Map<string, typeof claims>();
    for (const claim of claims) {
        const list = claimsBySubscription.get(claim.subscriptionId) ?? [];
        list.push(claim);
        claimsBySubscription.set(claim.subscriptionId, list);
    }

    const subscribers = rows.map((row) => {
        const subscriptionClaims = claimsBySubscription.get(row.subscriptionId) ?? [];
        const boardState = buildSeasonPassBoard({
            startAt: row.startAt,
            createdAt: row.createdAt,
            durationDays: plan.durationDays,
            claims: subscriptionClaims,
            rewardCatalog,
            now,
        });
        const claimedToday = subscriptionClaims.some((claim) => claim.claimDateKey === todayKey);
        const isRunning = row.startAt <= mysqlNow() && row.endAt >= mysqlNow();

        let statusLabel = "ยังไม่ได้รับ";
        if (!isRunning) statusLabel = "หมดอายุแล้ว";
        else if (claimedToday) statusLabel = "รับแล้ว";
        else if (boardState.missedCount > 0) statusLabel = "พลาดสิทธิ์";

        return {
            subscriptionId: row.subscriptionId,
            userId: row.userId,
            username: row.username,
            displayName: row.displayName,
            statusLabel,
            isRunning,
            pricePaid: row.pricePaid !== null && row.pricePaid !== undefined ? Number(row.pricePaid) : null,
            claimedCount: boardState.claimedCount,
            missedCount: boardState.missedCount,
            progressText: `${Math.min(boardState.currentDay, plan.durationDays)}/${plan.durationDays} วัน • รับแล้ว ${boardState.claimedCount}`,
            expiresAtText: formatThaiDateShort(row.endAt),
            endAt: row.endAt,
        };
    });

    const total = Number(totalRow?.total ?? 0);

    return { subscribers, total, page, pageSize, pageCount: Math.max(Math.ceil(total / pageSize), 1) };
}
