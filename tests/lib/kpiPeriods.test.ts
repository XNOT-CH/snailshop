import { describe, expect, it } from "vitest";
import { getKpiPeriodBounds, KPI_RANGE_DAYS } from "@/lib/features/dashboard/kpiPeriods";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("lib/features/dashboard/kpiPeriods", () => {
    // 2026-07-11 10:30 Thai time (UTC+7) = 03:30 UTC.
    const now = new Date("2026-07-11T03:30:00Z");
    const thaiDayStart = new Date("2026-07-10T17:00:00Z"); // 2026-07-11 00:00 Thai time

    it("today: current window is Thai midnight → now, previous is same slice of yesterday", () => {
        const bounds = getKpiPeriodBounds("today", now);
        expect(bounds.currentStart).toEqual(thaiDayStart);
        expect(bounds.currentEnd).toEqual(now);
        expect(bounds.previousStart).toEqual(new Date(thaiDayStart.getTime() - DAY_MS));
        expect(bounds.previousEnd).toEqual(new Date(now.getTime() - DAY_MS));
    });

    it("7d/30d: both windows span N days and previous is cut at the same time of day", () => {
        for (const range of ["7d", "30d"] as const) {
            const days = KPI_RANGE_DAYS[range];
            const bounds = getKpiPeriodBounds(range, now);

            expect(bounds.currentStart).toEqual(new Date(thaiDayStart.getTime() - (days - 1) * DAY_MS));
            expect(bounds.currentEnd).toEqual(now);
            expect(bounds.previousStart.getTime()).toBe(bounds.currentStart.getTime() - days * DAY_MS);
            expect(bounds.previousEnd.getTime()).toBe(now.getTime() - days * DAY_MS);
            expect(bounds.previousEnd.getTime() - bounds.previousStart.getTime()).toBe(
                bounds.currentEnd.getTime() - bounds.currentStart.getTime(),
            );
        }
    });
});
