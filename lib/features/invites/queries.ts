import { and, asc, count, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import { db, inviteClicksDaily, inviteCodes, topups, users } from "@/lib/db";

export type InviteStatsRange = {
    startDate?: string; // yyyy-MM-dd
    endDate?: string; // yyyy-MM-dd
};

export type InviteCodeWithStats = {
    id: string;
    code: string;
    label: string;
    note: string | null;
    destination: string;
    isActive: boolean;
    createdAt: string;
    clicks: number;
    signups: number;
    topupTotal: number;
};

export function findActiveInviteByCode(code: string) {
    return db.query.inviteCodes.findFirst({
        where: and(
            eq(inviteCodes.code, code.trim().toUpperCase()),
            eq(inviteCodes.isActive, true),
        ),
    });
}

export function findInviteCodeById(id: string) {
    return db.query.inviteCodes.findFirst({
        where: eq(inviteCodes.id, id),
    });
}

export function findInviteCodeByCode(code: string) {
    return db.query.inviteCodes.findFirst({
        where: eq(inviteCodes.code, code.trim().toUpperCase()),
    });
}

export function listInviteCodes() {
    return db.query.inviteCodes.findMany({
        orderBy: (table, helpers) => helpers.desc(table.createdAt),
    });
}

/**
 * listInviteCodesWithStats — one row per invite code with its three numbers.
 *
 * Deliberately four separate queries merged in JS instead of one join. Joining
 * InviteCode → User → Topup → InviteClickDaily multiplies the rows: a promoter
 * with 5 signups and 30 click-days would report 30× the baht and 6× the
 * signups. Each metric is therefore counted in isolation, at its own grain.
 *
 * Date range applies to clicks (clickDate) and signups (User.createdAt) only.
 * Top-up baht is lifetime by design: the question a channel is judged on is how
 * much money the people it sent have spent, whenever they spent it.
 */
export async function listInviteCodesWithStats(
    range: InviteStatsRange = {},
): Promise<InviteCodeWithStats[]> {
    const { startDate, endDate } = range;

    const clickFilters = [
        startDate ? gte(inviteClicksDaily.clickDate, startDate) : undefined,
        endDate ? lte(inviteClicksDaily.clickDate, endDate) : undefined,
    ].filter(Boolean);

    // User.createdAt is a datetime, so the end of the range has to cover the
    // whole day rather than stopping at its midnight.
    const signupFilters = [
        isNotNull(users.inviteCodeId),
        startDate ? gte(users.createdAt, `${startDate} 00:00:00`) : undefined,
        endDate ? lte(users.createdAt, `${endDate} 23:59:59`) : undefined,
    ].filter(Boolean);

    const [codes, clickRows, signupRows, topupRows] = await Promise.all([
        listInviteCodes(),
        db
            .select({
                inviteCodeId: inviteClicksDaily.inviteCodeId,
                clicks: sql<number>`coalesce(sum(${inviteClicksDaily.clicks}), 0)`,
            })
            .from(inviteClicksDaily)
            .where(clickFilters.length ? and(...clickFilters) : undefined)
            .groupBy(inviteClicksDaily.inviteCodeId),
        db
            .select({
                inviteCodeId: users.inviteCodeId,
                signups: count(),
            })
            .from(users)
            .where(and(...signupFilters))
            .groupBy(users.inviteCodeId),
        // Only APPROVED top-ups are money that actually arrived; PENDING slips
        // are still waiting on a human.
        db
            .select({
                inviteCodeId: users.inviteCodeId,
                total: sql<number>`coalesce(sum(${topups.amount}), 0)`,
            })
            .from(topups)
            .innerJoin(users, eq(topups.userId, users.id))
            .where(and(isNotNull(users.inviteCodeId), eq(topups.status, "APPROVED")))
            .groupBy(users.inviteCodeId),
    ]);

    const clicksById = new Map(clickRows.map((row) => [row.inviteCodeId, Number(row.clicks)]));
    const signupsById = new Map(signupRows.map((row) => [row.inviteCodeId, Number(row.signups)]));
    const topupById = new Map(topupRows.map((row) => [row.inviteCodeId, Number(row.total)]));

    return codes.map((code) => ({
        id: code.id,
        code: code.code,
        label: code.label,
        note: code.note,
        destination: code.destination,
        isActive: code.isActive,
        createdAt: code.createdAt,
        clicks: clicksById.get(code.id) ?? 0,
        signups: signupsById.get(code.id) ?? 0,
        topupTotal: topupById.get(code.id) ?? 0,
    }));
}

/** Daily click rows for one code, oldest first. Used by tests and future charts. */
export function listInviteClicksByCode(inviteCodeId: string) {
    return db
        .select()
        .from(inviteClicksDaily)
        .where(eq(inviteClicksDaily.inviteCodeId, inviteCodeId))
        .orderBy(asc(inviteClicksDaily.clickDate));
}
