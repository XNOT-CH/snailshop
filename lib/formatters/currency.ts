export function formatBaht(value: number) {
    return `฿${value.toLocaleString()}`;
}

export function formatLocalizedAmount(
    value: string | number | null | undefined,
    locale = "th-TH",
    options: Intl.NumberFormatOptions = {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    },
) {
    const numeric = Number(value || 0);
    if (Number.isNaN(numeric)) return "0";
    return numeric.toLocaleString(locale, options);
}

export function formatCompactBaht(value: number) {
    if (value >= 1_000_000) return `฿${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `฿${(value / 1_000).toFixed(0)}k`;
    return `฿${value}`;
}
