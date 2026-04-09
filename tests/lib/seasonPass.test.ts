import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
    db: {},
    seasonPassClaims: {},
    seasonPassPlans: {},
    seasonPassRewards: {},
    seasonPassSubscriptions: {},
}));

import { buildSeasonPassBoard, getSeasonPassRewardByDay } from "@/lib/seasonPass";

describe("lib/seasonPass", () => {
    it("builds board statuses from current day and claims", () => {
        const board = buildSeasonPassBoard({
            startAt: "2026-04-01 00:00:00",
            durationDays: 30,
            claims: [
                { dayNumber: 1, createdAt: "2026-04-01 00:10:00" },
                { dayNumber: 2, createdAt: "2026-04-02 00:10:00" },
                { dayNumber: 3, createdAt: "2026-04-03 00:10:00" },
                { dayNumber: 4, createdAt: "2026-04-04 00:10:00" },
            ] as never,
            now: new Date("2026-04-06T05:00:00Z"),
        });

        expect(board.currentDay).toBe(6);
        expect(board.claimedCount).toBe(4);
        expect(board.missedCount).toBe(1);
        expect(board.board[4]?.status).toBe("missed");
        expect(board.board[5]?.status).toBe("today");
        expect(board.board[6]?.status).toBe("locked");
    });

    it("marks skipped days as missed and unlocks the current day only", () => {
        const board = buildSeasonPassBoard({
            startAt: "2026-04-01 00:00:00",
            durationDays: 30,
            claims: [
                { dayNumber: 1, createdAt: "2026-04-01 00:10:00" },
            ] as never,
            now: new Date("2026-04-04T05:00:00Z"),
        });

        expect(board.currentDay).toBe(4);
        expect(board.claimedCount).toBe(1);
        expect(board.missedCount).toBe(2);
        expect(board.remainingCount).toBe(27);
        expect(board.board[0]?.status).toBe("claimed");
        expect(board.board[1]?.status).toBe("missed");
        expect(board.board[2]?.status).toBe("missed");
        expect(board.board[3]?.status).toBe("today");
    });

    it("returns reward definition for a given day", async () => {
        const reward = await getSeasonPassRewardByDay(30, "mock-plan-id");

        expect(reward).toMatchObject({
            day: 30,
            type: "tickets",
            label: "ตั๋วสุ่ม",
        });
    });
});
