import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
    findManyMock: vi.fn(),
    findFirstMock: vi.fn(),
    insertValuesMock: vi.fn(),
    updateWhereMock: vi.fn(),
    updateSetMock: vi.fn(),
    deleteWhereMock: vi.fn(),
    selectRows: [] as unknown[][],
}));

vi.mock("@/lib/db", () => {
    // db.select().from().where().groupBy() and the shorter chains all resolve to
    // whatever the current test queued in mocks.selectRows, in call order.
    let call = 0;
    const makeThenable = () => {
        const result = mocks.selectRows[call++] ?? [];
        const chain: Record<string, unknown> = {
            from: () => chain,
            where: () => chain,
            groupBy: () => Promise.resolve(result),
            then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
        };
        return chain;
    };

    return {
        db: {
            query: {
                dailyQuests: { findMany: mocks.findManyMock, findFirst: mocks.findFirstMock },
            },
            select: () => {
                if (call >= mocks.selectRows.length) call = 0;
                return makeThenable();
            },
            insert: () => ({ values: mocks.insertValuesMock }),
            update: () => ({ set: mocks.updateSetMock.mockReturnValue({ where: mocks.updateWhereMock }) }),
            delete: () => ({ where: mocks.deleteWhereMock }),
        },
        dailyQuests: { id: "id", slug: "slug", sortOrder: "sortOrder", isActive: "isActive", createdAt: "createdAt" },
        dailyQuestClaims: { questId: "questId", dateKey: "dateKey", rewardPoints: "rewardPoints" },
    };
});

vi.mock("drizzle-orm", () => ({
    and: vi.fn(), asc: vi.fn(), count: vi.fn(), eq: vi.fn(), sql: vi.fn(),
}));

import {
    createAdminQuest,
    deleteAdminQuest,
    listAdminQuests,
    QuestNotFoundError,
    QuestSlugTakenError,
    updateAdminQuest,
} from "@/lib/features/quests/adminQuests";

function quest(overrides: Record<string, unknown> = {}) {
    return {
        id: "q1", slug: "daily-check-in", title: "เช็คอิน", description: null,
        goalType: "CHECK_IN", goalValue: 1, rewardPoints: 10,
        ctaHref: null, sortOrder: 0, isActive: true, ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectRows = [];
    mocks.findFirstMock.mockResolvedValue(undefined);
    mocks.findManyMock.mockResolvedValue([]);
});

describe("listAdminQuests", () => {
    it("joins today's and all-time claim counts onto each quest", async () => {
        mocks.findManyMock.mockResolvedValue([quest(), quest({ id: "q2", slug: "spin-3" })]);
        mocks.selectRows = [
            [{ questId: "q1", value: 4 }],
            [{ questId: "q1", value: 40 }, { questId: "q2", value: 7 }],
        ];

        const rows = await listAdminQuests();

        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({ id: "q1", claimsToday: 4, claimsTotal: 40 });
        // No claims today for q2 must read as 0, not undefined.
        expect(rows[1]).toMatchObject({ id: "q2", claimsToday: 0, claimsTotal: 7 });
    });
});

describe("createAdminQuest", () => {
    it("rejects a slug that already exists", async () => {
        mocks.findFirstMock.mockResolvedValue({ id: "other" });

        await expect(createAdminQuest({
            slug: "daily-check-in", title: "ซ้ำ", goalType: "CHECK_IN",
            goalValue: 1, rewardPoints: 5,
        } as never)).rejects.toBeInstanceOf(QuestSlugTakenError);

        expect(mocks.insertValuesMock).not.toHaveBeenCalled();
    });

    it("appends after the highest sortOrder when none is given", async () => {
        mocks.selectRows = [[{ maxSort: 4 }]];

        await createAdminQuest({
            slug: "spin-3", title: "สุ่ม 3 ครั้ง", goalType: "GACHA_SPINS",
            goalValue: 3, rewardPoints: 20,
        } as never);

        expect(mocks.insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 5 }));
    });

    // CHECK_IN progress is hardcoded to 1, so a larger goal could never be met.
    it("clamps a CHECK_IN goal to 1 however large the input", async () => {
        mocks.selectRows = [[{ maxSort: null }]];

        await createAdminQuest({
            slug: "check", title: "เช็คอิน", goalType: "CHECK_IN",
            goalValue: 99, rewardPoints: 10,
        } as never);

        expect(mocks.insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({ goalValue: 1, sortOrder: 0 }));
    });

    it("stores an empty CTA link as null", async () => {
        mocks.selectRows = [[{ maxSort: null }]];

        await createAdminQuest({
            slug: "spin", title: "สุ่ม", goalType: "GACHA_SPINS",
            goalValue: 2, rewardPoints: 10, ctaHref: "   ",
        } as never);

        expect(mocks.insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({ ctaHref: null }));
    });
});

describe("updateAdminQuest", () => {
    it("throws when the quest is gone", async () => {
        mocks.findFirstMock.mockResolvedValue(undefined);

        await expect(updateAdminQuest("missing", { title: "x" })).rejects.toBeInstanceOf(QuestNotFoundError);
    });

    it("keeps untouched fields at their current values", async () => {
        mocks.findFirstMock.mockResolvedValue(quest({ rewardPoints: 25, ctaHref: "/shop" }));

        await updateAdminQuest("q1", { title: "ชื่อใหม่" });

        expect(mocks.updateSetMock).toHaveBeenCalledWith(expect.objectContaining({
            title: "ชื่อใหม่",
            rewardPoints: 25,
            ctaHref: "/shop",
            slug: "daily-check-in",
        }));
    });

    it("re-clamps the goal when the type changes to CHECK_IN", async () => {
        mocks.findFirstMock.mockResolvedValue(quest({ goalType: "GACHA_SPINS", goalValue: 5 }));

        await updateAdminQuest("q1", { goalType: "CHECK_IN" });

        expect(mocks.updateSetMock).toHaveBeenCalledWith(expect.objectContaining({ goalValue: 1 }));
    });
});

describe("deleteAdminQuest", () => {
    it("refuses to delete a quest that already paid out, to keep the claim history", async () => {
        mocks.findFirstMock.mockResolvedValue(quest());
        mocks.selectRows = [[{ value: 3 }]];

        await expect(deleteAdminQuest("q1")).rejects.toThrow(/ผู้รับรางวัลไปแล้ว/);
        expect(mocks.deleteWhereMock).not.toHaveBeenCalled();
    });

    it("deletes a quest nobody has claimed", async () => {
        mocks.findFirstMock.mockResolvedValue(quest());
        mocks.selectRows = [[{ value: 0 }]];

        await deleteAdminQuest("q1");

        expect(mocks.deleteWhereMock).toHaveBeenCalledTimes(1);
    });
});
