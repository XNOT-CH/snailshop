export interface AutoDeletePreset {
    label: string;
    value: string;
}

export const AUTO_DELETE_PRESETS: AutoDeletePreset[] = [
    { label: "30 นาที", value: "30" },
    { label: "1 ชม.", value: "60" },
    { label: "6 ชม.", value: "360" },
    { label: "12 ชม.", value: "720" },
    { label: "1 วัน", value: "1440" },
    { label: "3 วัน", value: "4320" },
    { label: "7 วัน", value: "10080" },
];

/** Turns the stored minute count into the wording used on the product forms. */
export function formatAutoDeleteSummary(autoDeleteAfterSale: string): string | null {
    if (!autoDeleteAfterSale) return null;

    const minutes = Number(autoDeleteAfterSale);
    if (!Number.isFinite(minutes) || minutes <= 0) return null;

    if (minutes >= 1440) return `${(minutes / 1440).toFixed(1)} วัน`;
    if (minutes >= 60) return `${(minutes / 60).toFixed(1)} ชั่วโมง`;

    return `${minutes} นาที`;
}

/** What the create/edit forms send for autoDeleteAfterSale. null means "off". */
export function getAutoDeleteAfterSaleValue(enabled: boolean, autoDeleteAfterSale: string): number | null {
    if (!enabled || !autoDeleteAfterSale) return null;

    const minutes = Number(autoDeleteAfterSale);
    if (!Number.isFinite(minutes) || minutes <= 0) return null;

    return minutes;
}
