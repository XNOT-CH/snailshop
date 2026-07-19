"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Client wrapper so the server-rendered dashboard page can defer this
// recharts-heavy section (ssr:false is not allowed directly in server files).
export const ComparisonSection = dynamic(
    () => import("@/components/admin/ComparisonSection").then((mod) => mod.ComparisonSection),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center rounded-2xl border border-border/80 bg-card/95" style={{ height: 280 }}>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        ),
    },
);
