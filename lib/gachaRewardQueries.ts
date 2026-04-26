import { and, eq, isNull } from "drizzle-orm";
import { db, gachaMachines, gachaRewards } from "@/lib/db";
export { isRewardEligibleForRoll } from "@/lib/gachaRewardEligibility";

export async function getMachineGameType(machineId: string | null) {
    if (!machineId) {
        return null;
    }

    const machine = await db.query.gachaMachines.findFirst({
        where: eq(gachaMachines.id, machineId),
        columns: { gameType: true },
    });

    return machine?.gameType ?? null;
}

export async function fetchActiveGridRewards(machineId: string | null) {
    return db.query.gachaRewards.findMany({
        where: and(
            eq(gachaRewards.isActive, true),
            machineId ? eq(gachaRewards.gachaMachineId, machineId) : isNull(gachaRewards.gachaMachineId),
        ),
        limit: 9,
        orderBy: (t, { asc }) => asc(t.createdAt),
        with: {
            product: {
                columns: {
                    id: true,
                    name: true,
                    price: true,
                    imageUrl: true,
                    isSold: true,
                    orderId: true,
                    secretData: true,
                    stockSeparator: true,
                },
            },
        },
    });
}

export async function fetchActiveSpinRewards(machineId: string | null) {
    return db.query.gachaRewards.findMany({
        where: and(
            eq(gachaRewards.isActive, true),
            machineId ? eq(gachaRewards.gachaMachineId, machineId) : isNull(gachaRewards.gachaMachineId),
        ),
        with: {
            product: {
                columns: {
                    id: true,
                    name: true,
                    price: true,
                    imageUrl: true,
                    isSold: true,
                    orderId: true,
                    secretData: true,
                    stockSeparator: true,
                },
            },
        },
    });
}
