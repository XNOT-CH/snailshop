import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/**
 * % change of `current` vs `baseline` with an up/down arrow; renders "—" when
 * the baseline is zero (no meaningful percentage).
 */
export function DeltaBadge({ current, baseline }: Readonly<{ current: number; baseline: number }>) {
    if (baseline === 0) {
        return <span className="text-xs text-muted-foreground">—</span>;
    }
    const pct = ((current - baseline) / Math.abs(baseline)) * 100;
    const isUp = pct >= 0;
    const Arrow = isUp ? ArrowUpRight : ArrowDownRight;
    return (
        <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            }`}
        >
            <Arrow className="h-3.5 w-3.5" />
            {Math.abs(pct).toLocaleString("th-TH", { maximumFractionDigits: 1 })}%
        </span>
    );
}
