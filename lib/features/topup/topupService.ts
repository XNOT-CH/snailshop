import { auditFromRequest, AUDIT_ACTIONS } from "@/lib/auditLog";
import { eq, sql } from "drizzle-orm";
import { db, topups, users } from "@/lib/db";
import { encryptTopupSensitiveFields } from "@/lib/sensitiveData";
import { mysqlNow } from "@/lib/utils/date";
import type { TopupVerifyTarget } from "@/lib/features/topup/slipHelpers";
import {
    buildApprovedTopupAudit,
    buildApprovedTopupInsert,
    buildApprovedTopupResponseData,
    buildPendingTopupAudit,
    buildPendingTopupInsert,
    buildPendingTopupResponseData,
    type TopupVerifyMethod,
    type VerifiedTopupSlip,
} from "@/lib/features/topup/topupBuilders";

export async function createPendingTopup(input: {
    request: Request;
    topupId: string;
    userId: string;
    requestedAmount: number;
    proofImage: string | null;
    verifyMethod: TopupVerifyMethod;
    verifyTarget: TopupVerifyTarget;
}) {
    await db.insert(topups).values(encryptTopupSensitiveFields(buildPendingTopupInsert({
        topupId: input.topupId,
        userId: input.userId,
        requestedAmount: input.requestedAmount,
        proofImage: input.proofImage,
        verifyTarget: input.verifyTarget,
        createdAt: mysqlNow(),
    })));

    await auditFromRequest(input.request, {
        action: AUDIT_ACTIONS.TOPUP_REQUEST,
        ...buildPendingTopupAudit({
            topupId: input.topupId,
            requestedAmount: input.requestedAmount,
            proofImage: input.proofImage,
            verifyMethod: input.verifyMethod,
            verifyTarget: input.verifyTarget,
        }),
    });

    return buildPendingTopupResponseData({
        topupId: input.topupId,
        requestedAmount: input.requestedAmount,
        proofImage: input.proofImage,
    });
}

export async function createApprovedTopup(input: {
    request: Request;
    topupId: string;
    userId: string;
    requestedAmount: number;
    verifiedSlip: VerifiedTopupSlip;
    verifiedAmount: number;
    proofImage: string | null;
    verifyMethod: TopupVerifyMethod;
}) {
    await db.transaction(async (tx) => {
        await tx.insert(topups).values(encryptTopupSensitiveFields(buildApprovedTopupInsert({
            topupId: input.topupId,
            userId: input.userId,
            verifiedSlip: input.verifiedSlip,
            verifiedAmount: input.verifiedAmount,
            proofImage: input.proofImage,
            createdAt: mysqlNow(),
        })));

        await tx.update(users).set({
            creditBalance: sql`creditBalance + ${input.verifiedAmount}`,
            totalTopup: sql`totalTopup + ${input.verifiedAmount}`,
        }).where(eq(users.id, input.userId));
    });

    await auditFromRequest(input.request, {
        action: AUDIT_ACTIONS.TOPUP_REQUEST,
        ...buildApprovedTopupAudit({
            topupId: input.topupId,
            requestedAmount: input.requestedAmount,
            verifiedSlip: input.verifiedSlip,
            verifiedAmount: input.verifiedAmount,
            proofImage: input.proofImage,
            verifyMethod: input.verifyMethod,
        }),
    });

    return buildApprovedTopupResponseData({
        topupId: input.topupId,
        verifiedSlip: input.verifiedSlip,
        verifiedAmount: input.verifiedAmount,
        proofImage: input.proofImage,
    });
}

export async function hasDuplicateTopupTransactionRef(transactionRef: string) {
    const existingTopup = await db.query.topups.findFirst({
        where: eq(topups.transactionRef, transactionRef),
        columns: { id: true },
    });

    return Boolean(existingTopup);
}
