import crypto from "node:crypto";
import { and, count, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db, gachaDailySpinCounters, gachaRollLogs } from "@/lib/db";
import { formatDateInTimeZone, toMySQLDatetime } from "@/lib/utils/date";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type GachaDailySpinCounterDb = Pick<typeof db | DbTransaction, "insert">;

export type GachaDailySpinWindow = {
    start: string;
    end: string;
};

export type CountDailyGachaSpins = (input: {
    userId: string;
    machineId: string | null;
    window: GachaDailySpinWindow;
}) => Promise<number | string | bigint | null | undefined>;

export type ConsumeDailyGachaSpin = (input: {
    userId: string;
    machineId: string | null;
    machineScope: string;
    spinDate: string;
    dailySpinLimit: number;
    nextSpinCount: number;
}) => Promise<boolean>;

export function getGachaDailySpinWindow(date: Date = new Date()): GachaDailySpinWindow {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return {
        start: toMySQLDatetime(start),
        end: toMySQLDatetime(end),
    };
}

export function getGachaDailySpinDate(date: Date = new Date()) {
    return formatDateInTimeZone(date);
}

export function getGachaDailySpinMachineScope(machineId: string | null) {
    return machineId ? `machine:${machineId}` : "global";
}

export function buildGachaDailySpinLimitMessage(dailySpinLimit: number) {
    return `คุณสุ่มครบ ${dailySpinLimit} ครั้ง/วันแล้ว`;
}

export function isGachaDailySpinLimitReached(todayCount: unknown, dailySpinLimit: number) {
    return Number(todayCount) >= dailySpinLimit;
}

export function normalizeDailySpinCount(todayCount: unknown) {
    const value = Number(todayCount ?? 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
}

export function didConsumeDailySpin(result: unknown) {
    if (Array.isArray(result)) {
        return didConsumeDailySpin(result[0]);
    }

    if (!result || typeof result !== "object") {
        return false;
    }

    const maybeResult = result as { affectedRows?: unknown; rowsAffected?: unknown };
    if (typeof maybeResult.affectedRows === "number") {
        return maybeResult.affectedRows > 0;
    }

    if (typeof maybeResult.rowsAffected === "number") {
        return maybeResult.rowsAffected > 0;
    }

    return false;
}

async function countDailyGachaSpins(input: {
    userId: string;
    machineId: string | null;
    window: GachaDailySpinWindow;
}) {
    const [{ count: todayCount }] = await db
        .select({ count: count() })
        .from(gachaRollLogs)
        .where(and(
            eq(gachaRollLogs.userId, input.userId),
            input.machineId ? eq(gachaRollLogs.gachaMachineId, input.machineId) : isNull(gachaRollLogs.gachaMachineId),
            gte(gachaRollLogs.createdAt, input.window.start),
            lte(gachaRollLogs.createdAt, input.window.end),
        ));

    return todayCount;
}

export async function consumeDailyGachaSpinCounter(input: {
    dbClient?: GachaDailySpinCounterDb;
    userId: string;
    machineScope: string;
    spinDate: string;
    dailySpinLimit: number;
    nextSpinCount: number;
}) {
    const dbClient = input.dbClient ?? db;
    const result = await dbClient
        .insert(gachaDailySpinCounters)
        .values({
            id: crypto.randomUUID(),
            userId: input.userId,
            machineScope: input.machineScope,
            spinDate: input.spinDate,
            spinCount: input.nextSpinCount,
        })
        .onDuplicateKeyUpdate({
            set: {
                spinCount: sql`IF(${gachaDailySpinCounters.spinCount} < ${input.dailySpinLimit}, ${gachaDailySpinCounters.spinCount} + 1, ${gachaDailySpinCounters.spinCount})`,
                updatedAt: sql`now()`,
            },
        });

    return didConsumeDailySpin(result);
}

export async function checkDailySpinLimit(input: {
    dbClient?: GachaDailySpinCounterDb;
    userId: string;
    machineId: string | null;
    dailySpinLimit: number;
    now?: Date;
    countDailySpins?: CountDailyGachaSpins;
    consumeDailySpin?: ConsumeDailyGachaSpin;
}) {
    const now = input.now ?? new Date();
    const window = getGachaDailySpinWindow(now);
    const spinDate = getGachaDailySpinDate(now);
    const machineScope = getGachaDailySpinMachineScope(input.machineId);
    const todayCount = await (input.countDailySpins ?? countDailyGachaSpins)({
        userId: input.userId,
        machineId: input.machineId,
        window,
    });
    const normalizedTodayCount = normalizeDailySpinCount(todayCount);

    if (isGachaDailySpinLimitReached(normalizedTodayCount, input.dailySpinLimit)) {
        throw new Error(buildGachaDailySpinLimitMessage(input.dailySpinLimit));
    }

    const consumed = await (input.consumeDailySpin ?? ((consumeInput) =>
        consumeDailyGachaSpinCounter({ ...consumeInput, dbClient: input.dbClient })))({
        userId: input.userId,
        machineId: input.machineId,
        machineScope,
        spinDate,
        dailySpinLimit: input.dailySpinLimit,
        nextSpinCount: normalizedTodayCount + 1,
    });

    if (!consumed) {
        throw new Error(buildGachaDailySpinLimitMessage(input.dailySpinLimit));
    }
}
