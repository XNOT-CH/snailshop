import { getThaiDayStartUtc } from "@/lib/utils/date";

export type KpiRange = "today" | "7d" | "30d" | "all";
export type ComparableKpiRange = Exclude<KpiRange, "all">;

export const KPI_RANGES: KpiRange[] = ["today", "7d", "30d", "all"];

export const KPI_RANGE_DAYS: Record<ComparableKpiRange, number> = {
    today: 1,
    "7d": 7,
    "30d": 30,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Current period = the last N Thai calendar days including today, cut at the
 * current moment. Previous period = the same window shifted back N days and
 * cut at the same time of day, so a partial today is compared like-for-like
 * ("yesterday up to this time", not full yesterday).
 */
export function getKpiPeriodBounds(range: ComparableKpiRange, now: Date = new Date()) {
    const days = KPI_RANGE_DAYS[range];
    const todayStart = getThaiDayStartUtc(now);

    const currentStart = new Date(todayStart.getTime() - (days - 1) * DAY_MS);
    const shift = days * DAY_MS;

    return {
        currentStart,
        currentEnd: now,
        previousStart: new Date(currentStart.getTime() - shift),
        previousEnd: new Date(now.getTime() - shift),
    };
}
