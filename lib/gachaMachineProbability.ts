import { and, eq } from "drizzle-orm";
import { db, gachaMachines, gachaRewards } from "@/lib/db";
import { hasExactProbabilityTotal, sumProbability } from "@/lib/gachaProbability";

type MachineRewardProbability = {
    probability: string | number | null;
    isActive: boolean;
};

export function getActiveMachineProbabilitySummary(rewards: MachineRewardProbability[]) {
    const activeRewards = rewards.filter((reward) => reward.isActive);
    const totalProbability = sumProbability(activeRewards);

    return {
        activeRewardCount: activeRewards.length,
        totalProbability,
        isComplete: hasExactProbabilityTotal(activeRewards),
    };
}

export async function getMachineProbabilitySummary(machineId: string) {
    const rewards = await db.query.gachaRewards.findMany({
        where: eq(gachaRewards.gachaMachineId, machineId),
        columns: {
            probability: true,
            isActive: true,
        },
    });

    return getActiveMachineProbabilitySummary(rewards);
}

export async function disableMachineIfProbabilityInvalid(machineId: string) {
    const summary = await getMachineProbabilitySummary(machineId);

    if (!summary.isComplete) {
        await db
            .update(gachaMachines)
            .set({ isActive: false })
            .where(and(eq(gachaMachines.id, machineId), eq(gachaMachines.isActive, true)));
    }

    return summary;
}
