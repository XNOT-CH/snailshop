import { describe, expect, it } from "vitest";
import { getNormalizedProbability, pickWeightedCandidate } from "@/lib/gachaProbability";

describe("lib/gachaProbability", () => {
    it("normalizes invalid probability values to zero", () => {
        expect(getNormalizedProbability(null)).toBe(0);
        expect(getNormalizedProbability(undefined)).toBe(0);
        expect(getNormalizedProbability(-1)).toBe(0);
        expect(getNormalizedProbability("abc")).toBe(0);
    });

    it("picks by weight order using the provided random value", () => {
        const candidates = [
            { id: "common", probability: 70 },
            { id: "rare", probability: 20 },
            { id: "legendary", probability: 10 },
        ];

        expect(pickWeightedCandidate(candidates, 0.05)?.id).toBe("common");
        expect(pickWeightedCandidate(candidates, 0.75)?.id).toBe("rare");
        expect(pickWeightedCandidate(candidates, 0.95)?.id).toBe("legendary");
    });

    it("falls back to the first item when every weight is zero", () => {
        const candidates = [
            { id: "a", probability: 0 },
            { id: "b", probability: 0 },
        ];

        expect(pickWeightedCandidate(candidates, 0.8)?.id).toBe("a");
    });
});
