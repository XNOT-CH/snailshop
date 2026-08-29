import { and, asc, count, eq, sql } from "drizzle-orm";
import { db, dailyQuests, dailyQuestClaims } from "@/lib/db";
import { formatDateInTimeZone } from "@/lib/utils/date";
import { QUEST_GOAL_TYPE_META } from "@/lib/features/quests/questGoalTypes";
import type { QuestGoalType } from "@/lib/features/quests/dailyQuests";
import type { CreateQuestInput, UpdateQuestInput } from "@/lib/validations/quest";

export interface AdminQuestRow {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    goalType: QuestGoalType;
    goalValue: number;
    rewardPoints: number;
    ctaHref: string | null;
    sortOrder: number;
    isActive: boolean;
    /** Claims today (Thai calendar day) and all-time — shows what actually gets played. */
    claimsToday: number;
    claimsTotal: number;
}

export class QuestSlugTakenError extends Error {
    constructor() {
        super("รหัสภารกิจ (slug) นี้ถูกใช้ไปแล้ว");
        this.name = "QuestSlugTakenError";
    }
}

export class QuestNotFoundError extends Error {
    constructor() {
        super("ไม่พบภารกิจนี้");
        this.name = "QuestNotFoundError";
    }
}

/**
 * CHECK_IN progress is hardcoded to 1 in getProgressByGoalType, so any goal
 * above 1 would be permanently unreachable. Clamp instead of trusting input.
 */
function normalizeGoalValue(goalType: QuestGoalType, goalValue: number) {
    return QUEST_GOAL_TYPE_META[goalType]?.fixedGoalValue ?? goalValue;
}

function normalizeCtaHref(ctaHref: string | null | undefined) {
    const trimmed = ctaHref?.trim();
    return trimmed ? trimmed : null;
}

export async function listAdminQuests(now = new Date()): Promise<AdminQuestRow[]> {
    const todayKey = formatDateInTimeZone(now);

    const [quests, todayRows, totalRows] = await Promise.all([
        db.query.dailyQuests.findMany({
            orderBy: [asc(dailyQuests.sortOrder), asc(dailyQuests.createdAt)],
        }),
        db
            .select({ questId: dailyQuestClaims.questId, value: count() })
            .from(dailyQuestClaims)
            .where(eq(dailyQuestClaims.dateKey, todayKey))
            .groupBy(dailyQuestClaims.questId),
        db
            .select({ questId: dailyQuestClaims.questId, value: count() })
            .from(dailyQuestClaims)
            .groupBy(dailyQuestClaims.questId),
    ]);

    const todayByQuest = new Map(todayRows.map((row) => [row.questId, Number(row.value)]));
    const totalByQuest = new Map(totalRows.map((row) => [row.questId, Number(row.value)]));

    return quests.map((quest) => ({
        id: quest.id,
        slug: quest.slug,
        title: quest.title,
        description: quest.description,
        goalType: quest.goalType as QuestGoalType,
        goalValue: quest.goalValue,
        rewardPoints: quest.rewardPoints,
        ctaHref: quest.ctaHref,
        sortOrder: quest.sortOrder,
        isActive: quest.isActive,
        claimsToday: todayByQuest.get(quest.id) ?? 0,
        claimsTotal: totalByQuest.get(quest.id) ?? 0,
    }));
}

async function assertSlugAvailable(slug: string, exceptId?: string) {
    const existing = await db.query.dailyQuests.findFirst({
        where: eq(dailyQuests.slug, slug),
        columns: { id: true },
    });

    if (existing && existing.id !== exceptId) {
        throw new QuestSlugTakenError();
    }
}

export async function createAdminQuest(input: CreateQuestInput) {
    await assertSlugAvailable(input.slug);

    const [{ maxSort }] = await db
        .select({ maxSort: sql<number | null>`MAX(${dailyQuests.sortOrder})` })
        .from(dailyQuests);

    const id = crypto.randomUUID();
    await db.insert(dailyQuests).values({
        id,
        slug: input.slug,
        title: input.title,
        description: input.description?.trim() || null,
        goalType: input.goalType,
        goalValue: normalizeGoalValue(input.goalType, input.goalValue),
        rewardPoints: input.rewardPoints,
        ctaHref: normalizeCtaHref(input.ctaHref),
        sortOrder: input.sortOrder ?? Number(maxSort ?? -1) + 1,
        isActive: input.isActive ?? true,
    });

    return id;
}

export async function getAdminQuest(id: string) {
    const quest = await db.query.dailyQuests.findFirst({ where: eq(dailyQuests.id, id) });
    if (!quest) {
        throw new QuestNotFoundError();
    }

    return quest;
}

export async function updateAdminQuest(id: string, input: UpdateQuestInput) {
    const existing = await getAdminQuest(id);

    if (input.slug && input.slug !== existing.slug) {
        await assertSlugAvailable(input.slug, id);
    }

    const goalType = (input.goalType ?? existing.goalType) as QuestGoalType;
    const goalValue = input.goalValue ?? existing.goalValue;

    await db
        .update(dailyQuests)
        .set({
            slug: input.slug ?? existing.slug,
            title: input.title ?? existing.title,
            description: input.description === undefined
                ? existing.description
                : (input.description?.trim() || null),
            goalType,
            goalValue: normalizeGoalValue(goalType, goalValue),
            rewardPoints: input.rewardPoints ?? existing.rewardPoints,
            ctaHref: input.ctaHref === undefined ? existing.ctaHref : normalizeCtaHref(input.ctaHref),
            sortOrder: input.sortOrder ?? existing.sortOrder,
            isActive: input.isActive ?? existing.isActive,
        })
        .where(eq(dailyQuests.id, id));

    return existing;
}

/**
 * Claims cascade on delete, which would wipe the record of points already paid
 * out. Deleting is therefore only offered for quests nobody has ever claimed —
 * everything else gets deactivated instead.
 */
export async function deleteAdminQuest(id: string) {
    const existing = await getAdminQuest(id);

    const [claimCount] = await db
        .select({ value: count() })
        .from(dailyQuestClaims)
        .where(eq(dailyQuestClaims.questId, id));

    if (Number(claimCount?.value ?? 0) > 0) {
        throw new Error("ภารกิจนี้มีผู้รับรางวัลไปแล้ว ปิดใช้งานแทนการลบเพื่อเก็บประวัติไว้");
    }

    await db.delete(dailyQuests).where(eq(dailyQuests.id, id));

    return existing;
}

/** Today's claim total across every quest — the header stat on the admin page. */
export async function getQuestClaimSummary(now = new Date()) {
    const todayKey = formatDateInTimeZone(now);

    const [todayRow, activeRow] = await Promise.all([
        db
            .select({
                claims: count(),
                points: sql<string>`COALESCE(SUM(${dailyQuestClaims.rewardPoints}), 0)`,
            })
            .from(dailyQuestClaims)
            .where(eq(dailyQuestClaims.dateKey, todayKey)),
        db
            .select({ value: count() })
            .from(dailyQuests)
            .where(and(eq(dailyQuests.isActive, true))),
    ]);

    return {
        dateKey: todayKey,
        claimsToday: Number(todayRow[0]?.claims ?? 0),
        pointsToday: Number(todayRow[0]?.points ?? 0),
        activeQuests: Number(activeRow[0]?.value ?? 0),
    };
}
