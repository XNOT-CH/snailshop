import { and, count, eq, gte, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db, inviteCodes, topups, users } from "@/lib/db";

export type InviteStatsRange = {
    startDate?: string; // yyyy-MM-dd
    endDate?: string; // yyyy-MM-dd
    // Stopped links are hidden by default. The admin table asks for them so a
    // channel's signups and baht stay readable after the link is stopped.
    includeDeleted?: boolean;
};

export type InviteCodeWithStats = {
    id: string;
    code: string;
    label: string;
    note: string | null;
    destination: string;
    createdAt: string;
    // null while the link works; a timestamp once it was stopped.
    deletedAt: string | null;
    signups: number;
    topupTotal: number;
};

export function findActiveInviteByCode(code: string) {
    return db.query.inviteCodes.findFirst({
        where: and(
            eq(inviteCodes.code, code.trim().toUpperCase()),
            eq(inviteCodes.isActive, true),
            isNull(inviteCodes.deletedAt),
        ),
    });
}

export function findInviteCodeById(id: string) {
    return db.query.inviteCodes.findFirst({
        where: eq(inviteCodes.id, id),
    });
}

// Deleted rows included on purpose: this is the duplicate guard, and handing a
// retired promoter's code to a new campaign would merge two sets of numbers.
export function findInviteCodeByCode(code: string) {
    return db.query.inviteCodes.findFirst({
        where: eq(inviteCodes.code, code.trim().toUpperCase()),
    });
}

export function listInviteCodes({ includeDeleted = false } = {}) {
    return db.query.inviteCodes.findMany({
        where: includeDeleted ? undefined : isNull(inviteCodes.deletedAt),
        orderBy: (table, helpers) => helpers.desc(table.createdAt),
    });
}

/**
 * listInviteCodesWithStats — one row per invite code with its two numbers.
 *
 * Deliberately three separate queries merged in JS instead of one join. Joining
 * InviteCode → User → Topup multiplies the rows: a promoter with 5 signups and
 * 30 top-ups would report 6× the signups. Each metric is therefore counted in
 * isolation, at its own grain.
 *
 * Date range applies to signups (User.createdAt) only. Top-up baht is lifetime
 * by design: the question a channel is judged on is how much money the people
 * it sent have spent, whenever they spent it.
 */
export async function listInviteCodesWithStats(
    range: InviteStatsRange = {},
): Promise<InviteCodeWithStats[]> {
    const { startDate, endDate, includeDeleted } = range;

    // User.createdAt is a datetime, so the end of the range has to cover the
    // whole day rather than stopping at its midnight.
    const signupFilters = [
        isNotNull(users.inviteCodeId),
        startDate ? gte(users.createdAt, `${startDate} 00:00:00`) : undefined,
        endDate ? lte(users.createdAt, `${endDate} 23:59:59`) : undefined,
    ].filter(Boolean);

    const [codes, signupRows, topupRows] = await Promise.all([
        listInviteCodes({ includeDeleted }),
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

    const signupsById = new Map(signupRows.map((row) => [row.inviteCodeId, Number(row.signups)]));
    const topupById = new Map(topupRows.map((row) => [row.inviteCodeId, Number(row.total)]));

    return codes.map((code) => ({
        id: code.id,
        code: code.code,
        label: code.label,
        note: code.note,
        destination: code.destination,
        createdAt: code.createdAt,
        deletedAt: code.deletedAt,
        signups: signupsById.get(code.id) ?? 0,
        topupTotal: topupById.get(code.id) ?? 0,
    }));
}
