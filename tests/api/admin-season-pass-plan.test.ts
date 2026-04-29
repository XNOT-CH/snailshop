import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ requirePermission: vi.fn() }));

vi.mock("@/lib/db", () => ({
    db: {
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn().mockResolvedValue(undefined),
            })),
        })),
        query: {
            seasonPassPlans: { findFirst: vi.fn() },
        },
    },
    seasonPassPlans: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));

vi.mock("@/lib/seasonPass", () => ({
    getOrCreateSeasonPassPlan: vi.fn(),
}));

import { requirePermission } from "@/lib/auth";
import { getOrCreateSeasonPassPlan } from "@/lib/seasonPass";

describe("API: /api/admin/season-pass/plan (PUT)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it("rejects durations other than the fixed 30-day reward board", async () => {
        (requirePermission as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
        (getOrCreateSeasonPassPlan as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "plan-1",
            durationDays: 30,
        });

        const { PUT } = await import("@/app/api/admin/season-pass/plan/route");
        const req = new NextRequest("http://localhost/api/admin/season-pass/plan", {
            method: "PUT",
            body: JSON.stringify({
                name: "Season Pass 30 วัน",
                price: "50.00",
                durationDays: 60,
                isActive: true,
            }),
        });
        const res = await PUT(req);
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error).toContain("fixed 30-day reward board");
    });
});
