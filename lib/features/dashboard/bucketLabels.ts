export type BucketGranularity = "hour" | "day";

/** "2026-07-11" → "11 ก.ค." ; "2026-07-11T09" → "09:00" (chart axis / table rows). */
export function formatBucketLabel(key: string, granularity: BucketGranularity, withYear = false): string {
    if (granularity === "hour") {
        return `${key.slice(11, 13)}:00`;
    }
    return new Date(`${key}T00:00:00Z`).toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "short",
        ...(withYear ? { year: "2-digit" } : {}),
        timeZone: "UTC",
    });
}
