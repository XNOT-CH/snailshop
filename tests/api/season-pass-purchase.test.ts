import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
    db: {
        query: {
            users: { findFirst: vi.fn() },
        },
        $client: { getConnection: vi.fn() },
    },
    users: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

vi.mock("@/lib/seasonPass", () => ({
    getCurrentSeasonPassSubscription: vi.fn(),
    getOrCreateSeasonPassPlan: vi.fn(),
    getSeasonPassExtensionEndAt: vi.fn(() => "2026-06-01 00:00:00"),
    getSeasonPassInitialEndAt: vi.fn(() => "2026-05-01 00:00:00"),
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
    getCurrentSeasonPassSubscription,
    getOrCreateSeasonPassPlan,
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

describe("API: /api/season-pass/purchase (POST)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it("rejects purchases when the season pass plan is inactive", async () => {
        (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "u1" } });
        (getOrCreateSeasonPassPlan as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "plan-1",
            price: "50.00",
            durationDays: 30,
            isActive: false,
        });

        const { POST } = await import("@/app/api/season-pass/purchase/route");
        const res = await POST();

        expect(res.status).toBe(403);
        expect(await res.json()).toMatchObject({
            success: false,
            message: "Season Pass ถูกปิดการขายชั่วคราว",
        });
    });

    it("queues a new subscription instead of extending the current active row", async () => {
        (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "u1" } });
        (getOrCreateSeasonPassPlan as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "plan-1",
            price: "50.00",
            durationDays: 30,
            isActive: true,
        });
        (db.query.users.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "u1",
            creditBalance: "200.00",
        });
        (getCurrentSeasonPassSubscription as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "active-1",
            endAt: "2026-05-01 00:00:00",
        });

        const conn = mkConn([
            [[{ id: "u1", creditBalance: "200.00" }]],
            [{ affectedRows: 0 }],
            [{ affectedRows: 0 }],
            [[{ id: "active-1", startAt: "2026-04-01 00:00:00", endAt: "2026-05-01 00:00:00", status: "ACTIVE" }]],
            [{ affectedRows: 1 }],
            [{ affectedRows: 1 }],
        ]);
        (db.$client.getConnection as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(conn);

        const { POST } = await import("@/app/api/season-pass/purchase/route");
        const res = await POST();
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toMatchObject({
            success: true,
            queued: true,
            startsAt: "2026-05-01 00:00:00",
            endAt: "2026-06-01 00:00:00",
        });

        expect(conn.execute).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO SeasonPassSubscription"),
            expect.arrayContaining(["u1", "plan-1", "2026-05-01 00:00:00", "2026-06-01 00:00:00"]),
        );
        expect(conn.execute).not.toHaveBeenCalledWith(
            expect.stringContaining("UPDATE SeasonPassSubscription SET endAt = ?"),
            expect.anything(),
        );
    });

    it("creates an active subscription immediately for a first-time purchase", async () => {
        (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "u1" } });
        (getOrCreateSeasonPassPlan as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "plan-1",
            price: "50.00",
            durationDays: 30,
            isActive: true,
        });
        (db.query.users.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "u1",
            creditBalance: "200.00",
        });
        (getCurrentSeasonPassSubscription as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "active-1",
            endAt: "2026-05-01 00:00:00",
        });

        const conn = mkConn([
            [[{ id: "u1", creditBalance: "200.00" }]],
            [{ affectedRows: 0 }],
            [{ affectedRows: 0 }],
            [[]],
            [{ affectedRows: 1 }],
            [{ affectedRows: 1 }],
        ]);
        (db.$client.getConnection as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(conn);

        const { POST } = await import("@/app/api/season-pass/purchase/route");
        const res = await POST();
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toMatchObject({
            success: true,
            queued: false,
            endAt: "2026-05-01 00:00:00",
        });
        expect(conn.execute).toHaveBeenCalledWith(
            expect.stringContaining("VALUES (?, ?, ?, 'ACTIVE', UTC_TIMESTAMP(), ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())"),
            expect.arrayContaining(["u1", "plan-1", "2026-05-01 00:00:00"]),
        );
    });
});
