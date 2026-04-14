export type ProductCurrencyCode = "THB" | "POINT";

export interface PublicCurrencySettings {
  id: string;
  name: string;
  symbol: string;
  code: "POINT";
  description: string | null;
  isActive: boolean;
}

export const DEFAULT_CURRENCY_SETTINGS: PublicCurrencySettings = {
  id: "default",
  name: "พอยท์",
  symbol: "💎",
  code: "POINT",
  description: null,
  isActive: true,
};

function formatNumericAmount(value: number, currency: ProductCurrencyCode) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  if (currency === "POINT") {
    return Math.round(value).toLocaleString();
  }

  const hasDecimals = Math.round(value * 100) % 100 !== 0;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function normalizeCurrencyCode(value?: string | null): ProductCurrencyCode {
  return value === "POINT" ? "POINT" : "THB";
}

export function normalizeCurrencySettings(
  settings?: Partial<PublicCurrencySettings> | null,
): PublicCurrencySettings {
  return {
    id: settings?.id || DEFAULT_CURRENCY_SETTINGS.id,
    name: settings?.name?.trim() || DEFAULT_CURRENCY_SETTINGS.name,
    symbol: settings?.symbol?.trim() || DEFAULT_CURRENCY_SETTINGS.symbol,
    code: "POINT",
    description: settings?.description?.trim() || null,
    isActive: settings?.isActive ?? DEFAULT_CURRENCY_SETTINGS.isActive,
  };
}

export function getPointCurrencyName(
  settings?: Partial<PublicCurrencySettings> | null,
) {
  return normalizeCurrencySettings(settings).name;
}

export function getPointCurrencySymbol(
  settings?: Partial<PublicCurrencySettings> | null,
) {
  return normalizeCurrencySettings(settings).symbol;
}

export function getCurrencyDisplayName(
  currency: string | null | undefined,
  settings?: Partial<PublicCurrencySettings> | null,
) {
  const normalizedCurrency = normalizeCurrencyCode(currency);
  if (normalizedCurrency === "POINT") {
    return getPointCurrencyName(settings);
  }

  return "บาท";
}

export function formatCurrencyAmount(
  amount: number,
  currency: string | null | undefined,
  settings?: Partial<PublicCurrencySettings> | null,
  options?: {
    withName?: boolean;
    withSymbol?: boolean;
  },
) {
  const normalizedCurrency = normalizeCurrencyCode(currency);
  const normalizedSettings = normalizeCurrencySettings(settings);
  const withName = options?.withName ?? true;
  const withSymbol = options?.withSymbol ?? true;

  if (normalizedCurrency === "THB") {
    return `฿${formatNumericAmount(amount, "THB")}`;
  }

  const segments: string[] = [];

  if (withSymbol) {
    segments.push(normalizedSettings.symbol);
  }

  segments.push(formatNumericAmount(amount, "POINT"));

  if (withName) {
    segments.push(normalizedSettings.name);
  }

  return segments.join(" ");
}

export function buildCurrencyBreakdownLabel(
  totals: Partial<Record<ProductCurrencyCode, number>>,
  settings?: Partial<PublicCurrencySettings> | null,
) {
  const parts: string[] = [];
  const thbTotal = Number(totals.THB ?? 0);
  const pointTotal = Number(totals.POINT ?? 0);

  if (thbTotal > 0) {
    parts.push(formatCurrencyAmount(thbTotal, "THB", settings));
  }

  if (pointTotal > 0) {
    parts.push(formatCurrencyAmount(pointTotal, "POINT", settings));
  }

  return parts.length > 0 ? parts.join(" + ") : formatCurrencyAmount(0, "THB", settings);
}
