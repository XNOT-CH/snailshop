import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { bucketKey, parseThaiDateParam } from "@/lib/features/dashboard/kpiPeriods";
import { loadBucketMetrics, type BucketMetrics } from "@/lib/features/dashboard/kpiBucketMetrics";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MAX_SPAN_DAYS = 366;

type Period = { start: Date; endExclusive: Date; days: number };

/** Parse an inclusive Thai-calendar-date period from `<prefix>Start`/`<prefix>End` params. */
function parsePeriodParams(params: URLSearchParams, prefix: string): Period | null {
    const start = parseThaiDateParam(params.get(`${prefix}Start`));
    const end = parseThaiDateParam(params.get(`${prefix}End`));
    if (!start || !end) return null;

    const days = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
    if (days < 1 || days > MAX_SPAN_DAYS) return null;

    return { start, endExclusive: new Date(end.getTime() + DAY_MS), days };
}

async function loadPeriod(period: Period, hourly: boolean) {
    const metricsAt = await loadBucketMetrics(period.start, period.endExclusive, hourly);
    const bucketMs = hourly ? HOUR_MS : DAY_MS;
    const bucketCount = hourly ? period.days * 24 : period.days;

    const points = Array.from({ length: bucketCount }, (_, i) => {
        const key = bucketKey(period.start.getTime() + i * bucketMs, hourly);
        return { date: key, ...metricsAt(key) };
    });

    const revenue = points.reduce((acc, p) => acc + p.revenue, 0);
    const orders = points.reduce((acc, p) => acc + p.orders, 0);
    const topup = points.reduce((acc, p) => acc + p.topup, 0);
    const seasonPassRevenue = points.reduce((acc, p) => acc + p.seasonPassRevenue, 0);
    const totals: BucketMetrics = {
        revenue,
        orders,
        aov: orders > 0 ? revenue / orders : 0,
        topup,
        netInflow: topup - revenue,
        seasonPassRevenue,
    };

    return { points, totals };
}

export async function GET(request: NextRequest) {
    const authCheck = await requirePermission(PERMISSIONS.DASHBOARD_VIEW);
    if (!authCheck.success) {
        return NextResponse.json({ success: false, message: authCheck.error ?? "Unauthorized" }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const periodA = parsePeriodParams(params, "a");
    const periodB = parsePeriodParams(params, "b");
    if (!periodA || !periodB) {
        return NextResponse.json(
            { success: false, message: "ช่วงเวลาไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD และไม่เกิน 366 วัน)" },
            { status: 400 },
        );
    }

    try {
        // Hour-level detail only makes sense when both sides are a single day.
        const hourly = periodA.days === 1 && periodB.days === 1;
        const [a, b] = await Promise.all([loadPeriod(periodA, hourly), loadPeriod(periodB, hourly)]);

        return NextResponse.json({ success: true, granularity: hourly ? "hour" : "day", a, b });
    } catch (error) {
        console.error("[ADMIN_DASHBOARD_KPI_COMPARE]", error);
        return NextResponse.json({ success: false, message: "Failed to load KPI comparison" }, { status: 500 });
    }
}
