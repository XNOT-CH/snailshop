import { describe, expect, it, vi } from "vitest";
import {
    buildGachaDailySpinLimitMessage,
    checkDailySpinLimit,
    didConsumeDailySpin,
    getGachaDailySpinDate,
    getGachaDailySpinMachineScope,
    getGachaDailySpinWindow,
    isGachaDailySpinLimitReached,
    normalizeDailySpinCount,
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

    it("builds the Thai-date counter key used by atomic daily limits", () => {
        expect(getGachaDailySpinDate(new Date("2026-05-07T17:30:00.000Z"))).toBe("2026-05-08");
        expect(getGachaDailySpinMachineScope("machine-1")).toBe("machine:machine-1");
        expect(getGachaDailySpinMachineScope(null)).toBe("global");
    });

    it("normalizes invalid daily counts to zero", () => {
        expect(normalizeDailySpinCount(null)).toBe(0);
        expect(normalizeDailySpinCount("bad")).toBe(0);
        expect(normalizeDailySpinCount(-1)).toBe(0);
        expect(normalizeDailySpinCount("2")).toBe(2);
    });

    it("treats duplicate-key no-op results as a failed counter consume", () => {
        expect(didConsumeDailySpin({ affectedRows: 1 })).toBe(true);
        expect(didConsumeDailySpin([{ affectedRows: 2 }])).toBe(true);
        expect(didConsumeDailySpin({ affectedRows: 0 })).toBe(false);
        expect(didConsumeDailySpin({})).toBe(false);
    });

    it("allows a roll when the injected daily count is below the limit", async () => {
        const countDailySpins = vi.fn().mockResolvedValue(1);
        const consumeDailySpin = vi.fn().mockResolvedValue(true);
        const now = new Date("2026-05-07T12:00:00.000+07:00");

        await expect(checkDailySpinLimit({
            userId: "user-1",
            machineId: "machine-1",
            dailySpinLimit: 2,
            now,
            countDailySpins,
            consumeDailySpin,
        })).resolves.toBeUndefined();

        expect(countDailySpins).toHaveBeenCalledWith({
            userId: "user-1",
            machineId: "machine-1",
            window: getGachaDailySpinWindow(now),
        });
        expect(consumeDailySpin).toHaveBeenCalledWith({
            userId: "user-1",
            machineId: "machine-1",
            machineScope: "machine:machine-1",
            spinDate: "2026-05-07",
            dailySpinLimit: 2,
            nextSpinCount: 2,
        });
    });

    it("throws the existing message when the daily count reaches the limit", async () => {
        const consumeDailySpin = vi.fn().mockResolvedValue(true);

        await expect(checkDailySpinLimit({
            userId: "user-1",
            machineId: null,
            dailySpinLimit: 2,
            now: new Date("2026-05-07T12:00:00.000+07:00"),
            countDailySpins: vi.fn().mockResolvedValue(2),
            consumeDailySpin,
        })).rejects.toThrow("คุณสุ่มครบ 2 ครั้ง/วันแล้ว");

        expect(consumeDailySpin).not.toHaveBeenCalled();
    });

    it("throws the existing message when the atomic counter refuses the consume", async () => {
        await expect(checkDailySpinLimit({
            userId: "user-1",
            machineId: null,
            dailySpinLimit: 2,
            now: new Date("2026-05-07T12:00:00.000+07:00"),
            countDailySpins: vi.fn().mockResolvedValue(1),
            consumeDailySpin: vi.fn().mockResolvedValue(false),
        })).rejects.toThrow("คุณสุ่มครบ 2 ครั้ง/วันแล้ว");
    });
});
