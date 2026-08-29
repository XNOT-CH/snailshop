import { describe, expect, it } from "vitest";
import {
    formatDiscountValue,
    getCalculatedDiscountPrice,
    getDiscountAmountButtonLabel,
    getDiscountHint,
    getDiscountInputStep,
    getDiscountPlaceholder,
    getDiscountSummary,
    getDiscountValueValidationMessage,
    getDiscountState,
    getFetchedDiscountAmount,
    getNormalizedDiscountPrice,
    getPriceInputPlaceholder,
    getPriceInputStep,
    normalizeMoney,
} from "@/lib/features/products/pricing";

describe("lib/features/products/pricing", () => {
    it("normalizes money according to currency precision", () => {
        expect(normalizeMoney(123.456, "THB")).toBe(123.46);
        expect(normalizeMoney(123.456, "POINT")).toBe(123);
        expect(normalizeMoney(Number.NaN, "THB")).toBe(0);
    });

    it("formats discount values according to currency", () => {
        expect(formatDiscountValue(12.5, "THB")).toBe("12.50");
        expect(formatDiscountValue(1200, "POINT")).toBe("1,200");
    });

    it("calculates amount and percent discount prices", () => {
        expect(getCalculatedDiscountPrice(true, true, 1000, 150, "amount", "THB")).toBe(850);
        expect(getCalculatedDiscountPrice(true, true, 1000, 15, "percent", "THB")).toBe(850);
        expect(getCalculatedDiscountPrice(true, true, 99.99, 10, "percent", "THB")).toBe(89.99);
        expect(getCalculatedDiscountPrice(true, true, 100, 15.5, "amount", "POINT")).toBe(85);
    });

    it("returns null when discount cannot be calculated", () => {
        expect(getCalculatedDiscountPrice(false, true, 100, 10, "amount", "THB")).toBeNull();
        expect(getCalculatedDiscountPrice(true, false, 100, 10, "amount", "THB")).toBeNull();
        expect(getCalculatedDiscountPrice(true, true, 0, 10, "amount", "THB")).toBeNull();
        expect(getCalculatedDiscountPrice(true, true, 100, Number.NaN, "amount", "THB")).toBeNull();
    });

    it("normalizes calculated discount prices for submit payloads", () => {
        expect(getNormalizedDiscountPrice(0)).toBeNull();
        expect(getNormalizedDiscountPrice(-1)).toBeNull();
        expect(getNormalizedDiscountPrice(null)).toBeNull();
        expect(getNormalizedDiscountPrice(20)).toBe(20);
    });

    it("builds UI copy and input settings without page-local helpers", () => {
        expect(getDiscountPlaceholder("percent")).toBe("เช่น 15");
        expect(getDiscountPlaceholder("amount")).toBe("เช่น 100");
        expect(getPriceInputPlaceholder("POINT")).toBe("เช่น 100");
        expect(getPriceInputPlaceholder("THB")).toBe("เช่น 1500");
        expect(getPriceInputStep("POINT")).toBe("1");
        expect(getPriceInputStep("THB")).toBe("0.01");
        expect(getDiscountInputStep("percent", "POINT")).toBe("0.01");
        expect(getDiscountInputStep("amount", "POINT")).toBe("1");
        expect(getDiscountAmountButtonLabel("POINT", "พอยท์")).toBe("ลดเป็นพอยท์");
        expect(getDiscountHint("amount", "THB", "พอยท์")).toBe("กรอกจำนวนบาทที่ต้องการลด");
    });

    it("builds validation messages and discount summaries", () => {
        expect(getDiscountValueValidationMessage("percent")).toBe("กรุณากรอกเปอร์เซ็นส่วนลดให้ถูกต้อง");
        expect(getDiscountValueValidationMessage("amount")).toBe("กรุณากรอกจำนวนส่วนลดให้ถูกต้อง");
        expect(getDiscountSummary("percent", "THB", "พอยท์", 15, 850)).toBe("ลด 15.00% เหลือ 850.00");
        expect(getDiscountSummary("amount", "POINT", "พอยท์", 15, 85)).toBe("ลด 15 พอยท์ เหลือ 85");
    });

    it("converts fetched discount price back to discount amount for edit forms", () => {
        expect(getFetchedDiscountAmount(1000, 850, "THB")).toBe(150);
        expect(getFetchedDiscountAmount(100, 84.5, "POINT")).toBe(16);
        expect(getFetchedDiscountAmount(100, null, "THB")).toBeNull();
        expect(getFetchedDiscountAmount(100, 100, "THB")).toBeNull();
    });

    // Both product forms read their discount from here now, so the rules that
    // used to live twice — once per form — are only correct in one place.
    it("derives the discount state both product forms render from", () => {
        expect(getDiscountState("1000", "", "amount", "THB")).toMatchObject({
            hasDiscount: false,
            isValid: true,
            normalized: null,
        });

        expect(getDiscountState("1000", "150", "amount", "THB")).toMatchObject({
            hasDiscount: true,
            isValid: true,
            normalized: 850,
        });

        expect(getDiscountState("1000", "15", "percent", "THB")).toMatchObject({
            isValid: true,
            normalized: 850,
        });

        // A discount at or over the full price, or 100%, leaves nothing to sell.
        expect(getDiscountState("1000", "1000", "amount", "THB")).toMatchObject({
            isValid: false,
            normalized: null,
        });
        expect(getDiscountState("1000", "100", "percent", "THB")).toMatchObject({
            isValid: false,
            normalized: null,
        });
        expect(getDiscountState("1000", "abc", "amount", "THB")).toMatchObject({
            isValid: false,
            normalized: null,
        });
    });
});
