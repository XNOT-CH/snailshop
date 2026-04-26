import { and, eq } from "drizzle-orm";
import { db, gachaMachines } from "@/lib/db";
import { hasExactProbabilityTotal, sumProbability } from "@/lib/gachaProbability";
import { isRewardEligibleForRoll } from "@/lib/gachaRewardEligibility";
import { fetchActiveGridRewards, fetchActiveSpinRewards } from "@/lib/gachaRewardQueries";

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
    const machine = await db.query.gachaMachines.findFirst({
        where: eq(gachaMachines.id, machineId),
        columns: {
            gameType: true,
        },
    });

    if (machine?.gameType === "GRID_3X3") {
        const rewards = (await fetchActiveGridRewards(machineId))
            .filter(isRewardEligibleForRoll)
            .map((reward) => ({
                probability: reward.probability,
                isActive: true,
            }));

        return getActiveMachineProbabilitySummary(rewards);
    }

    const rewards = (await fetchActiveSpinRewards(machineId))
        .filter(isRewardEligibleForRoll)
        .map((reward) => ({
            probability: reward.probability,
            isActive: reward.isActive,
        }));

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
