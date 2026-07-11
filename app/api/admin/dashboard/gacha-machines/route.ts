import { NextRequest, NextResponse } from "next/server";
import { count, countDistinct, eq, gte, sql } from "drizzle-orm";
import { db, gachaMachines, gachaRewards, gachaRollLogs, products } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { toMySQLDatetime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const ALLOWED_DAYS = [7, 30, 90];

/** Rolls with no machine id came from the legacy single-machine settings. */
const DEFAULT_MACHINE_KEY = "__default__";

// Reward value paid out per roll: the snapshot when present (rows since
// 2026-07-11), otherwise the rewarded product's current sale price — an
// approximation for older rows, hence "RTP โดยประมาณ" in the UI.
const payoutValue = sql`COALESCE(${gachaRollLogs.rewardValue}, COALESCE(${products.discountPrice}, ${products.price}), 0)`;

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const requested = Number.parseInt(request.nextUrl.searchParams.get("days") ?? "30", 10);
    const days = ALLOWED_DAYS.includes(requested) ? requested : 30;

    try {
        const rangeCondition = gte(gachaRollLogs.createdAt, toMySQLDatetime(new Date(Date.now() - days * DAY_MS)));

        const [machineRows, statRows, tierRows, expectedRows] = await Promise.all([
            db
                .select({
                    id: gachaMachines.id,
                    name: gachaMachines.name,
                    isActive: gachaMachines.isActive,
                    isEnabled: gachaMachines.isEnabled,
                })
                .from(gachaMachines),
            db
                .select({
                    machineId: gachaRollLogs.gachaMachineId,
                    rolls: count(),
                    revenue: sql<string>`COALESCE(SUM(${gachaRollLogs.costAmount}), 0)`,
                    payout: sql<string>`COALESCE(SUM(${payoutValue}), 0)`,
                    players: countDistinct(gachaRollLogs.userId),
                })
                .from(gachaRollLogs)
                .leftJoin(products, eq(gachaRollLogs.productId, products.id))
                .where(rangeCondition)
                .groupBy(gachaRollLogs.gachaMachineId),
            db
                .select({
                    machineId: gachaRollLogs.gachaMachineId,
                    tier: gachaRollLogs.tier,
                    rolls: count(),
                })
                .from(gachaRollLogs)
                .where(rangeCondition)
                .groupBy(gachaRollLogs.gachaMachineId, gachaRollLogs.tier),
            db
                .select({
                    machineId: gachaRewards.gachaMachineId,
                    tier: gachaRewards.tier,
                    probability: sql<string>`COALESCE(SUM(${gachaRewards.probability}), 0)`,
                })
                .from(gachaRewards)
                .where(eq(gachaRewards.isActive, true))
                .groupBy(gachaRewards.gachaMachineId, gachaRewards.tier),
        ]);

        const machineNames = new Map(machineRows.map((m) => [m.id, m]));
        const keyOf = (machineId: string | null) => machineId ?? DEFAULT_MACHINE_KEY;

        // Expected tier share = this tier's active probability mass / machine total.
        const expectedByMachine = new Map<string, Map<string, number>>();
        for (const row of expectedRows) {
            const key = keyOf(row.machineId);
            const perTier = expectedByMachine.get(key) ?? new Map<string, number>();
            perTier.set(row.tier, Number(row.probability));
            expectedByMachine.set(key, perTier);
        }

        const actualByMachine = new Map<string, Map<string, number>>();
        for (const row of tierRows) {
            const key = keyOf(row.machineId);
            const perTier = actualByMachine.get(key) ?? new Map<string, number>();
            perTier.set(row.tier, Number(row.rolls));
            actualByMachine.set(key, perTier);
        }

        const machines = statRows
            .map((row) => {
                const key = keyOf(row.machineId);
                const machine = row.machineId ? machineNames.get(row.machineId) : undefined;
                const rolls = Number(row.rolls);
                const revenue = Number(row.revenue);
                const payout = Number(row.payout);

                const expected = expectedByMachine.get(key) ?? new Map<string, number>();
                const actual = actualByMachine.get(key) ?? new Map<string, number>();
                const expectedTotal = Array.from(expected.values()).reduce((acc, v) => acc + v, 0);
                const tierKeys = Array.from(new Set([...expected.keys(), ...actual.keys()]));
                const tiers = tierKeys.map((tier) => ({
                    tier,
                    actualPct: rolls > 0 ? ((actual.get(tier) ?? 0) / rolls) * 100 : 0,
                    expectedPct: expectedTotal > 0 ? ((expected.get(tier) ?? 0) / expectedTotal) * 100 : null,
                    count: actual.get(tier) ?? 0,
                }));

                return {
                    machineId: row.machineId,
                    name: machine?.name ?? "ตู้เริ่มต้น (ไม่ระบุตู้)",
                    isActive: machine?.isActive ?? true,
                    isEnabled: machine?.isEnabled ?? true,
                    rolls,
                    revenue,
                    payout,
                    rtp: revenue > 0 ? (payout / revenue) * 100 : null,
                    players: Number(row.players),
                    tiers,
                };
            })
            .sort((a, b) => b.rolls - a.rolls);

        return NextResponse.json({ success: true, days, machines });
    } catch (error) {
        console.error("[ADMIN_DASHBOARD_GACHA_MACHINES]", error);
        return NextResponse.json({ success: false, message: "Failed to load gacha machines" }, { status: 500 });
    }
}
