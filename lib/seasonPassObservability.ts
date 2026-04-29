import { AUDIT_ACTIONS, auditFromRequest, createAuditLog } from "@/lib/auditLog";

type SeasonPassLogLevel = "info" | "warn" | "error";

type SeasonPassLogContext = Record<string, unknown>;

export function logSeasonPassEvent(level: SeasonPassLogLevel, event: string, context: SeasonPassLogContext) {
    const payload = {
        scope: "season-pass",
        event,
        level,
        ...context,
    };
    const line = JSON.stringify(payload);

    if (level === "error") {
        console.error(line);
        return;
    }

    if (level === "warn") {
        console.warn(line);
        return;
    }

    console.info(line);
}

export async function auditSeasonPassPurchase(request: Request | undefined, params: {
    userId: string;
    planId: string;
    queued: boolean;
    price: number;
    startsAt?: string | null;
    endAt: string;
}) {
    const action = params.queued ? AUDIT_ACTIONS.SEASON_PASS_RENEW_QUEUED : AUDIT_ACTIONS.SEASON_PASS_PURCHASE;
    const details = {
        queued: params.queued,
        planId: params.planId,
        price: params.price,
        startsAt: params.startsAt ?? null,
        endAt: params.endAt,
    };

    if (request) {
        await auditFromRequest(request, {
            userId: params.userId,
            action,
            resource: "season_pass_subscription",
            resourceId: params.planId,
            details,
        });
        return;
    }

    await createAuditLog({
        userId: params.userId,
        action,
        resource: "season_pass_subscription",
        resourceId: params.planId,
        details,
    });
}

export async function auditSeasonPassClaim(request: Request | undefined, params: {
    userId: string;
    subscriptionId: string;
    dayNumber: number;
    rewardType: string;
    rewardLabel: string;
    rewardAmount: string;
    claimDateKey: string;
}) {
    const details = {
        subscriptionId: params.subscriptionId,
        dayNumber: params.dayNumber,
        rewardType: params.rewardType,
        rewardLabel: params.rewardLabel,
        rewardAmount: params.rewardAmount,
        claimDateKey: params.claimDateKey,
    };

    if (request) {
        await auditFromRequest(request, {
            userId: params.userId,
            action: AUDIT_ACTIONS.SEASON_PASS_CLAIM,
            resource: "season_pass_claim",
            resourceId: params.subscriptionId,
            details,
        });
        return;
    }

    await createAuditLog({
        userId: params.userId,
        action: AUDIT_ACTIONS.SEASON_PASS_CLAIM,
        resource: "season_pass_claim",
        resourceId: params.subscriptionId,
        details,
    });
}

export async function auditSeasonPassQueueActivation(params: {
    userId: string;
    request?: Request;
    activatedCount: number;
}) {
    if (params.activatedCount <= 0) {
        return;
    }

    const details = { activatedCount: params.activatedCount };
    if (params.request) {
        await auditFromRequest(params.request, {
            userId: params.userId,
            action: AUDIT_ACTIONS.SEASON_PASS_QUEUE_ACTIVATED,
            resource: "season_pass_subscription",
            details,
        });
        return;
    }

    await createAuditLog({
        userId: params.userId,
        action: AUDIT_ACTIONS.SEASON_PASS_QUEUE_ACTIVATED,
        resource: "season_pass_subscription",
        details,
    });
}
