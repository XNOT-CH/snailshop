import { describe, expect, it } from "vitest";
import { formatCurrencyAmount } from "@/lib/currencySettings";
import { summarizePurchaseBalance } from "@/lib/prepare-purchase";

const thb = (value: number) => formatCurrencyAmount(value, "THB", null);

describe("summarizePurchaseBalance", () => {
    it("shows the deduction and what is left when the balance covers the price", () => {
        const summary = summarizePurchaseBalance(500, 120, "THB");

        expect(summary).toMatchObject({
            balanceLabel: "เครดิต",
            deductText: thb(120),
            remainingText: thb(380),
            insufficient: false,
            canTopup: true,
        });
    });

    it("treats an exact balance as enough and leaves zero", () => {
        const summary = summarizePurchaseBalance(120, 120, "THB");

        expect(summary.insufficient).toBe(false);
        expect(summary.remainingText).toBe(thb(0));
    });

    it("never shows a negative remainder when the balance is short", () => {
        const summary = summarizePurchaseBalance(50, 120, "THB");

        expect(summary.insufficient).toBe(true);
        expect(summary.remainingText).toBe(thb(50));
        expect(summary.shortfallText).toBe(thb(70));
    });

    it("labels points and offers no top-up for them", () => {
        const summary = summarizePurchaseBalance(10, 20, "POINT");

        expect(summary.balanceLabel).toBe("พอยท์");
        expect(summary.canTopup).toBe(false);
    });
});
