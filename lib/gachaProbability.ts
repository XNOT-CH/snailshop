export interface WeightedCandidate {
    id: string;
    probability?: string | number | null;
}

const PROBABILITY_SCALE = 100;
const REQUIRED_PROBABILITY_TOTAL = 100;

export function getNormalizedProbability(value: string | number | null | undefined) {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

export function sumProbability(candidates: Array<Pick<WeightedCandidate, "probability">>) {
    const scaledTotal = candidates.reduce((sum, candidate) => {
        return sum + Math.round(getNormalizedProbability(candidate.probability) * PROBABILITY_SCALE);
    }, 0);

    return scaledTotal / PROBABILITY_SCALE;
}

export function hasExactProbabilityTotal(
    candidates: Array<Pick<WeightedCandidate, "probability">>,
    requiredTotal = REQUIRED_PROBABILITY_TOTAL,
) {
    return sumProbability(candidates) === requiredTotal;
}

export function pickWeightedCandidate<T extends WeightedCandidate>(
    candidates: T[],
    randomValue = Math.random(),
) {
    if (candidates.length === 0) {
        return null;
    }

    const weights = candidates.map((candidate) => getNormalizedProbability(candidate.probability));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    if (totalWeight <= 0) {
        return candidates[0] ?? null;
    }

    let cursor = Math.min(Math.max(randomValue, 0), 0.999999999999) * totalWeight;
    for (let index = 0; index < candidates.length; index += 1) {
        cursor -= weights[index] ?? 0;
        if (cursor < 0) {
            return candidates[index] ?? null;
        }
    }

    return candidates[candidates.length - 1] ?? null;
}
