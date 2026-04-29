import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
    db: {
        $client: { getConnection: vi.fn() },
    },
}));

vi.mock("@/lib/seasonPass", () => ({
    buildSeasonPassBoard: vi.fn(),
    getCurrentSeasonPassSubscription: vi.fn(),
    getOrCreateSeasonPassPlan: vi.fn(),
    getSeasonPassRewardByDay: vi.fn(),
    getSeasonPassRewardCatalog: vi.fn(),
}));

vi.mock("@/lib/seasonPassObservability", () => ({
    auditSeasonPassClaim: vi.fn(),
    auditSeasonPassPurchase: vi.fn(),
    auditSeasonPassQueueActivation: vi.fn(),
    logSeasonPassEvent: vi.fn(),
}));

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
    buildSeasonPassBoard,
    getCurrentSeasonPassSubscription,
    getOrCreateSeasonPassPlan,
    getSeasonPassRewardByDay,
    getSeasonPassRewardCatalog,
} from "@/lib/seasonPass";

function mkConn(executeResults: unknown[]) {
    const conn = {
        beginTransaction: vi.fn().mockResolvedValue(undefined),
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
        release: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn(),
    };

    for (const result of executeResults) {
        conn.execute.mockResolvedValueOnce(result);
    }

    return conn;
}

describe("API: /api/season-pass/claim (POST)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it("returns 403 when there is no active subscription", async () => {
        (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "u1", role: "USER" } });
        (getOrCreateSeasonPassPlan as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "plan-1",
            durationDays: 30,
        });
        (getSeasonPassRewardCatalog as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
        (getCurrentSeasonPassSubscription as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const { POST } = await import("@/app/api/season-pass/claim/route");
        const res = await POST(new NextRequest("http://localhost/api/season-pass/claim", { method: "POST" }));

        expect(res.status).toBe(403);
        expect(await res.json()).toMatchObject({
            success: false,
            message: "ยังไม่มี Season Pass ที่ใช้งานอยู่",
        });
    });

    it("claims today's reward through the transaction service", async () => {
        (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "u1", role: "USER" } });
        (getOrCreateSeasonPassPlan as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "plan-1",
            durationDays: 30,
        });
        (getSeasonPassRewardCatalog as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ day: 5, type: "credits", amount: "80", label: "เครดิต" }]);
        (getCurrentSeasonPassSubscription as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "sub-1",
            startAt: "2026-04-24 00:00:00",
            endAt: "2026-05-24 00:00:00",
        });
        (buildSeasonPassBoard as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            currentDay: 5,
        });
        (getSeasonPassRewardByDay as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            type: "credits",
            label: "เครดิต",
            amount: "80",
            creditReward: 80,
            pointReward: null,
            highlight: false,
        });

        const conn = mkConn([
            [{ affectedRows: 0 }],
            [{ affectedRows: 0 }],
            [[{ id: "sub-1", startAt: "2026-04-24 00:00:00" }]],
            [[]],
            [{ affectedRows: 1 }],
            [{ affectedRows: 1 }],
        ]);
        (db.$client.getConnection as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(conn);

        const { POST } = await import("@/app/api/season-pass/claim/route");
        const res = await POST(new NextRequest("http://localhost/api/season-pass/claim", { method: "POST" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toMatchObject({
            success: true,
            dayNumber: 5,
            rewardLabel: "เครดิต",
            rewardAmount: "80",
        });
    });
});
