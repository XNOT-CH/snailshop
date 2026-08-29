import { describe, it, expect } from "vitest";
import {
    formatAutoDeleteSummary,
    getAutoDeleteAfterSaleValue,
} from "@/lib/features/products/autoDelete";

describe("formatAutoDeleteSummary", () => {
    it("counts in minutes, hours, then days", () => {
        expect(formatAutoDeleteSummary("30")).toBe("30 นาที");
        expect(formatAutoDeleteSummary("90")).toBe("1.5 ชั่วโมง");
        expect(formatAutoDeleteSummary("4320")).toBe("3.0 วัน");
    });

    it("says nothing for empty or nonsense input", () => {
        expect(formatAutoDeleteSummary("")).toBeNull();
        expect(formatAutoDeleteSummary("0")).toBeNull();
        expect(formatAutoDeleteSummary("-5")).toBeNull();
        expect(formatAutoDeleteSummary("abc")).toBeNull();
    });
});

// null is what the API stores as "no timer", so a disabled switch and a blank
// box have to reach it — otherwise a product picks up a timer nobody set.
describe("getAutoDeleteAfterSaleValue", () => {
    it("sends the minute count when the timer is on", () => {
        expect(getAutoDeleteAfterSaleValue(true, "60")).toBe(60);
    });

    it("sends null when the timer is off, blank, or not a positive number", () => {
        expect(getAutoDeleteAfterSaleValue(false, "60")).toBeNull();
        expect(getAutoDeleteAfterSaleValue(true, "")).toBeNull();
        expect(getAutoDeleteAfterSaleValue(true, "0")).toBeNull();
        expect(getAutoDeleteAfterSaleValue(true, "abc")).toBeNull();
    });
});
