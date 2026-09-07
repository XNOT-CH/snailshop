import { describe, it, expect, vi, beforeEach } from "vitest";

// The money test. Clicks, signups and top-up baht live at three different
// grains, so counting them in one join multiplies them by each other: a
// promoter with 30 click-days and 3 top-ups would be credited 90 times over.
// These tests hold the shape that avoids it — one query per metric, merged by
// code id — and the rule that only money which actually arrived is counted.

const { findMany, selectResults, selectCalls, whereCalls } = vi.hoisted(() => ({
    findMany: vi.fn(),
    selectResults: [] as unknown[][],
    selectCalls: [] as Record<string, unknown>[],
    whereCalls: [] as unknown[],
}));

// A stub query builder: every chained call returns itself, and awaiting it
// yields the next queued result set.
function makeBuilder() {
    const builder: Record<string, unknown> = {};
    for (const method of ["from", "groupBy", "innerJoin", "orderBy"]) {
        builder[method] = () => builder;
    }
    builder.where = (condition: unknown) => {
        whereCalls.push(condition);
        return builder;
    };
    builder.then = (resolve: (value: unknown) => unknown) => resolve(selectResults.shift() ?? []);
    return builder;
}

vi.mock("@/lib/db", () => ({
    db: {
        query: { inviteCodes: { findMany: (...args: unknown[]) => findMany(...args) } },
        select: (selection: Record<string, unknown>) => {
            selectCalls.push(selection);
            return makeBuilder();
        },
    },
    inviteCodes: {
        id: "id",
        code: "code",
        isActive: "isActive",
        deletedAt: "deletedAt",
        createdAt: "createdAt",
    },
    inviteClicksDaily: { inviteCodeId: "inviteCodeId", clickDate: "clickDate", clicks: "clicks" },
    topups: { userId: "userId", amount: "amount", status: "status", createdAt: "createdAt" },
    users: { id: "id", inviteCodeId: "inviteCodeId", createdAt: "createdAt" },
}));

vi.mock("drizzle-orm", () => ({
    and: (...args: unknown[]) => ({ and: args }),
    asc: (column: unknown) => ({ asc: column }),
    count: () => ({ count: true }),
    eq: (a: unknown, b: unknown) => ({ eq: [a, b] }),
    gte: (a: unknown, b: unknown) => ({ gte: [a, b] }),
    isNotNull: (a: unknown) => ({ isNotNull: a }),
    isNull: (a: unknown) => ({ isNull: a }),
    lte: (a: unknown, b: unknown) => ({ lte: [a, b] }),
    sql: (strings: TemplateStringsArray) => strings.join(""),
}));

import { listInviteCodesWithStats } from "@/lib/features/invites/queries";

const CODES = [
    {
        id: "invite-1",
        code: "TIKTOK1",
        label: "TikTok",
        note: null,
        destination: "/shop",
        isActive: true,
        createdAt: "2026-09-01 00:00:00",
    },
    {
        id: "invite-2",
        code: "QUIET",
        label: "ยังไม่ได้ใช้",
        note: null,
        destination: "/shop",
        isActive: false,
        createdAt: "2026-09-02 00:00:00",
    },
];

describe("listInviteCodesWithStats", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        selectResults.length = 0;
        selectCalls.length = 0;
        whereCalls.length = 0;
        findMany.mockResolvedValue(CODES);
    });

    it("counts each metric once — two users with three top-ups each do not multiply", async () => {
        selectResults.push(
            [{ inviteCodeId: "invite-1", clicks: 40 }], // 40 click-days
            [{ inviteCodeId: "invite-1", signups: 2 }], // 2 users
            [{ inviteCodeId: "invite-1", total: 1500 }], // 6 top-ups summing to 1,500
        );

        const [row] = await listInviteCodesWithStats();

        expect(row.clicks).toBe(40);
        expect(row.signups).toBe(2);
        expect(row.topupTotal).toBe(1500);
    });

    it("counts each metric with its own query rather than one join", async () => {
        selectResults.push([], [], []);

        await listInviteCodesWithStats();

        // Three selects: clicks, signups, baht. A single joined query is the
        // fan-out bug this whole shape exists to avoid.
        expect(selectCalls).toHaveLength(3);
    });

    it("shows a code nobody has used yet as zeros instead of dropping it", async () => {
        selectResults.push([{ inviteCodeId: "invite-1", clicks: 5 }], [], []);

        const rows = await listInviteCodesWithStats();

        expect(rows).toHaveLength(2);
        expect(rows[1]).toEqual(
            expect.objectContaining({ code: "QUIET", clicks: 0, signups: 0, topupTotal: 0 }),
        );
    });

    it("filters clicks and signups by the date range but never the top-up total", async () => {
        selectResults.push([], [], []);

        await listInviteCodesWithStats({ startDate: "2026-09-01", endDate: "2026-09-07" });

        const [clickWhere, signupWhere, topupWhere] = whereCalls.map((condition) =>
            JSON.stringify(condition),
        );

        expect(clickWhere).toContain("2026-09-01");
        expect(clickWhere).toContain("2026-09-07");
        expect(signupWhere).toContain("2026-09-01 00:00:00");
        // The whole day, not up to its midnight.
        expect(signupWhere).toContain("2026-09-07 23:59:59");
        // Lifetime: a shopper who signed up in May and topped up today still
        // counts for the channel that brought them.
        expect(topupWhere).not.toContain("2026-09");
        expect(topupWhere).toContain("APPROVED");
    });

    it("asks for no date filter at all when no range is chosen", async () => {
        selectResults.push([], [], []);

        await listInviteCodesWithStats();

        // The clicks query gets no WHERE at all rather than an empty one.
        expect(whereCalls[0]).toBeUndefined();
    });
});
