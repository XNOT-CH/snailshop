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
const THAI_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Bucket key for the Thai-local bucket starting at UTC instant `t`: the ISO
 * date ("2026-07-11") for daily buckets or date-hour ("2026-07-11T09") for
 * hourly ones. Matches the DATE_FORMAT patterns used by the dashboard
 * aggregation queries (e.g. the revenue and gacha-summary routes).
 */
export const bucketKey = (t: number, hourly: boolean) =>
    new Date(t + THAI_UTC_OFFSET_MS).toISOString().slice(0, hourly ? 13 : 10);

/**
 * Parse a "YYYY-MM-DD" query param as a Thai calendar date and return the UTC
 * instant of that Thai midnight; null for missing, malformed, or rolled-over
 * dates (e.g. 2026-02-31).
 */
export function parseThaiDateParam(value: string | null): Date | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const utcMidnight = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(utcMidnight.getTime()) || utcMidnight.toISOString().slice(0, 10) !== value) return null;
    return new Date(utcMidnight.getTime() - THAI_UTC_OFFSET_MS);
}

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
