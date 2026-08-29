import { describe, it, expect } from "vitest";
import { createQuestSchema, updateQuestSchema } from "@/lib/validations/quest";

const valid = {
    slug: "daily-check-in",
    title: "เช็คอินรับแต้ม",
    goalType: "CHECK_IN",
    goalValue: 1,
    rewardPoints: 10,
};

function fieldError(input: unknown) {
    const result = createQuestSchema.safeParse(input);
    return result.success ? null : result.error.issues[0]?.message;
}

describe("createQuestSchema", () => {
    it("accepts a minimal valid quest", () => {
        expect(createQuestSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects a slug with characters that would break a URL", () => {
        expect(fieldError({ ...valid, slug: "Daily Check In" })).toMatch(/a-z/);
        expect(fieldError({ ...valid, slug: "เช็คอิน" })).toMatch(/a-z/);
    });

    it("rejects an unknown goal type", () => {
        expect(fieldError({ ...valid, goalType: "SOMETHING_ELSE" })).toMatch(/ประเภทเงื่อนไข/);
    });

    it("requires a positive whole reward", () => {
        expect(fieldError({ ...valid, rewardPoints: 0 })).toMatch(/มากกว่า 0/);
        expect(fieldError({ ...valid, rewardPoints: 2.5 })).toMatch(/จำนวนเต็ม/);
        expect(fieldError({ ...valid, rewardPoints: -5 })).toMatch(/มากกว่า 0/);
    });

    it("requires a positive whole goal", () => {
        expect(fieldError({ ...valid, goalValue: 0 })).toMatch(/มากกว่า 0/);
        expect(fieldError({ ...valid, goalValue: 1.5 })).toMatch(/จำนวนเต็ม/);
    });

    // A quest must never be able to send players to another site.
    it("only allows a site-relative CTA link", () => {
        expect(createQuestSchema.safeParse({ ...valid, ctaHref: "/shop" }).success).toBe(true);
        expect(fieldError({ ...valid, ctaHref: "https://evil.example.com" })).toMatch(/เส้นทางภายในเว็บ/);
        expect(fieldError({ ...valid, ctaHref: "shop" })).toMatch(/เส้นทางภายในเว็บ/);
    });

    it("rejects values longer than their column", () => {
        expect(fieldError({ ...valid, title: "ก".repeat(256) })).toMatch(/255/);
        expect(fieldError({ ...valid, slug: "a".repeat(101) })).toMatch(/100/);
        expect(fieldError({ ...valid, description: "ก".repeat(501) })).toMatch(/500/);
    });
});

describe("updateQuestSchema", () => {
    it("allows a single-field patch", () => {
        expect(updateQuestSchema.safeParse({ isActive: false }).success).toBe(true);
        expect(updateQuestSchema.safeParse({}).success).toBe(true);
    });

    it("still enforces the rules on the fields it is given", () => {
        expect(updateQuestSchema.safeParse({ rewardPoints: -1 }).success).toBe(false);
        expect(updateQuestSchema.safeParse({ slug: "BAD SLUG" }).success).toBe(false);
    });
});
