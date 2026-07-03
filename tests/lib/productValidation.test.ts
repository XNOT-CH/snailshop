import { describe, it, expect } from "vitest";
import {
    parseProductPrice,
    validateCurrency,
    validateDiscountPrice,
    validatePointCurrencyPricing,
    SUPPORTED_CURRENCIES,
} from "@/lib/features/products/shared";

// These are the functions the /api/products create + update routes actually
// enforce (the zod schema in lib/validations/product.ts is not wired to them),
// so they carry the real guarantees for pricing/currency and need coverage.

describe("parseProductPrice", () => {
    it("accepts a positive numeric string", () => {
        expect(parseProductPrice("1500")).toEqual({ value: 1500 });
    });
    it("accepts a positive number", () => {
        expect(parseProductPrice(99.5)).toEqual({ value: 99.5 });
    });
    it("rejects zero", () => {
        expect(parseProductPrice("0")).toHaveProperty("error");
    });
    it("rejects a negative price", () => {
        expect(parseProductPrice(-10)).toHaveProperty("error");
    });
    it("rejects a non-numeric value", () => {
        expect(parseProductPrice("abc")).toHaveProperty("error");
    });
});

describe("validateCurrency", () => {
    it("accepts the supported currencies", () => {
        for (const currency of SUPPORTED_CURRENCIES) {
            expect(validateCurrency(currency)).toBeNull();
        }
    });
    it("treats empty / null / undefined as valid (stored as THB by default)", () => {
        expect(validateCurrency("")).toBeNull();
        expect(validateCurrency(null)).toBeNull();
        expect(validateCurrency(undefined)).toBeNull();
    });
    it("rejects an unknown currency so it cannot be checked out for free", () => {
        expect(validateCurrency("USD")).toHaveProperty("error");
        expect(validateCurrency("THN")).toHaveProperty("error");
    });
    it("is case-sensitive (lowercase is not a supported currency)", () => {
        expect(validateCurrency("thb")).toHaveProperty("error");
        expect(validateCurrency("point")).toHaveProperty("error");
    });
});

describe("validateDiscountPrice", () => {
    it("returns null value when no discount is provided", () => {
        expect(validateDiscountPrice(undefined, 100)).toEqual({ value: null });
        expect(validateDiscountPrice("", 100)).toEqual({ value: null });
        expect(validateDiscountPrice(null, 100)).toEqual({ value: null });
    });
    it("accepts a positive discount below the base price", () => {
        expect(validateDiscountPrice(80, 100)).toEqual({ value: 80 });
        expect(validateDiscountPrice("49.5", 100)).toEqual({ value: 49.5 });
    });
    it("rejects a zero discount price (would sell for free)", () => {
        expect(validateDiscountPrice(0, 100)).toHaveProperty("error");
        expect(validateDiscountPrice("0", 100)).toHaveProperty("error");
    });
    it("rejects a negative discount price", () => {
        expect(validateDiscountPrice(-5, 100)).toHaveProperty("error");
    });
    it("rejects a discount equal to or above the base price", () => {
        expect(validateDiscountPrice(100, 100)).toHaveProperty("error");
        expect(validateDiscountPrice(150, 100)).toHaveProperty("error");
    });
    it("rejects a non-numeric discount price", () => {
        expect(validateDiscountPrice("abc", 100)).toHaveProperty("error");
    });
});

describe("validatePointCurrencyPricing", () => {
    it("ignores non-POINT currencies", () => {
        expect(validatePointCurrencyPricing("THB", 99.99, 49.5)).toBeNull();
        expect(validatePointCurrencyPricing(null, 10.5, null)).toBeNull();
    });
    it("accepts whole-number POINT prices", () => {
        expect(validatePointCurrencyPricing("POINT", 100, 80)).toBeNull();
        expect(validatePointCurrencyPricing("POINT", 100, null)).toBeNull();
    });
    it("rejects a fractional POINT price", () => {
        expect(validatePointCurrencyPricing("POINT", 100.5, null)).toHaveProperty("error");
    });
    it("rejects a fractional POINT discount price", () => {
        expect(validatePointCurrencyPricing("POINT", 100, 80.5)).toHaveProperty("error");
    });
});
