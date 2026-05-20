import { and, count, eq, gte, isNull, lte } from "drizzle-orm";
import { db, gachaRollLogs } from "@/lib/db";
import { toMySQLDatetime } from "@/lib/utils/date";

export type GachaDailySpinWindow = {
    start: string;
    end: string;
};

export type CountDailyGachaSpins = (input: {
    userId: string;
    machineId: string | null;
    window: GachaDailySpinWindow;
}) => Promise<number | string | bigint | null | undefined>;

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

export function buildGachaDailySpinLimitMessage(dailySpinLimit: number) {
    return `คุณสุ่มครบ ${dailySpinLimit} ครั้ง/วันแล้ว`;
}

export function isGachaDailySpinLimitReached(todayCount: unknown, dailySpinLimit: number) {
    return Number(todayCount) >= dailySpinLimit;
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

export async function checkDailySpinLimit(input: {
    userId: string;
    machineId: string | null;
    dailySpinLimit: number;
    now?: Date;
    countDailySpins?: CountDailyGachaSpins;
}) {
    const window = getGachaDailySpinWindow(input.now ?? new Date());
    const todayCount = await (input.countDailySpins ?? countDailyGachaSpins)({
        userId: input.userId,
        machineId: input.machineId,
        window,
    });

    if (isGachaDailySpinLimitReached(todayCount, input.dailySpinLimit)) {
        throw new Error(buildGachaDailySpinLimitMessage(input.dailySpinLimit));
    }
}
