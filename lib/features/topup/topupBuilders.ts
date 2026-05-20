import type { SlipVerificationData } from "@/lib/features/topup/easySlipService";
import type { EasySlipVerifyTarget } from "@/lib/features/topup/slipHelpers";

export type TopupVerifyMethod = "payload" | "base64" | "url" | "image";

export function getVerifiedTopupAmount(verifiedSlip: SlipVerificationData) {
    return verifiedSlip.amount?.amount || 0;
}

export function buildPendingTopupInsert(input: {
    topupId: string;
    userId: string;
    requestedAmount: number;
    proofImage: string | null;
    createdAt: string;
}) {
    return {
        id: input.topupId,
        userId: input.userId,
        amount: String(input.requestedAmount),
        proofImage: input.proofImage,
        status: "PENDING",
        createdAt: input.createdAt,
    };
}

export function buildPendingTopupAudit(input: {
    topupId: string;
    requestedAmount: number;
    proofImage: string | null;
    verifyMethod: TopupVerifyMethod;
    verifyTarget: EasySlipVerifyTarget;
}) {
    return {
        resource: "TopupRequest",
        resourceId: input.topupId,
        resourceName: `฿${input.requestedAmount.toLocaleString("th-TH")}`,
        details: {
            amount: input.requestedAmount,
            proofImageStored: Boolean(input.proofImage),
            status: "PENDING",
            verification: "manual-review",
            verifyMethod: input.verifyMethod,
            verifyTarget: input.verifyTarget,
        },
    };
}

export function buildPendingTopupResponseData(input: {
    topupId: string;
    requestedAmount: number;
    proofImage: string | null;
}) {
    return {
        topupId: input.topupId,
        amount: input.requestedAmount,
        status: "PENDING",
        proofImage: input.proofImage,
    };
}

export function buildApprovedTopupInsert(input: {
    topupId: string;
    userId: string;
    verifiedSlip: SlipVerificationData;
    verifiedAmount: number;
    proofImage: string | null;
    createdAt: string;
}) {
    return {
        id: input.topupId,
        userId: input.userId,
        amount: String(input.verifiedAmount),
        proofImage: input.proofImage,
        status: "APPROVED",
        transactionRef: input.verifiedSlip.transRef,
        senderName: input.verifiedSlip.sender.account?.name?.th || null,
        senderBank: input.verifiedSlip.sender.bank?.name || null,
        receiverName: input.verifiedSlip.receiver.account?.name?.th || null,
        receiverBank: input.verifiedSlip.receiver.bank?.name || null,
        createdAt: input.createdAt,
    };
}

export function buildApprovedTopupAudit(input: {
    topupId: string;
    requestedAmount: number;
    verifiedSlip: SlipVerificationData;
    verifiedAmount: number;
    proofImage: string | null;
    verifyMethod: TopupVerifyMethod;
    verifyTarget: EasySlipVerifyTarget;
}) {
    return {
        resource: "TopupRequest",
        resourceId: input.topupId,
        resourceName: `฿${input.verifiedAmount.toLocaleString("th-TH")}`,
        details: {
            amount: input.verifiedAmount,
            requestedAmount: input.requestedAmount,
            transRef: input.verifiedSlip.transRef,
            senderNameStored: Boolean(input.verifiedSlip.sender.account?.name?.th),
            proofImageStored: Boolean(input.proofImage),
            status: "APPROVED",
            verification: "automatic",
            verifyMethod: input.verifyMethod,
            verifyTarget: input.verifyTarget,
        },
    };
}

export function buildApprovedTopupResponseData(input: {
    topupId: string;
    verifiedSlip: SlipVerificationData;
    verifiedAmount: number;
    proofImage: string | null;
}) {
    return {
        topupId: input.topupId,
        amount: input.verifiedAmount,
        senderName: input.verifiedSlip.sender.account?.name?.th,
        senderBank: input.verifiedSlip.sender.bank?.name,
        transRef: input.verifiedSlip.transRef,
        proofImage: input.proofImage,
        status: "APPROVED",
    };
}
