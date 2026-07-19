"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// recharts is ~120KB gzipped; defer it until a donut actually renders so the
// dashboard shell (KPI cards, tables) paints without waiting on the chart lib.
export const DonutChart = dynamic(
    () => import("@/components/admin/DonutChart").then((mod) => mod.DonutChart),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center" style={{ height: 260 }}>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        ),
    },
);
