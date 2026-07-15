import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/**
 * Absolute change of `current` vs `baseline` with an up/down arrow (e.g. "+3",
 * "฿1,200"); renders "—" when nothing changed. Pass `format` to add units.
 */
export function DeltaBadge({
    current,
    baseline,
    format = (value: number) => value.toLocaleString("th-TH", { maximumFractionDigits: 1 }),
}: Readonly<{ current: number; baseline: number; format?: (value: number) => string }>) {
    const diff = current - baseline;
    if (diff === 0) {
        return <span className="text-xs text-muted-foreground">—</span>;
    }
    const isUp = diff > 0;
    const Arrow = isUp ? ArrowUpRight : ArrowDownRight;
    return (
        <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            }`}
        >
            <Arrow className="h-3.5 w-3.5" />
            {isUp ? "+" : "−"}
            {format(Math.abs(diff))}
        </span>
    );
}
