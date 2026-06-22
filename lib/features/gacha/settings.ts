import { eq } from "drizzle-orm";
import { db, gachaMachines } from "@/lib/db";
import { normalizeGachaCost } from "@/lib/gachaCost";

type GachaSettingsRow = {
    costAmount?: string | number | null;
    costType?: string | null;
    dailySpinLimit?: number | null;
    fallbackCreditCap?: string | number | null;
    isActive?: boolean | null;
    isEnabled?: boolean | null;
};

function normalizeFallbackCreditCap(value: string | number | null | undefined) {
    const cap = Number(value ?? 0);
    return Number.isFinite(cap) && cap > 0 ? cap : 0;
}

export type FindGachaMachineSettings = (machineId: string) => Promise<GachaSettingsRow | null | undefined>;
export type FindGlobalGachaSettings = () => Promise<GachaSettingsRow | null | undefined>;

export type GachaSettingsLookupDeps = {
    findMachineSettings?: FindGachaMachineSettings;
    findGlobalSettings?: FindGlobalGachaSettings;
};

async function findMachineSettings(machineId: string) {
    return db.query.gachaMachines.findFirst({
        where: eq(gachaMachines.id, machineId),
        columns: {
            costAmount: true,
            costType: true,
            dailySpinLimit: true,
            fallbackCreditCap: true,
            isActive: true,
            isEnabled: true,
        },
    });
}

async function findGlobalSettings() {
    return db.query.gachaSettings.findFirst();
}

function normalizeSettingsCost(settings: GachaSettingsRow | null | undefined) {
    return normalizeGachaCost(settings?.costType ?? "FREE", settings?.costAmount ?? 0);
}

export async function getSpinGachaSettings(machineId: string | null, deps: GachaSettingsLookupDeps = {}) {
    const findMachine = deps.findMachineSettings ?? findMachineSettings;
    const findGlobal = deps.findGlobalSettings ?? findGlobalSettings;

    if (machineId) {
        const machine = await findMachine(machineId);

        if (!machine) {
            throw new Error("ไม่พบตู้กาชา");
        }
        if (!machine.isActive) {
            throw new Error("ตู้กาชานี้ปิดอยู่ชั่วคราว");
        }

        return {
            ...normalizeSettingsCost(machine),
            dailySpinLimit: machine.dailySpinLimit ?? 0,
            fallbackCreditCap: normalizeFallbackCreditCap(machine.fallbackCreditCap),
            isEnabled: machine.isEnabled ?? true,
        };
    }

    const settings = await findGlobal().catch(() => null);
    return {
        ...normalizeSettingsCost(settings),
        dailySpinLimit: settings?.dailySpinLimit ?? 0,
        fallbackCreditCap: normalizeFallbackCreditCap(settings?.fallbackCreditCap),
        isEnabled: settings?.isEnabled ?? true,
    };
}

export async function getGridGachaSettings(machineId: string | null, deps: GachaSettingsLookupDeps = {}) {
    const findMachine = deps.findMachineSettings ?? findMachineSettings;
    const findGlobal = deps.findGlobalSettings ?? findGlobalSettings;

    if (machineId) {
        const machine = await findMachine(machineId);
        if (!machine || !machine.isActive || !machine.isEnabled) {
            throw new Error("ตู้กาชานี้ปิดอยู่ชั่วคราว");
        }

        return {
            ...normalizeSettingsCost(machine),
            dailySpinLimit: machine.dailySpinLimit ?? 0,
        };
    }

    const settings = await findGlobal().catch(() => null);
    if (settings && !settings.isEnabled) {
        throw new Error("ระบบกาชาปิดอยู่ชั่วคราว");
    }

    return {
        ...normalizeSettingsCost(settings),
        dailySpinLimit: settings?.dailySpinLimit ?? 0,
    };
}
