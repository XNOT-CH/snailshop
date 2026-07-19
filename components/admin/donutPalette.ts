// Fixed hue order per slice position; validated for CVD separation and the
// per-mode lightness band against the card surface (light #fff / dark #142033).
// Lives apart from DonutChart so legends/tables can color-match slices without
// statically pulling recharts into their chunk (DonutChart is lazy-loaded).
export const DONUT_SLICE_HUES = ["var(--pie-1)", "var(--pie-2)", "var(--pie-3)", "var(--pie-4)"];
export const DONUT_OTHER_COLOR = "var(--pie-other)";
