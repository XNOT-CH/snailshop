import { describe, expect, it } from "vitest";
import { getNextBangkokMidnight } from "@/lib/welcomeCookie";

describe("welcomeCookie", () => {
  it("returns the next Bangkok calendar midnight", () => {
    const nextMidnight = getNextBangkokMidnight(new Date("2026-05-22T10:00:00.000Z"));

    expect(nextMidnight.toISOString()).toBe("2026-05-22T17:00:00.000Z");
  });

  it("moves to the following day after Bangkok midnight", () => {
    const nextMidnight = getNextBangkokMidnight(new Date("2026-05-22T17:00:00.000Z"));

    expect(nextMidnight.toISOString()).toBe("2026-05-23T17:00:00.000Z");
  });
});
