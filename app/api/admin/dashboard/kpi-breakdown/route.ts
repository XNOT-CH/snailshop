import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { KPI_RANGE_DAYS, bucketKey, getKpiPeriodBounds, type ComparableKpiRange } from "@/lib/features/dashboard/kpiPeriods";
import { loadBucketMetrics } from "@/lib/features/dashboard/kpiBucketMetrics";

export const dynamic = "force-dynamic";

const COMPARABLE_RANGES: ComparableKpiRange[] = ["today", "7d", "30d"];

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const requested = request.nextUrl.searchParams.get("range");
    const range: ComparableKpiRange = COMPARABLE_RANGES.includes(requested as ComparableKpiRange)
        ? (requested as ComparableKpiRange)
        : "7d";

    try {
        const { currentStart, currentEnd, previousStart, previousEnd } = getKpiPeriodBounds(range);
        const hourly = range === "today";
        const bucketMs = hourly ? HOUR_MS : DAY_MS;
        const shift = KPI_RANGE_DAYS[range] * DAY_MS;
        const bucketCount = hourly
            ? Math.floor((currentEnd.getTime() - currentStart.getTime()) / HOUR_MS) + 1
            : KPI_RANGE_DAYS[range];

        const [currentMetrics, previousMetrics] = await Promise.all([
            loadBucketMetrics(currentStart, currentEnd, hourly),
            loadBucketMetrics(previousStart, previousEnd, hourly),
        ]);

        const points = Array.from({ length: bucketCount }, (_, i) => {
            const currentBucketStart = currentStart.getTime() + i * bucketMs;
            const date = bucketKey(currentBucketStart, hourly);
            const previousDate = bucketKey(currentBucketStart - shift, hourly);
            return {
                date,
                previousDate,
                current: currentMetrics(date),
                previous: previousMetrics(previousDate),
            };
        });

        return NextResponse.json({ success: true, range, granularity: hourly ? "hour" : "day", points });
    } catch (error) {
        console.error("[ADMIN_DASHBOARD_KPI_BREAKDOWN]", error);
        return NextResponse.json({ success: false, message: "Failed to load KPI breakdown" }, { status: 500 });
    }
}
