import { describe, expect, it, vi } from "vitest";
import { getGridGachaSettings, getSpinGachaSettings } from "@/lib/features/gacha/settings";

describe("lib/features/gacha/settings", () => {
    it("loads spin machine settings and preserves disabled machine as isEnabled false", async () => {
        await expect(getSpinGachaSettings("machine-1", {
            findMachineSettings: vi.fn().mockResolvedValue({
                costType: "POINT",
                costAmount: "25",
                dailySpinLimit: 3,
                fallbackCreditCap: "50",
                isActive: true,
                isEnabled: false,
            }),
        })).resolves.toEqual({
            costType: "POINT",
            costAmount: 25,
            dailySpinLimit: 3,
            fallbackCreditCap: 50,
            isEnabled: false,
        });
    });

    it("keeps spin machine missing and inactive errors unchanged", async () => {
        await expect(getSpinGachaSettings("missing", {
            findMachineSettings: vi.fn().mockResolvedValue(null),
        })).rejects.toThrow("ไม่พบตู้กาชา");

        await expect(getSpinGachaSettings("inactive", {
            findMachineSettings: vi.fn().mockResolvedValue({
                costType: "FREE",
                costAmount: 0,
                dailySpinLimit: null,
                isActive: false,
                isEnabled: true,
            }),
        })).rejects.toThrow("ตู้กาชานี้ปิดอยู่ชั่วคราว");
    });

    it("loads spin global settings with the existing fallback and swallowed lookup errors", async () => {
        await expect(getSpinGachaSettings(null, {
            findGlobalSettings: vi.fn().mockRejectedValue(new Error("db down")),
        })).resolves.toEqual({
            costType: "FREE",
            costAmount: 0,
            dailySpinLimit: 0,
            fallbackCreditCap: 0,
            isEnabled: true,
        });

        await expect(getSpinGachaSettings(null, {
            findGlobalSettings: vi.fn().mockResolvedValue({
                costType: "CREDIT",
                costAmount: "10",
                dailySpinLimit: 5,
                isEnabled: false,
            }),
        })).resolves.toEqual({
            costType: "CREDIT",
            costAmount: 10,
            dailySpinLimit: 5,
            fallbackCreditCap: 0,
            isEnabled: false,
        });
    });

    it("loads grid machine settings and throws the existing closed message for missing, inactive, or disabled machines", async () => {
        await expect(getGridGachaSettings("machine-1", {
            findMachineSettings: vi.fn().mockResolvedValue({
                costType: "TICKET",
                costAmount: 2,
                dailySpinLimit: 4,
                isActive: true,
                isEnabled: true,
            }),
        })).resolves.toEqual({
            costType: "TICKET",
            costAmount: 2,
            dailySpinLimit: 4,
        });

        for (const machine of [
            null,
            { costType: "FREE", costAmount: 0, dailySpinLimit: 0, isActive: false, isEnabled: true },
            { costType: "FREE", costAmount: 0, dailySpinLimit: 0, isActive: true, isEnabled: false },
        ]) {
            await expect(getGridGachaSettings("machine-closed", {
                findMachineSettings: vi.fn().mockResolvedValue(machine),
            })).rejects.toThrow("ตู้กาชานี้ปิดอยู่ชั่วคราว");
        }
    });

    it("loads grid global settings and preserves disabled global error behavior", async () => {
        await expect(getGridGachaSettings(null, {
            findGlobalSettings: vi.fn().mockResolvedValue({
                costType: "POINT",
                costAmount: "9",
                dailySpinLimit: null,
                isEnabled: true,
            }),
        })).resolves.toEqual({
            costType: "POINT",
            costAmount: 9,
            dailySpinLimit: 0,
        });

        await expect(getGridGachaSettings(null, {
            findGlobalSettings: vi.fn().mockResolvedValue({
                costType: "FREE",
                costAmount: 0,
                dailySpinLimit: 0,
                isEnabled: false,
            }),
        })).rejects.toThrow("ระบบกาชาปิดอยู่ชั่วคราว");
    });
});
