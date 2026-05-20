import { describe, expect, it, vi } from "vitest";
import {
    buildGachaDailySpinLimitMessage,
    checkDailySpinLimit,
    getGachaDailySpinWindow,
    isGachaDailySpinLimitReached,
} from "@/lib/features/gacha/limits";

describe("lib/features/gacha/limits", () => {
    it("builds the same MySQL day window used by gacha routes", () => {
        expect(getGachaDailySpinWindow(new Date("2026-05-07T15:30:45.123+07:00"))).toEqual({
            start: "2026-05-06 17:00:00",
            end: "2026-05-07 16:59:59",
        });
    });

    it("builds the existing daily spin limit message", () => {
        expect(buildGachaDailySpinLimitMessage(3)).toBe("คุณสุ่มครบ 3 ครั้ง/วันแล้ว");
    });

    it("detects when today count reaches or exceeds the limit", () => {
        expect(isGachaDailySpinLimitReached(2, 3)).toBe(false);
        expect(isGachaDailySpinLimitReached("3", 3)).toBe(true);
        expect(isGachaDailySpinLimitReached(4n, 3)).toBe(true);
    });

    it("allows a roll when the injected daily count is below the limit", async () => {
        const countDailySpins = vi.fn().mockResolvedValue(1);
        const now = new Date("2026-05-07T12:00:00.000+07:00");

        await expect(checkDailySpinLimit({
            userId: "user-1",
            machineId: "machine-1",
            dailySpinLimit: 2,
            now,
            countDailySpins,
        })).resolves.toBeUndefined();

        expect(countDailySpins).toHaveBeenCalledWith({
            userId: "user-1",
            machineId: "machine-1",
            window: getGachaDailySpinWindow(now),
        });
    });

    it("throws the existing message when the daily count reaches the limit", async () => {
        await expect(checkDailySpinLimit({
            userId: "user-1",
            machineId: null,
            dailySpinLimit: 2,
            now: new Date("2026-05-07T12:00:00.000+07:00"),
            countDailySpins: vi.fn().mockResolvedValue(2),
        })).rejects.toThrow("คุณสุ่มครบ 2 ครั้ง/วันแล้ว");
    });
});
