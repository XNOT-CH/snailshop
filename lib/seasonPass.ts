import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { db, seasonPassClaims, seasonPassPlans, seasonPassRewards, seasonPassSubscriptions } from "@/lib/db";
import { formatDateInTimeZone, mysqlDateTimeToIso, mysqlNow, TH_TIME_ZONE } from "@/lib/utils/date";

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
    durationDays: 30,
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

let ensureSeasonPassSchemaPromise: Promise<void> | null = null;

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

async function ensureSeasonPassSchema() {
    if (!ensureSeasonPassSchemaPromise) {
        ensureSeasonPassSchemaPromise = (async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const client = (db as any).$client;

            await client.execute(`
                CREATE TABLE IF NOT EXISTS \`SeasonPassPlan\` (
                    \`id\` varchar(36) NOT NULL,
                    \`slug\` varchar(100) NOT NULL,
                    \`name\` varchar(255) NOT NULL,
                    \`description\` text NULL,
                    \`price\` decimal(10,2) NOT NULL,
                    \`durationDays\` int NOT NULL DEFAULT 30,
                    \`isActive\` boolean NOT NULL DEFAULT true,
                    \`createdAt\` datetime NOT NULL DEFAULT (now()),
                    \`updatedAt\` datetime NOT NULL DEFAULT (now()),
                    CONSTRAINT \`SeasonPassPlan_id_pk\` PRIMARY KEY(\`id\`),
                    CONSTRAINT \`SeasonPassPlan_slug_unique\` UNIQUE(\`slug\`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);

            await client.execute(`
                CREATE TABLE IF NOT EXISTS \`SeasonPassSubscription\` (
                    \`id\` varchar(36) NOT NULL,
                    \`userId\` varchar(36) NOT NULL,
                    \`planId\` varchar(36) NOT NULL,
                    \`status\` varchar(20) NOT NULL DEFAULT 'ACTIVE',
                    \`startAt\` datetime NOT NULL DEFAULT (now()),
                    \`endAt\` datetime NOT NULL,
                    \`createdAt\` datetime NOT NULL DEFAULT (now()),
                    \`updatedAt\` datetime NOT NULL DEFAULT (now()),
                    CONSTRAINT \`SeasonPassSubscription_id_pk\` PRIMARY KEY(\`id\`),
                    CONSTRAINT \`SeasonPassSubscription_userId_User_id_fk\`
                        FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE cascade,
                    CONSTRAINT \`SeasonPassSubscription_planId_SeasonPassPlan_id_fk\`
                        FOREIGN KEY (\`planId\`) REFERENCES \`SeasonPassPlan\`(\`id\`) ON DELETE restrict
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);

            await client.execute(`
                CREATE TABLE IF NOT EXISTS \`SeasonPassClaim\` (
                    \`id\` varchar(36) NOT NULL,
                    \`subscriptionId\` varchar(36) NOT NULL,
                    \`userId\` varchar(36) NOT NULL,
                    \`dayNumber\` int NOT NULL,
                    \`claimDateKey\` varchar(10) NOT NULL,
                    \`rewardType\` varchar(30) NOT NULL,
                    \`rewardLabel\` varchar(120) NOT NULL,
                    \`rewardAmount\` varchar(50) NOT NULL,
                    \`rewardPayload\` json NULL,
                    \`createdAt\` datetime NOT NULL DEFAULT (now()),
                    CONSTRAINT \`SeasonPassClaim_id_pk\` PRIMARY KEY(\`id\`),
                    CONSTRAINT \`SeasonPassClaim_subscriptionId_SeasonPassSubscription_id_fk\`
                        FOREIGN KEY (\`subscriptionId\`) REFERENCES \`SeasonPassSubscription\`(\`id\`) ON DELETE cascade,
                    CONSTRAINT \`SeasonPassClaim_userId_User_id_fk\`
                        FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE cascade,
                    CONSTRAINT \`uq_season_pass_claim_subscription_day\` UNIQUE(\`subscriptionId\`, \`dayNumber\`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);

            await client.execute(`
                CREATE TABLE IF NOT EXISTS \`SeasonPassReward\` (
                    \`id\` varchar(36) NOT NULL,
                    \`planId\` varchar(36) NOT NULL,
                    \`dayNumber\` int NOT NULL,
                    \`rewardType\` varchar(30) NOT NULL,
                    \`label\` varchar(120) NOT NULL,
                    \`amount\` varchar(50) NOT NULL,
                    \`imageUrl\` varchar(500) NULL,
                    \`highlight\` boolean NOT NULL DEFAULT false,
                    \`creditReward\` int NULL,
                    \`pointReward\` int NULL,
                    \`createdAt\` datetime NOT NULL DEFAULT (now()),
                    \`updatedAt\` datetime NOT NULL DEFAULT (now()),
                    CONSTRAINT \`SeasonPassReward_id_pk\` PRIMARY KEY(\`id\`),
                    CONSTRAINT \`SeasonPassReward_planId_SeasonPassPlan_id_fk\`
                        FOREIGN KEY (\`planId\`) REFERENCES \`SeasonPassPlan\`(\`id\`) ON DELETE cascade,
                    CONSTRAINT \`uq_season_pass_reward_plan_day\` UNIQUE(\`planId\`, \`dayNumber\`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);

            try {
                await client.execute("ALTER TABLE `SeasonPassReward` ADD COLUMN `imageUrl` varchar(500) NULL AFTER `amount`;");
            } catch {
                // Column may already exist.
            }

            try {
                await client.execute("ALTER TABLE `User` ADD COLUMN `ticketBalance` int NOT NULL DEFAULT 0 AFTER `pointBalance`;");
            } catch {
                // Column may already exist.
            }
        })().catch((error: unknown) => {
            ensureSeasonPassSchemaPromise = null;
            throw error;
        });
    }

    await ensureSeasonPassSchemaPromise;
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
    // Test environment may mock db without query helpers.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(db as any).query?.seasonPassRewards) {
        return [...DEFAULT_REWARD_CATALOG];
    }

    const plan = planId ? { id: planId } : await getOrCreateSeasonPassPlan();
    const rewards = await seedSeasonPassRewards(plan.id);
    return rewards.map(mapDbRewardToDefinition);
}

export async function getSeasonPassRewardByDay(dayNumber: number, planId?: string) {
    const rewards = await getSeasonPassRewardCatalog(planId);
    return rewards.find((reward) => reward.day === dayNumber) ?? null;
}

export async function getOrCreateSeasonPassPlan() {
    await ensureSeasonPassSchema();

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

export async function getCurrentSeasonPassSubscription(userId: string) {
    await expireSeasonPassSubscriptions(userId);

    const rows = await db
        .select()
        .from(seasonPassSubscriptions)
        .where(
            and(
                eq(seasonPassSubscriptions.userId, userId),
                eq(seasonPassSubscriptions.status, "ACTIVE"),
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

export async function getSeasonPassDashboardState(userId: string) {
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

export function getSeasonPassExtensionEndAt(baseEndAt: string | null, durationDays: number) {
    const baseDate = baseEndAt ? parseMySqlDateTime(baseEndAt) : new Date();
    return formatMySqlDateTime(addDays(baseDate, durationDays));
}

export function getSeasonPassInitialEndAt(durationDays: number) {
    return formatMySqlDateTime(addDays(new Date(), durationDays));
}
