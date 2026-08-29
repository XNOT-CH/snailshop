import { describe, it, expect } from "vitest";
import { MAX_DECIMAL_AMOUNT, roundAmount, sumAmounts, toBaht, toSatang } from "@/lib/money";

describe("toSatang", () => {
    it("converts baht to whole satang", () => {
        expect(toSatang(19.99)).toBe(1999);
        expect(toSatang("0.07")).toBe(7);
        expect(toSatang(0)).toBe(0);
    });

    it("treats missing and non-finite values as zero", () => {
        expect(toSatang(null)).toBe(0);
        expect(toSatang(undefined)).toBe(0);
        expect(toSatang("abc")).toBe(0);
        expect(toSatang(Number.POSITIVE_INFINITY)).toBe(0);
    });

    it("snaps a value that binary floating point cannot hold exactly", () => {
        expect(toSatang(0.07 * 3)).toBe(21);
        expect(toSatang(19.99 * 7)).toBe(13993);
    });

    it("still converts the largest storable amount exactly", () => {
        expect(toSatang(MAX_DECIMAL_AMOUNT)).toBe(9_999_999_999);
    });
});

describe("sumAmounts", () => {
    // The whole reason lib/money.ts exists: these sums drift when added as
    // floats, and a drifted total gets compared against an exact balance.
    it("adds prices that drift when summed as plain numbers", () => {
        expect(0.07 + 0.07 + 0.07).not.toBe(0.21);
        expect(sumAmounts([0.07, 0.07, 0.07])).toBe(0.21);
    });

    it("adds a longer mixed cart exactly", () => {
        expect(sumAmounts([0.07, 0.29, 19.99, 129.45, 4.35])).toBe(154.15);
    });

    it("accepts the strings MySQL returns for DECIMAL columns", () => {
        expect(sumAmounts(["33.33", "33.33", "33.34"])).toBe(100);
    });

    it("returns zero for an empty list", () => {
        expect(sumAmounts([])).toBe(0);
    });
});

describe("roundAmount", () => {
    it("snaps to the two decimals the column can store", () => {
        expect(roundAmount(6.9993)).toBe(7);
        expect(roundAmount(37.0368)).toBe(37.04);
        expect(roundAmount(7.4875)).toBe(7.49);
    });

    it("leaves an already-exact amount alone", () => {
        expect(roundAmount(1500)).toBe(1500);
        expect(roundAmount(99.5)).toBe(99.5);
    });
});

describe("toBaht", () => {
    it("round-trips through satang", () => {
        expect(toBaht(toSatang(1234.56))).toBe(1234.56);
    });
});
