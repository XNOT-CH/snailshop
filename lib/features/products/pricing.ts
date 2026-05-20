export type DiscountMode = "amount" | "percent";

export function normalizeMoney(value: number, currency: string) {
    if (!Number.isFinite(value)) return 0;
    return currency === "POINT" ? Math.round(value) : Math.round(value * 100) / 100;
}

export function formatDiscountValue(value: number, currency: string) {
    return currency === "POINT" ? value.toLocaleString() : value.toFixed(2);
}

export function getCalculatedDiscountPrice(
    hasDiscountPrice: boolean,
    isDiscountValueValid: boolean,
    priceNumber: number,
    discountInputNumber: number,
    discountMode: DiscountMode,
    currency: string,
) {
    if (
        !hasDiscountPrice
        || !isDiscountValueValid
        || !Number.isFinite(priceNumber)
        || priceNumber <= 0
        || !Number.isFinite(discountInputNumber)
    ) {
        return null;
    }

    if (discountMode === "percent") {
        return normalizeMoney(priceNumber - (priceNumber * discountInputNumber) / 100, currency);
    }

    return normalizeMoney(priceNumber - discountInputNumber, currency);
}

export function getNormalizedDiscountPrice(calculatedDiscountPrice: number | null) {
    if (calculatedDiscountPrice !== null && calculatedDiscountPrice > 0) {
        return calculatedDiscountPrice;
    }

    return null;
}

export function getDiscountPlaceholder(discountMode: DiscountMode) {
    if (discountMode === "percent") {
        return "เช่น 15";
    }

    return "เช่น 100";
}

export function getDiscountValueValidationMessage(discountMode: DiscountMode) {
    return discountMode === "percent"
        ? "กรุณากรอกเปอร์เซ็นส่วนลดให้ถูกต้อง"
        : "กรุณากรอกจำนวนส่วนลดให้ถูกต้อง";
}

export const getDiscountInputErrorMessage = getDiscountValueValidationMessage;

export function getPriceInputPlaceholder(currency: string) {
    return currency === "POINT" ? "เช่น 100" : "เช่น 1500";
}

export function getPriceInputStep(currency: string) {
    return currency === "POINT" ? "1" : "0.01";
}

export function getDiscountAmountButtonLabel(currency: string, pointCurrencyName: string) {
    return `ลดเป็น${currency === "POINT" ? pointCurrencyName : "บาท"}`;
}

export function getDiscountInputStep(discountMode: DiscountMode, currency: string) {
    if (discountMode === "percent") {
        return "0.01";
    }

    return currency === "POINT" ? "1" : "0.01";
}

export function getDiscountHint(discountMode: DiscountMode, currency: string, pointCurrencyName: string) {
    if (discountMode === "percent") {
        return "กรอกเปอร์เซ็นที่ต้องการลด";
    }

    return `กรอกจำนวน${currency === "POINT" ? pointCurrencyName : "บาท"}ที่ต้องการลด`;
}

export function getDiscountHelperText(discountMode: DiscountMode, isPointCurrency: boolean, pointCurrencyName: string) {
    return getDiscountHint(discountMode, isPointCurrency ? "POINT" : "THB", pointCurrencyName);
}

export function getDiscountErrorText(discountMode: DiscountMode) {
    return discountMode === "percent"
        ? "เปอร์เซ็นต์ต้องน้อยกว่า 100%"
        : "จำนวนส่วนลดต้องน้อยกว่าราคาเต็ม";
}

export const getDiscountValidationText = getDiscountErrorText;

export function getDiscountSummaryUnit(
    discountMode: DiscountMode,
    isPointCurrency: boolean,
    pointCurrencyName: string,
) {
    if (discountMode === "percent") {
        return "%";
    }

    return isPointCurrency ? ` ${pointCurrencyName}` : " บาท";
}

export function getDiscountSummaryText(
    discountMode: DiscountMode,
    isPointCurrency: boolean,
    pointCurrencyName: string,
    discountInputNumber: number,
    currency: string,
    normalizedDiscountPrice: number,
) {
    const unit = getDiscountSummaryUnit(discountMode, isPointCurrency, pointCurrencyName);
    return `ลด ${formatDiscountValue(discountInputNumber, currency)}${unit} เหลือ ${formatDiscountValue(normalizedDiscountPrice, currency)}`;
}

export function getDiscountSummary(
    discountMode: DiscountMode,
    currency: string,
    pointCurrencyName: string,
    discountInputNumber: number,
    normalizedDiscountPrice: number,
) {
    return getDiscountSummaryText(
        discountMode,
        currency === "POINT",
        pointCurrencyName,
        discountInputNumber,
        currency,
        normalizedDiscountPrice,
    );
}

export function getFetchedDiscountAmount(
    priceNumber: number,
    discountPriceNumber: number | null,
    currency: string,
) {
    if (
        discountPriceNumber === null
        || !Number.isFinite(priceNumber)
        || !Number.isFinite(discountPriceNumber)
        || discountPriceNumber >= priceNumber
    ) {
        return null;
    }

    return normalizeMoney(priceNumber - discountPriceNumber, currency);
}

export function getDiscountMessage(options: {
    hasDiscountPrice: boolean;
    isDiscountValueValid: boolean;
    normalizedDiscountPrice: number | null;
    discountMode: DiscountMode;
    isPointCurrency: boolean;
    pointCurrencyName: string;
    discountInputNumber: number;
    currency: string;
}) {
    const {
        currency,
        discountInputNumber,
        discountMode,
        hasDiscountPrice,
        isDiscountValueValid,
        isPointCurrency,
        normalizedDiscountPrice,
        pointCurrencyName,
    } = options;

    if (!hasDiscountPrice) {
        return null;
    }

    if (!isDiscountValueValid) {
        return {
            className: "font-medium text-rose-600",
            text: getDiscountValidationText(discountMode),
        };
    }

    if (normalizedDiscountPrice === null) {
        return null;
    }

    return {
        className: "font-medium text-rose-700",
        text: getDiscountSummaryText(
            discountMode,
            isPointCurrency,
            pointCurrencyName,
            discountInputNumber,
            currency,
            normalizedDiscountPrice,
        ),
    };
}
