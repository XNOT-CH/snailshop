"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Client wrapper so the server-rendered dashboard page can defer this
// recharts-heavy tab until it actually mounts.
export const MembersSummary = dynamic(
    () => import("@/components/MembersSummary").then((mod) => mod.MembersSummary),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center" style={{ height: 320 }}>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        ),
    },
);
