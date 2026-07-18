import { and, asc, count, eq, gte, inArray, lt, sql } from "drizzle-orm";
import {
    db,
    dailyQuests,
    dailyQuestClaims,
    gachaRollLogs,
    orders,
    seasonPassClaims,
    topups,
} from "@/lib/db";
import { formatDateInTimeZone, getThaiDayStartUtc, toMySQLDatetime } from "@/lib/utils/date";

export const QUEST_GOAL_TYPES = [
    "CHECK_IN",
    "PURCHASE_COUNT",
    "TOPUP_AMOUNT",
    "GACHA_SPINS",
    "SEASON_PASS_CLAIM",
] as const;

export type QuestGoalType = (typeof QUEST_GOAL_TYPES)[number];

export interface DailyQuestView {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    goalType: QuestGoalType;
    goalValue: number;
    rewardPoints: number;
    ctaHref: string | null;
    progress: number;
    claimed: boolean;
    claimable: boolean;
}

export interface DailyQuestBoard {
    dateKey: string;
    resetAtIso: string;
    quests: DailyQuestView[];
    claimedCount: number;
    totalCount: number;
}

/** UTC range [start, end) of the Thai calendar day containing `now`. */
function thaiDayUtcRange(now: Date) {
    const start = getThaiDayStartUtc(now);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
}

async function getProgressByGoalType(userId: string, now: Date): Promise<Record<QuestGoalType, number>> {
    const { start, end } = thaiDayUtcRange(now);
    const startSql = toMySQLDatetime(start);
    const endSql = toMySQLDatetime(end);
    const todayKey = formatDateInTimeZone(now);

    const [orderRows, topupRows, gachaRows, seasonPassRows] = await Promise.all([
        db.select({ value: count() })
            .from(orders)
            .where(and(
                eq(orders.userId, userId),
                eq(orders.status, "COMPLETED"),
                gte(orders.purchasedAt, startSql),
                lt(orders.purchasedAt, endSql),
            )),
        db.select({ value: sql<string>`COALESCE(SUM(${topups.amount}), 0)` })
            .from(topups)
            .where(and(
                eq(topups.userId, userId),
                eq(topups.status, "APPROVED"),
                gte(topups.createdAt, startSql),
                lt(topups.createdAt, endSql),
            )),
        db.select({ value: count() })
            .from(gachaRollLogs)
            .where(and(
                eq(gachaRollLogs.userId, userId),
                gte(gachaRollLogs.createdAt, startSql),
                lt(gachaRollLogs.createdAt, endSql),
            )),
        db.select({ value: count() })
            .from(seasonPassClaims)
            .where(and(
                eq(seasonPassClaims.userId, userId),
                eq(seasonPassClaims.claimDateKey, todayKey),
            )),
    ]);

    return {
        // Check-in has no prerequisite: the claim itself is the action.
        CHECK_IN: 1,
        PURCHASE_COUNT: Number(orderRows[0]?.value ?? 0),
        TOPUP_AMOUNT: Math.floor(Number(topupRows[0]?.value ?? 0)),
        GACHA_SPINS: Number(gachaRows[0]?.value ?? 0),
        SEASON_PASS_CLAIM: Number(seasonPassRows[0]?.value ?? 0),
    };
}

export async function getActiveQuests() {
    return db.query.dailyQuests.findMany({
        where: eq(dailyQuests.isActive, true),
        orderBy: [asc(dailyQuests.sortOrder), asc(dailyQuests.createdAt)],
    });
}

/**
 * Full board for the quests page. `userId` may be null (guest): quests render
 * with zero progress and nothing claimable.
 */
export async function getDailyQuestBoard(userId: string | null, now = new Date()): Promise<DailyQuestBoard> {
    const todayKey = formatDateInTimeZone(now);
    const { end } = thaiDayUtcRange(now);
    const quests = await getActiveQuests();

    let progressByType: Record<QuestGoalType, number> | null = null;
    let claimedQuestIds = new Set<string>();

    if (userId && quests.length > 0) {
        const [progress, claims] = await Promise.all([
            getProgressByGoalType(userId, now),
            db.select({ questId: dailyQuestClaims.questId })
                .from(dailyQuestClaims)
                .where(and(
                    eq(dailyQuestClaims.userId, userId),
                    eq(dailyQuestClaims.dateKey, todayKey),
                    inArray(dailyQuestClaims.questId, quests.map((quest) => quest.id)),
                )),
        ]);
        progressByType = progress;
        claimedQuestIds = new Set(claims.map((claim) => claim.questId));
    }

    const questViews = quests.map((quest): DailyQuestView => {
        const goalType = quest.goalType as QuestGoalType;
        const rawProgress = progressByType?.[goalType] ?? 0;
        const progress = Math.min(rawProgress, quest.goalValue);
        const claimed = claimedQuestIds.has(quest.id);

        return {
            id: quest.id,
            slug: quest.slug,
            title: quest.title,
            description: quest.description,
            goalType,
            goalValue: quest.goalValue,
            rewardPoints: quest.rewardPoints,
            ctaHref: quest.ctaHref,
            progress: claimed ? quest.goalValue : progress,
            claimed,
            claimable: Boolean(userId) && !claimed && progress >= quest.goalValue,
        };
    });

    return {
        dateKey: todayKey,
        resetAtIso: end.toISOString(),
        quests: questViews,
        claimedCount: questViews.filter((quest) => quest.claimed).length,
        totalCount: questViews.length,
    };
}

/**
 * Claims a quest reward. Progress is re-verified server-side and the unique
 * (userId, questId, dateKey) index makes double claims impossible even under
 * concurrent requests.
 */
export async function claimDailyQuest(params: { userId: string; questId: string }) {
    const now = new Date();
    const todayKey = formatDateInTimeZone(now);

    const quest = await db.query.dailyQuests.findFirst({
        where: and(eq(dailyQuests.id, params.questId), eq(dailyQuests.isActive, true)),
    });

    if (!quest) {
        return { ok: false as const, status: 404, message: "ไม่พบภารกิจนี้" };
    }

    const goalType = quest.goalType as QuestGoalType;
    const progressByType = await getProgressByGoalType(params.userId, now);
    if ((progressByType[goalType] ?? 0) < quest.goalValue) {
        return { ok: false as const, status: 400, message: "ยังทำภารกิจไม่ครบตามเงื่อนไข" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = await (db as any).$client.getConnection();

    try {
        await conn.beginTransaction();

        try {
            await conn.execute(
                "INSERT INTO DailyQuestClaim (id, userId, questId, dateKey, rewardPoints, createdAt) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())",
                [crypto.randomUUID(), params.userId, quest.id, todayKey, quest.rewardPoints],
            );
        } catch (error) {
            const isDuplicate = (error as { code?: string })?.code === "ER_DUP_ENTRY";
            throw isDuplicate ? new Error("คุณรับรางวัลภารกิจนี้ไปแล้ววันนี้") : error;
        }

        await conn.execute(
            "UPDATE User SET pointBalance = pointBalance + ?, lifetimePoints = lifetimePoints + ? WHERE id = ?",
            [quest.rewardPoints, quest.rewardPoints, params.userId],
        );

        await conn.commit();

        return {
            ok: true as const,
            status: 200,
            body: {
                success: true,
                message: `รับ ${quest.rewardPoints} แต้ม จากภารกิจ "${quest.title}" สำเร็จ`,
                questId: quest.id,
                rewardPoints: quest.rewardPoints,
                dateKey: todayKey,
            },
        };
    } catch (error) {
        await conn.rollback();
        return {
            ok: false as const,
            status: 400,
            message: error instanceof Error ? error.message : "ไม่สามารถรับรางวัลได้",
        };
    } finally {
        conn.release();
    }
}
